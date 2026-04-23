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

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse, Response

try:
    from openai import OpenAI
except Exception:  # pragma: no cover
    OpenAI = None

try:
    from anthropic import Anthropic
except Exception:  # pragma: no cover
    Anthropic = None


APP_VERSION = "1.7.1"
PRIMARY_EMAIL = os.environ.get("ADMIN_EMAIL", "info@boldkimya.com.tr")
GMAIL_USER = os.environ.get("GMAIL_USER", "")
GMAIL_PASS = os.environ.get("GMAIL_APP_PASSWORD", "")
PASSWORD = "Q7m!R2x#"

OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY", "").strip()
OPENAI_MODEL = os.environ.get("OPENAI_MODEL", "gpt-4o-mini").strip()
ANTHROPIC_API_KEY = os.environ.get("ANTHROPIC_API_KEY", "").strip()
ANTHROPIC_MODEL = os.environ.get("ANTHROPIC_MODEL", "claude-sonnet-4-5").strip()
LLAMA_BASE_URL = os.environ.get("LLAMA_BASE_URL", "").strip()
LLAMA_MODEL = os.environ.get("LLAMA_MODEL", "").strip()
LLAMA_API_KEY = os.environ.get("LLAMA_API_KEY", "local-dev-key").strip() or "local-dev-key"

app = FastAPI(title="T.C. ANATOLIA-Q", version=APP_VERSION)
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

USERS = {
    "158963": {"name": "Sistem Yonetici", "role": "admin"},
    "274851": {"name": "Operasyon Birimi", "role": "operator"},
    "386472": {"name": "Stratejik Analiz", "role": "analyst"},
    "491205": {"name": "Enerji Izleme", "role": "analyst"},
    "563184": {"name": "Saha Operatoru", "role": "operator"},
}

DOMAINS = {
    "savunma": {"display": "Savunma", "kurumlar": ["MSB", "TSK", "MIT"]},
    "ekonomi": {"display": "Ekonomi", "kurumlar": ["Hazine ve Maliye Bakanligi", "TCMB", "BDDK"]},
    "enerji": {"display": "Enerji", "kurumlar": ["Enerji ve Tabii Kaynaklar Bakanligi", "EPDK", "BOTAS"]},
    "dis_politika": {"display": "Dis Politika", "kurumlar": ["Disisleri Bakanligi", "Cumhurbaskanligi", "MIT"]},
    "toplumsal_olaylar": {"display": "Toplumsal Olaylar", "kurumlar": ["Icisleri Bakanligi", "Emniyet Genel Mudurlugu", "Valilikler"]},
    "genel_chat": {"display": "Genel Chat", "kurumlar": ["Cumhurbaskanligi", "Strateji Birimi", "Merkez Koordinasyon"]},
    "cross": {"display": "Capraz Sentez", "kurumlar": ["Cumhurbaskanligi", "MSB", "Disisleri Bakanligi"]},
}

PROVIDER_ROUTE = {
    "genel_chat": ["llama", "openai", "anthropic", "fallback"],
    "savunma": ["openai", "anthropic", "llama", "fallback"],
    "ekonomi": ["openai", "anthropic", "llama", "fallback"],
    "enerji": ["openai", "anthropic", "llama", "fallback"],
    "dis_politika": ["openai", "anthropic", "llama", "fallback"],
    "toplumsal_olaylar": ["openai", "anthropic", "llama", "fallback"],
    "cross": ["openai", "anthropic", "llama", "fallback"],
}

pending_codes = {}
active_sessions = {}
analysis_store = {}
alerts_store = []
ops_feed_store = []


def stamp() -> str:
    return datetime.now().strftime("%d.%m.%Y %H:%M")


def send_mail(subject: str, html: str):
    if not GMAIL_USER or not GMAIL_PASS:
        raise HTTPException(500, "E-posta ayarlari eksik.")

    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = GMAIL_USER
    msg["To"] = PRIMARY_EMAIL
    msg.attach(MIMEText(html, "html", "utf-8"))

    with smtplib.SMTP_SSL("smtp.gmail.com", 465) as smtp:
        smtp.login(GMAIL_USER, GMAIL_PASS)
        smtp.sendmail(GMAIL_USER, [PRIMARY_EMAIL], msg.as_string())


def token_from(request: Request, body=None) -> str:
    auth = request.headers.get("authorization", "")
    if auth.lower().startswith("bearer "):
        return auth.split(" ", 1)[1].strip()
    return request.headers.get("x-auth-token", "").strip() or str((body or {}).get("token", "")).strip()


def require_session(request: Request, body=None):
    session = active_sessions.get(token_from(request, body))
    if not session:
        raise HTTPException(401, "Gecersiz oturum.")
    return session


def clean_name(value) -> str:
    raw = "".join(ch for ch in str(value or "").strip() if ch.isalnum() or ch in " .-_")
    return raw[:24].strip() or "dostum"


def trim_store(store, limit=60):
    while len(store) > limit:
        store.pop(0)


def extract_json_text(value: str) -> str:
    text = str(value or "").strip()
    if text.startswith("```"):
        lines = text.splitlines()[1:]
        while lines and lines[-1].strip().startswith("```"):
            lines.pop()
        text = "\n".join(lines).strip()

    start = text.find("{")
    end = text.rfind("}")
    if start != -1 and end != -1 and end > start:
        return text[start : end + 1]
    return text


