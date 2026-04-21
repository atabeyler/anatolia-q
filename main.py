from datetime import datetime, timedelta
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
import os, random, smtplib, string, uuid
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse
app = FastAPI(title='T.C. ANATOLIA-Q', version='1.4.9')
app.add_middleware(CORSMiddleware, allow_origins=['*'], allow_methods=['*'], allow_headers=['*'])
PRIMARY_EMAIL = os.environ.get('ADMIN_EMAIL', 'info@boldkimya.com.tr')
GMAIL_USER = os.environ.get('GMAIL_USER', '')
GMAIL_PASS = os.environ.get('GMAIL_APP_PASSWORD', '')
PASSWORD = 'Q7m!R2x#'
SESSION_KEYS = ['anatolia_q_session_v4','anatolia_q_session_v3','anatolia_q_session_v2','anatolia_q_session']
USERS = {'158963': {'name': 'Sistem Yonetici', 'role': 'admin'}, '274851': {'name': 'Operasyon Birimi', 'role': 'operator'}, '386472': {'name': 'Stratejik Analiz', 'role': 'analyst'}, '491205': {'name': 'Enerji Izleme', 'role': 'analyst'}, '563184': {'name': 'Saha Operatoru', 'role': 'operator'}}
DOMAINS = {'savunma': {'display': 'Savunma', 'kurumlar': ['MSB','TSK','MIT']}, 'ekonomi': {'display': 'Ekonomi', 'kurumlar': ['Hazine ve Maliye Bakanligi','TCMB','BDDK']}, 'enerji': {'display': 'Enerji', 'kurumlar': ['Enerji ve Tabii Kaynaklar Bakanligi','EPDK','BOTAS']}, 'dis_politika': {'display': 'Dis Politika', 'kurumlar': ['Disisleri Bakanligi','Cumhurbaskanligi','MIT']}, 'toplumsal_olaylar': {'display': 'Toplumsal Olaylar', 'kurumlar': ['Icisleri Bakanligi','Emniyet Genel Mudurlugu','Valilikler']}, 'genel_chat': {'display': 'Genel Chat', 'kurumlar': ['Cumhurbaskanligi','Strateji Birimi','Merkez Koordinasyon']}, 'cross': {'display': 'Capraz Sentez', 'kurumlar': ['Cumhurbaskanligi','MSB','Disisleri Bakanligi']}}
pending_codes, active_sessions, analysis_store = {}, {}, {}
def stamp(): return datetime.now().strftime('%d.%m.%Y %H:%M')
def send_mail(subject, html):
    if not GMAIL_USER or not GMAIL_PASS: raise HTTPException(500, 'E-posta ayarlari eksik.')
    msg = MIMEMultipart('alternative'); msg['Subject']=subject; msg['From']=GMAIL_USER; msg['To']=PRIMARY_EMAIL; msg.attach(MIMEText(html,'html','utf-8'))
    with smtplib.SMTP_SSL('smtp.gmail.com', 465) as s: s.login(GMAIL_USER, GMAIL_PASS); s.sendmail(GMAIL_USER,[PRIMARY_EMAIL],msg.as_string())
def token_from(request: Request, body=None):
    a = request.headers.get('authorization','')
    if a.lower().startswith('bearer '): return a.split(' ',1)[1].strip()
    return request.headers.get('x-auth-token','').strip() or str((body or {}).get('token','')).strip()
def fallback(domain, situation):
    base = DOMAINS[domain]
    r = {'ozet': f"{base['display']} icin yedek analiz uretildi. Ana eksen: {situation[:220]}", 'tehdit_analizi': 'Sistem guvenli modda kural tabanli degerlendirme uretti.', 'senaryolar': [{'baslik':'Gerilim artar','olasilik':'Yuksek','aciklama':'Kisa vadede baski artabilir.','aksiyon':'Anlik izleme ve koordinasyon surdurulmeli.'},{'baslik':'Etki dengelenir','olasilik':'Orta','aciklama':'Hizli tepki ile etki sinirlanabilir.','aksiyon':'Durum raporlamasi siklastirilmali.'},{'baslik':'Etki daralir','olasilik':'Dusuk','aciklama':'Tetikleyiciler zayiflarsa tablo yumusayabilir.','aksiyon':'Yedek planlar hazir tutulmali.'}], 'oncelikli_oneri': 'Kurumlar arasi koordinasyon korunmali ve durum izlenmelidir.', 'etkilenen_kurumlar': base['kurumlar'], 'zaman_cercevesi': 'Acil'}
    if domain == 'cross': r.update({'genel_tehdit_seviyesi':'ORTA','alan_etkileri':{k:{'etki':'orta','aciklama':'Takip edilmelidir.'} for k in ['savunma','ekonomi','enerji','toplumsal_olaylar','dis_politika']},'kritik_baglanti':'Alanlar arasindaki etki birbirini hizlandirabilir.'})
    else: r['tehdit_seviyesi'] = 'ORTA'
    return r
