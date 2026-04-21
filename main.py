from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, HTMLResponse
import anthropic, json, uuid, os, smtplib, random, string
from datetime import datetime, timedelta
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

app = FastAPI(title="ANATOLIA-Q", version="1.0.0")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])
MODEL_CANDIDATES = [
    os.environ.get("ANTHROPIC_MODEL", "").strip(),
    "claude-sonnet-4-20250514",
    "claude-3-7-sonnet-20250219",
    "claude-3-5-sonnet-20241022",
]

DOMAIN_PROMPTS = {
    "savunma": 'Sen ANATOLIA-Q Savunma Analiz Modülüsün. SADECE JSON formatında yanıt ver: {"ozet":"...","tehdit_seviyesi":"KRİTİK","tehdit_analizi":"...","senaryolar":[{"baslik":"...","olasilik":"Yüksek","aciklama":"...","aksiyon":"..."},{"baslik":"...","olasilik":"Orta","aciklama":"...","aksiyon":"..."},{"baslik":"...","olasilik":"Düşük","aciklama":"...","aksiyon":"..."}],"oncelikli_oneri":"...","etkilenen_kurumlar":["MSB","SGK"],"zaman_cercevesi":"Acil (0-48 saat)"}',
    "ekonomi": 'Sen ANATOLIA-Q Ekonomi Analiz Modülüsün. SADECE JSON formatında yanıt ver: {"ozet":"...","tehdit_seviyesi":"YÜKSEK","tehdit_analizi":"...","senaryolar":[{"baslik":"...","olasilik":"Yüksek","aciklama":"...","aksiyon":"..."},{"baslik":"...","olasilik":"Orta","aciklama":"...","aksiyon":"..."},{"baslik":"...","olasilik":"Düşük","aciklama":"...","aksiyon":"..."}],"oncelikli_oneri":"...","etkilenen_kurumlar":["Hazine","TCMB"],"zaman_cercevesi":"Kısa (1-2 hafta)"}',
    "enerji": 'Sen ANATOLIA-Q Enerji Analiz Modülüsün. SADECE JSON formatında yanıt ver: {"ozet":"...","tehdit_seviyesi":"ORTA","tehdit_analizi":"...","senaryolar":[{"baslik":"...","olasilik":"Yüksek","aciklama":"...","aksiyon":"..."},{"baslik":"...","olasilik":"Orta","aciklama":"...","aksiyon":"..."},{"baslik":"...","olasilik":"Düşük","aciklama":"...","aksiyon":"..."}],"oncelikli_oneri":"...","etkilenen_kurumlar":["BOTAŞ","EPDK"],"zaman_cercevesi":"Orta (1-3 ay)"}',
    "dis_politika": 'Sen ANATOLIA-Q Dış Politika Analiz Modülüsün. SADECE JSON formatında yanıt ver: {"ozet":"...","tehdit_seviyesi":"YÜKSEK","tehdit_analizi":"...","senaryolar":[{"baslik":"...","olasilik":"Yüksek","aciklama":"...","aksiyon":"..."},{"baslik":"...","olasilik":"Orta","aciklama":"...","aksiyon":"..."},{"baslik":"...","olasilik":"Düşük","aciklama":"...","aksiyon":"..."}],"oncelikli_oneri":"...","etkilenen_kurumlar":["Dışişleri","MİT"],"zaman_cercevesi":"Acil (0-48 saat)"}',
    "cross": 'Sen ANATOLIA-Q Çapraz Alan Sentez Motorusun. SADECE JSON formatında yanıt ver: {"ozet":"...","genel_tehdit_seviyesi":"KRİTİK","alan_etkileri":{"savunma":{"etki":"yüksek","aciklama":"..."},"ekonomi":{"etki":"orta","aciklama":"..."},"enerji":{"etki":"düşük","aciklama":"..."},"dis_politika":{"etki":"yüksek","aciklama":"..."}},"kritik_baglanti":"...","tehdit_analizi":"...","senaryolar":[{"baslik":"...","olasilik":"Yüksek","aciklama":"...","aksiyon":"..."},{"baslik":"...","olasilik":"Orta","aciklama":"...","aksiyon":"..."},{"baslik":"...","olasilik":"Düşük","aciklama":"...","aksiyon":"..."}],"oncelikli_oneri":"...","etkilenen_kurumlar":["MSB","Dışişleri"],"zaman_cercevesi":"Acil (0-48 saat)"}'
}

USERS = {
    "admin": {
        "password": "Bold2026!",
        "email": os.environ.get("ADMIN_EMAIL", "info@boldkimya.com.tr"),
        "name": "Yönetici",
        "role": "admin"
    }
}

pending_codes = {}
active_sessions = {}
analysis_store = {}
GMAIL_USER = os.environ.get("GMAIL_USER", "")
GMAIL_PASS = os.environ.get("GMAIL_APP_PASSWORD", "")

def generate_code():
    return ''.join(random.choices(string.digits, k=6))

