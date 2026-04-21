from datetime import datetime, timedelta
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, HTMLResponse

import json
import openai
import os
import random
import smtplib
import string
import uuid
from openai import OpenAI

app = FastAPI(title="ANATOLIA-Q", version="1.1.0")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

DOMAIN_PROMPTS = {
    "savunma": "Sen ANATOLIA-Q Savunma Analiz Modulusun. Turkiye odakli, kisa ama stratejik derinligi olan bir analiz uret. Cevabi sadece istenen JSON semasina uygun doldur.",
    "ekonomi": "Sen ANATOLIA-Q Ekonomi Analiz Modulusun. Turkiye odakli, piyasa ve kurum etkisini ayiran bir analiz uret. Cevabi sadece istenen JSON semasina uygun doldur.",
    "enerji": "Sen ANATOLIA-Q Enerji Analiz Modulusun. Enerji arzi, altyapi guvenligi ve kamu etkisini birlikte degerlendir. Cevabi sadece istenen JSON semasina uygun doldur.",
    "dis_politika": "Sen ANATOLIA-Q Dis Politika Analiz Modulusun. Diplomatik, bolgesel ve uluslararasi etkileri birlikte yorumla. Cevabi sadece istenen JSON semasina uygun doldur.",
    "cross": "Sen ANATOLIA-Q Capraz Alan Sentez Motorusun. Savunma, ekonomi, enerji ve dis politika etkilerini birlikte sentezle. Cevabi sadece istenen JSON semasina uygun doldur."
}

COMMON_ANALYSIS_SCHEMA = {
    "type": "object",
    "additionalProperties": False,
    "properties": {
        "ozet": {"type": "string"},
        "tehdit_seviyesi": {
            "type": "string",
            "enum": ["KRITIK", "YUKSEK", "ORTA", "DUSUK"]
        },
        "tehdit_analizi": {"type": "string"},
        "senaryolar": {
            "type": "array",
            "minItems": 3,
            "items": {
                "type": "object",
                "additionalProperties": False,
                "properties": {
                    "baslik": {"type": "string"},
                    "olasilik": {
                        "type": "string",
                        "enum": ["Yuksek", "Orta", "Dusuk"]
                    },
                    "aciklama": {"type": "string"},
                    "aksiyon": {"type": "string"}
                },
                "required": ["baslik", "olasilik", "aciklama", "aksiyon"]
            }
        },
        "oncelikli_oneri": {"type": "string"},
        "etkilenen_kurumlar": {
            "type": "array",
            "items": {"type": "string"}
        },
        "zaman_cercevesi": {"type": "string"}
    },
    "required": [
        "ozet",
        "tehdit_seviyesi",
        "tehdit_analizi",
        "senaryolar",
        "oncelikli_oneri",
        "etkilenen_kurumlar",
        "zaman_cercevesi"
    ]
}

CROSS_ANALYSIS_SCHEMA = {
    "type": "object",
    "additionalProperties": False,
    "properties": {
        "ozet": {"type": "string"},
        "genel_tehdit_seviyesi": {
            "type": "string",
            "enum": ["KRITIK", "YUKSEK", "ORTA", "DUSUK"]
        },
        "alan_etkileri": {
            "type": "object",
            "additionalProperties": False,
            "properties": {
                "savunma": {
                    "type": "object",
                    "additionalProperties": False,
                    "properties": {
                        "etki": {"type": "string", "enum": ["yuksek", "orta", "dusuk"]},
                        "aciklama": {"type": "string"}
                    },
                    "required": ["etki", "aciklama"]
                },
                "ekonomi": {
                    "type": "object",
                    "additionalProperties": False,
                    "properties": {
                        "etki": {"type": "string", "enum": ["yuksek", "orta", "dusuk"]},
                        "aciklama": {"type": "string"}
                    },
                    "required": ["etki", "aciklama"]
                },
                "enerji": {
                    "type": "object",
                    "additionalProperties": False,
                    "properties": {
                        "etki": {"type": "string", "enum": ["yuksek", "orta", "dusuk"]},
                        "aciklama": {"type": "string"}
                    },
                    "required": ["etki", "aciklama"]
                },
                "dis_politika": {
                    "type": "object",
                    "additionalProperties": False,
                    "properties": {
                        "etki": {"type": "string", "enum": ["yuksek", "orta", "dusuk"]},
                        "aciklama": {"type": "string"}
                    },
                    "required": ["etki", "aciklama"]
                }
            },
            "required": ["savunma", "ekonomi", "enerji", "dis_politika"]
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
                    "olasilik": {
                        "type": "string",
                        "enum": ["Yuksek", "Orta", "Dusuk"]
                    },
                    "aciklama": {"type": "string"},
                    "aksiyon": {"type": "string"}
                },
                "required": ["baslik", "olasilik", "aciklama", "aksiyon"]
            }
        },
        "oncelikli_oneri": {"type": "string"},
        "etkilenen_kurumlar": {
            "type": "array",
            "items": {"type": "string"}
        },
        "zaman_cercevesi": {"type": "string"}
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
        "zaman_cercevesi"
    ]
}