def save_analysis(domain, situation, result):
    aid = 'AQ-' + uuid.uuid4().hex[:6].upper(); t = stamp(); result = dict(result)
    result.update({'analysis_id': aid, 'timestamp': t, 'time': t, 'created_at': t, 'fallback_mode': True, 'risk_analizi': result.get('tehdit_analizi','')})
    result['senaryo_analizi'] = [f"{x['baslik']} | Olasilik: {x['olasilik']} | {x['aciklama']} | Aksiyon: {x['aksiyon']}" for x in result.get('senaryolar', [])]
    analysis_store[aid] = {'id': aid, 'domain': domain, 'timestamp': t, 'result': result}; return result
def patch_frontend(html):
    js = """<script>(()=>{const k=%s;const clear=()=>k.forEach(x=>{try{localStorage.removeItem(x)}catch(_){}});const showLogin=()=>{const l=document.getElementById('loginScreen'),m=document.getElementById('mainSystem');if(m)m.classList.add('hidden');if(l)l.classList.remove('hidden')};const getToken=()=>{for(const key of k){try{const raw=localStorage.getItem(key);if(!raw)continue;const p=JSON.parse(raw);const t=p.token||p.sessionToken||'';if(t)return t}catch(_){}}return''};const openCenter=()=>{const o=document.getElementById('centerOverlay');const p=o?o.querySelector('.center-panel'):null;const n=document.getElementById('centerNote');if(!o)return;o.classList.add('open');o.setAttribute('aria-hidden','false');o.style.overflowY='auto';o.style.alignItems=window.innerWidth<=900?'flex-start':'center';o.style.padding=window.innerWidth<=560?'12px':'24px';if(p){p.style.maxHeight=window.innerWidth<=560?'calc(100vh - 24px)':'min(calc(100vh - 48px), 900px)';p.style.overflowY='auto';}if(n)requestAnimationFrame(()=>n.focus())};const closeCenter=()=>{const o=document.getElementById('centerOverlay');if(!o)return;o.classList.remove('open');o.setAttribute('aria-hidden','true')};const bindLogout=()=>{const b=document.getElementById('logoutBtn');if(!b||b.dataset.fixed==='1')return;b.dataset.fixed='1';b.addEventListener('click',e=>{e.preventDefault();e.stopImmediatePropagation();clear();closeCenter();showLogin()},true)};const bindCenter=()=>{['centerBtnLogin','centerBtnInline','centerBtnApp','centerBtnSide','centerBtnDash','centerBtnAnalysis'].forEach(id=>{const b=document.getElementById(id);if(!b||b.dataset.centerFixed==='1')return;b.dataset.centerFixed='1';b.addEventListener('click',e=>{e.preventDefault();e.stopImmediatePropagation();openCenter()},true)});const c=document.getElementById('closeCenterBtn');if(c&&c.dataset.centerFixed!=='1'){c.dataset.centerFixed='1';c.addEventListener('click',e=>{e.preventDefault();e.stopImmediatePropagation();closeCenter()},true)}const o=document.getElementById('centerOverlay');if(o&&o.dataset.centerFixed!=='1'){o.dataset.centerFixed='1';o.addEventListener('click',e=>{if(e.target===o)closeCenter()});document.addEventListener('keydown',e=>{if(e.key==='Escape'&&o.classList.contains('open'))closeCenter()})}const a=document.getElementById('contactCenterBtn');if(a&&a.dataset.centerFixed!=='1'){a.dataset.centerFixed='1';a.addEventListener('click',async e=>{e.preventDefault();e.stopImmediatePropagation();const status=document.getElementById('centerStatus');const load=document.getElementById('centerLoad');const note=document.getElementById('centerNote');const token=getToken();if(!token){if(status){status.setAttribute('data-kind','error');status.textContent='Önce giriş yapmanız gerekiyor.'}return}if(status){status.setAttribute('data-kind','info');status.textContent='Merkeze bildirim hazırlanıyor...'}if(load)load.classList.add('active');a.disabled=true;try{const r=await fetch('/api/contact-center',{method:'POST',headers:{'Content-Type':'application/json','Authorization':`Bearer ${token}`,'X-Auth-Token':token},body:JSON.stringify({token,note:note?note.value.trim():''})});const d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.detail||d.message||`İstek başarısız (${r.status})`);if(status){status.setAttribute('data-kind','success');status.textContent=d.message||'Merkez iletişim talebiniz gönderildi.'}if(note)note.value=''}catch(err){if(status){status.setAttribute('data-kind','error');status.textContent=err.message||'Merkez bildirimi gönderilemedi.'}}finally{if(load)load.classList.remove('active');a.disabled=false}},true)}};const init=()=>{clear();showLogin();bindLogout();bindCenter()};document.readyState==='loading'?document.addEventListener('DOMContentLoaded',init):init()})();</script>""" % repr(SESSION_KEYS)
    if '</body>' not in html:
        return html + js
    head, tail = html.rsplit('</body>', 1)
    return head + js + '\n</body>' + tail
