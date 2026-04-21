from datetime import datetime, timedelta
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
import os, random, smtplib, string, uuid

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse

app = FastAPI(title="T.C. ANATOLIA-Q", version="1.5.0")
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
    js = """<script>(()=>{const k=%s;const clear=()=>k.forEach(x=>{try{localStorage.removeItem(x)}catch(_){}});const showLogin=()=>{const l=document.getElementById('loginScreen'),m=document.getElementById('mainSystem');if(m)m.classList.add('hidden');if(l)l.classList.remove('hidden')};const getToken=()=>{for(const key of k){try{const raw=localStorage.getItem(key);if(!raw)continue;const p=JSON.parse(raw);const t=p.token||p.sessionToken||'';if(t)return t}catch(_){}}return''};const chatMode=()=>typeof state!=='undefined'&&state.domain==='genel_chat';const labelNodes=()=>Array.from(document.querySelectorAll('#resultArea .soft-label'));const cardNodes=()=>Array.from(document.querySelectorAll('#resultArea .result-card'));const getChatInput=()=>document.getElementById('chatNameInput');const ensureChatField=()=>{if(document.getElementById('chatNameField'))return;const area=document.getElementById('sitInput');const field=area?area.closest('.field'):null;if(!field||!field.parentElement)return;const wrap=document.createElement('div');wrap.id='chatNameField';wrap.className='field hidden';wrap.style.marginTop='14px';wrap.innerHTML='<label for="chatNameInput">Hitap adı (isteğe bağlı)</label><input id="chatNameInput" type="text" maxlength="24" placeholder="Örnek: Atabey"><div class="field-note">Genel Chat seni bu adla karşılayabilir ve daha doğal cevap verebilir.</div>';field.insertAdjacentElement('afterend',wrap);const input=document.getElementById('chatNameInput');if(input){input.addEventListener('input',()=>{input.value=input.value.replace(/[^\\p{L}\\p{N}\\s.-]/gu,'').slice(0,24)});input.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();patchedRunAnalysis()}})}};const configureChatUi=()=>{ensureChatField();const sitLabel=document.getElementById('sitLabel')||document.querySelector('label[for="sitInput"]');const runBtn=document.getElementById('runBtn');const injectBtn=document.getElementById('injectBtn');const downloadBtn=document.getElementById('downloadBtn');const title=document.getElementById('analysisTitle');const sub=document.getElementById('analysisSubtitle');const wrap=document.getElementById('chatNameField');const labels=labelNodes();if(chatMode()){if(sitLabel)sitLabel.textContent='Mesajın';if(runBtn)runBtn.textContent='Mesajı gönder';if(injectBtn)injectBtn.textContent='Konu öner';if(downloadBtn)downloadBtn.textContent='Sohbet indir';if(title)title.textContent='Serbest sohbet ve genel bilgi alanı';if(sub)sub.textContent='Genel kültür, günlük bilgi ve rahat tonda soru-cevap için sohbet modu.';if(wrap)wrap.classList.remove('hidden');if(labels[0])labels[0].textContent='Sohbet cevabı';if(labels[1])labels[1].textContent='Kısa ek not';if(labels[2])labels[2].textContent='Akış tonu';if(labels[3])labels[3].textContent='Sohbet yönleri';if(labels[4])labels[4].textContent='Devam seçenekleri';if(labels[5])labels[5].textContent='Bir sonraki iyi soru';if(labels[6])labels[6].textContent='Sohbet modu';if(labels[7])labels[7].textContent='Minik not'}else{if(sitLabel)sitLabel.textContent='Durum bildirimi';if(runBtn)runBtn.textContent='Analiz başlat';if(injectBtn)injectBtn.textContent='Şablon ekle';if(downloadBtn)downloadBtn.textContent='Rapor indir';if(wrap)wrap.classList.add('hidden')}};const configureResult=()=>{const badge=document.getElementById('threatBadge');const cards=cardNodes();if(chatMode()){if(badge)badge.classList.add('hidden');[2,3,6].forEach(i=>{if(cards[i])cards[i].classList.add('hidden')})}else{if(badge)badge.classList.remove('hidden');[2,3,6].forEach(i=>{if(cards[i])cards[i].classList.remove('hidden')})}};const openCenter=()=>{const o=document.getElementById('centerOverlay');const p=o?o.querySelector('.center-panel'):null;const n=document.getElementById('centerNote');if(!o)return;o.classList.add('open');o.setAttribute('aria-hidden','false');o.style.overflowY='auto';o.style.alignItems=window.innerWidth<=900?'flex-start':'center';o.style.padding=window.innerWidth<=560?'12px':'24px';if(p){p.style.maxHeight=window.innerWidth<=560?'calc(100vh - 24px)':'min(calc(100vh - 48px), 900px)';p.style.overflowY='auto';}if(n)requestAnimationFrame(()=>n.focus())};const closeCenter=()=>{const o=document.getElementById('centerOverlay');if(!o)return;o.classList.remove('open');o.setAttribute('aria-hidden','true')};const bindLogout=()=>{const b=document.getElementById('logoutBtn');if(!b||b.dataset.fixed==='1')return;b.dataset.fixed='1';b.addEventListener('click',e=>{e.preventDefault();e.stopImmediatePropagation();clear();closeCenter();showLogin()},true)};const bindCenter=()=>{['centerBtnLogin','centerBtnInline','centerBtnApp','centerBtnSide','centerBtnDash','centerBtnAnalysis'].forEach(id=>{const b=document.getElementById(id);if(!b||b.dataset.centerFixed==='1')return;b.dataset.centerFixed='1';b.addEventListener('click',e=>{e.preventDefault();e.stopImmediatePropagation();openCenter()},true)});const c=document.getElementById('closeCenterBtn');if(c&&c.dataset.centerFixed!=='1'){c.dataset.centerFixed='1';c.addEventListener('click',e=>{e.preventDefault();e.stopImmediatePropagation();closeCenter()},true)}const o=document.getElementById('centerOverlay');if(o&&o.dataset.centerFixed!=='1'){o.dataset.centerFixed='1';o.addEventListener('click',e=>{if(e.target===o)closeCenter()});document.addEventListener('keydown',e=>{if(e.key==='Escape'&&o.classList.contains('open'))closeCenter()})}const a=document.getElementById('contactCenterBtn');if(a&&a.dataset.centerFixed!=='1'){a.dataset.centerFixed='1';a.addEventListener('click',async e=>{e.preventDefault();e.stopImmediatePropagation();const status=document.getElementById('centerStatus');const load=document.getElementById('centerLoad');const note=document.getElementById('centerNote');const token=getToken();if(!token){if(status){status.setAttribute('data-kind','error');status.textContent='Önce giriş yapmanız gerekiyor.'}return}if(status){status.setAttribute('data-kind','info');status.textContent='Merkeze bildirim hazırlanıyor...'}if(load)load.classList.add('active');a.disabled=true;try{const r=await fetch('/api/contact-center',{method:'POST',headers:{'Content-Type':'application/json','Authorization':`Bearer ${token}`,'X-Auth-Token':token},body:JSON.stringify({token,note:note?note.value.trim():''})});const d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.detail||d.message||`İstek başarısız (${r.status})`);if(status){status.setAttribute('data-kind','success');status.textContent=d.message||'Merkez iletişim talebiniz gönderildi.'}if(note)note.value=''}catch(err){if(status){status.setAttribute('data-kind','error');status.textContent=err.message||'Merkez bildirimi gönderilemedi.'}}finally{if(load)load.classList.remove('active');a.disabled=false}},true)}};const patchedRenderResult=result=>{if(typeof renderResult==='function')renderResult(result);if(chatMode()){const heading=document.getElementById('resultHeading');const meta=document.getElementById('resultMeta');const threat=document.getElementById('threatText');const timeline=document.getElementById('timelineText');const critical=document.getElementById('criticalLinkText');if(heading)heading.textContent='Sohbet cevabı hazır';if(meta)meta.textContent=`ID: ${result.analysis_id||'--'} | Alan: Genel Chat${result.fallback_mode?' | Mod: Sohbet çekirdeği':''}`;if(threat)threat.textContent=result.tehdit_analizi||'İstersen daha ciddi ya da daha eğlenceli moda geçebilirim.';if(timeline)timeline.textContent=result.sohbet_tonu||'Rahat, akıcı ve hafif şakacı.';if(critical)critical.textContent=result.kritik_baglanti||'İstersen aynı başlığı daha kısa, daha ciddi ya da daha eğlenceli sürdürebiliriz.'}configureChatUi();configureResult()};const patchedRunAnalysis=async()=>{const input=document.getElementById('sitInput');const status=document.getElementById('analysisStatus');const load=document.getElementById('analysisLoad');const runBtn=document.getElementById('runBtn');const text=input?input.value.trim():'';if(!text){if(typeof setStatus==='function')setStatus(status,'error',chatMode()?'Mesaj alanı boş bırakılamaz.':'Durum bildirimi boş bırakılamaz.');return}const chatName=getChatInput()?getChatInput().value.trim():'';if(runBtn)runBtn.disabled=true;if(typeof setLoading==='function')setLoading(load,true);if(typeof setStatus==='function')setStatus(status,'','');try{const result=await apiFetch('/api/analyze',{method:'POST',body:JSON.stringify({domain:state.domain,situation:text,chat_name:chatName})});patchedRenderResult(result);if(typeof appendHistoryEntry==='function')appendHistoryEntry(result);if(typeof switchPage==='function')switchPage('analysis');if(typeof setStatus==='function')setStatus(status,result.fallback_mode?'warn':'success',chatMode()?(result.fallback_mode?'Sohbet cevabı sohbet çekirdeğiyle üretildi.':'Sohbet cevabı hazır.'):result.fallback_mode?'AI servis sınırında yedek analiz kullanıldı.':'Analiz başarıyla üretildi.')}catch(err){if(typeof setStatus==='function')setStatus(status,'error',err.message||(chatMode()?'Sohbet cevabı üretilemedi.':'Analiz üretilemedi.'))}finally{if(runBtn)runBtn.disabled=false;if(typeof setLoading==='function')setLoading(load,false)}};const bindRunFix=()=>{const runBtn=document.getElementById('runBtn');if(runBtn&&runBtn.dataset.chatFixed!=='1'){runBtn.dataset.chatFixed='1';runBtn.addEventListener('click',e=>{e.preventDefault();e.stopImmediatePropagation();patchedRunAnalysis()},true)}const clearBtn=document.getElementById('clearBtn');if(clearBtn&&clearBtn.dataset.chatFixed!=='1'){clearBtn.dataset.chatFixed='1';clearBtn.addEventListener('click',e=>{if(!chatMode())return;e.preventDefault();e.stopImmediatePropagation();const i=document.getElementById('sitInput');const n=getChatInput();if(i)i.value='';if(n)n.value='';if(typeof updateWordCount==='function')updateWordCount();if(typeof setStatus==='function')setStatus(document.getElementById('analysisStatus'),'','')},true)}};const patchDomain=()=>{if(typeof setDomain==='function'&&!window.__aqSetDomainPatched){window.__aqSetDomainPatched=true;const orig=setDomain;setDomain=function(domain){const out=orig.apply(this,arguments);configureChatUi();configureResult();return out}}};const patchPreset=()=>{if(typeof injectTemplate==='function'&&!window.__aqPresetPatched){window.__aqPresetPatched=true;const orig=injectTemplate;injectTemplate=function(){orig.apply(this,arguments);if(chatMode()){const i=document.getElementById('sitInput');if(i&&/Yönetim için hızlı/i.test(i.value))i.value='Bana normal bir yapay zeka sohbeti gibi cevap ver. Genel kültür, günlük bilgi veya herhangi bir konuyu rahat ama akıllı bir tonda anlat.';if(typeof updateWordCount==='function')updateWordCount()}}}};const init=()=>{clear();showLogin();bindLogout();bindCenter();patchDomain();patchPreset();ensureChatField();configureChatUi();configureResult();bindRunFix()};document.readyState==='loading'?document.addEventListener('DOMContentLoaded',init):init()})();</script>""" % repr(SESSION_KEYS)
    if "</body>" not in html:
        return html + js
    head, tail = html.rsplit("</body>", 1)
    return head + js + "\n</body>" + tail


