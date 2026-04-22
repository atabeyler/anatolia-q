from datetime import datetime, timedelta
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
import os, random, smtplib, string, uuid
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse, Response

app = FastAPI(title="T.C. ANATOLIA-Q", version="1.5.5")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])
PRIMARY_EMAIL = os.environ.get("ADMIN_EMAIL", "info@boldkimya.com.tr")
GMAIL_USER = os.environ.get("GMAIL_USER", "")
GMAIL_PASS = os.environ.get("GMAIL_APP_PASSWORD", "")
PASSWORD = "Q7m!R2x#"
SESSION_KEYS = ["anatolia_q_session_v4", "anatolia_q_session_v3", "anatolia_q_session_v2", "anatolia_q_session"]
USERS = {"158963": {"name": "Sistem Yonetici", "role": "admin"}, "274851": {"name": "Operasyon Birimi", "role": "operator"}, "386472": {"name": "Stratejik Analiz", "role": "analyst"}, "491205": {"name": "Enerji Izleme", "role": "analyst"}, "563184": {"name": "Saha Operatoru", "role": "operator"}}
DOMAINS = {"savunma": {"display": "Savunma", "kurumlar": ["MSB", "TSK", "MIT"]}, "ekonomi": {"display": "Ekonomi", "kurumlar": ["Hazine ve Maliye Bakanligi", "TCMB", "BDDK"]}, "enerji": {"display": "Enerji", "kurumlar": ["Enerji ve Tabii Kaynaklar Bakanligi", "EPDK", "BOTAS"]}, "dis_politika": {"display": "Dis Politika", "kurumlar": ["Disisleri Bakanligi", "Cumhurbaskanligi", "MIT"]}, "toplumsal_olaylar": {"display": "Toplumsal Olaylar", "kurumlar": ["Icisleri Bakanligi", "Emniyet Genel Mudurlugu", "Valilikler"]}, "genel_chat": {"display": "Genel Chat", "kurumlar": ["Cumhurbaskanligi", "Strateji Birimi", "Merkez Koordinasyon"]}, "cross": {"display": "Capraz Sentez", "kurumlar": ["Cumhurbaskanligi", "MSB", "Disisleri Bakanligi"]}}
pending_codes, active_sessions, analysis_store = {}, {}, {}

def stamp(): return datetime.now().strftime("%d.%m.%Y %H:%M")
def send_mail(subject, html):
    if not GMAIL_USER or not GMAIL_PASS: raise HTTPException(500, "E-posta ayarlari eksik.")
    msg = MIMEMultipart("alternative"); msg["Subject"] = subject; msg["From"] = GMAIL_USER; msg["To"] = PRIMARY_EMAIL; msg.attach(MIMEText(html, "html", "utf-8"))
    with smtplib.SMTP_SSL("smtp.gmail.com", 465) as smtp: smtp.login(GMAIL_USER, GMAIL_PASS); smtp.sendmail(GMAIL_USER, [PRIMARY_EMAIL], msg.as_string())
def token_from(request: Request, body=None):
    auth = request.headers.get("authorization", "")
    if auth.lower().startswith("bearer "): return auth.split(" ", 1)[1].strip()
    return request.headers.get("x-auth-token", "").strip() or str((body or {}).get("token", "")).strip()
def clean_name(value):
    raw = "".join(ch for ch in str(value or "").strip() if ch.isalnum() or ch in " .-_")
    return raw[:24].strip() or "dostum"
