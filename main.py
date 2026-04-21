from datetime import datetime, timedelta
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
import os, random, smtplib, string, uuid

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse

app = FastAPI(title="T.C. ANATOLIA-Q", version="1.5.1")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

PRIMARY_EMAIL = os.environ.get("ADMIN_EMAIL", "info@boldkimya.com.tr")
GMAIL_USER = os.environ.get("GMAIL_USER", "")
GMAIL_PASS = os.environ.get("GMAIL_APP_PASSWORD", "")
PASSWORD = "Q7m!R2x#"
SESSION_KEYS = ["anatolia_q_session_v4", "anatolia_q_session_v3", "anatolia_q_session_v2", "anatolia_q_session"]

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

pending_codes, active_sessions, analysis_store = {}, {}, {}


def stamp():
    return datetime.now().strftime("%d.%m.%Y %H:%M")


def send_mail(subject, html):
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


def token_from(request: Request, body=None):
    auth = request.headers.get("authorization", "")
    if auth.lower().startswith("bearer "):
        return auth.split(" ", 1)[1].strip()
    return request.headers.get("x-auth-token", "").strip() or str((body or {}).get("token", "")).strip()


def clean_name(value):
    raw = "".join(ch for ch in str(value or "").strip() if ch.isalnum() or ch in " .-_")
    return raw[:24].strip()


def general_chat_reply(situation, chat_name=""):
    name = clean_name(chat_name) or "dostum"
    text = " ".join(str(situation or "").split())
    low = text.lower()

    if any(word in low for word in ["selam", "merhaba", "sa", "naber", "nasilsin"]):
        answer = f"Selam {name}, buradayim. Sistemler acik, kahve sanal ama enerji yerinde. Ne konusmak istiyorsun?"
    elif any(word in low for word in ["nedir", "ne demek", "anlat", "acikla"]):
        answer = f"{name}, bunu sade anlatalim: {text[:220]}. Kisa cevap su; konu temelde parcalari dogru yere oturtma isi. Istersen daha teknik ya da daha gunluk dille de acabilirim."
    elif "?" in text or any(word in low for word in ["neden", "niye", "nasil", "kim", "ne zaman", "hangi"]):
        answer = f"{name}, hizli cevap vereyim: {text[:220]} basliginda once resmi gor, sonra parcala, sonra en guclu noktayi sec. Istersen bunu 3 maddede de indirebilirim."
    else:
        answer = f"{name}, notunu aldim. Bunu fazla kasmadan toparlayayim: {text[:220]}. Ilk izlenimim, konu netlestikce cevap daha da guclenir; istersen kisaltirim, ciddilestiririm ya da biraz daha esprituel hale getiririm."

    return {
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
    }


def fallback(domain, situation, chat_name=""):
    base = DOMAINS[domain]
    if domain == "genel_chat":
        return general_chat_reply(situation, chat_name)

    result = {
        "ozet": f"{base['display']} icin yedek analiz uretildi. Ana eksen: {situation[:220]}",
        "tehdit_analizi": "Sistem guvenli modda kural tabanli degerlendirme uretti.",
        "senaryolar": [
            {"baslik": "Gerilim artar", "olasilik": "Yuksek", "aciklama": "Kisa vadede baski artabilir.", "aksiyon": "Anlik izleme ve koordinasyon surdurulmeli."},
            {"baslik": "Etki dengelenir", "olasilik": "Orta", "aciklama": "Hizli tepki ile etki sinirlanabilir.", "aksiyon": "Durum raporlamasi siklastirilmali."},
            {"baslik": "Etki daralir", "olasilik": "Dusuk", "aciklama": "Tetikleyiciler zayiflarsa tablo yumusayabilir.", "aksiyon": "Yedek planlar hazir tutulmali."},
        ],
        "oncelikli_oneri": "Kurumlar arasi koordinasyon korunmali ve durum izlenmelidir.",
        "etkilenen_kurumlar": base["kurumlar"],
        "zaman_cercevesi": "Acil",
    }
    if domain == "cross":
        result.update(
            {
                "genel_tehdit_seviyesi": "ORTA",
                "alan_etkileri": {
                    key: {"etki": "orta", "aciklama": "Takip edilmelidir."}
                    for key in ["savunma", "ekonomi", "enerji", "toplumsal_olaylar", "dis_politika"]
                },
                "kritik_baglanti": "Alanlar arasindaki etki birbirini hizlandirabilir.",
            }
        )
    else:
        result["tehdit_seviyesi"] = "ORTA"
    return result


def save_analysis(domain, situation, result):
    analysis_id = "AQ-" + uuid.uuid4().hex[:6].upper()
    created = stamp()
    payload = dict(result)
    payload.update(
        {
            "analysis_id": analysis_id,
            "timestamp": created,
            "time": created,
            "created_at": created,
            "fallback_mode": True,
            "risk_analizi": payload.get("tehdit_analizi", ""),
        }
    )
    payload["senaryo_analizi"] = [
        f"{item['baslik']} | Olasilik: {item['olasilik']} | {item['aciklama']} | Aksiyon: {item['aksiyon']}"
        for item in payload.get("senaryolar", [])
        if isinstance(item, dict)
    ]
    analysis_store[analysis_id] = {"id": analysis_id, "domain": domain, "timestamp": created, "result": payload}
    return payload


def patch_frontend(html):
    js = """<script>(()=>{const k=%s;const turns=[];const clear=()=>k.forEach(x=>{try{localStorage.removeItem(x)}catch(_){}});const showLogin=()=>{const l=document.getElementById('loginScreen'),m=document.getElementById('mainSystem');if(m)m.classList.add('hidden');if(l)l.classList.remove('hidden')};const getToken=()=>{for(const key of k){try{const raw=localStorage.getItem(key);if(!raw)continue;const p=JSON.parse(raw);const t=p.token||p.sessionToken||'';if(t)return t}catch(_){}}return''};const chatMode=()=>typeof state!=='undefined'&&state.domain==='genel_chat';const getChatInput=()=>document.getElementById('chatNameInput');const ensureStyle=()=>{if(document.getElementById('aqChatStyle'))return;const style=document.createElement('style');style.id='aqChatStyle';style.textContent=`#chatShell{display:grid;gap:16px}#chatShell.hidden{display:none!important}.aq-chat-log{display:grid;gap:14px;max-height:62vh;overflow:auto;padding:8px 2px}.aq-chat-empty{padding:20px;border:1px dashed rgba(105,224,255,.18);border-radius:18px;color:#9bb5d2;background:rgba(6,14,24,.55);font-family: