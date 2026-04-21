from __future__ import annotations

from datetime import datetime, timedelta
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
import json
import os
import random
import smtplib
import string
import uuid

import openai
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse
from openai import OpenAI


app = FastAPI(title="T.C. ANATOLIA-Q", version="1.4.6")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

PRIMARY_EMAIL = os.environ.get("ADMIN_EMAIL", "info@boldkimya.com.tr")
GMAIL_USER = os.environ.get("GMAIL_USER", "")
GMAIL_PASS = os.environ.get("GMAIL_APP_PASSWORD", "")
OPENAI_MODEL = os.environ.get("OPENAI_MODEL", "gpt-4o-mini")
COMMON_PASSWORD = "Q7m!R2x#"
SESSION_KEYS = ["anatolia_q_session_v4", "anatolia_q_session_v3", "anatolia_q_session_v2", "anatolia_q_session"]

USERS = {
    "158963": {"password": COMMON_PASSWORD, "email": PRIMARY_EMAIL, "name": "Sistem Yonetici", "role": "admin"},
    "274851": {"password": COMMON_PASSWORD, "email": PRIMARY_EMAIL, "name": "Operasyon Birimi", "role": "operator"},
    "386472": {"password": COMMON_PASSWORD, "email": PRIMARY_EMAIL, "name": "Stratejik Analiz", "role": "analyst"},
    "491205": {"password": COMMON_PASSWORD, "email": PRIMARY_EMAIL, "name": "Enerji Izleme", "role": "analyst"},
    "563184": {"password": COMMON_PASSWORD, "email": PRIMARY_EMAIL, "name": "Saha Operatoru", "role": "operator"},
}

DOMAIN_CONFIG = {
    "savunma": {"display": "Savunma", "kurumlar": ["MSB", "TSK", "MIT"], "zaman": "Acil (0-48 saat)"},
    "ekonomi": {"display": "Ekonomi", "kurumlar": ["Hazine ve Maliye Bakanligi", "TCMB", "BDDK"], "zaman": "Kisa (1-2 hafta)"},
    "enerji": {"display": "Enerji", "kurumlar": ["Enerji ve Tabii Kaynaklar Bakanligi", "EPDK", "BOTAS"], "zaman": "Kisa-Orta (1-4 hafta)"},
    "dis_politika": {"display": "Dis Politika", "kurumlar": ["Disisleri Bakanligi", "Cumhurbaskanligi", "MIT"], "zaman": "Acil (0-72 saat)"},
    "toplumsal_olaylar": {"display": "Toplumsal Olaylar", "kurumlar": ["Icisleri Bakanligi", "Emniyet Genel Mudurlugu", "Valilikler"], "zaman": "Acil (0-72 saat)"},
    "genel_chat": {"display": "Genel Chat", "kurumlar": ["Cumhurbaskanligi", "Strateji Birimi", "Merkez Koordinasyon"], "zaman": "Duruma gore"},
    "cross": {"display": "Capraz Sentez", "kurumlar": ["Cumhurbaskanligi", "MSB", "Disisleri Bakanligi", "Hazine ve Maliye Bakanligi"], "zaman": "Acil (0-72 saat)"},
}

STANDARD_SCHEMA = {
    "type": "object",
    "additionalProperties": False,
    "properties": {
        "ozet": {"type": "string"},
        "tehdit_seviyesi": {"type": "string", "enum": ["KRITIK", "YUKSEK", "ORTA", "DUSUK"]},
        "tehdit_analizi": {"type": "string"},
        "senaryolar": {
            "type": "array",
            "minItems": 3,
            "items": {
                "type": "object",
                "additionalProperties": False,
                "properties": {
                    "baslik": {"type": "string"},
                    "olasilik": {"type": "string", "enum": ["Yuksek", "Orta", "Dusuk"]},
                    "aciklama": {"type": "string"},
                    "aksiyon": {"type": "string"},
                },
                "required": ["baslik", "olasilik", "aciklama", "aksiyon"],
            },
        },
        "oncelikli_oneri": {"type": "string"},
        "etkilenen_kurumlar": {"type": "array", "items": {"type": "string"}},
        "zaman_cercevesi": {"type": "string"},
    },
    "required": ["ozet", "tehdit_seviyesi", "tehdit_analizi", "senaryolar", "oncelikli_oneri", "etkilenen_kurumlar", "zaman_cercevesi"],
}