USERS = {
    "admin": {
        "password": "Bold2026!",
        "email": os.environ.get("ADMIN_EMAIL", "info@boldkimya.com.tr"),
        "name": "Yonetici",
        "role": "admin"
    }
}

pending_codes = {}
active_sessions = {}
analysis_store = {}
GMAIL_USER = os.environ.get("GMAIL_USER", "")
GMAIL_PASS = os.environ.get("GMAIL_APP_PASSWORD", "")
OPENAI_MODEL = os.environ.get("OPENAI_MODEL", "gpt-4o-mini")


def generate_code():
    return "".join(random.choices(string.digits, k=6))


def send_2fa_email(to_email, code, name):
    msg = MIMEMultipart("alternative")
    msg["Subject"] = f"ANATOLIA-Q Dogrulama Kodu: {code}"
    msg["From"] = GMAIL_USER
    msg["To"] = to_email
    html = f"""<html><body style="font-family:Arial,sans-serif;background:#0a0e1a;padding:40px">
    <div style="max-width:480px;margin:0 auto;background:#0d1321;border:1px solid #1e3a5f;padding:32px">
      <div style="font-family:monospace;font-size:22px;font-weight:900;letter-spacing:6px;color:#00b4d8;margin-bottom:4px">ANATOLIA-Q</div>
      <div style="font-size:11px;color:#3d5a78;letter-spacing:2px;margin-bottom:24px">ULUSAL KARAR DESTEK SISTEMI</div>
      <p style="color:#8aa5c0">Sayin <b style="color:#e2e8f0">{name}</b>, giris dogrulama kodunuz:</p>
      <div style="background:#111827;border:2px solid #00b4d8;padding:20px;text-align:center;margin:20px 0">
        <div style="font-family:monospace;font-size:40px;font-weight:900;letter-spacing:10px;color:#00b4d8">{code}</div>
        <div style="font-size:12px;color:#3d5a78;margin-top:8px">10 dakika gecerlidir</div>
      </div>
      <p style="font-size:12px;color:#3d5a78">Bu kodu siz talep etmediyseniz guvenlik biriminizi bilgilendirin.<br><br>BOLD Askeri Teknoloji ve Savunma Sanayi A.S.</p>
    </div></body></html>"""
    msg.attach(MIMEText(html, "html"))
    with smtplib.SMTP_SSL("smtp.gmail.com", 465) as server:
        server.login(GMAIL_USER, GMAIL_PASS)
        server.sendmail(GMAIL_USER, to_email, msg.as_string())


def get_output_schema(domain):
    if domain == "cross":
        return {
            "name": "anatolia_q_cross_analysis",
            "schema": CROSS_ANALYSIS_SCHEMA,
        }
    return {
        "name": "anatolia_q_standard_analysis",
        "schema": COMMON_ANALYSIS_SCHEMA,
    }


def normalize_result(domain, result):
    threat_map = {
        "KRITIK": "KRİTİK",
        "YUKSEK": "YÜKSEK",
        "ORTA": "ORTA",
        "DUSUK": "DÜŞÜK",
    }
    probability_map = {
        "Yuksek": "Yüksek",
        "Orta": "Orta",
        "Dusuk": "Düşük",
    }
    impact_map = {
        "yuksek": "yüksek",
        "orta": "orta",
        "dusuk": "düşük",
    }

    if domain == "cross":
        result["genel_tehdit_seviyesi"] = threat_map.get(result.get("genel_tehdit_seviyesi", ""), result.get("genel_tehdit_seviyesi", "ORTA"))
        for info in result.get("alan_etkileri", {}).values():
            info["etki"] = impact_map.get(info.get("etki", ""), info.get("etki", "orta"))
    else:
        result["tehdit_seviyesi"] = threat_map.get(result.get("tehdit_seviyesi", ""), result.get("tehdit_seviyesi", "ORTA"))

    for scenario in result.get("senaryolar", []):
        scenario["olasilik"] = probability_map.get(scenario.get("olasilik", ""), scenario.get("olasilik", "Orta"))

    return result