def is_soft_provider_failure(error: Exception) -> bool:
    message = str(error).lower()
    markers = [
        "quota",
        "rate limit",
        "insufficient_quota",
        "billing",
        "credit",
        "429",
        "overloaded",
        "capacity",
        "temporarily unavailable",
    ]
    return any(marker in message for marker in markers)


def provider_status():
    return {
        "openai": bool(OpenAI and OPENAI_API_KEY),
        "anthropic": bool(Anthropic and ANTHROPIC_API_KEY),
        "llama": bool(OpenAI and LLAMA_BASE_URL and LLAMA_MODEL),
        "fallback": True,
    }


def build_schema_hint(domain: str) -> str:
    if domain == "genel_chat":
        payload = {
            "ozet": "Kisa ve dogal sohbet cevabi",
            "tehdit_analizi": "Konuya dair kisa degerlendirme",
            "senaryolar": [
                "Bunu daha sade anlat.",
                "Bana 3 maddede ozetle.",
                "Bir tik daha ciddi tonda yeniden yaz.",
            ],
            "oncelikli_oneri": "Bir sonraki mesaj icin oneri",
            "etkilenen_kurumlar": ["Genel Bilgi", "Gundelik Dil", "Hizli Ozet"],
            "zaman_cercevesi": "Anlik sohbet",
            "sohbet_tonu": "Rahat, akici ve hafif sakaci",
            "kritik_baglanti": "Konunun devam baglantisi",
            "tehdit_seviyesi": "DUSUK",
        }
    else:
        payload = {
            "ozet": "Yonetici ozeti",
            "tehdit_analizi": "Durumun stratejik analizi",
            "senaryolar": [
                {
                    "baslik": "Senaryo basligi",
                    "olasilik": "Yuksek",
                    "aciklama": "Senaryonun kisa aciklamasi",
                    "aksiyon": "Onerilen aksiyon",
                }
            ],
            "oncelikli_oneri": "Birincil oneri",
            "etkilenen_kurumlar": ["Kurum 1", "Kurum 2"],
            "zaman_cercevesi": "Acil / Kisa / Orta / Uzun",
            "kritik_baglanti": "Gozlenmesi gereken kilit bag",
            "tehdit_seviyesi": "DUSUK|ORTA|YUKSEK|KRITIK",
        }
        if domain == "cross":
            payload["genel_tehdit_seviyesi"] = "ORTA"
            payload["alan_etkileri"] = {
                "savunma": {"etki": "orta", "aciklama": "Alan etkisi"},
                "ekonomi": {"etki": "orta", "aciklama": "Alan etkisi"},
                "enerji": {"etki": "orta", "aciklama": "Alan etkisi"},
                "toplumsal_olaylar": {"etki": "orta", "aciklama": "Alan etkisi"},
                "dis_politika": {"etki": "orta", "aciklama": "Alan etkisi"},
            }
    return json.dumps(payload, ensure_ascii=False, indent=2)


def build_system_prompt(domain: str) -> str:
    area = DOMAINS[domain]["display"]
    return (
        "Sen T.C. ANATOLIA-Q icin calisan resmi karar destek motorusun. "
        "Yanitlarin Turkce olmali, duz uydurma yapmamali, risk ve oneri ayrimini net tutmali. "
        "Kullanici arayuzu sadece JSON bekliyor; asla aciklama, markdown, kod blogu veya onsoz ekleme. "
        f"Alan: {area}. "
        "Resmi kurum dili kullan ama okunabilir ve net kal. "
        "Belirsiz bilgi varsa bunu tahmini degil dikkatli bir dille isle. "
        "Cikti yapisi su ornegi izlemeli:\n"
        f"{build_schema_hint(domain)}"
    )


def build_user_prompt(domain: str, situation: str, chat_name: str = "") -> str:
    if domain == "genel_chat":
        name = clean_name(chat_name)
        return (
            f"Hitap adi: {name}\n"
            "Bu mod sohbet ekranı icindir. Cevap dogal, kisa-orta uzunlukta, akici ve hafif sakaci olsun. "
            "Yine de sacmalama, soruyu gercekten cevapla.\n"
            f"Kullanici mesaji:\n{situation.strip()}"
        )

    institutions = ", ".join(DOMAINS[domain]["kurumlar"])
    return (
        f"Analiz alani: {DOMAINS[domain]['display']}\n"
        f"Ilgili kurumlar: {institutions}\n"
        "Asagidaki durumu karar destek mantigiyla analiz et. "
        "Kisa vadeli risk, senaryo ve kurumlar arasi etkileri ayir.\n"
        f"Durum notu:\n{situation.strip()}"
    )