def general_chat_reply(situation, chat_name=""):
    name, text = clean_name(chat_name), " ".join(str(situation or "").split())
    low = text.lower()
    if any(w in low for w in ["selam", "merhaba", "sa", "naber", "nasilsin"]): answer = f"Selam {name}, buradayim. Sistemler acik, kahve sanal ama enerji yerinde. Ne konusmak istiyorsun?"
    elif any(w in low for w in ["nedir", "ne demek", "anlat", "acikla"]): answer = f"{name}, bunu sade anlatalim: {text[:220]}. Kisa cevap su; konu temelde parcalari dogru yere oturtma isi."
    elif "?" in text or any(w in low for w in ["neden", "niye", "nasil", "kim", "ne zaman", "hangi"]): answer = f"{name}, hizli cevap vereyim: {text[:220]} basliginda once resmi gor, sonra parcala, sonra en guclu noktayi sec."
    else: answer = f"{name}, notunu aldim. Bunu fazla kasmadan toparlayayim: {text[:220]}. Istersen daha ciddi ya da daha eglenceli moda da gecebilirim."
    return {"ozet": answer, "tehdit_analizi": "Ton rahat tutuldu; istersen bir sonraki mesajda daha ciddi, daha teknik ya da daha komik moda gecebilirim.", "senaryolar": ["Bunu daha sade anlat.", "Bana 3 maddede ozetle.", "Bir tik daha ciddi tonda yeniden yaz."], "oncelikli_oneri": "Bir sonraki mesajda tek bir soru ya da konu basligi at; cevabi daha keskinlestireyim.", "etkilenen_kurumlar": ["Genel Bilgi", "Gundelik Dil", "Hizli Ozet"], "zaman_cercevesi": "Anlik sohbet", "sohbet_tonu": f"Rahat, akici ve hafif sakaci. Hitap: {name}", "kritik_baglanti": "Ayni konuyu daha ciddi, daha kisa ya da daha eglenceli tonda surdurebiliriz.", "tehdit_seviyesi": "DUSUK"}
def fallback(domain, situation, chat_name=""):
    if domain == "genel_chat": return general_chat_reply(situation, chat_name)
    base = DOMAINS[domain]
    result = {"ozet": f"{base['display']} icin yedek analiz uretildi. Ana eksen: {situation[:220]}", "tehdit_analizi": "Sistem guvenli modda kural tabanli degerlendirme uretti.", "senaryolar": [{"baslik": "Gerilim artar", "olasilik": "Yuksek", "aciklama": "Kisa vadede baski artabilir.", "aksiyon": "Anlik izleme ve koordinasyon surdurulmeli."}, {"baslik": "Etki dengelenir", "olasilik": "Orta", "aciklama": "Hizli tepki ile etki sinirlanabilir.", "aksiyon": "Durum raporlamasi siklastirilmali."}, {"baslik": "Etki daralir", "olasilik": "Dusuk", "aciklama": "Tetikleyiciler zayiflarsa tablo yumusayabilir.", "aksiyon": "Yedek planlar hazir tutulmali."}], "oncelikli_oneri": "Kurumlar arasi koordinasyon korunmali ve durum izlenmelidir.", "etkilenen_kurumlar": base["kurumlar"], "zaman_cercevesi": "Acil"}
    if domain == "cross": result.update({"genel_tehdit_seviyesi": "ORTA", "alan_etkileri": {k: {"etki": "orta", "aciklama": "Takip edilmelidir."} for k in ["savunma", "ekonomi", "enerji", "toplumsal_olaylar", "dis_politika"]}, "kritik_baglanti": "Alanlar arasindaki etki birbirini hizlandirabilir."})
    else: result["tehdit_seviyesi"] = "ORTA"
    return result
def save_analysis(domain, situation, result):
    aid, created = "AQ-" + uuid.uuid4().hex[:6].upper(), stamp()
    payload = dict(result); payload.update({"analysis_id": aid, "timestamp": created, "time": created, "created_at": created, "fallback_mode": True, "risk_analizi": payload.get("tehdit_analizi", "")})
    payload["senaryo_analizi"] = [f"{i['baslik']} | Olasilik: {i['olasilik']} | {i['aciklama']} | Aksiyon: {i['aksiyon']}" for i in payload.get("senaryolar", []) if isinstance(i, dict)]
    analysis_store[aid] = {"id": aid, "domain": domain, "timestamp": created, "result": payload}
    return payload
