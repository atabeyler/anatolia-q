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

app = FastAPI(title="ANATOLIA-Q", version="1.2.0")
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
                    "olasilik": {"type": "string", "enum": ["Yuksek", "Orta", "Dusuk"]},
                    "aciklama": {"type": "string"},
                    "aksiyon": {"type": "string"}
                },
                "required": ["baslik", "olasilik", "aciklama", "aksiyon"]
            }
        },
        "oncelikli_oneri": {"type": "string"},
        "etkilenen_kurumlar": {"type": "array", "items": {"type": "string"}},
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
                    "olasilik": {"type": "string", "enum": ["Yuksek", "Orta", "Dusuk"]},
                    "aciklama": {"type": "string"},
                    "aksiyon": {"type": "string"}
                },
                "required": ["baslik", "olasilik", "aciklama", "aksiyon"]
            }
        },
        "oncelikli_oneri": {"type": "string"},
        "etkilenen_kurumlar": {"type": "array", "items": {"type": "string"}},
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

DOMAIN_DEFAULTS = {
    "savunma": {
        "kurumlar": ["MSB", "TSK", "MIT"],
        "zaman": "Acil (0-48 saat)",
        "oneri": "Saha farkindaligi ve kurumlar arasi koordinasyon derhal artirilmalidir.",
    },
    "ekonomi": {
        "kurumlar": ["Hazine ve Maliye Bakanligi", "TCMB", "BDDK"],
        "zaman": "Kisa (1-2 hafta)",
        "oneri": "Piyasa guveni ve likidite yonetimi icin hizli bir koordinasyon paketi aciklanmalidir.",
    },
    "enerji": {
        "kurumlar": ["Enerji ve Tabii Kaynaklar Bakanligi", "EPDK", "BOTAS"],
        "zaman": "Kisa-Orta (1-4 hafta)",
        "oneri": "Kritik altyapi korumasi ve arz surekliligi icin teknik teyit ve kriz masasi devreye alinmalidir.",
    },
    "dis_politika": {
        "kurumlar": ["Disisleri Bakanligi", "Cumhurbaskanligi", "MIT"],
        "zaman": "Acil (0-72 saat)",
        "oneri": "Diplomatik temaslar hizlandirilmali ve dis kamuoyu anlatisi tek merkezden yonetilmelidir.",
    },
    "cross": {
        "kurumlar": ["Cumhurbaskanligi", "MSB", "Disisleri Bakanligi", "Hazine ve Maliye Bakanligi"],
        "zaman": "Acil (0-72 saat)",
        "oneri": "Tek merkezli koordinasyon yapisi kurularak alanlar arasi etkiler es zamanli izlenmelidir.",
    },
}


LEVEL_KEYWORDS = {
    "KRITIK": ["saldiri", "kriz", "coklu", "seferber", "catisma", "patlama"],
    "YUKSEK": ["baski", "tehdit", "kesinti", "ihlal", "karistirma", "siber", "iha"],
    "ORTA": ["gerilim", "oynaklik", "risk", "hassas", "uyari"],
}


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


def detect_level(situation):
    text = situation.lower()
    for level, words in LEVEL_KEYWORDS.items():
        if any(word in text for word in words):
            return level
    return "ORTA"


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


