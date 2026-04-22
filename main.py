from datetime import datetime, timedelta
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
import os
import random
import smtplib
import string
import uuid

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse, Response

app = FastAPI(title="T.C. ANATOLIA-Q", version="1.6.3")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

PRIMARY_EMAIL = os.environ.get("ADMIN_EMAIL", "info@boldkimya.com.tr")
GMAIL_USER = os.environ.get("GMAIL_USER", "")
GMAIL_PASS = os.environ.get("GMAIL_APP_PASSWORD", "")
PASSWORD = "Q7m!R2x#"

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

pending_codes = {}
active_sessions = {}
analysis_store = {}
alerts_store = []
ops_feed_store = []


def stamp():
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


def token_from(request: Request, body=None):
    auth = request.headers.get("authorization", "")
    if auth.lower().startswith("bearer "):
        return auth.split(" ", 1)[1].strip()
    return request.headers.get("x-auth-token", "").strip() or str((body or {}).get("token", "")).strip()


def require_session(request: Request, body=None):
    session = active_sessions.get(token_from(request, body))
    if not session:
        raise HTTPException(401, "Gecersiz oturum.")
    return session


def clean_name(value):
    raw = "".join(ch for ch in str(value or "").strip() if ch.isalnum() or ch in " .-_")
    return raw[:24].strip() or "dostum"


def trim_store(store, limit=60):
    while len(store) > limit:
        store.pop(0)


def general_chat_reply(situation, chat_name=""):
    name = clean_name(chat_name)
    text = " ".join(str(situation or "").split())
    low = text.lower()

    if any(word in low for word in ["selam", "merhaba", "sa", "naber", "nasilsin"]):
        answer = f"Selam {name}, buradayim. Sistemler acik, kahve sanal ama enerji yerinde. Ne konusmak istiyorsun?"
    elif any(word in low for word in ["nedir", "ne demek", "anlat", "acikla"]):
        answer = f"{name}, bunu sade anlatalim: {text[:220]}. Kisa cevap su; konu temelde parcalari dogru yere oturtma isi."
    elif "?" in text or any(word in low for word in ["neden", "niye", "nasil", "kim", "ne zaman", "hangi"]):
        answer = f"{name}, hizli cevap vereyim: {text[:220]} basliginda once resmi gor, sonra parcala, sonra en guclu noktayi sec."
    else:
        answer = f"{name}, notunu aldim. Bunu fazla kasmadan toparlayayim: {text[:220]}. Istersen daha ciddi ya da daha eglenceli moda da gecebilirim."

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
    if domain == "genel_chat":
        return general_chat_reply(situation, chat_name)

    base = DOMAINS[domain]
    result = {
        "ozet": f"{base['display']} icin yedek analiz uretildi. Ana eksen: {situation[:220]}",
        "tehdit_analizi": "Sistem guvenli modda kural tabanli degerlendirme uretti.",
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
    analysis_store[analysis_id] = {
        "id": analysis_id,
        "domain": domain,
        "timestamp": created,
        "result": payload,
    }
    return payload


def patch_frontend(html: str) -> str:
    inject = '<script src="/chat-hotfix.js?v=1.6.3"></script><script src="/ui-tidy-hotfix.js?v=1.6.3"></script>'
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


@app.get("/ui-tidy-hotfix.js")
async def ui_tidy_hotfix():
    path = os.path.join(os.path.dirname(__file__), "ui_tidy_hotfix.js")
    if not os.path.exists(path):
        return Response("// layout hotfix missing", media_type="application/javascript")
    with open(path, "r", encoding="utf-8") as handle:
        return Response(handle.read(), media_type="application/javascript")


@app.get("/health")
async def health():
    return {"status": "online", "system": "T.C. ANATOLIA-Q", "version": "1.6.3", "provider": "fallback-core"}


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

    return save_analysis(domain, situation, fallback(domain, situation, chat_name))


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
            "fallback_mode": True,
            "result": item["result"],
        }
        for item in items[:20]
    ]