@app.get("/")
async def root():
    html_path = os.path.join(os.path.dirname(__file__), "index.html")
    if os.path.exists(html_path):
        return FileResponse(html_path)
    return HTMLResponse("<h1>ANATOLIA-Q</h1>")


@app.get("/health")
async def health():
    return {"status": "online", "system": "ANATOLIA-Q", "version": "1.1.0", "provider": "openai"}


@app.post("/api/login")
async def login(data: dict):
    username = data.get("username", "").strip()
    password = data.get("password", "")
    user = USERS.get(username)
    if not user or user["password"] != password:
        raise HTTPException(401, "Kullanıcı adı veya şifre hatalı.")

    code = generate_code()
    pending_codes[username] = {"code": code, "expires": datetime.now() + timedelta(minutes=10)}

    try:
        send_2fa_email(user["email"], code, user["name"])
    except Exception as exc:
        raise HTTPException(500, f"E-posta gönderilemedi: {str(exc)}")

    email = user["email"]
    return {
        "message": "Doğrulama kodu gönderildi.",
        "email_hint": email[:3] + "***@" + email.split("@")[1],
    }


@app.post("/api/verify")
async def verify(data: dict):
    username = data.get("username", "").strip()
    code = data.get("code", "").strip()
    user = USERS.get(username)

    if not user:
        raise HTTPException(401, "Geçersiz kullanıcı.")

    pending = pending_codes.get(username)
    if not pending:
        raise HTTPException(401, "Kod bulunamadı. Tekrar giriş yapın.")

    if datetime.now() > pending["expires"]:
        del pending_codes[username]
        raise HTTPException(401, "Kodun süresi doldu.")

    if pending["code"] != code:
        raise HTTPException(401, "Hatalı doğrulama kodu.")

    del pending_codes[username]
    token = f"aq_{username}_{uuid.uuid4().hex[:16]}"
    active_sessions[token] = {"username": username, "name": user["name"], "role": user["role"]}
    return {"token": token, "name": user["name"], "role": user["role"]}


@app.post("/api/analyze")
async def analyze(req: dict):
    domain = req.get("domain", "")
    situation = req.get("situation", "")
    api_key = os.environ.get("OPENAI_API_KEY", req.get("api_key", ""))

    if domain not in DOMAIN_PROMPTS:
        raise HTTPException(400, "Geçersiz alan.")
    if not situation:
        raise HTTPException(400, "Durum bildirimi boş.")
    if not api_key:
        raise HTTPException(400, "OPENAI_API_KEY eksik.")

    schema_config = get_output_schema(domain)
    client = OpenAI(api_key=api_key)
    user_msg = (
        f"Durum:\n{situation}\n\n"
        f"Tarih: {datetime.now().strftime('%d.%m.%Y %H:%M')}\n\n"
        "Kisa, net ve kurumsal bir analiz uret."
    )

    try:
        response = client.responses.create(
            model=OPENAI_MODEL,
            input=[
                {
                    "role": "developer",
                    "content": [{"type": "input_text", "text": DOMAIN_PROMPTS[domain]}],
                },
                {
                    "role": "user",
                    "content": [{"type": "input_text", "text": user_msg}],
                },
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
            raise HTTPException(500, "Model boş yanıt döndürdü.")

        result = normalize_result(domain, json.loads(raw))
        aid = "AQ-" + uuid.uuid4().hex[:6].upper()
        analysis_store[aid] = {
            "id": aid,
            "domain": domain,
            "situation": situation,
            "result": result,
            "timestamp": datetime.now().isoformat(),
        }
        return {
            "analysis_id": aid,
            "timestamp": datetime.now().strftime("%d.%m.%Y %H:%M"),
            **result,
        }
    except openai.AuthenticationError:
        raise HTTPException(401, "Geçersiz OpenAI API anahtarı.")
    except openai.RateLimitError:
        raise HTTPException(429, "OpenAI kota veya rate limit sınırına ulaşıldı.")
    except openai.APIConnectionError:
        raise HTTPException(502, "OpenAI servisine bağlanılamadı.")
    except openai.APIError as exc:
        raise HTTPException(502, f"OpenAI API hatası: {str(exc)}")
    except json.JSONDecodeError:
        raise HTTPException(500, "Model çıktısı JSON olarak işlenemedi.")
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(500, str(exc))


@app.get("/api/history")
async def get_history():
    items = sorted(analysis_store.values(), key=lambda item: item["timestamp"], reverse=True)
    return [
        {
            "id": item["id"],
            "domain": item["domain"],
            "timestamp": item["timestamp"][:16],
            "ozet": item["result"].get("ozet", "")[:80],
        }
        for item in items[:20]
    ]