def build_standard_fallback(domain, situation, reason):
    defaults = DOMAIN_DEFAULTS[domain]
    level = detect_level(situation)
    return normalize_result(domain, {
        "ozet": f"Bu analiz yerel yedek modda uretildi. {DOMAIN_PROMPTS[domain].split('.')[0]}. Durumun ana ekseni: {situation[:220]}",
        "tehdit_seviyesi": level,
        "tehdit_analizi": f"Bulut model servisi gecici olarak kullanilamadigi icin kural tabanli degerlendirme yapildi. Tespit edilen ana risk, durumun hizli kurumsal koordinasyon gerektirmesi ve belirsizligin buyume potansiyelidir. Teknik neden: {reason}",
        "senaryolar": [
            {
                "baslik": "Kisa vadede gerilimin artmasi",
                "olasilik": "Yuksek",
                "aciklama": "Mevcut gostergeler olay akisinin kisa vadede yogunlasabilecegini isaret ediyor.",
                "aksiyon": "Anlik izleme ve ust duzey koordinasyon mekanizmasi aktif tutulmali."
            },
            {
                "baslik": "Kontrollu dengelenme",
                "olasilik": "Orta",
                "aciklama": "Dogru kurumsal tepkiyle etkinin belirli bir esikte tutulmasi mumkun gorunuyor.",
                "aksiyon": "Durum raporlamasi standardize edilmeli ve karar ritmi siklastirilmali."
            },
            {
                "baslik": "Etkisinin sinirli kalmasi",
                "olasilik": "Dusuk",
                "aciklama": "Tetikleyici unsurlar zayiflarsa olaylar beklendigi kadar buyumeyebilir.",
                "aksiyon": "Dusuk olasilikli ama yuksek etkili ihtimaller icin yedek plan hazir tutulmali."
            }
        ],
        "oncelikli_oneri": defaults["oneri"],
        "etkilenen_kurumlar": defaults["kurumlar"],
        "zaman_cercevesi": defaults["zaman"],
    })


def build_cross_fallback(situation, reason):
    defaults = DOMAIN_DEFAULTS["cross"]
    level = detect_level(situation)
    impact = "yuksek" if level in {"KRITIK", "YUKSEK"} else "orta"
    return normalize_result("cross", {
        "ozet": f"Bu analiz yerel yedek modda capraz alan sentezi olarak uretildi. Durum girdisi birden fazla kurumsal ve sektorel etki ihtimali tasiyor: {situation[:220]}",
        "genel_tehdit_seviyesi": level,
        "alan_etkileri": {
            "savunma": {"etki": impact, "aciklama": "Guvenlik ve caydiricilik boyutunda hizli izleme ihtiyaci dogabilir."},
            "ekonomi": {"etki": "orta", "aciklama": "Piyasa algisi ve beklenti yonetimi etkilenebilir."},
            "enerji": {"etki": "orta", "aciklama": "Kritik altyapi ve operasyonel sureklilik teyit edilmelidir."},
            "dis_politika": {"etki": impact, "aciklama": "Uluslararasi mesajlasma ve diplomatik denge boyutu dogabilir."}
        },
        "kritik_baglanti": "Guvenlik, ekonomi ve diplomatik anlatilarin ayni zaman diliminde etkilesime girmesi durumun carpani olabilir.",
        "tehdit_analizi": f"Bulut model servisi gecici olarak kullanilamadigi icin capraz alanli kural tabanli sentez uretildi. Temel risk, farkli kurum ve alanlardaki etkilerin birbirini hizlandirmasidir. Teknik neden: {reason}",
        "senaryolar": [
            {
                "baslik": "Cok alanli baski derinlesir",
                "olasilik": "Yuksek",
                "aciklama": "Bir alandaki stres diger alanlara hizli sekilde yayilabilir.",
                "aksiyon": "Tek merkezli kriz koordinasyonu devreye alinmali."
            },
            {
                "baslik": "Alanlar arasi etki kontrol altina alinir",
                "olasilik": "Orta",
                "aciklama": "Es zamanli kurum tepkisi ile yayilma sinirlanabilir.",
                "aksiyon": "Kurumlar arasi veri akisi standartlastirilmali."
            },
            {
                "baslik": "Etkiler parcali ve sinirli kalir",
                "olasilik": "Dusuk",
                "aciklama": "Tetikleyiciler beklenenden zayif kalirsa capraz etki daralabilir.",
                "aksiyon": "Yedek planlar korunurken normal operasyon ritmi izlenmeli."
            }
        ],
        "oncelikli_oneri": defaults["oneri"],
        "etkilenen_kurumlar": defaults["kurumlar"],
        "zaman_cercevesi": defaults["zaman"],
    })


def build_fallback_result(domain, situation, reason):
    if domain == "cross":
        return build_cross_fallback(situation, reason)
    return build_standard_fallback(domain, situation, reason)