def normalize_general_chat(raw: dict, chat_name: str = "") -> dict:
    name = clean_name(chat_name)
    scenarios = raw.get("senaryolar") or [
        "Bunu daha sade anlat.",
        "Bana 3 maddede ozetle.",
        "Bir tik daha ciddi tonda yeniden yaz.",
    ]
    if not isinstance(scenarios, list):
        scenarios = [str(scenarios)]

    return {
        "ozet": str(raw.get("ozet") or f"Selam {name}, devam edelim. Sorunu biraz daha acarsan daha net gidebilirim."),
        "tehdit_analizi": str(raw.get("tehdit_analizi") or "Sohbet modu acik. Istersen bu konuyu daha ciddi ya da daha eglenceli tonda surdurebiliriz."),
        "senaryolar": [str(item) for item in scenarios[:3]],
        "oncelikli_oneri": str(raw.get("oncelikli_oneri") or "Bir sonraki mesajda tek soru sor; cevabi keskinlestireyim."),
        "etkilenen_kurumlar": raw.get("etkilenen_kurumlar") or ["Genel Bilgi", "Gundelik Dil", "Hizli Ozet"],
        "zaman_cercevesi": str(raw.get("zaman_cercevesi") or "Anlik sohbet"),
        "sohbet_tonu": str(raw.get("sohbet_tonu") or f"Rahat, akici ve hafif sakaci. Hitap: {name}"),
        "kritik_baglanti": str(raw.get("kritik_baglanti") or "Istersen ayni konuda devam edebiliriz."),
        "tehdit_seviyesi": str(raw.get("tehdit_seviyesi") or "DUSUK").upper(),
    }


def normalize_analysis(domain: str, raw: dict, chat_name: str = "") -> dict:
    if domain == "genel_chat":
        return normalize_general_chat(raw, chat_name)

    scenarios = raw.get("senaryolar") or []
    normalized_scenarios = []
    for item in scenarios[:3]:
        if isinstance(item, dict):
            normalized_scenarios.append(
                {
                    "baslik": str(item.get("baslik") or "Senaryo"),
                    "olasilik": str(item.get("olasilik") or "Orta").capitalize(),
                    "aciklama": str(item.get("aciklama") or "Ek degerlendirme gerekiyor."),
                    "aksiyon": str(item.get("aksiyon") or "Yakin izleme onerilir."),
                }
            )
        else:
            normalized_scenarios.append(
                {
                    "baslik": "Senaryo",
                    "olasilik": "Orta",
                    "aciklama": str(item),
                    "aksiyon": "Yakin izleme onerilir.",
                }
            )

    while len(normalized_scenarios) < 3:
        normalized_scenarios.append(
            {
                "baslik": f"Senaryo {len(normalized_scenarios) + 1}",
                "olasilik": "Orta",
                "aciklama": "Ek modelleme ile netlestirilmeli.",
                "aksiyon": "Veri takibi surdurulmeli.",
            }
        )

    result = {
        "ozet": str(raw.get("ozet") or f"{DOMAINS[domain]['display']} icin degerlendirme uretildi."),
        "tehdit_analizi": str(raw.get("tehdit_analizi") or "Durum analizi tamamlandi."),
        "senaryolar": normalized_scenarios,
        "oncelikli_oneri": str(raw.get("oncelikli_oneri") or "Kurumlar arasi esgudum korunmali."),
        "etkilenen_kurumlar": raw.get("etkilenen_kurumlar") or DOMAINS[domain]["kurumlar"],
        "zaman_cercevesi": str(raw.get("zaman_cercevesi") or "Acil"),
        "kritik_baglanti": str(raw.get("kritik_baglanti") or "Alanlar arasi baglar duzenli izlenmeli."),
        "tehdit_seviyesi": str(raw.get("tehdit_seviyesi") or "ORTA").upper(),
    }

    if domain == "cross":
        alan_etkileri = raw.get("alan_etkileri") or {}
        result["genel_tehdit_seviyesi"] = str(raw.get("genel_tehdit_seviyesi") or result["tehdit_seviyesi"]).upper()
        result["alan_etkileri"] = {
            key: {
                "etki": str((alan_etkileri.get(key) or {}).get("etki") or "orta"),
                "aciklama": str((alan_etkileri.get(key) or {}).get("aciklama") or "Takip edilmelidir."),
            }
            for key in ["savunma", "ekonomi", "enerji", "toplumsal_olaylar", "dis_politika"]
        }

    return result


def general_chat_reply(situation, chat_name="") -> dict:
    name = clean_name(chat_name)
    text = " ".join(str(situation or "").split())
    low = text.lower()

    if any(word in low for word in ["selam", "merhaba", "sa", "naber", "nasilsin"]):
        answer = f"Selam {name}, buradayim. Sistem acik, tempo iyi. Ne konusmak istiyorsun?"
    elif any(word in low for word in ["nedir", "ne demek", "anlat", "acikla"]):
        answer = f"{name}, bunu sade anlatalim: {text[:220]}. Kisa cevap su; konu parcalari dogru yere oturtma isi."
    elif "?" in text or any(word in low for word in ["neden", "niye", "nasil", "kim", "ne zaman", "hangi"]):
        answer = f"{name}, hizli cevap vereyim: once resmi gor, sonra parcala, sonra en guclu noktayi sec."
    else:
        answer = f"{name}, notunu aldim. Bunu fazla kasmadan toparlayayim: {text[:220]}. Istersen tonu daha ciddi ya da daha eglenceli yapabilirim."

    return normalize_general_chat(
        {
            "ozet": answer,
            "tehdit_analizi": "Ton rahat tutuldu; istersen bir sonraki mesajda daha ciddi, daha teknik ya da daha komik moda gecebilirim.",
            "senaryolar": [
                "Bunu daha sade anlat.",
                "Bana 3 maddede ozetle.",
                "Bir tik daha ciddi tonda yeniden yaz.",
            ],
            "oncelikli_oneri": "Bir sonraki mesajda tek bir soru ya da konu basligi at; cevabi daha keskinlestireyim.",
            "etkilenen_kurumlar": ["Genel Bilgi", "Gundelik Dil", "Hizli Ozet"],
            "zaman_cercevesi": "Anlik sohbet",
            "sohbet_tonu": f"Rahat, akici ve hafif sakaci. Hitap: {name}",
            "kritik_baglanti": "Ayni konuyu daha ciddi, daha kisa ya da daha eglenceli tonda surdurebiliriz.",
            "tehdit_seviyesi": "DUSUK",
        },
        chat_name,
    )