@app.get('/')
async def root():
    p = os.path.join(os.path.dirname(__file__), 'index.html')
    if not os.path.exists(p): return HTMLResponse('<h1>T.C. ANATOLIA-Q</h1>')
    with open(p, 'r', encoding='utf-8') as f: return HTMLResponse(patch_frontend(f.read()))
@app.get('/health')
async def health(): return {'status':'online','system':'T.C. ANATOLIA-Q','version':'1.4.9','provider':'fallback-core'}
@app.post('/api/login')
async def login(data: dict):
    u = str(data.get('username','')).strip(); p = str(data.get('password',''))
    if u not in USERS or p != PASSWORD: raise HTTPException(401, 'Kullanici kodu veya sifre hatali.')
    code = ''.join(random.choices(string.digits, k=6)); pending_codes[u] = {'code': code, 'expires': datetime.now() + timedelta(minutes=10)}
    send_mail('T.C. ANATOLIA-Q Dogrulama Kodu', f"<p>Kullanici: <b>{u}</b></p><p>Kod: <b>{code}</b></p><p>Saat: {stamp()}</p>")
    return {'message':'Dogrulama kodu gonderildi.','email_hint': PRIMARY_EMAIL[:3] + '***@' + PRIMARY_EMAIL.split('@')[-1]}
@app.post('/api/verify')
async def verify(data: dict):
    u = str(data.get('username','')).strip(); c = str(data.get('code','')).strip(); p = pending_codes.get(u)
    if u not in USERS: raise HTTPException(401, 'Gecersiz kullanici.')
    if not p: raise HTTPException(401, 'Kod bulunamadi. Tekrar giris yapin.')
    if datetime.now() > p['expires']: del pending_codes[u]; raise HTTPException(401, 'Kodun suresi doldu.')
    if p['code'] != c: raise HTTPException(401, 'Hatali dogrulama kodu.')
    del pending_codes[u]; t = f"aq_{u}_{uuid.uuid4().hex[:16]}"; active_sessions[t] = {'username': u, **USERS[u]}
    return {'token': t, 'name': USERS[u]['name'], 'role': USERS[u]['role'], 'username': u, 'user': u}
@app.post('/api/contact-center')
async def contact_center(request: Request, req: dict):
    s = active_sessions.get(token_from(request, req))
    if not s: raise HTTPException(401, 'Gecersiz oturum.')
    n = str(req.get('note','')).strip()
    send_mail('T.C. ANATOLIA-Q Merkez Iletisim Talebi', f"<p>Kullanici: <b>{s['username']}</b></p><p>Rol: <b>{s['role']}</b></p><p>Not: {n or '-'}</p><p>Saat: {stamp()}</p>")
    return {'message':'Merkez iletisim talebiniz gonderildi.'}
@app.post('/api/analyze')
async def analyze(req: dict):
    d = str(req.get('domain','')).strip(); s = str(req.get('situation','')).strip()
    if d not in DOMAINS: raise HTTPException(400, 'Gecersiz alan.')
    if not s: raise HTTPException(400, 'Durum bildirimi bos.')
    return save_analysis(d, s, fallback(d, s))
@app.get('/api/history')
async def history():
    items = sorted(analysis_store.values(), key=lambda x: x['timestamp'], reverse=True)
    return [{'id': i['id'], 'domain': i['domain'], 'dom': i['domain'], 'timestamp': i['result']['timestamp'], 'time': i['result']['timestamp'], 'summary': str(i['result'].get('ozet',''))[:130], 'ozet': str(i['result'].get('ozet',''))[:130], 'fallback_mode': True, 'result': i['result']} for i in items[:20]]