def save_analysis(domain, situation, result, fallback_mode=False):
    aid = "AQ-" + uuid.uuid4().hex[:6].upper()
    analysis_store[aid] = {
        "id": aid,
        "domain": domain,
        "situation": situation,
        "result": result,
        "timestamp": datetime.now().isoformat(),
        "fallback_mode": fallback_mode,
    }
    return {
        "analysis_id": aid,
        "timestamp": datetime.now().strftime("%d.%m.%Y %H:%M"),
        "fallback_mode": fallback_mode,
        **result,
    }


@app.get("/")
async def root():
    html_path = os.path.join(os.path.dirname(__file__), "index.html")
    if os.path.exists(html_path):
        return FileResponse(html_path)
    return HTMLResponse("<h1>ANATOLIA-Q</h1>")


@app.get("/health")
async def health():
    return {"status": "online", "system": "ANATOLIA-Q", "version": "1.2.0", "provider": "openai-with-fallback"}


@app.post("/api/login")
async def login(data: dict):
    username = data.get("username", "").strip()
    password = data.get("password", "")
    user = USERS.get(username)
    if not user or user["password"] != password:
        raise HTTPException(401, "Kullanici adi veya sifre hatali.")

    code = generate_code()
    pending_codes[username] = {"code": code, "expires": datetime.now() + timedelta(minutes=10)}

    try:
        send_2fa_email(user["email"], code, user["name"])
    except Exception as exc:
        raise HTTPException(500, f"E-posta gonderilemedi: {str(exc)}")

    email = user["email"]
    return {
        "message": "Dogrulama kodu gonderildi.",
        "email_hint": email[:3] + "***@" + email.split("@")[1],
    }


@app.post("/api/verify")
async def verify(data: dict):
    username = data.get("username", "").strip()
    code = data.get("code", "").strip()
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
    return {"token": token, "name": user["name"], "role": user["role"]}


@app.post("/api/analyze")
async def analyze(req: dict):
    domain = req.get("domain", "")
    situation = req.get("situation", "")
    api_key = os.environ.get("OPENAI_API_KEY", req.get("api_key", ""))

    if domain not in DOMAIN_PROMPTS:
        raise HTTPException(400, "Gecersiz alan.")
    if not situation:
        raise HTTPException(400, "Durum bildirimi bos.")

    if not api_key:
        fallback_result = build_fallback_result(domain, situation, "OPENAI_API_KEY eksik")
        return save_analysis(domain, situation, fallback_result, fallback_mode=True)

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
            raise ValueError("Model bos yanit dondurdu")

        result = normalize_result(domain, json.loads(raw))
        return save_analysis(domain, situation, result, fallback_mode=False)
    except openai.AuthenticationError:
        fallback_result = build_fallback_result(domain, situation, "Gecersiz OpenAI API anahtari")
        return save_analysis(domain, situation, fallback_result, fallback_mode=True)
    except openai.RateLimitError:
        fallback_result = build_fallback_result(domain, situation, "OpenAI kota veya rate limit siniri")
        return save_analysis(domain, situation, fallback_result, fallback_mode=True)
    except openai.APIConnectionError:
        fallback_result = build_fallback_result(domain, situation, "OpenAI baglanti hatasi")
        return save_analysis(domain, situation, fallback_result, fallback_mode=True)
    except openai.APIError as exc:
        fallback_result = build_fallback_result(domain, situation, f"OpenAI API hatasi: {str(exc)}")
        return save_analysis(domain, situation, fallback_result, fallback_mode=True)
    except (json.JSONDecodeError, ValueError) as exc:
        fallback_result = build_fallback_result(domain, situation, f"Model cikti hatasi: {str(exc)}")
        return save_analysis(domain, situation, fallback_mode=True, result=fallback_result)
    except Exception as exc:
        fallback_result = build_fallback_result(domain, situation, f"Beklenmeyen hata: {str(exc)}")
        return save_analysis(domain, situation, fallback_result, fallback_mode=True)


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