def fallback(domain: str, situation: str, chat_name: str = "") -> dict:
    if domain == "genel_chat":
        return general_chat_reply(situation, chat_name)

    base = DOMAINS[domain]
    result = {
        "ozet": f"{base['display']} icin ucretsiz yedek analiz uretildi. Ana eksen: {situation[:220]}",
        "tehdit_analizi": "Ucretli model kotasi dolsa bile sistem durmasin diye kural tabanli guvenli mod devreye girdi.",
        "senaryolar": [
            {
                "baslik": "Gerilim artar",
                "olasilik": "Yuksek",
                "aciklama": "Kisa vadede baski artabilir.",
                "aksiyon": "Anlik izleme ve koordinasyon surdurulmeli.",
            },
            {
                "baslik": "Etki dengelenir",
                "olasilik": "Orta",
                "aciklama": "Hizli tepki ile etki sinirlanabilir.",
                "aksiyon": "Durum raporlamasi siklastirilmali.",
            },
            {
                "baslik": "Etki daralir",
                "olasilik": "Dusuk",
                "aciklama": "Tetikleyiciler zayiflarsa tablo yumusayabilir.",
                "aksiyon": "Yedek planlar hazir tutulmali.",
            },
        ],
        "oncelikli_oneri": "Kurumlar arasi koordinasyon korunmali ve durum izlenmelidir.",
        "etkilenen_kurumlar": base["kurumlar"],
        "zaman_cercevesi": "Acil",
        "kritik_baglanti": "Guncel veri geldikce analiz derinlestirilmeli.",
        "tehdit_seviyesi": "ORTA",
    }

    if domain == "cross":
        result["genel_tehdit_seviyesi"] = "ORTA"
        result["alan_etkileri"] = {
            key: {"etki": "orta", "aciklama": "Takip edilmelidir."}
            for key in ["savunma", "ekonomi", "enerji", "toplumsal_olaylar", "dis_politika"]
        }

    return normalize_analysis(domain, result, chat_name)


def report_code_for(domain: str) -> str:
    codes = {
        "savunma": "SAV",
        "ekonomi": "EKO",
        "enerji": "ENR",
        "dis_politika": "DIP",
        "toplumsal_olaylar": "TOP",
        "genel_chat": "GCH",
        "cross": "SEN",
    }
    return codes.get(domain, "GEN")


