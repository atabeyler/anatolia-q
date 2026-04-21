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

app = FastAPI(title="T.C. ANATOLIA-Q", version="1.4.4")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

PRIMARY_EMAIL = os.environ.get("ADMIN_EMAIL", "info@boldkimya.com.tr")
OPENAI_MODEL = os.environ.get("OPENAI_MODEL", "gpt-4o-mini")
GMAIL_USER = os.environ.get("GMAIL_USER", "")
GMAIL_PASS = os.environ.get("GMAIL_APP_PASSWORD", "")
COMMON_PASSWORD = "Q7m!R2x#"

USERS = {
    "158963": {"password": COMMON_PASSWORD, "email": PRIMARY_EMAIL, "name": "Sistem Yonetici", "role": "admin"},
    "274851": {"password": COMMON_PASSWORD, "email": PRIMARY_EMAIL, "name": "Operasyon Birimi", "role": "operator"},
    "386472": {"password": COMMON_PASSWORD, "email": PRIMARY_EMAIL, "name": "Stratejik Analiz", "role": "analyst"},
    "491205": {"password": COMMON_PASSWORD, "email": PRIMARY_EMAIL, "name": "Enerji Izleme", "role": "analyst"},
    "563184": {"password": COMMON_PASSWORD, "email": PRIMARY_EMAIL, "name": "Saha Operatoru", "role": "operator"},
}

DOMAIN_CONFIG = {
    "savunma": {
        "display": "Savunma",
        "prompt": "You are the defense analysis module of T.C. ANATOLIA-Q. Produce concise strategic Turkish analysis in the requested JSON schema.",
        "kurumlar": ["MSB", "TSK", "MIT"],
        "zaman": "Acil (0-48 saat)",
        "oneri": "Saha farkindaligi ve kurumlar arasi koordinasyon derhal artirilmalidir.",
    },
    "ekonomi": {
        "display": "Ekonomi",
        "prompt": "You are the economy analysis module of T.C. ANATOLIA-Q. Produce concise strategic Turkish analysis in the requested JSON schema.",
        "kurumlar": ["Hazine ve Maliye Bakanligi", "TCMB", "BDDK"],
        "zaman": "Kisa (1-2 hafta)",
        "oneri": "Piyasa guveni ve likidite yonetimi icin hizli bir koordinasyon paketi aciklanmalidir.",
    },
    "enerji": {
        "display": "Enerji",
        "prompt": "You are the energy analysis module of T.C. ANATOLIA-Q. Produce concise strategic Turkish analysis in the requested JSON schema.",
        "kurumlar": ["Enerji ve Tabii Kaynaklar Bakanligi", "EPDK", "BOTAS"],
        "zaman": "Kisa-Orta (1-4 hafta)",
        "oneri": "Kritik altyapi korumasi ve arz surekliligi icin teknik teyit ve kriz masasi devreye alinmalidir.",
    },
    "dis_politika": {
        "display": "Dis Politika",
        "prompt": "You are the foreign policy analysis module of T.C. ANATOLIA-Q. Produce concise strategic Turkish analysis in the requested JSON schema.",
        "kurumlar": ["Disisleri Bakanligi", "Cumhurbaskanligi", "MIT"],
        "zaman": "Acil (0-72 saat)",
        "oneri": "Diplomatik temaslar hizlandirilmali ve dis kamuoyu anlatisi tek merkezden yonetilmelidir.",
    },
    "toplumsal_olaylar": {
        "display": "Toplumsal Olaylar",
        "prompt": "You are the social events analysis module of T.C. ANATOLIA-Q. Produce concise strategic Turkish analysis in the requested JSON schema.",
        "kurumlar": ["Icisleri Bakanligi", "Emniyet Genel Mudurlugu", "Valilikler"],
        "zaman": "Acil (0-72 saat)",
        "oneri": "Sahadaki toplumsal dinamikler erken fazda izlenmeli ve kurumlar arasi bilgi akisi tek elde toplanmalidir.",
    },
    "genel_chat": {
        "display": "Genel Chat",
        "prompt": "You are the strategic general chat module of T.C. ANATOLIA-Q. Produce concise Turkish analysis in the requested JSON schema.",
        "kurumlar": ["Cumhurbaskanligi", "Strateji Birimi", "Merkez Koordinasyon"],
        "zaman": "Duruma gore",
        "oneri": "Karar vericilere sunulacak ana mesajlar netlestirilmeli ve belirsizlikler acikca ayrilmalidir.",
    },
    "cross": {
        "display": "Capraz Sentez",
        "prompt": "You are the cross-domain synthesis module of T.C. ANATOLIA-Q. Produce concise Turkish analysis in the requested JSON schema.",
        "kurumlar": ["Cumhurbaskanligi", "MSB", "Disisleri Bakanligi", "Hazine ve Maliye Bakanligi"],
        "zaman": "Acil (0-72 saat)",
        "oneri": "Tek merkezli koordinasyon yapisi kurularak alanlar arasi etkiler es zamanli izlenmelidir.",
    },
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
    "required": [
        "ozet",
        "tehdit_seviyesi",
        "tehdit_analizi",
        "senaryolar",
        "oncelikli_oneri",
        "etkilenen_kurumlar",
        "zaman_cercevesi",
    ],
}