def send_2fa_email(to_email, code, name):
    msg = MIMEMultipart("alternative")
    msg["Subject"] = f"ANATOLIA-Q Doğrulama Kodu: {code}"
    msg["From"] = GMAIL_USER
    msg["To"] = to_email
    html = f"""<html><body style="font-family:Arial,sans-serif;background:#0a0e1a;padding:40px">
    <div style="max-width:480px;margin:0 auto;background:#0d1321;border:1px solid #1e3a5f;padding:32px">
      <div style="font-family:monospace;font-size:22px;font-weight:900;letter-spacing:6px;color:#00b4d8;margin-bottom:4px">ANATOLIA-Q</div>
      <div style="font-size:11px;color:#3d5a78;letter-spacing:2px;margin-bottom:24px">ULUSAL KARAR DESTEK SİSTEMİ</div>
      <p style="color:#8aa5c0">Sayın <b style="color:#e2e8f0">{name}</b>, giriş doğrulama kodunuz:</p>
      <div style="background:#111827;border:2px solid #00b4d8;padding:20px;text-align:center;margin:20px 0">
        <div style="font-family:monospace;font-size:40px;font-weight:900;letter-spacing:10px;color:#00b4d8">{code}</div>
        <div style="font-size:12px;color:#3d5a78;margin-top:8px">10 dakika geçerlidir</div>
      </div>
      <p style="font-size:12px;color:#3d5a78">Bu kodu siz talep etmediyseniz güvenlik biriminizi bilgilendirin.<br><br>BOLD Askeri Teknoloji ve Savunma Sanayi A.Ş.</p>
    </div></body></html>"""
    msg.attach(MIMEText(html, "html"))
    with smtplib.SMTP_SSL("smtp.gmail.com", 465) as server:
        server.login(GMAIL_USER, GMAIL_PASS)
        server.sendmail(GMAIL_USER, to_email, msg.as_string())

@app.get("/")
async def root():
    html_path = os.path.join(os.path.dirname(__file__), "index.html")
    if os.path.exists(html_path):
        return FileResponse(html_path)
    return HTMLResponse("<h1>ANATOLIA-Q</h1>")

@app.get("/health")
async def health():
    return {"status": "online", "system": "ANATOLIA-Q", "version": "1.0.0"}

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
    except Exception as e:
        raise HTTPException(500, f"E-posta gönderilemedi: {str(e)}")
    email = user["email"]
    return {"message": "Doğrulama kodu gönderildi.", "email_hint": email[:3] + "***@" + email.split("@")[1]}

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
    req_api_key = (req.get("api_key", "") or "").strip()
    env_api_key = os.environ.get("ANTHROPIC_API_KEY", "").strip()
    api_candidates = []
    for key in [req_api_key, env_api_key]:
        if key and key not in api_candidates:
            api_candidates.append(key)
    if domain not in DOMAIN_PROMPTS:
        raise HTTPException(400, "Geçersiz alan.")
    if not situation:
        raise HTTPException(400, "Durum bildirimi boş.")
    if not api_candidates:
        raise HTTPException(400, "API anahtarı eksik.")
    user_msg = f"Durum:\n{situation}\n\nTarih: {datetime.now().strftime('%d.%m.%Y %H:%M')}\n\nSADECE JSON formatında yanıt ver."
    try:
        auth_error = None
        model_error = None
        msg = None
        for api_key in api_candidates:
            client = anthropic.Anthropic(api_key=api_key)
            try:
                for model in [m for m in MODEL_CANDIDATES if m]:
                    try:
                        msg = client.messages.create(
                            model=model, max_tokens=2000,
                            system=DOMAIN_PROMPTS[domain],
                            messages=[{"role": "user", "content": user_msg}]
                        )
                        break
                    except anthropic.BadRequestError as e:
                        model_error = e
                        err = str(e).lower()
                        if "model" not in err and "not_found_error" not in err:
                            raise
                if msg:
                    break
            except anthropic.AuthenticationError as e:
                auth_error = e
                continue
        if not msg and auth_error:
            raise HTTPException(401, "Geçersiz API anahtarı. API key'i kontrol edin.")
        if not msg:
            raise HTTPException(500, f"Uygun model bulunamadı: {str(model_error)}")
        raw = "\n".join(
            block.text.strip() for block in msg.content
            if getattr(block, "type", "") == "text" and getattr(block, "text", "").strip()
        )
        if not raw:
            raise HTTPException(500, "AI yanıtında metin bulunamadı.")
        if "```json" in raw: raw = raw.split("```json")[1].split("```")[0].strip()
        elif "```" in raw: raw = raw.split("```")[1].split("```")[0].strip()
        result = json.loads(raw)
        aid = "AQ-" + uuid.uuid4().hex[:6].upper()
        analysis_store[aid] = {"id": aid, "domain": domain, "situation": situation, "result": result, "timestamp": datetime.now().isoformat()}
        return {"analysis_id": aid, "timestamp": datetime.now().strftime('%d.%m.%Y %H:%M'), **result}
    except HTTPException:
        raise
    except anthropic.AuthenticationError:
        raise HTTPException(401, "Geçersiz API anahtarı.")
    except json.JSONDecodeError:
        raise HTTPException(500, "AI yanıtı işlenemedi.")
    except Exception as e:
        raise HTTPException(500, str(e))

@app.get("/api/history")
async def get_history():
    items = sorted(analysis_store.values(), key=lambda x: x["timestamp"], reverse=True)
    return [{"id": i["id"], "domain": i["domain"], "timestamp": i["timestamp"][:16], "ozet": i["result"].get("ozet","")[:80]} for i in items[:20]]