def report_profile_for(domain: str) -> dict:
    profiles = {
        "savunma": {
            "cover_title": "ULUSAL SAVUNMA VE TEHDIT DEGERLENDIRME RAPORU",
            "scope": "Ulusal guvenlik, sinir hatti, askeri hazirlik ve caydiricilik gorunumu",
            "capacity": "Mevcut savunma gorunumu; saha sinyalleri, kurumlar arasi esgudum seviyesi ve kisa vadeli reaksiyon kapasitesi uzerinden degerlendirilmistir.",
            "architecture": "Cok katmanli erken uyari, teyit edilmis saha beslemesi, musterek komuta akisi ve hizli karar dongusu birlikte ele alinmalidir.",
            "standards": [
                "Kritik savunma verileri tek operasyon masasinda birlestirilmelidir.",
                "Uyari, teyit ve gorevlendirme ayni karar zinciri icinde tutulmalidir.",
                "Merkez bildirimleri kullanici kodu, zaman damgasi ve oncelik derecesi ile kayit altina alinmalidir.",
            ],
        },
        "ekonomi": {
            "cover_title": "EKONOMIK ETKI, DAYANIKLILIK VE RISK RAPORU",
            "scope": "Makroekonomik gorunum, piyasa etkisi, finansal istikrar ve kurumsal tepki alani",
            "capacity": "Ekonomik gorunum; piyasa hassasiyetleri, kurumsal tamponlar ve karar alicilarin manevra alani uzerinden ele alinmistir.",
            "architecture": "Erken uyari gostergeleri, likidite gorunumu, kurumsal esgudum ve asamali mudahale plani birlikte isletilmelidir.",
            "standards": [
                "Kritik ekonomik gostergeler tek karar destek hattinda toplanmalidir.",
                "Kurumsal bildirim ve piyasa etkisi ayni cercevede izlenmelidir.",
                "Oneriler kisa, orta ve uzun vadeli etkiler bazinda ayristirilmalidir.",
            ],
        },
        "enerji": {
            "cover_title": "ENERJI GUVENLIGI, SUREKLILIK VE DAYANIKLILIK RAPORU",
            "scope": "Arz guvenligi, altyapi surekliligi, bolgesel enerji etkisi ve mudahale kapasitesi",
            "capacity": "Enerji gorunumu; tedarik surekliligi, altyapi kirilganligi ve kurumlar arasi mudahale kapasitesi dikkate alinarak ozetlenmistir.",
            "architecture": "Arz hatti izlemesi, altyapi alarm esikleri, merkez teyidi ve yedek kapasite planlamasi birlikte isletilmelidir.",
            "standards": [
                "Enerji surekliligi verileri gercek zamanli alarm mantigiyla izlenmelidir.",
                "Tedarik, iletim ve tuketim etkileri ayni karar ekraninda eslestirilmelidir.",
                "Yedek kapasite ve acil mudahale plani rapor ciktisina baglanmalidir.",
            ],
        },
        "dis_politika": {
            "cover_title": "DIS POLITIKA, BOLGESEL ETKI VE DIPLOMATIK RISK RAPORU",
            "scope": "Bolgesel siyasi etki, diplomatik temas yogunlugu ve dis yansima gorunumu",
            "capacity": "Dis politika gorunumu; aktor davranisi, diplomatik soylem ve kisa vadeli gerilim uretme kapasitesi uzerinden degerlendirilmistir.",
            "architecture": "Aktor analizi, diplomatik trafik, kamu soylemi ve kurumlar arasi koordinasyon tek cercevede ele alinmalidir.",
            "standards": [
                "Diplomatik etkiler savunma ve ekonomi yansimalariyla birlikte okunmalidir.",
                "Kritik aktor aciklamalari ayri teyit seviyeleriyle islenmelidir.",
                "Merkez karar notlari cok alanli etki matrisiyle desteklenmelidir.",
            ],
        },
        "toplumsal_olaylar": {
            "cover_title": "TOPLUMSAL OLAYLAR, SAHA ETKISI VE KAMU DUZENI RAPORU",
            "scope": "Saha hareketliligi, kamu duzeni riski, yayilim potansiyeli ve kurumsal refleks gorunumu",
            "capacity": "Toplumsal gorunum; saha dinamigi, yayilim hizi ve yerel-idari refleks kapasitesi temelinde degerlendirilmistir.",
            "architecture": "Bolgesel alarm izlemesi, saha teyidi, yayilim takibi ve merkez yonlendirmesi tek akista tutulmalidir.",
            "standards": [
                "Saha kaynakli gelismeler dogrulama derecesiyle birlikte kaydedilmelidir.",
                "Yayilim riski, zaman penceresi ve bolgesel etki duzeyi ayri islenmelidir.",
                "Merkez uyarilari yerel uygulama birimleriyle es zamanli paylasilmalidir.",
            ],
        },
        "cross": {
            "cover_title": "CAPRAZ ETKI STRATEJIK SENTEZ VE KARAR DESTEK RAPORU",
            "scope": "Savunma, ekonomi, enerji, toplumsal alanlar ve dis politika arasinda capraz etki gorunumu",
            "capacity": "Bu cikti; alanlar arasi karsilikli etkiler, hizlandirici unsurlar ve esgudum ihtiyaci bakimindan sentezlenmistir.",
            "architecture": "Cok alanli alarm matrisi, ortak merkez teyidi ve onceliklendirilmis karar akisi birlikte isletilmelidir.",
            "standards": [
                "Alan etkileri tek tek degil, zincirleme sonuclariyla birlikte degerlendirilmelidir.",
                "Merkez karar akisi capraz etki katsayisi ile desteklenmelidir.",
                "Kurumsal sorumluluklar musterek etki duzleminde ayristirilmalidir.",
            ],
        },
        "genel_chat": {
            "cover_title": "GENEL CHAT GORUSME NOTU",
            "scope": "Serbest yazisma, bilgi alma ve sohbet akisi",
            "capacity": "Genel chat modu resmi karar destegi yerine kullaniciyla serbest etkilesim icin degerlendirilmistir.",
            "architecture": "Sohbet akisi, kullanici hitabi ve baglam surekliligi onceliklidir.",
            "standards": [
                "Sohbet baglami akis icinde korunmalidir.",
                "Yanitlar acik, dogal ve kullanici dostu kalmalidir.",
                "Gerektiginde daha resmi moda gecis yapilabilmelidir.",
            ],
        },
    }
    return profiles.get(domain, profiles["cross"])