@app.get("/")
async def root():
    path = os.path.join(os.path.dirname(__file__), "index.html")
    if not os.path.exists(path):
        return HTMLResponse("<h1>T.C. ANATOLIA-Q</h1>")
    with open(path, "r", encoding="utf-8") as handle:
        return HTMLResponse(patch_frontend(handle.read()))


@app.get("/health")
async def health():
    return {"status": "online", "system": "T.C. ANATOLIA-Q", "version": "1.5.0", "provider": "fallback-core"}


@app.post("/api/login")
async def login(data: dict):
    username = str(data.get("username", "")).strip()
    password = str(data.get("password", ""))
    if username not in USERS or password != PASSWORD:
        raise HTTPException(401, "Kullanici kodu veya sifre hatali.")
    code = "".join(random.choices(string.digits, k=6))
    pending_codes[username] = {"code": code, "expires": datetime.now() + timedelta(minutes=10)}
    send_mail("T.C. ANATOLIA-Q Dogrulama Kodu", f"<p>Kullanici: <b>{username}</b></p><p>Kod: <b>{code}</b></p><p>Saat: {stamp()}</p>")
    return {"message": "Dogrulama kodu gonderildi.", "email_hint": PRIMARY_EMAIL[:3] + "***@" + PRIMARY_EMAIL.split("@")[ -1]}


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
    return {"token": token, "name": USERS[username]["name"], "role": USERS[username]["role"], "username": username, "user": username}


@app.post("/api/contact-center")
async def contact_center(request: Request, req: dict):
    session = active_sessions.get(token_from(request, req))
    if not session:
        raise HTTPException(401, "Gecersiz oturum.")
    note = str(req.get("note", "")).strip()
    send_mail(
        "T.C. ANATOLIA-Q Merkez Iletisim Talebi",
        f"<p>Kullanici: <b>{session['username']}</b></p><p>Rol: <b>{session['role']}</b></p><p>Not: {note or '-'}</p><p>Saat: {stamp()}</p>",
    )
    return {"message": "Merkez iletisim talebiniz gonderildi."}


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