def patch_frontend(html):
    inject = """<script src=\"/chat-hotfix.js?v=1.5.5\"></script><script>(()=>{const k=%s;const clear=()=>k.forEach(x=>{try{localStorage.removeItem(x)}catch(_){}});const showLogin=()=>{const l=document.getElementById('loginScreen'),m=document.getElementById('mainSystem');if(m)m.classList.add('hidden');if(l)l.classList.remove('hidden')};const token=()=>{for(const key of k){try{const raw=localStorage.getItem(key);if(!raw)continue;const p=JSON.parse(raw),t=p.token||p.sessionToken||'';if(t)return t}catch(_){}}return''};const open=()=>{const o=document.getElementById('centerOverlay'),p=o?o.querySelector('.center-panel'):null,n=document.getElementById('centerNote');if(!o)return;o.classList.add('open');o.setAttribute('aria-hidden','false');o.style.overflowY='auto';o.style.alignItems=window.innerWidth<=900?'flex-start':'center';o.style.padding=window.innerWidth<=560?'12px':'24px';if(p){p.style.maxHeight=window.innerWidth<=560?'calc(100vh - 24px)':'min(calc(100vh - 48px),900px)';p.style.overflowY='auto'}if(n)requestAnimationFrame(()=>n.focus())};const close=()=>{const o=document.getElementById('centerOverlay');if(o){o.classList.remove('open');o.setAttribute('aria-hidden','true')}};const logout=()=>{const b=document.getElementById('logoutBtn');if(!b||b.dataset.fixed==='1')return;b.dataset.fixed='1';b.addEventListener('click',e=>{e.preventDefault();e.stopImmediatePropagation();window.__aqChatTurns=[];clear();close();showLogin()},true)};const center=()=>{['centerBtnLogin','centerBtnInline','centerBtnApp','centerBtnSide','centerBtnDash','centerBtnAnalysis'].forEach(id=>{const b=document.getElementById(id);if(!b||b.dataset.centerFixed==='1')return;b.dataset.centerFixed='1';b.addEventListener('click',e=>{e.preventDefault();e.stopImmediatePropagation();open()},true)});const c=document.getElementById('closeCenterBtn');if(c&&c.dataset.centerFixed!=='1'){c.dataset.centerFixed='1';c.addEventListener('click',e=>{e.preventDefault();e.stopImmediatePropagation();close()},true)}const o=document.getElementById('centerOverlay');if(o&&o.dataset.centerFixed!=='1'){o.dataset.centerFixed='1';o.addEventListener('click',e=>{if(e.target===o)close()});document.addEventListener('keydown',e=>{if(e.key==='Escape'&&o.classList.contains('open'))close()})}const a=document.getElementById('contactCenterBtn');if(a&&a.dataset.centerFixed!=='1'){a.dataset.centerFixed='1';a.addEventListener('click',async e=>{e.preventDefault();e.stopImmediatePropagation();const s=document.getElementById('centerStatus'),l=document.getElementById('centerLoad'),n=document.getElementById('centerNote'),t=token();if(!t){if(s){s.setAttribute('data-kind','error');s.textContent='Önce giriş yapmanız gerekiyor.'}return}if(s){s.setAttribute('data-kind','info');s.textContent='Merkeze bildirim hazırlanıyor...'}if(l)l.classList.add('active');a.disabled=true;try{const r=await fetch('/api/contact-center',{method:'POST',headers:{'Content-Type':'application/json','Authorization':`Bearer ${t}`,'X-Auth-Token':t},body:JSON.stringify({token:t,note:n?n.value.trim():''})}),d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.detail||d.message||`İstek başarısız (${r.status})`);if(s){s.setAttribute('data-kind','success');s.textContent=d.message||'Merkez iletişim talebiniz gönderildi.'}if(n)n.value=''}catch(err){if(s){s.setAttribute('data-kind','error');s.textContent=err.message||'Merkez bildirimi gönderilemedi.'}}finally{if(l)l.classList.remove('active');a.disabled=false}},true)}};const init=()=>{clear();showLogin();logout();center()};document.readyState==='loading'?document.addEventListener('DOMContentLoaded',init):init()})();</script>""" % repr(SESSION_KEYS)
    return html.replace("</body>", inject + "</body>") if "</body>" in html else html + inject