def build_report_package(analysis_id: str, domain: str, situation: str, payload: dict) -> dict:
    profile = report_profile_for(domain)
    institutions = [str(item) for item in payload.get("etkilenen_kurumlar") or DOMAINS[domain]["kurumlar"]]
    scenarios = payload.get("senaryolar") or []
    findings = [str(payload.get("tehdit_analizi") or "Durum takibe alinmistir.")]
    findings.extend(str(item.get("aciklama") or "") for item in scenarios[:2] if isinstance(item, dict))
    recommendations = [str(payload.get("oncelikli_oneri") or "Kurumlar arasi koordinasyon korunmalidir.")]
    recommendations.extend(str(item.get("aksiyon") or "") for item in scenarios[:2] if isinstance(item, dict))

    risks = []
    for item in scenarios[:3]:
        if isinstance(item, dict):
            risks.append(
                {
                    "baslik": str(item.get("baslik") or "Risk"),
                    "aciklama": str(item.get("aciklama") or "Ek degerlendirme gerekiyor."),
                    "tedbir": str(item.get("aksiyon") or "Yakin izleme onerilir."),
                }
            )

    area_label = DOMAINS[domain]["display"]
    return {
        "kapak": {
            "kurum": "BOLD Askeri Teknoloji ve Savunma Sanayi A.S.",
            "birim": "Stratejik Analiz ve Politika Gelistirme Birimi",
            "sistem": "T.C. ANATOLIA-Q Kuantum Tabanli Ulusal Karar Destek Sistemi",
            "proje_kodu": "QTR-202412",
            "cikti_no": f"ANATOLIA-Q / {report_code_for(domain)}-{analysis_id[-4:]}",
            "belge_no": f"BOLD-{report_code_for(domain)}-{datetime.now().year}-{analysis_id[-4:]}",
            "baslik": profile["cover_title"],
            "tarih": payload.get("timestamp") or stamp(),
            "gizlilik": "GIZLILIK DERECESI: GIZLI",
            "kapsam": profile["scope"],
        },
        "yonetici_ozeti": str(payload.get("ozet") or f"{area_label} alanina iliskin mevcut gorunum yonetici ozeti formatinda degerlendirilmistir."),
        "kritik_bulgular": [item for item in findings if item][:3],
        "temel_oneriler": [item for item in recommendations if item][:3],
        "tehdit_analizi_bolumu": str(payload.get("tehdit_analizi") or "Duruma iliskin risk gorunumu degerlendirilmistir."),
        "mevcut_kapasite": profile["capacity"],
        "onerilen_mimari": f"{profile['architecture']} Kilit kurumlar: {', '.join(institutions)}.",
        "bolgesel_analiz": f"{area_label} alanina iliskin baslangic girdisi karar destek mantigiyla ayristirilmistir. Ilk kayit metni: {situation[:500]}",
        "uygulama_plani": [
            {"faz": "Faz 1", "zaman": "Ilk 24 saat", "icerik": "Dogrulama, on teyit, ilk risk haritalamasi ve merkez bilgilendirmesi."},
            {"faz": "Faz 2", "zaman": "1-7 gun", "icerik": "Kurumlar arasi koordinasyon, saha dogrulamasi ve gorev dagiliminin kesinlestirilmesi."},
            {"faz": "Faz 3", "zaman": "1-4 hafta", "icerik": "Kalici tedbir seti, takip takvimi ve ikinci kademe karar planinin uygulanmasi."},
        ],
        "kurumsal_sorumluluklar": institutions,
        "teknik_standartlar": profile["standards"],
        "riskler_ve_tedbirler": risks,
        "sonuc_ve_eylem_cagrisi": str(payload.get("oncelikli_oneri") or "Mevcut gorunum, yakin izleme ve merkez koordinasyonunda asamali tedbir gerektirmektedir."),
    }


def parse_provider_json(raw_text: str) -> dict:
    text = extract_json_text(raw_text)
    data = json.loads(text)
    if not isinstance(data, dict):
        raise ValueError("Saglayici JSON nesnesi dondurmedi.")
    return data


def call_openai_like(provider_name: str, api_key: str, model: str, domain: str, situation: str, chat_name: str = "", base_url: str | None = None):
    if OpenAI is None:
        raise RuntimeError(f"{provider_name} istemcisi kullanilamiyor.")
    if not model:
        raise RuntimeError(f"{provider_name} model bilgisi eksik.")

    kwargs = {"api_key": api_key} if api_key else {}
    if base_url:
        kwargs["base_url"] = base_url
    client = OpenAI(**kwargs)

    response = client.chat.completions.create(
        model=model,
        temperature=0.35,
        response_format={"type": "json_object"},
        messages=[
            {"role": "system", "content": build_system_prompt(domain)},
            {"role": "user", "content": build_user_prompt(domain, situation, chat_name)},
        ],
    )
    text = response.choices[0].message.content or "{}"
    parsed = parse_provider_json(text)
    return normalize_analysis(domain, parsed, chat_name), {"provider": provider_name, "model": model}


def call_anthropic(domain: str, situation: str, chat_name: str = ""):
    if Anthropic is None or not ANTHROPIC_API_KEY:
        raise RuntimeError("Anthropic yapilandirilmamis.")

    client = Anthropic(api_key=ANTHROPIC_API_KEY)
    response = client.messages.create(
        model=ANTHROPIC_MODEL,
        max_tokens=1800,
        temperature=0.35,
        system=build_system_prompt(domain),
        messages=[
            {
                "role": "user",
                "content": build_user_prompt(domain, situation, chat_name) + "\n\nYalnizca gecerli JSON dondur.",
            }
        ],
    )
    parts = [block.text for block in response.content if getattr(block, "type", "") == "text"]
    parsed = parse_provider_json("\n".join(parts))
    return normalize_analysis(domain, parsed, chat_name), {"provider": "anthropic", "model": ANTHROPIC_MODEL}


def analyze_with_router(domain: str, situation: str, chat_name: str = "") -> dict:
    route = PROVIDER_ROUTE.get(domain, ["openai", "anthropic", "llama", "fallback"])
    errors = []
    availability = provider_status()

    for provider in route:
        if not availability.get(provider):
            errors.append(f"{provider}:not-configured")
            continue

        try:
            if provider == "openai":
                result, meta = call_openai_like("openai", OPENAI_API_KEY, OPENAI_MODEL, domain, situation, chat_name)
            elif provider == "anthropic":
                result, meta = call_anthropic(domain, situation, chat_name)
            elif provider == "llama":
                result, meta = call_openai_like("llama", LLAMA_API_KEY, LLAMA_MODEL, domain, situation, chat_name, base_url=LLAMA_BASE_URL)
            else:
                result = fallback(domain, situation, chat_name)
                meta = {"provider": "fallback", "model": "fallback-core"}

            result["_meta"] = {
                "provider": meta["provider"],
                "model": meta["model"],
                "route": route,
                "attempt_errors": errors,
                "fallback_mode": meta["provider"] == "fallback",
            }
            return result
        except Exception as error:
            errors.append(f"{provider}:{error.__class__.__name__}")
            if provider == "fallback" and not is_soft_provider_failure(error):
                raise
            continue

    result = fallback(domain, situation, chat_name)
    result["_meta"] = {
        "provider": "fallback",
        "model": "fallback-core",
        "route": route,
        "attempt_errors": errors,
        "fallback_mode": True,
    }
    return result