CROSS_SCHEMA = {
    "type": "object",
    "additionalProperties": False,
    "properties": {
        "ozet": {"type": "string"},
        "genel_tehdit_seviyesi": {"type": "string", "enum": ["KRITIK", "YUKSEK", "ORTA", "DUSUK"]},
        "alan_etkileri": {
            "type": "object",
            "additionalProperties": False,
            "properties": {
                "savunma": {"type": "object", "additionalProperties": False, "properties": {"etki": {"type": "string", "enum": ["yuksek", "orta", "dusuk"]}, "aciklama": {"type": "string"}}, "required": ["etki", "aciklama"]},
                "ekonomi": {"type": "object", "additionalProperties": False, "properties": {"etki": {"type": "string", "enum": ["yuksek", "orta", "dusuk"]}, "aciklama": {"type": "string"}}, "required": ["etki", "aciklama"]},
                "enerji": {"type": "object", "additionalProperties": False, "properties": {"etki": {"type": "string", "enum": ["yuksek", "orta", "dusuk"]}, "aciklama": {"type": "string"}}, "required": ["etki", "aciklama"]},
                "toplumsal_olaylar": {"type": "object", "additionalProperties": False, "properties": {"etki": {"type": "string", "enum": ["yuksek", "orta", "dusuk"]}, "aciklama": {"type": "string"}}, "required": ["etki", "aciklama"]},
                "dis_politika": {"type": "object", "additionalProperties": False, "properties": {"etki": {"type": "string", "enum": ["yuksek", "orta", "dusuk"]}, "aciklama": {"type": "string"}}, "required": ["etki", "aciklama"]},
            },
            "required": ["savunma", "ekonomi", "enerji", "toplumsal_olaylar", "dis_politika"],
        },
        "kritik_baglanti": {"type": "string"},
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
    "required": [
        "ozet",
        "genel_tehdit_seviyesi",
        "alan_etkileri",
        "kritik_baglanti",
        "tehdit_analizi",
        "senaryolar",
        "oncelikli_oneri",
        "etkilenen_kurumlar",
        "zaman_cercevesi",
    ],
}

LEVEL_KEYWORDS = {
    "KRITIK": ["saldiri", "kriz", "catisma", "patlama", "yaygin", "seferberlik"],
    "YUKSEK": ["baski", "tehdit", "kesinti", "ihlal", "siber", "protesto"],
    "ORTA": ["gerilim", "risk", "hassas", "uyari"],
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
      <p style='font-size:12px;color:#6a86a3'>Bu kodu siz talep etmediyseniz merkez yonetimini bilgilendirin.<br><br>Bold Askeri Teknoloji ve Savunma Sanayi A.S.</p>
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
      <p style='font-size:12px;color:#6a87a8'>Bildirim merkeze otomatik gonderilmistir.<br><br>Bold Askeri Teknoloji ve Savunma Sanayi A.S.</p>
    </div></body></html>"""
    send_email_message(build_email("T.C. ANATOLIA-Q Merkez Iletisim Talebi", html, PRIMARY_EMAIL))


def detect_level(situation: str) -> str:
    lowered = situation.lower()
    for level, words in LEVEL_KEYWORDS.items():
        if any(word in lowered for word in words):
            return level
    return "ORTA"


def get_output_schema(domain: str) -> dict[str, object]:
    if domain == "cross":
        return {"name": "anatolia_q_cross_analysis", "schema": CROSS_SCHEMA}
    return {"name": "anatolia_q_standard_analysis", "schema": STANDARD_SCHEMA}


def normalize_result(domain: str, payload: dict[str, object]) -> dict[str, object]:
    if domain == "cross":
        level = str(payload.get("genel_tehdit_seviyesi", "ORTA")).upper()
        payload["genel_tehdit_seviyesi"] = level if level in {"KRITIK", "YUKSEK", "ORTA", "DUSUK"} else "ORTA"
        impacts = payload.get("alan_etkileri", {})
        if isinstance(impacts, dict):
            for item in impacts.values():
                if isinstance(item, dict):
                    etki = str(item.get("etki", "orta")).lower()
                    item["etki"] = etki if etki in {"yuksek", "orta", "dusuk"} else "orta"
    else:
        level = str(payload.get("tehdit_seviyesi", "ORTA")).upper()
        payload["tehdit_seviyesi"] = level if level in {"KRITIK", "YUKSEK", "ORTA", "DUSUK"} else "ORTA"

    for scenario in payload.get("senaryolar", []):
        if isinstance(scenario, dict):
            olasilik = str(scenario.get("olasilik", "Orta"))
            scenario["olasilik"] = olasilik if olasilik in {"Yuksek", "Orta", "Dusuk"} else "Orta"
    return payload


def scenario_to_text(item: object) -> str:
    if not isinstance(item, dict):
        return str(item)
    parts = [
        str(item.get("baslik", "")).strip(),
        f"Olasilik: {str(item.get('olasilik', 'Orta')).strip()}",
        str(item.get("aciklama", "")).strip(),
        f"Aksiyon: {str(item.get('aksiyon', '')).strip()}",
    ]
    return " | ".join([part for part in parts if part and not part.endswith(": ")])


def add_ui_aliases(domain: str, payload: dict[str, object]) -> dict[str, object]:
    result = dict(payload)
    result["risk_analizi"] = result.get("tehdit_analizi", "")
    result["senaryo_analizi"] = [scenario_to_text(item) for item in result.get("senaryolar", [])]
    result["onerilen_aksiyonlar"] = [result["oncelikli_oneri"]] if result.get("oncelikli_oneri") else []
    if domain == "cross":
        result["etki_alanlari"] = [
            f"{DOMAIN_CONFIG[key]['display']}: {value.get('etki', 'orta')} | {value.get('aciklama', '')}"
            for key, value in result.get("alan_etkileri", {}).items()
            if key in DOMAIN_CONFIG and isinstance(value, dict)
        ]
    else:
        result["etki_alanlari"] = [str(result.get("tehdit_analizi", ""))]
    return result


def build_standard_fallback(domain: str, situation: str, reason: str) -> dict[str, object]:
    config = DOMAIN_CONFIG[domain]
    return normalize_result(domain, {
        "ozet": f"{config['display']} icin yedek analiz uretildi. Ana eksen: {situation[:220]}",
        "tehdit_seviyesi": detect_level(situation),
        "tehdit_analizi": f"Bulut model servisi kullanilamadigi icin yedek degerlendirme yapildi. Teknik neden: {reason}.",
        "senaryolar": [
            {"baslik": "Gerilim artar", "olasilik": "Yuksek", "aciklama": "Durum kisa vadede yogunlasabilir.", "aksiyon": "Anlik izleme ve koordinasyon aktif tutulmali."},
            {"baslik": "Kontrollu dengelenme", "olasilik": "Orta", "aciklama": "Dogru tepki ile etki sinirlanabilir.", "aksiyon": "Durum raporlamasi siklastirilmali."},
            {"baslik": "Etki sinirli kalir", "olasilik": "Dusuk", "aciklama": "Tetikleyiciler zayiflarsa tablo yumusayabilir.", "aksiyon": "Yedek planlar hazir tutulmali."},
        ],
        "oncelikli_oneri": config["oneri"],
        "etkilenen_kurumlar": config["kurumlar"],
        "zaman_cercevesi": config["zaman"],
    })


def build_cross_fallback(situation: str, reason: str) -> dict[str, object]:
    config = DOMAIN_CONFIG["cross"]
    level = detect_level(situation)
    impact = "yuksek" if level in {"KRITIK", "YUKSEK"} else "orta"
    return normalize_result("cross", {
        "ozet": f"Capraz alan sentezi yedek modda uretildi. Ana eksen: {situation[:220]}",
        "genel_tehdit_seviyesi": level,
        "alan_etkileri": {
            "savunma": {"etki": impact, "aciklama": "Guvenlik boyutu hizli izlenmeli."},
            "ekonomi": {"etki": "orta", "aciklama": "Beklenti yonetimi etkilenebilir."},
            "enerji": {"etki": "orta", "aciklama": "Kritik altyapi teyidi gereklidir."},
            "toplumsal_olaylar": {"etki": impact, "aciklama": "Toplumsal algi ve saha hareketliligi takip edilmelidir."},
            "dis_politika": {"etki": impact, "aciklama": "Dis anlatilar ve diplomatik denge etkilenebilir."},
        },
        "kritik_baglanti": "Guvenlik, toplumsal algi ve ekonomi ayni zaman diliminde birbirini hizlandirabilir.",
        "tehdit_analizi": f"Bulut model servisi kullanilamadigi icin yedek capraz sentez uretildi. Teknik neden: {reason}.",
        "senaryolar": [
            {"baslik": "Cok alanli baski artar", "olasilik": "Yuksek", "aciklama": "Bir alandaki stres diger alanlara yayilabilir.", "aksiyon": "Tek merkezli koordinasyon kurulmali."},
            {"baslik": "Etki kontrol altina alinir", "olasilik": "Orta", "aciklama": "Es zamanli tepki ile yayilma sinirlanabilir.", "aksiyon": "Kurumlar arasi veri akisi standardize edilmeli."},
            {"baslik": "Etki parcalanir", "olasilik": "Dusuk", "aciklama": "Tetikleyiciler zayiflarsa capraz etki azalabilir.", "aksiyon": "Yedek planlar korunmali."},
        ],
        "oncelikli_oneri": config["oneri"],
        "etkilenen_kurumlar": config["kurumlar"],
        "zaman_cercevesi": config["zaman"],
    })


def build_fallback_result(domain: str, situation: str, reason: str) -> dict[str, object]:
    if domain == "cross":
        return build_cross_fallback(situation, reason)
    return build_standard_fallback(domain, situation, reason)


def save_analysis(domain: str, situation: str, result: dict[str, object], fallback_mode: bool) -> dict[str, object]:
    payload = add_ui_aliases(domain, result)
    analysis_id = "AQ-" + uuid.uuid4().hex[:6].upper()
    stamp = now_text()
    response_payload = {
        "analysis_id": analysis_id,
        "timestamp": stamp,
        "time": stamp,
        "created_at": stamp,
        "summary": payload.get("ozet", ""),
        "fallback_mode": fallback_mode,
        **payload,
    }
    analysis_store[analysis_id] = {
        "id": analysis_id,
        "domain": domain,
        "situation": situation,
        "timestamp": datetime.now().isoformat(),
        "fallback_mode": fallback_mode,
        "result": response_payload,
    }
    return response_payload


def extract_token(request: Request, body: dict[str, object] | None = None) -> str:
    auth = request.headers.get("authorization", "")
    if auth.lower().startswith("bearer "):
        return auth.split(" ", 1)[1].strip()
    header_token = request.headers.get("x-auth-token", "").strip()
    if header_token:
        return header_token
    if body:
        return str(body.get("token", "")).strip()
    return ""


def get_session_from_token(token: str) -> dict[str, str]:
    session = active_sessions.get(token)
    if not session:
        raise HTTPException(401, "Gecersiz oturum.")
    return session


def patch_frontend(html: str) -> str:
    injected = """
<script>
(() => {
  function hotfixCenterPanel() {
    const overlay = document.getElementById("centerOverlay");
    const panel = overlay ? overlay.querySelector(".center-panel") : null;
    const note = document.getElementById("centerNote");
    const statusBox = document.getElementById("centerStatus");
    const loadTrack = document.getElementById("centerLoad");
    const actionButton = document.getElementById("contactCenterBtn");
    const closeButton = document.getElementById("closeCenterBtn");
    if (!overlay || !panel) return;

    const refreshLayout = () => {
      overlay.style.overflowY = "auto";
      overlay.style.alignItems = window.innerWidth <= 900 ? "flex-start" : "center";
      overlay.style.padding = window.innerWidth <= 560 ? "12px" : "24px";
      panel.style.maxHeight = window.innerWidth <= 560 ? "calc(100vh - 24px)" : "min(calc(100vh - 48px), 900px)";
      panel.style.overflowY = "auto";
      panel.style.overscrollBehavior = "contain";
    };

    const clearStatus = () => {
      if (!statusBox) return;
      statusBox.textContent = "";
      statusBox.removeAttribute("data-kind");
    };

    const setStatus = (kind, message) => {
      if (!statusBox) return;
      statusBox.setAttribute("data-kind", kind);
      statusBox.textContent = message;
    };

    const openCenter = () => {
      refreshLayout();
      overlay.classList.add("open");
      overlay.setAttribute("aria-hidden", "false");
      clearStatus();
      requestAnimationFrame(() => {
        if (note) note.focus();
      });
    };

    const closeCenter = () => {
      overlay.classList.remove("open");
      overlay.setAttribute("aria-hidden", "true");
    };

    [
      "centerBtnLogin",
      "centerBtnInline",
      "centerBtnApp",
      "centerBtnSide",
      "centerBtnDash",
      "centerBtnAnalysis"
    ].forEach((id) => {
      const button = document.getElementById(id);
      if (!button || button.dataset.centerHotfix === "1") return;
      button.dataset.centerHotfix = "1";
      button.addEventListener("click", (event) => {
        event.preventDefault();
        openCenter();
      }, true);
    });

    if (closeButton && closeButton.dataset.centerHotfix !== "1") {
      closeButton.dataset.centerHotfix = "1";
      closeButton.addEventListener("click", (event) => {
        event.preventDefault();
        closeCenter();
      }, true);
    }

    if (overlay.dataset.centerOverlayHotfix !== "1") {
      overlay.dataset.centerOverlayHotfix = "1";
      overlay.addEventListener("click", (event) => {
        if (event.target === overlay) closeCenter();
      });
      document.addEventListener("keydown", (event) => {
        if (event.key === "Escape" && overlay.classList.contains("open")) closeCenter();
      });
      window.addEventListener("resize", refreshLayout);
    }

    if (actionButton && actionButton.dataset.centerActionHotfix !== "1") {
      actionButton.dataset.centerActionHotfix = "1";
      actionButton.addEventListener("click", async (event) => {
        event.preventDefault();
        event.stopImmediatePropagation();

        const sessionKeys = ["anatolia_q_session_v4", "anatolia_q_session_v3", "anatolia_q_session_v2", "anatolia_q_session"];
        let token = "";
        for (const key of sessionKeys) {
          try {
            const raw = localStorage.getItem(key);
            if (!raw) continue;
            const parsed = JSON.parse(raw);
            token = parsed.token || parsed.sessionToken || "";
            if (token) break;
          } catch (_) {}
        }

        if (!token && window.state && typeof window.state === "object") {
          token = window.state.sessionToken || "";
        }

        if (!token) {
          setStatus("error", "Once giris yapmaniz gerekiyor.");
          return;
        }

        actionButton.disabled = true;
        if (loadTrack) loadTrack.classList.add("active");
        setStatus("info", "Merkeze bildirim hazirlaniyor...");

        try {
          const response = await fetch("/api/contact-center", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${token}`,
              "X-Auth-Token": token,
            },
            body: JSON.stringify({ token, note: note ? note.value.trim() : "" }),
          });
          const data = await response.json().catch(() => ({}));
          if (!response.ok) {
            throw new Error(data.detail || data.message || `Istek basarisiz (${response.status})`);
          }
          setStatus("success", data.message || "Merkez iletisim talebiniz gonderildi.");
          if (note) note.value = "";
        } catch (error) {
          setStatus("error", error.message || "Merkez bildirimi gonderilemedi.");
        } finally {
          if (loadTrack) loadTrack.classList.remove("active");
          actionButton.disabled = false;
        }
      }, true);
    }

    refreshLayout();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", hotfixCenterPanel);
  } else {
    hotfixCenterPanel();
  }
})();
</script>
"""
    return html.replace("</body>", injected + "\n</body>") if "</body>" in html else html + injected


@app.get("/")
async def root() -> HTMLResponse:
    html_path = os.path.join(os.path.dirname(__file__), "index.html")
    if not os.path.exists(html_path):
        return HTMLResponse("<h1>T.C. ANATOLIA-Q</h1>")
    with open(html_path, "r", encoding="utf-8") as handle:
        return HTMLResponse(patch_frontend(handle.read()))


@app.get("/health")
async def health() -> dict[str, str]:
    return {
        "status": "online",
        "system": "T.C. ANATOLIA-Q",
        "version": "1.4.4",
        "provider": "openai-with-fallback",
    }


@app.post("/api/login")
async def login(data: dict) -> dict[str, str]:
    username = str(data.get("username", "")).strip()
    password = str(data.get("password", ""))
    user = USERS.get(username)

    if not user or user["password"] != password:
        raise HTTPException(401, "Kullanici kodu veya sifre hatali.")
    if not GMAIL_USER or not GMAIL_PASS:
        raise HTTPException(500, "Dogrulama e-posta ayarlari eksik.")

    code = generate_code()
    pending_codes[username] = {"code": code, "expires": datetime.now() + timedelta(minutes=10)}

    try:
        send_2fa_email(user["email"], code, user["name"])
    except Exception as exc:
        raise HTTPException(500, f"E-posta gonderilemedi: {str(exc)}") from exc

    email = user["email"]
    return {
        "message": "Dogrulama kodu gonderildi.",
        "email_hint": email[:3] + "***@" + email.split("@")[-1],
    }


@app.post("/api/verify")
async def verify(data: dict) -> dict[str, str]:
    username = str(data.get("username", "")).strip()
    code = str(data.get("code", "")).strip()
    user = USERS.get(username)

    if not user:
        raise HTTPException(401, "Gecersiz kullanici.")

    pending = pending_codes.get(username)
    if not pending:
        raise HTTPException(401, "Kod bulunamadi. Tekrar giris yapin.")
    if datetime.now() > pending["expires"]:
        del pending_codes[username]
        raise HTTPException(401, "Kodun suresi doldu.")
    if pending["code"] != code:
        raise HTTPException(401, "Hatali dogrulama kodu.")

    del pending_codes[username]
    token = f"aq_{username}_{uuid.uuid4().hex[:16]}"
    active_sessions[token] = {"username": username, "name": user["name"], "role": user["role"]}
    return {
        "token": token,
        "name": user["name"],
        "role": user["role"],
        "username": username,
        "user": username,
    }


@app.post("/api/contact-center")
async def contact_center(request: Request, req: dict) -> dict[str, str]:
    token = extract_token(request, req)
    session = get_session_from_token(token)
    note = str(req.get("note", "")).strip()

    if not GMAIL_USER or not GMAIL_PASS:
        raise HTTPException(500, "Merkez bildirim e-posta ayarlari eksik.")

    try:
        send_center_contact_email(session["name"], session["username"], session["role"], note)
    except Exception as exc:
        raise HTTPException(500, f"Merkez bildirimi gonderilemedi: {str(exc)}") from exc

    return {"message": "Merkez iletisim talebiniz gonderildi."}


@app.post("/api/analyze")
async def analyze(req: dict) -> dict[str, object]:
    domain = str(req.get("domain", ""))
    situation = str(req.get("situation", "")).strip()
    api_key = os.environ.get("OPENAI_API_KEY", str(req.get("api_key", ""))).strip()

    if domain not in DOMAIN_CONFIG:
        raise HTTPException(400, "Gecersiz alan.")
    if not situation:
        raise HTTPException(400, "Durum bildirimi bos.")
    if not api_key:
        return save_analysis(domain, situation, build_fallback_result(domain, situation, "OPENAI_API_KEY eksik"), True)

    schema_config = get_output_schema(domain)
    client = OpenAI(api_key=api_key)
    user_message = (
        f"Durum:\n{situation}\n\n"
        f"Tarih: {now_text()}\n\n"
        f"Alan: {DOMAIN_CONFIG[domain]['display']}\n\n"
        "Kisa, net ve karar destek odakli bir cikti uret."
    )

    try:
        response = client.responses.create(
            model=OPENAI_MODEL,
            input=[
                {"role": "developer", "content": [{"type": "input_text", "text": DOMAIN_CONFIG[domain]["prompt"]}]},
                {"role": "user", "content": [{"type": "input_text", "text": user_message}]},
            ],
            text={
                "format": {
                    "type": "json_schema",
                    "name": schema_config["name"],
                    "strict": True,
                    "schema": schema_config["schema"],
                }
            },
            max_output_tokens=1800,
        )
        raw = (response.output_text or "").strip()
        if not raw:
            raise ValueError("Model bos yanit dondurdu")
        result = normalize_result(domain, json.loads(raw))
        return save_analysis(domain, situation, result, False)
    except openai.AuthenticationError:
        return save_analysis(domain, situation, build_fallback_result(domain, situation, "Gecersiz OpenAI API anahtari"), True)
    except openai.RateLimitError:
        return save_analysis(domain, situation, build_fallback_result(domain, situation, "OpenAI kota veya rate limit siniri"), True)
    except openai.APIConnectionError:
        return save_analysis(domain, situation, build_fallback_result(domain, situation, "OpenAI baglanti hatasi"), True)
    except openai.APIError as exc:
        return save_analysis(domain, situation, build_fallback_result(domain, situation, f"OpenAI API hatasi: {str(exc)}"), True)
    except (json.JSONDecodeError, ValueError) as exc:
        return save_analysis(domain, situation, build_fallback_result(domain, situation, f"Model cikti hatasi: {str(exc)}"), True)
    except Exception as exc:
        return save_analysis(domain, situation, build_fallback_result(domain, situation, f"Beklenmeyen hata: {str(exc)}"), True)


@app.get("/api/history")
async def get_history() -> list[dict[str, object]]:
    items = sorted(analysis_store.values(), key=lambda item: item["timestamp"], reverse=True)
    return [
        {
            "id": item["id"],
            "domain": item["domain"],
            "dom": item["domain"],
            "timestamp": item["result"].get("timestamp", ""),
            "time": item["result"].get("time", ""),
            "summary": str(item["result"].get("ozet", ""))[:130],
            "ozet": str(item["result"].get("ozet", ""))[:130],
            "fallback_mode": item.get("fallback_mode", False),
            "result": item["result"],
        }
        for item in items[:20]
    ]