CROSS_SCHEMA = {
    "type": "object",
    "additionalProperties": False,
    "properties": {
        "ozet": {"type": "string"},
        "genel_tehdit_seviyesi": {"type": "string", "enum": ["KRITIK", "YUKSEK", "ORTA", "DUSUK"]},
        "alan_etkileri": {"type": "object"},
        "kritik_baglanti": {"type": "string"},
        "tehdit_analizi": {"type": "string"},
        "senaryolar": STANDARD_SCHEMA["properties"]["senaryolar"],
        "oncelikli_oneri": {"type": "string"},
        "etkilenen_kurumlar": {"type": "array", "items": {"type": "string"}},
        "zaman_cercevesi": {"type": "string"},
    },
    "required": ["ozet", "genel_tehdit_seviyesi", "alan_etkileri", "kritik_baglanti", "tehdit_analizi", "senaryolar", "oncelikli_oneri", "etkilenen_kurumlar", "zaman_cercevesi"],
}

pending_codes: dict[str, dict[str, object]] = {}
active_sessions: dict[str, dict[str, str]] = {}
analysis_store: dict[str, dict[str, object]] = {}


def now_text() -> str:
    return datetime.now().strftime("%d.%m.%Y %H:%M")


def generate_code() -> str:
    return "".join(random.choices(string.digits, k=6))


def build_email(subject: str, html: str, to_email: str) -> MIMEMultipart:
    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = GMAIL_USER
    msg["To"] = to_email
    msg.attach(MIMEText(html, "html", "utf-8"))
    return msg


def send_email_message(message: MIMEMultipart) -> None:
    with smtplib.SMTP_SSL("smtp.gmail.com", 465) as server:
        server.login(GMAIL_USER, GMAIL_PASS)
        server.sendmail(GMAIL_USER, [message["To"]], message.as_string())


def send_2fa_email(to_email: str, code: str, name: str) -> None:
    html = f"""<html><body style='font-family:Arial,sans-serif;background:#07111e;padding:40px'>
    <div style='max-width:520px;margin:0 auto;background:#0c1727;border:1px solid #2b8df0;padding:34px;border-radius:20px'>
      <div style='font-family:monospace;font-size:24px;font-weight:900;letter-spacing:5px;color:#7ed1ff;margin-bottom:4px'>T.C. ANATOLIA-Q</div>
      <div style='font-size:11px;color:#59728d;letter-spacing:2px;margin-bottom:24px'>ULUSAL KARAR DESTEK SISTEMI</div>
      <p style='color:#b8cce0'>Sayin <b style='color:#ffffff'>{name}</b>, giris dogrulama kodunuz:</p>
      <div style='background:#09111d;border:2px solid #7ed1ff;padding:22px;text-align:center;margin:20px 0;border-radius:16px'>
        <div style='font-family:monospace;font-size:42px;font-weight:900;letter-spacing:10px;color:#7ed1ff'>{code}</div>
        <div style='font-size:12px;color:#6a86a3;margin-top:8px'>10 dakika gecerlidir</div>
      </div>
      <p style='font-size:12px;color:#6a86a3'>Bold Askeri Teknoloji ve Savunma Sanayi A.S.</p>
    </div></body></html>"""
    send_email_message(build_email(f"T.C. ANATOLIA-Q Dogrulama Kodu: {code}", html, to_email))


def send_center_contact_email(user_name: str, username: str, role: str, note: str = "") -> None:
    note_html = f"<p style='color:#cfe2f5;line-height:1.6'><b>Not:</b> {note}</p>" if note else ""
    html = f"""<html><body style='font-family:Arial,sans-serif;background:#06101b;padding:40px'>
    <div style='max-width:560px;margin:0 auto;background:#0d1a2b;border:1px solid #49b7ff;padding:34px;border-radius:22px'>
      <div style='font-family:monospace;font-size:24px;font-weight:900;letter-spacing:5px;color:#7ed1ff;margin-bottom:4px'>T.C. ANATOLIA-Q</div>
      <div style='font-size:11px;color:#6a87a8;letter-spacing:2px;margin-bottom:24px'>MERKEZ ILETISIM BILDIRIMI</div>
      <p style='color:#d9ecff;line-height:1.7'><b>{user_name}</b> merkez ile iletisim kurulmasini talep etti.</p>
      <div style='background:#08111d;border:1px solid #25486a;border-radius:16px;padding:18px;margin:20px 0'>
        <p style='margin:0 0 8px;color:#d9ecff'><b>Kullanici kodu:</b> {username}</p>
        <p style='margin:0 0 8px;color:#d9ecff'><b>Rol:</b> {role}</p>
        <p style='margin:0;color:#d9ecff'><b>Talep zamani:</b> {now_text()}</p>
      </div>
      {note_html}
      <p style='font-size:12px;color:#6a87a8'>Bold Askeri Teknoloji ve Savunma Sanayi A.S.</p>
    </div></body></html>"""
    send_email_message(build_email("T.C. ANATOLIA-Q Merkez Iletisim Talebi", html, PRIMARY_EMAIL))