def save_analysis(domain: str, situation: str, result: dict) -> dict:
    analysis_id = "AQ-" + uuid.uuid4().hex[:6].upper()
    created = stamp()
    payload = dict(result)
    meta = dict(payload.get("_meta") or {})
    payload.update(
        {
            "analysis_id": analysis_id,
            "timestamp": created,
            "time": created,
            "created_at": created,
            "fallback_mode": bool(meta.get("fallback_mode")),
            "provider": meta.get("provider", "fallback"),
            "model": meta.get("model", "fallback-core"),
            "risk_analizi": payload.get("tehdit_analizi", ""),
        }
    )
    payload["senaryo_analizi"] = [
        f"{item['baslik']} | Olasilik: {item['olasilik']} | {item['aciklama']} | Aksiyon: {item['aksiyon']}"
        for item in payload.get("senaryolar", [])
        if isinstance(item, dict)
    ]
    payload["report_package"] = build_report_package(analysis_id, domain, situation, payload)
    analysis_store[analysis_id] = {
        "id": analysis_id,
        "domain": domain,
        "timestamp": created,
        "result": payload,
    }
    return payload


def patch_frontend(html: str) -> str:
    inject = (
        f'<script src="/chat-hotfix.js?v={APP_VERSION}"></script>'
        f'<script src="/report-hotfix.js?v={APP_VERSION}"></script>'
        f'<script src="/ui-tidy-hotfix.js?v={APP_VERSION}"></script>'
    )
    marker = "</body>"
    index = html.rfind(marker)
    if index == -1:
        return html + inject
    return html[:index] + inject + html[index:]


@app.get("/")
async def root():
    path = os.path.join(os.path.dirname(__file__), "index.html")
    if not os.path.exists(path):
        return HTMLResponse("<h1>T.C. ANATOLIA-Q</h1>")
    with open(path, "r", encoding="utf-8") as handle:
        return HTMLResponse(patch_frontend(handle.read()))


@app.get("/chat-hotfix.js")
async def chat_hotfix():
    path = os.path.join(os.path.dirname(__file__), "chat_hotfix.js")
    if not os.path.exists(path):
        return Response("// chat hotfix missing", media_type="application/javascript")
    with open(path, "r", encoding="utf-8") as handle:
        return Response(handle.read(), media_type="application/javascript")


@app.get("/report-hotfix.js")
async def report_hotfix():
    path = os.path.join(os.path.dirname(__file__), "report_hotfix.js")
    if not os.path.exists(path):
        return Response("// report hotfix missing", media_type="application/javascript")
    with open(path, "r", encoding="utf-8") as handle:
        return Response(handle.read(), media_type="application/javascript")


@app.get("/ui-tidy-hotfix.js")
async def ui_tidy_hotfix():
    path = os.path.join(os.path.dirname(__file__), "ui_tidy_hotfix.js")
    if not os.path.exists(path):
        return Response("// layout hotfix missing", media_type="application/javascript")
    with open(path, "r", encoding="utf-8") as handle:
        return Response(handle.read(), media_type="application/javascript")


@app.get("/health")
async def health():
    return {
        "status": "online",
        "system": "T.C. ANATOLIA-Q",
        "version": APP_VERSION,
        "provider": "multi-router",
        "providers": provider_status(),
        "routes": PROVIDER_ROUTE,
    }


@app.post("/api/login")
async def login(data: dict):
    username = str(data.get("username", "")).strip()
    password = str(data.get("password", ""))
    if username not in USERS or password != PASSWORD:
        raise HTTPException(401, "Kullanici kodu veya sifre hatali.")

    code = "".join(random.choices(string.digits, k=6))
    pending_codes[username] = {"code": code, "expires": datetime.now() + timedelta(minutes=10)}
    send_mail(
        "T.C. ANATOLIA-Q Dogrulama Kodu",
        f"<p>Kullanici: <b>{username}</b></p><p>Kod: <b>{code}</b></p><p>Saat: {stamp()}</p>",
    )
    return {
        "message": "Dogrulama kodu gonderildi.",
        "email_hint": PRIMARY_EMAIL[:3] + "***@" + PRIMARY_EMAIL.split("@")[-1],
    }


@app.post("/api/verify")
async def verify(data: dict):
    username = str(data.get("username", "")).strip()
    code = str(data.get("code", "")).strip()
    pending = pending_codes.get(username)

    if username not in USERS:
        raise HTTPException(401, "Gecersiz kullanici.")
    if not pending:
        raise HTTPException(401, "Kod bulunamadi. Tekrar giris yapin.")
    if datetime.now() > pending["expires"]:
        del pending_codes[username]
        raise HTTPException(401, "Kodun suresi doldu.")
    if pending["code"] != code:
        raise HTTPException(401, "Hatali dogrulama kodu.")

    del pending_codes[username]
    token = f"aq_{username}_{uuid.uuid4().hex[:16]}"
    active_sessions[token] = {"username": username, **USERS[username]}
    return {
        "token": token,
        "name": USERS[username]["name"],
        "role": USERS[username]["role"],
        "username": username,
        "user": username,
    }


