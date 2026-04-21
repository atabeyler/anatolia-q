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

app = FastAPI(title="T.C. ANATOLIA-Q", version="1.3.0")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

PRIMARY_EMAIL = os.environ.get("ADMIN_EMAIL", "info@boldkimya.com.tr")
OPENAI_MODEL = os.environ.get("OPENAI_MODEL", "gpt-4o-mini")
GMAIL_USER = os.environ.get("GMAIL_USER", "")
GMAIL_PASS = os.environ.get("GMAIL_APP_PASSWORD", "")

DOMAIN_CONFIG = {
    "savunma": {
        "display": "Savunma",
        "prompt": "Sen T.C. ANATOLIA-Q Savunma Analiz Modulusun. Turkiye odakli, net, kurumsal ve stratejik derinligi olan bir analiz uret. Cevabi sadece istenen JSON semasina uygun doldur.",
        "kurumlar": ["MSB", "TSK", "MIT"],
        "zaman": "Acil (0-48 saat)",
        "oneri": "Saha farkindaligi ve kurumlar arasi koordinasyon derhal artirilmalidir.",
    },
    "ekonomi": {
        "display": "Ekonomi",
        "prompt": "Sen T.C. ANATOLIA-Q Ekonomi Analiz Modulusun. Turkiye odakli, piyasa, kurum ve algi boyutlarini ayiran bir analiz uret. Cevabi sadece istenen JSON semasina uygun doldur.",
        "kurumlar": ["Hazine ve Maliye Bakanligi", "TCMB", "BDDK"],
        "zaman": "Kisa (1-2 hafta)",
        "oneri": "Piyasa guveni ve likidite yonetimi icin hizli bir koordinasyon paketi aciklanmalidir.",
    },
    "enerji": {
        "display": "Enerji",
        "prompt": "Sen T.C. ANATOLIA-Q Enerji Analiz Modulusun. Enerji arzi, altyapi guvenligi ve kamu etkisini birlikte degerlendir. Cevabi sadece istenen JSON semasina uygun doldur.",
        "kurumlar": ["Enerji ve Tabii Kaynaklar Bakanligi", "EPDK", "BOTAS"],
        "zaman": "Kisa-Orta (1-4 hafta)",
        "oneri": "Kritik altyapi korumasi ve arz surekliligi icin teknik teyit ve kriz masasi devreye alinmalidir.",
    },
    "dis_politika": {
        "display": "Dis Politika",
        "prompt": "Sen T.C. ANATOLIA-Q Dis Politika Analiz Modulusun. Diplomatik, bolgesel ve uluslararasi etkileri birlikte yorumla. Cevabi sadece istenen JSON semasina uygun doldur.",
        "kurumlar": ["Disisleri Bakanligi", "Cumhurbaskanligi", "MIT"],
        "zaman": "Acil (0-72 saat)",
        "oneri": "Diplomatik temaslar hizlandirilmali ve dis kamuoyu anlatisi tek merkezden yonetilmelidir.",
    },
    "toplumsal_olaylar": {
        "display": "Toplumsal Olaylar",
        "prompt": "Sen T.C. ANATOLIA-Q Toplumsal Olaylar Modulusun. Sahadaki toplumsal hareketlilik, kamu duzeni, algi ve koordinasyon boyutlarini birlikte yorumla. Cevabi sadece istenen JSON semasina uygun doldur.",
        "kurumlar": ["Icislieri Bakanligi", "Emniyet Genel Mudurlugu", "Valilikler"],
        "zaman": "Acil (0-72 saat)",
        "oneri": "Sahadaki toplumsal dinamikler erken fazda izlenmeli ve kurumlar arasi bilgi akisi tek elde toplanmalidir.",
    },
    "genel_chat": {
        "display": "Genel Chat",
        "prompt": "Sen T.C. ANATOLIA-Q Genel Chat ve Stratejik Danisma Modulusun. Kullanici girdisini daha serbest ama yine kurumsal disiplinle yorumla. Cevabi sadece istenen JSON semasina uygun doldur.",
        "kurumlar": ["Cumhurbaskanligi", "Strateji Birimi", "Merkez Koordinasyon"],
        "zaman": "Degisken (duruma gore)",
        "oneri": "Karar vericilere sunulacak ana mesajlar netlestirilmeli ve belirsizlikler acik sekilde ayrismalidir.",
    },
    "cross": {
        "display": "Capraz Sentez",
        "prompt": "Sen T.C. ANATOLIA-Q Capraz Alan Sentez Motorusun. Savunma, ekonomi, enerji, toplumsal olaylar ve dis politika etkilerini birlikte sentezle. Cevabi sadece istenen JSON semasina uygun doldur.",
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
                "toplumsal_olaylar": {
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
            "required": ["savunma", "ekonomi", "enerji", "toplumsal_olaylar", "dis_politika"]
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
    "admin": {"password": "Bold2026!", "email": PRIMARY_EMAIL, "name": "Merkez Yonetici", "role": "admin"},
    "merkez.operasyon": {"password": "Merkez2026!", "email": PRIMARY_EMAIL, "name": "Merkez Operasyon", "role": "operator"},
    "strateji.birim": {"password": "Strateji2026!", "email": PRIMARY_EMAIL, "name": "Strateji Birimi", "role": "analyst"},
    "enerji.masasi": {"password": "Enerji2026!", "email": PRIMARY_EMAIL, "name": "Enerji Masasi", "role": "analyst"},
    "analiz.operator": {"password": "Analiz2026!", "email": PRIMARY_EMAIL, "name": "Analiz Operatoru", "role": "operator"},
}

LEVEL_KEYWORDS = {
    "KRITIK": ["saldiri", "kriz", "coklu", "seferber", "catisma", "patlama", "yaygin"],
    "YUKSEK": ["baski", "tehdit", "kesinti", "ihlal", "karistirma", "siber", "iha", "protesto"],
    "ORTA": ["gerilim", "oynaklik", "risk", "hassas", "uyari"],
}

pending_codes = {}
active_sessions = {}
analysis_store = {}


def generate_code():
    return "".join(random.choices(string.digits, k=6))


def send_2fa_email(to_email, code, name):
    msg = MIMEMultipart("alternative")
    msg["Subject"] = f"T.C. ANATOLIA-Q Dogrulama Kodu: {code}"
    msg["From"] = GMAIL_USER
    msg["To"] = to_email
    html = f"""<html><body style="font-family:Arial,sans-serif;background:#07111e;padding:40px">
    <div style="max-width:520px;margin:0 auto;background:#0c1727;border:1px solid #2b8df0;padding:34px;border-radius:20px">
      <div style="font-family:monospace;font-size:24px;font-weight:900;letter-spacing:5px;color:#7ed1ff;margin-bottom:4px">T.C. ANATOLIA-Q</div>
      <div style="font-size:11px;color:#59728d;letter-spacing:2px;margin-bottom:24px">ULUSAL KARAR DESTEK SISTEMI</div>
      <p style="color:#b8cce0">Sayin <b style="color:#ffffff">{name}</b>, giris dogrulama kodunuz:</p>
      <div style="background:#09111d;border:2px solid #7ed1ff;padding:22px;text-align:center;margin:20px 0;border-radius:16px">
        <div style="font-family:monospace;font-size:42px;font-weight:900;letter-spacing:10px;color:#7ed1ff">{code}</div>
        <div style="font-size:12px;color:#6a86a3;margin-top:8px">10 dakika gecerlidir</div>
      </div>
      <p style="font-size:12px;color:#6a86a3">Bu kodu siz talep etmediyseniz merkez yonetimini bilgilendirin.<br><br>Bold Askeri Teknoloji ve Savunma Sanayi A.S.</p>
    </div></body></html>"""
    msg.attach(MIMEText(html, "html"))
    with smtplib.SMTP_SSL("smtp.gmail.com", 465) as server:
        server.login(GMAIL_USER, GMAIL_PASS)
        server.sendmail(GMAIL_USER, to_email, msg.as_string())


def get_output_schema(domain):
    if domain == "cross":
        return {"name": "anatolia_q_cross_analysis", "schema": CROSS_SCHEMA}
    return {"name": "anatolia_q_standard_analysis", "schema": STANDARD_SCHEMA}


def detect_level(situation):
    lowered = situation.lower()
    for level, words in LEVEL_KEYWORDS.items():
        if any(word in lowered for word in words):
            return level
    return "ORTA"


def normalize_result(domain, result):
    threat_map = {
        "KRITIK": "KRİTİK",
        "YUKSEK": "YÜKSEK",
        "ORTA": "ORTA",
        "DUSUK": "DÜŞÜK",
    }
    probability_map = {"Yuksek": "Yüksek", "Orta": "Orta", "Dusuk": "Düşük"}
    impact_map = {"yuksek": "yüksek", "orta": "orta", "dusuk": "düşük"}

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
    config = DOMAIN_CONFIG[domain]
    level = detect_level(situation)
    return normalize_result(domain, {
        "ozet": f"{config['display']} icin yerel yedek analiz uretildi. Girdinin ana ekseni: {situation[:220]}",
        "tehdit_seviyesi": level,
        "tehdit_analizi": f"Bulut model servisi gecici olarak kullanilamadigi icin kural tabanli degerlendirme yapildi. Teknik neden: {reason}. Mevcut tablo hizli kurumsal koordinasyon ihtiyacina isaret ediyor.",
        "senaryolar": [
            {"baslik": "Gerilimin kisa vadede artmasi", "olasilik": "Yuksek", "aciklama": "Mevcut isaretler olay akisinin kisa vadede yogunlasabilecegini gosteriyor.", "aksiyon": "Anlik izleme ve ust duzey koordinasyon mekanizmasi aktif tutulmali."},
            {"baslik": "Kontrollu dengelenme", "olasilik": "Orta", "aciklama": "Dogru kurumsal tepkiyle etkinin belirli bir esikte tutulmasi mumkun olabilir.", "aksiyon": "Durum raporlamasi standartlastirilmali ve karar ritmi siklastirilmali."},
            {"baslik": "Etkisinin sinirli kalmasi", "olasilik": "Dusuk", "aciklama": "Tetikleyici unsurlar zayiflarsa olaylar beklenenden daha sinirli kalabilir.", "aksiyon": "Dusuk olasilikli ama yuksek etkili ihtimaller icin yedek plan hazir tutulmali."},
        ],
        "oncelikli_oneri": config["oneri"],
        "etkilenen_kurumlar": config["kurumlar"],
        "zaman_cercevesi": config["zaman"],
    })


def build_cross_fallback(situation, reason):
    config = DOMAIN_CONFIG["cross"]
    level = detect_level(situation)
    impact = "yuksek" if level in {"KRITIK", "YUKSEK"} else "orta"
    return normalize_result("cross", {
        "ozet": f"Capraz alan sentezi yerel yedek modda uretildi. Girdi birden fazla kurumsal ve sektorel etki olasiligi tasiyor: {situation[:220]}",
        "genel_tehdit_seviyesi": level,
        "alan_etkileri": {
            "savunma": {"etki": impact, "aciklama": "Guvenlik ve caydiricilik boyutunda hizli izleme ihtiyaci dogabilir."},
            "ekonomi": {"etki": "orta", "aciklama": "Piyasa algisi ve beklenti yonetimi etkilenebilir."},
            "enerji": {"etki": "orta", "aciklama": "Kritik altyapi ve operasyonel sureklilik teyit edilmelidir."},
            "toplumsal_olaylar": {"etki": impact, "aciklama": "Toplumsal algi, meydan hareketliligi ve kamu duzeni boyutu takip edilmelidir."},
            "dis_politika": {"etki": impact, "aciklama": "Uluslararasi mesajlasma ve diplomatik denge boyutu dogabilir."},
        },
        "kritik_baglanti": "Guvenlik, toplumsal algi, ekonomi ve diplomatik anlatilar ayni zaman diliminde birbirini hizlandirabilir.",
        "tehdit_analizi": f"Bulut model servisi gecici olarak kullanilamadigi icin capraz alanli kural tabanli sentez uretildi. Teknik neden: {reason}. Temel risk, farkli alanlardaki etkinin birbirini buyutmesidir.",
        "senaryolar": [
            {"baslik": "Cok alanli baski derinlesir", "olasilik": "Yuksek", "aciklama": "Bir alandaki stres diger alanlara hizli sekilde yayilabilir.", "aksiyon": "Tek merkezli kriz koordinasyonu devreye alinmali."},
            {"baslik": "Alanlar arasi etki kontrol altina alinir", "olasilik": "Orta", "aciklama": "Es zamanli kurum tepkisi ile yayilma sinirlanabilir.", "aksiyon": "Kurumlar arasi veri akisi standartlastirilmali."},
            {"baslik": "Etkiler parcali ve sinirli kalir", "olasilik": "Dusuk", "aciklama": "Tetikleyiciler beklenenden zayif kalirsa capraz etki daralabilir.", "aksiyon": "Yedek planlar korunurken normal operasyon ritmi izlenmeli."},
        ],
        "oncelikli_oneri": config["oneri"],
        "etkilenen_kurumlar": config["kurumlar"],
        "zaman_cercevesi": config["zaman"],
    })


def build_fallback_result(domain, situation, reason):
    if domain == "cross":
        return build_cross_fallback(situation, reason)
    return build_standard_fallback(domain, situation, reason)


def save_analysis(domain, situation, result, fallback_mode=False):
    analysis_id = "AQ-" + uuid.uuid4().hex[:6].upper()
    analysis_store[analysis_id] = {
        "id": analysis_id,
        "domain": domain,
        "situation": situation,
        "result": result,
        "timestamp": datetime.now().isoformat(),
        "fallback_mode": fallback_mode,
    }
    return {
        "analysis_id": analysis_id,
        "timestamp": datetime.now().strftime("%d.%m.%Y %H:%M"),
        "fallback_mode": fallback_mode,
        **result,
    }


@app.get("/")
async def root():
    html_path = os.path.join(os.path.dirname(__file__), "index.html")
    if os.path.exists(html_path):
        return FileResponse(html_path)
    return HTMLResponse("<h1>T.C. ANATOLIA-Q</h1>")


@app.get("/health")
async def health():
    return {"status": "online", "system": "T.C. ANATOLIA-Q", "version": "1.3.0", "provider": "openai-with-fallback"}


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
    return {"message": "Dogrulama kodu gonderildi.", "email_hint": email[:3] + "***@" + email.split("@")[1]}


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

    if domain not in DOMAIN_CONFIG:
        raise HTTPException(400, "Gecersiz alan.")
    if not situation:
        raise HTTPException(400, "Durum bildirimi bos.")

    if not api_key:
        return save_analysis(domain, situation, build_fallback_result(domain, situation, "OPENAI_API_KEY eksik"), True)

    schema_config = get_output_schema(domain)
    client = OpenAI(api_key=api_key)
    user_msg = (
        f"Durum:\n{situation}\n\n"
        f"Tarih: {datetime.now().strftime('%d.%m.%Y %H:%M')}\n\n"
        f"Alan: {DOMAIN_CONFIG[domain]['display']}\n\n"
        "Kisa, net, kurumsal ve karar destek amacina uygun bir cikti uret."
    )

    try:
        response = client.responses.create(
            model=OPENAI_MODEL,
            input=[
                {"role": "developer", "content": [{"type": "input_text", "text": DOMAIN_CONFIG[domain]["prompt"]}]},
                {"role": "user", "content": [{"type": "input_text", "text": user_msg}]},
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
async def get_history():
    items = sorted(analysis_store.values(), key=lambda item: item["timestamp"], reverse=True)
    return [
        {
            "id": item["id"],
            "domain": item["domain"],
            "timestamp": item["timestamp"][:16],
            "ozet": item["result"].get("ozet", "")[:80],
            "fallback_mode": item.get("fallback_mode", False),
        }
        for item in items[:20]
    ]