def extract_token(request: Request, body: dict | None = None) -> str:
    auth = request.headers.get("authorization", "")
    if auth.lower().startswith("bearer "):
        return auth.split(" ", 1)[1].strip()
    token = request.headers.get("x-auth-token", "").strip()
    if token:
        return token
    if body:
        return str(body.get("token", "")).strip()
    return ""


def get_session_from_token(token: str) -> dict[str, str]:
    session = active_sessions.get(token)
    if not session:
        raise HTTPException(401, "Gecersiz oturum.")
    return session


def scenario_to_text(item: object) -> str:
    if not isinstance(item, dict):
        return str(item)
    return " | ".join(
        part for part in [
            str(item.get("baslik", "")).strip(),
            f"Olasilik: {str(item.get('olasilik', 'Orta')).strip()}",
            str(item.get("aciklama", "")).strip(),
            f"Aksiyon: {str(item.get('aksiyon', '')).strip()}",
        ]
        if part and not part.endswith(": ")
    )


def add_aliases(domain: str, payload: dict[str, object], fallback_mode: bool) -> dict[str, object]:
    result = dict(payload)
    result["risk_analizi"] = result.get("tehdit_analizi", "")
    result["senaryo_analizi"] = [scenario_to_text(item) for item in result.get("senaryolar", [])]
    result["fallback_mode"] = fallback_mode
    if domain == "cross":
        result["etki_alanlari"] = [
            f"{DOMAIN_CONFIG[key]['display']}: {value.get('etki', 'orta')} | {value.get('aciklama', '')}"
            for key, value in result.get("alan_etkileri", {}).items()
            if key in DOMAIN_CONFIG and isinstance(value, dict)
        ]
    else:
        result["etki_alanlari"] = [str(result.get("tehdit_analizi", ""))]
    return result


def fallback_result(domain: str, situation: str, reason: str) -> dict[str, object]:
    config = DOMAIN_CONFIG[domain]
    if domain == "cross":
        payload = {
            "ozet": f"Capraz alan sentezi yedek modda uretildi. Ana eksen: {situation[:220]}",
            "genel_tehdit_seviyesi": "ORTA",
            "alan_etkileri": {
                "savunma": {"etki": "orta", "aciklama": "Guvenlik boyutu izlenmeli."},
                "ekonomi": {"etki": "orta", "aciklama": "Piyasa algisi etkilenebilir."},
                "enerji": {"etki": "orta", "aciklama": "Kritik altyapi teyidi gerekli."},
                "toplumsal_olaylar": {"etki": "orta", "aciklama": "Saha hareketliligi izlenmeli."},
                "dis_politika": {"etki": "orta", "aciklama": "Diplomatik yansimalar takip edilmeli."},
            },
            "kritik_baglanti": "Alanlar arasindaki etki birbirini hizlandirabilir.",
            "tehdit_analizi": f"Bulut model servisi kullanilamadi. Teknik neden: {reason}.",
            "senaryolar": [
                {"baslik": "Cok alanli baski artar", "olasilik": "Yuksek", "aciklama": "Bir alandaki stres digerine yayilabilir.", "aksiyon": "Tek merkezli koordinasyon kurulmali."},
                {"baslik": "Etki dengelenir", "olasilik": "Orta", "aciklama": "Es zamanli tepki ile yayilma sinirlanabilir.", "aksiyon": "Kurumlar arasi veri akisi standardize edilmeli."},
                {"baslik": "Etki parcali kalir", "olasilik": "Dusuk", "aciklama": "Tetikleyiciler zayiflarsa etki daralabilir.", "aksiyon": "Yedek planlar korunmali."},
            ],
            "oncelikli_oneri": "Tek merkezli koordinasyon yapisi kurularak alanlar arasi etkiler es zamanli izlenmelidir.",
            "etkilenen_kurumlar": config["kurumlar"],
            "zaman_cercevesi": config["zaman"],
        }
    else {