@app.get('/')
async def root():
    path = os.path.join(os.path.dirname(__file__), 'index.html')
    if not os.path.exists(path): return HTMLResponse('<h1>T.C. ANATOLIA-Q</h1>')
    with open(path, 'r', encoding='utf-8') as handle: return HTMLResponse(patch_frontend(handle.read()))
@app.get('/chat-hotfix.js')
async def chat_hotfix():
    path = os.path.join(os.path.dirname(__file__), 'chat_hotfix.js')
    if not os.path.exists(path): return Response('// chat hotfix missing', media_type='application/javascript')
    with open(path, 'r', encoding='utf-8') as handle: return Response(handle.read(), media_type='application/javascript')
@app.get('/health')
async def health(): return {'status': 'online', 'system': 'T.C. ANATOLIA-Q', 'version': '1.5.5', 'provider': 'fallback-core'}
@app.post('/api/login')
async def login(data: dict):
    username, password = str(data.get('username', '')).strip(), str(data.get('password', ''))
    if username not in USERS or password != PASSWORD: raise HTTPException(401, 'Kullanici kodu veya sifre hatali.')
    code = ''.join(random.choices(string.digits, k=6)); pending_codes[username] = {'code': code, 'expires': datetime.now() + timedelta(minutes=10)}
    send_mail('T.C. ANATOLIA-Q Dogrulama Kodu', f'<p>Kullanici: <b>{username}</b></p><p>Kod: <b>{code}</b></p><p>Saat: {stamp()}</p>')
    return {'message': 'Dogrulama kodu gonderildi.', 'email_hint': PRIMARY_EMAIL[:3] + '***@' + PRIMARY_EMAIL.split('@')[-1]}
@app.post('/api/verify')
async def verify(data: dict):
    username, code = str(data.get('username', '')).strip(), str(data.get('code', '')).strip(); pending = pending_codes.get(username)
    if username not in USERS: raise HTTPException(401, 'Gecersiz kullanici.')
    if not pending: raise HTTPException(401, 'Kod bulunamadi. Tekrar giris yapin.')
    if datetime.now() > pending['expires']: del pending_codes[username]; raise HTTPException(401, 'Kodun suresi doldu.')
    if pending['code'] != code: raise HTTPException(401, 'Hatali dogrulama kodu.')
    del pending_codes[username]; token = f'aq_{username}_{uuid.uuid4().hex[:16]}'; active_sessions[token] = {'username': username, **USERS[username]}
    return {'token': token, 'name': USERS[username]['name'], 'role': USERS[username]['role'], 'username': username, 'user': username}
@app.post('/api/contact-center')
async def contact_center(request: Request, req: dict):
    session = active_sessions.get(token_from(request, req))
    if not session: raise HTTPException(401, 'Gecersiz oturum.')
    note = str(req.get('note', '')).strip()
    send_mail('T.C. ANATOLIA-Q Merkez Iletisim Talebi', f"<p>Kullanici: <b>{session['username']}</b></p><p>Rol: <b>{session['role']}</b></p><p>Not: {note or '-'}</p><p>Saat: {stamp()}</p>")
    return {'message': 'Merkez iletisim talebiniz gonderildi.'}
@app.post('/api/analyze')
async def analyze(req: dict):
    domain, situation, chat_name = str(req.get('domain', '')).strip(), str(req.get('situation', '')).strip(), str(req.get('chat_name', '')).strip()
    if domain not in DOMAINS: raise HTTPException(400, 'Gecersiz alan.')
    if not situation: raise HTTPException(400, 'Durum bildirimi bos.')
    return save_analysis(domain, situation, fallback(domain, situation, chat_name))
@app.get('/api/history')
async def history():
    items = sorted(analysis_store.values(), key=lambda item: item['timestamp'], reverse=True)
    return [{'id': item['id'], 'domain': item['domain'], 'dom': item['domain'], 'timestamp': item['result']['timestamp'], 'time': item['result']['timestamp'], 'summary': str(item['result'].get('ozet', ''))[:130], 'ozet': str(item['result'].get('ozet', ''))[:130], 'fallback_mode': True, 'result': item['result']} for item in items[:20]]