@app.post("/api/contact-center")
async def contact_center(request: Request, req: dict):
    session = require_session(request, req)
    note = str(req.get("note", "")).strip()
    send_mail(
        "T.C. ANATOLIA-Q Merkez Iletisim Talebi",
        f"<p>Kullanici: <b>{session['username']}</b></p><p>Rol: <b>{session['role']}</b></p><p>Not: {note or '-'}</p><p>Saat: {stamp()}</p>",
    )
    return {"message": "Merkez iletisim talebiniz gonderildi."}


@app.get("/api/alerts")
async def alerts():
    return {"items": list(reversed(alerts_store))}


@app.post("/api/alerts")
async def create_alert(request: Request, req: dict):
    session = require_session(request, req)
    region = str(req.get("region", "")).strip() or "Genel"
    title = str(req.get("title", "")).strip() or "Bolgesel alarm"
    detail = str(req.get("detail", "")).strip() or "Merkez inceleme bekliyor."
    priority = str(req.get("priority", "")).strip().upper() or "ORTA"

    item = {
        "id": "ALM-" + uuid.uuid4().hex[:6].upper(),
        "region": region[:32],
        "title": title[:80],
        "detail": detail[:400],
        "priority": priority[:16],
        "user": session["username"],
        "role": session["role"],
        "timestamp": stamp(),
    }
    alerts_store.append(item)
    trim_store(alerts_store)

    try:
        send_mail(
            f"T.C. ANATOLIA-Q Alarm | {item['region']}",
            f"<p>Kullanici: <b>{session['username']}</b></p><p>Rol: <b>{session['role']}</b></p><p>Bolge: <b>{item['region']}</b></p><p>Baslik: <b>{item['title']}</b></p><p>Detay: {item['detail']}</p><p>Oncelik: <b>{item['priority']}</b></p><p>Saat: {item['timestamp']}</p>",
        )
    except HTTPException:
        pass

    ops_feed_store.append(
        {
            "id": "MSG-" + uuid.uuid4().hex[:6].upper(),
            "channel": "alarm",
            "priority": item["priority"],
            "message": f"{item['region']} bolgesi icin alarm gecti: {item['title']}",
            "user": session["username"],
            "role": session["role"],
            "timestamp": item["timestamp"],
        }
    )
    trim_store(ops_feed_store)
    return {"message": "Alarm tum kullanicilar icin kaydedildi.", "item": item}


@app.get("/api/ops-feed")
async def ops_feed():
    return {"items": list(reversed(ops_feed_store))}


@app.post("/api/ops-feed")
async def push_ops_feed(request: Request, req: dict):
    session = require_session(request, req)
    message = str(req.get("message", "")).strip()
    channel = str(req.get("channel", "")).strip() or "ops"
    priority = str(req.get("priority", "")).strip().upper() or "BILGI"

    if not message:
        raise HTTPException(400, "Mesaj bos olamaz.")

    item = {
        "id": "MSG-" + uuid.uuid4().hex[:6].upper(),
        "channel": channel[:24],
        "priority": priority[:16],
        "message": message[:600],
        "user": session["username"],
        "role": session["role"],
        "timestamp": stamp(),
    }
    ops_feed_store.append(item)
    trim_store(ops_feed_store, limit=120)

    if channel == "emergency":
        try:
            send_mail(
                "T.C. ANATOLIA-Q Acil Alarm",
                f"<p>Kullanici: <b>{session['username']}</b></p><p>Rol: <b>{session['role']}</b></p><p>Mesaj: {item['message']}</p><p>Oncelik: <b>{item['priority']}</b></p><p>Saat: {item['timestamp']}</p>",
            )
        except HTTPException:
            pass

    return {"message": "Operasyon akisi guncellendi.", "item": item}


@app.post("/api/analyze")
async def analyze(req: dict):
    domain = str(req.get("domain", "")).strip()
    situation = str(req.get("situation", "")).strip()
    chat_name = str(req.get("chat_name", "")).strip()

    if domain not in DOMAINS:
        raise HTTPException(400, "Gecersiz alan.")
    if not situation:
        raise HTTPException(400, "Durum bildirimi bos.")

    return save_analysis(domain, situation, analyze_with_router(domain, situation, chat_name))


@app.get("/api/history")
async def history():
    items = sorted(analysis_store.values(), key=lambda item: item["timestamp"], reverse=True)
    return [
        {
            "id": item["id"],
            "domain": item["domain"],
            "dom": item["domain"],
            "timestamp": item["result"]["timestamp"],
            "time": item["result"]["timestamp"],
            "summary": str(item["result"].get("ozet", ""))[:130],
            "ozet": str(item["result"].get("ozet", ""))[:130],
            "fallback_mode": bool(item["result"].get("fallback_mode")),
            "provider": item["result"].get("provider", "fallback"),
            "model": item["result"].get("model", "fallback-core"),
            "result": item["result"],
        }
        for item in items[:20]
    ]
