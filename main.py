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

app = FastAPI(title="T.C. ANATOLIA-Q", version="1.4.2")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

PRIMARY_EMAIL = os.environ.get("ADMIN_EMAIL", "info@boldkimya.com.tr")
OPENAI_MODEL = os.environ.get("OPENAI_MODEL", "gpt-4o-mini")
GMAIL_USER = os.environ.get("GMAIL_USER", "")
GMAIL_PASS = os.environ.get("GMAIL_APP_PASSWORD", "")
COMMON_PASSWORD = "Q7m!R2x#"

USERS = {
    "158963": {"password": COMMON_PASSWORD, "email": PRIMARY_EMAIL, "name": "Merkez Yonetici", "role": "admin"},
    "274851": {"password": COMMON_PASSWORD, "email": PRIMARY_EMAIL, "name": "Merkez Operasyon", "role": "operator"},
    "386472": {"password": COMMON_PASSWORD, "email": PRIMARY_EMAIL, "name": "Strateji Birimi", "role": "analyst"},
    "491205": {"password": COMMON_PASSWORD, "email": PRIMARY_EMAIL, "name": "Enerji Masasi", "role": "analyst"},
    "563184": {"password": COMMON_PASSWORD, "email": PRIMARY_EMAIL, "name": "Analiz Operatoru", "role": "operator"},
}

DOMAIN_CONFIG = {
    "savunma": {
        "display": "Savunma",
        "prompt": "You are the defense analysis module of T.C. ANATOLIA-Q. Produce concise strategic Turkish analysis in the requested JSON schema.",
        "kurumlar": ["MSB", "TSK", "MIT"],
        "zaman": "Acil (0-48 saat)",
        "oneri": "Saha farkindaligi ve kurumlar arasi koordinasyon derhal artirilmalidir.",
    },
    "ekonomi": {
        "display": "Ekonomi",
        "prompt": "You are the economy analysis module of T.C. ANATOLIA-Q. Produce concise strategic Turkish analysis in the requested JSON schema.",
        "kurumlar": ["Hazine ve Maliye Bakanligi", "TCMB", "BDDK"],
        "zaman": "Kisa (1-2 hafta)",
        "oneri": "Piyasa guveni ve likidite yonetimi icin hizli bir koordinasyon paketi aciklanmalidir.",
    },
    "enerji": {
        "display": "Enerji",
        "prompt": "You are the energy analysis module of T.C. ANATOLIA-Q. Produce concise strategic Turkish analysis in the requested JSON schema.",
        "kurumlar": ["Enerji ve Tabii Kaynaklar Bakanligi", "EPDK", "BOTAS"],
        "zaman": "Kisa-Orta (1-4 hafta)",
        "oneri": "Kritik altyapi korumasi ve arz surekliligi icin teknik teyit ve kriz masasi devreye alinmalidir.",
    },
    "dis_politika": {
        "display": "Dis Politika",
        "prompt": "You are the foreign policy analysis module of T.C. ANATOLIA-Q. Produce concise strategic Turkish analysis in the requested JSON schema.",
        "kurumlar": ["Disisleri Bakanligi", "Cumhurbaskanligi", "MIT"],
        "zaman": "Acil (0-72 saat)",
        "oneri": "Diplomatik temaslar hizlandirilmali ve dis kamuoyu anlatisi tek merkezden yonetilmelidir.",
    },
    "toplumsal_olaylar": {
        "display": "Toplumsal Olaylar",
        "prompt": "You are the social events analysis module of T.C. ANATOLIA-Q. Produce concise strategic Turkish analysis in the requested JSON schema.",
        "kurumlar": ["Icisleri Bakanligi", "Emniyet Genel Mudurlugu", "Valilikler"],
        "zaman": "Acil (0-72 saat)",
        "oneri": "Sahadaki toplumsal dinamikler erken fazda izlenmeli ve kurumlar arasi bilgi akisi tek elde toplanmalidir.",
    },
    "genel_chat": {
        "display": "Genel Chat",
        "prompt": "You are the strategic general chat module of T.C. ANATOLIA-Q. Produce concise Turkish output in the requested JSON schema.",
        "kurumlar": ["Cumhurbaskanligi", "Strateji Birimi", "Merkez Koordinasyon"],
        "zaman": "Duruma gore",
        "oneri": "Karar vericilere sunulacak ana mesajlar netlestirilmeli ve belirsizlikler acikca ayrilmalidir.",
    },
    "cross": {
        "display": "Capraz Sentez",
        "prompt": "You are the cross-domain synthesis module of T.C. ANATOLIA-Q. Produce concise Turkish output in the requested JSON schema.",
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
                    "aksiyon": {"type": "string"},
                },
                "required": ["baslik", "olasilik", "aciklama", "aksiyon"],
            },
        },
        "oncelikli_oneri": {"type": "string"},
        "etkilenen_kurumlar": {"type": "array", "items": {"type": "string"}},
        "zaman_cercevesi": {"type": "string"},
    },
    "required": [
        "ozet",
        "tehdit_seviyesi",
        "tehdit_analizi",
        "senaryolar",
        "oncelikli_oneri",
        "etkilenen_kurumlar",
        "zaman_cercevesi",
    ],
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
                "savunma": {"type": "object", "additionalProperties": False, "properties": {"etki": {"type": "string", "enum": ["yuksek", "orta", "dusuk"]}, "aciklama": {"type": "string"}}, "required": ["etki", "aciklama"]},
                "ekonomi": {"type": "object", "additionalProperties": False, "properties": {"etki": {"type": "string", "enum": ["yuksek", "orta", "dusuk"]}, "aciklama": {"type": "string"}}, "required": ["etki", "aciklama"]},
                "enerji": {"type": "object", "additionalProperties": False, "properties": {"etki": {"type": "string", "enum": ["yuksek", "orta", "dusuk"]}, "aciklama": {"type": "string"}}, "required": ["etki", "aciklama"]},
                "toplumsal_olaylar": {"type": "object", "additionalProperties": False, "properties": {"etki": {"type": "string", "enum": ["yuksek", "orta", "dusuk"]}, "aciklama": {"type": "string"}}, "required": ["etki", "aciklama"]},
                "dis_politika": {"type": "object", "additionalProperties": False, "properties": {"etki": {"type": "string", "enum": ["yuksek", "orta", "dusuk"]}, "aciklama": {"type": "string"}}, "required": ["etki", "aciklama"]},
            },
            "required": ["savunma", "ekonomi", "enerji", "toplumsal_olaylar", "dis_politika"],
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
                    "aksiyon": {"type": "string"},
                },
                "required": ["baslik", "olasilik", "aciklama", "aksiyon"],
            },
        },
        "oncelikli_oneri": {"type": "string"},
        "etkilenen_kurumlar": {"type": "array", "items": {"type": "string"}},
        "zaman_cercevesi": {"type": "string"},
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
        "zaman_cercevesi",
    ],
}

LEVEL_KEYWORDS = {
    "KRITIK": ["saldiri", "kriz", "coklu", "catisma", "patlama", "yaygin"],
    "YUKSEK": ["baski", "tehdit", "kesinti", "ihlal", "siber", "protesto"],
    "ORTA": ["gerilim", "risk", "hassas", "uyari"],
}

pending_codes = {}
active_sessions = {}
analysis_store = {}


def generate_code():
    return "".join(random.choices(string.digits, k=6))


def build_email(subject, html, to_email):
    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = GMAIL_USER
    msg["To"] = to_email
    msg.attach(MIMEText(html, "html", "utf-8"))
    return msg


def send_email_message(message):
    with smtplib.SMTP_SSL("smtp.gmail.com", 465) as server:
        server.login(GMAIL_USER, GMAIL_PASS)
        server.sendmail(GMAIL_USER, [message["To"]], message.as_string())


def send_2fa_email(to_email, code, name):
    html = f"""<html><body style='font-family:Arial,sans-serif;background:#07111e;padding:40px'>
    <div style='max-width:520px;margin:0 auto;background:#0c1727;border:1px solid #2b8df0;padding:34px;border-radius:20px'>
      <div style='font-family:monospace;font-size:24px;font-weight:900;letter-spacing:5px;color:#7ed1ff;margin-bottom:4px'>T.C. ANATOLIA-Q</div>
      <div style='font-size:11px;color:#59728d;letter-spacing:2px;margin-bottom:24px'>ULUSAL KARAR DESTEK SISTEMI</div>
      <p style='color:#b8cce0'>Sayin <b style='color:#ffffff'>{name}</b>, giris dogrulama kodunuz:</p>
      <div style='background:#09111d;border:2px solid #7ed1ff;padding:22px;text-align:center;margin:20px 0;border-radius:16px'>
        <div style='font-family:monospace;font-size:42px;font-weight:900;letter-spacing:10px;color:#7ed1ff'>{code}</div>
        <div style='font-size:12px;color:#6a86a3;margin-top:8px'>10 dakika gecerlidir</div>
      </div>
      <p style='font-size:12px;color:#6a86a3'>Bu kodu siz talep etmediyseniz merkez yonetimini bilgilendirin.<br><br>Bold Askeri Teknoloji ve Savunma Sanayi A.S.</p>
    </div></body></html>"""
    send_email_message(build_email(f"T.C. ANATOLIA-Q Dogrulama Kodu: {code}", html, to_email))


def send_center_contact_email(user_name, username, role, note=""):
    note_html = f"<p style='color:#cfe2f5;line-height:1.6'><b>Not:</b> {note}</p>" if note else ""
    html = f"""<html><body style='font-family:Arial,sans-serif;background:#06101b;padding:40px'>
    <div style='max-width:560px;margin:0 auto;background:#0d1a2b;border:1px solid #49b7ff;padding:34px;border-radius:22px'>
      <div style='font-family:monospace;font-size:24px;font-weight:900;letter-spacing:5px;color:#7ed1ff;margin-bottom:4px'>T.C. ANATOLIA-Q</div>
      <div style='font-size:11px;color:#6a87a8;letter-spacing:2px;margin-bottom:24px'>MERKEZ ILETISIM BILDIRIMI</div>
      <p style='color:#d9ecff;line-height:1.7'><b>{user_name}</b> merkez ile iletisim kurulmasini talep etti.</p>
      <div style='background:#08111d;border:1px solid #25486a;border-radius:16px;padding:18px;margin:20px 0'>
        <p style='margin:0 0 8px;color:#d9ecff'><b>Kullanici kodu:</b> {username}</p>
        <p style='margin:0 0 8px;color:#d9ecff'><b>Rol:</b> {role}</p>
        <p style='margin:0;color:#d9ecff'><b>Talep zamani:</b> {datetime.now().strftime('%d.%m.%Y %H:%M:%S')}</p>
      </div>
      {note_html}
      <p style='font-size:12px;color:#6a87a8'>Bildirim merkeze otomatik gonderilmistir.<br><br>Bold Askeri Teknoloji ve Savunma Sanayi A.S.</p>
    </div></body></html>"""
    send_email_message(build_email("T.C. ANATOLIA-Q Merkez Iletisim Talebi", html, PRIMARY_EMAIL))


def detect_level(situation):
    lowered = situation.lower()
    for level, words in LEVEL_KEYWORDS.items():
        if any(word in lowered for word in words):
            return level
    return "ORTA"


def normalize_result(domain, result):
    threat_map = {"KRITIK": "KRITIK", "YUKSEK": "YUKSEK", "ORTA": "ORTA", "DUSUK": "DUSUK"}
    probability_map = {"Yuksek": "Yuksek", "Orta": "Orta", "Dusuk": "Dusuk"}
    impact_map = {"yuksek": "yuksek", "orta": "orta", "dusuk": "dusuk"}

    if domain == "cross":
        result["genel_tehdit_seviyesi"] = threat_map.get(result.get("genel_tehdit_seviyesi", ""), result.get("genel_tehdit_seviyesi", "ORTA"))
        for info in result.get("alan_etkileri", {}).values():
            info["etki"] = impact_map.get(info.get("etki", ""), info.get("etki", "orta"))
    else:
        result["tehdit_seviyesi"] = threat_map.get(result.get("tehdit_seviyesi", ""), result.get("tehdit_seviyesi", "ORTA"))

    for scenario in result.get("senaryolar", []):
        scenario["olasilik"] = probability_map.get(scenario.get("olasilik", ""), scenario.get("olasilik", "Orta"))
    return result


def scenario_to_text(item):
    if not isinstance(item, dict):
        return str(item)
    pieces = [
        item.get("baslik", ""),
        f"Olasilik: {item.get('olasilik', 'Orta')}",
        item.get("aciklama", ""),
        f"Aksiyon: {item.get('aksiyon', '')}",
    ]
    return " | ".join([part for part in pieces if part and not part.endswith(": ")])


def add_ui_aliases(domain, result):
    payload = dict(result)
    payload["risk_analizi"] = payload.get("tehdit_analizi", "")
    payload["senaryo_analizi"] = [scenario_to_text(item) for item in payload.get("senaryolar", [])]
    payload["onerilen_aksiyonlar"] = [payload["oncelikli_oneri"]] if payload.get("oncelikli_oneri") else []
    if domain == "cross":
        payload["etki_alanlari"] = [
            f"{DOMAIN_CONFIG[key]['display']}: {value.get('etki', 'orta')} | {value.get('aciklama', '')}"
            for key, value in payload.get("alan_etkileri", {}).items()
            if key in DOMAIN_CONFIG
        ]
    else:
        payload["etki_alanlari"] = [payload.get("tehdit_analizi", "")]
    return payload


def build_standard_fallback(domain, situation, reason):
    config = DOMAIN_CONFIG[domain]
    level = detect_level(situation)
    return normalize_result(domain, {
        "ozet": f"{config['display']} icin yedek analiz uretildi. Ana eksen: {situation[:220]}",
        "tehdit_seviyesi": level,
        "tehdit_analizi": f"Bulut model servisi kullanilamadigi icin yedek degerlendirme yapildi. Teknik neden: {reason}.",
        "senaryolar": [
            {"baslik": "Gerilim artar", "olasilik": "Yuksek", "aciklama": "Durum kisa vadede yogunlasabilir.", "aksiyon": "Anlik izleme ve koordinasyon aktif tutulmali."},
            {"baslik": "Kontrollu dengelenme", "olasilik": "Orta", "aciklama": "Dogru tepki ile etki sinirlanabilir.", "aksiyon": "Durum raporlamasi siklastirilmali."},
            {"baslik": "Etki sinirli kalir", "olasilik": "Dusuk", "aciklama": "Tetikleyiciler zayiflarsa tablo yumusayabilir.", "aksiyon": "Yedek planlar hazir tutulmali."},
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
        "ozet": f"Capraz alan sentezi yedek modda uretildi. Ana eksen: {situation[:220]}",
        "genel_tehdit_seviyesi": level,
        "alan_etkileri": {
            "savunma": {"etki": impact, "aciklama": "Guvenlik boyutu hizli izlenmeli."},
            "ekonomi": {"etki": "orta", "aciklama": "Beklenti yonetimi etkilenebilir."},
            "enerji": {"etki": "orta", "aciklama": "Kritik altyapi teyidi gereklidir."},
            "toplumsal_olaylar": {"etki": impact, "aciklama": "Toplumsal algi ve saha hareketliligi takip edilmelidir."},
            "dis_politika": {"etki": impact, "aciklama": "Dis anlatilar ve diplomatik denge etkilenebilir."},
        },
        "kritik_baglanti": "Guvenlik, toplumsal algi ve ekonomi ayni zaman diliminde birbirini hizlandirabilir.",
        "tehdit_analizi": f"Bulut model servisi kullanilamadigi icin yedek capraz sentez uretildi. Teknik neden: {reason}.",
        "senaryolar": [
            {"baslik": "Cok alanli baski artar", "olasilik": "Yuksek", "aciklama": "Bir alandaki stres diger alanlara yayilabilir.", "aksiyon": "Tek merkezli koordinasyon kurulmali."},
            {"baslik": "Etki kontrol altina alinir", "olasilik": "Orta", "aciklama": "Es zamanli tepki ile yayilma sinirlanabilir.", "aksiyon": "Kurumlar arasi veri akisi standardize edilmeli."},
            {"baslik": "Etki parcalanir", "olasilik": "Dusuk", "aciklama": "Tetikleyiciler zayiflarsa capraz etki azalabilir.", "aksiyon": "Yedek planlar korunmali."},
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
    data = add_ui_aliases(domain, result)
    analysis_id = "AQ-" + uuid.uuid4().hex[:6].upper()
    stamp = datetime.now().strftime("%d.%m.%Y %H:%M")
    payload = {
        "analysis_id": analysis_id,
        "timestamp": stamp,
        "time": stamp,
        "created_at": stamp,
        "summary": data.get("ozet", ""),
        "fallback_mode": fallback_mode,
        **data,
    }
    analysis_store[analysis_id] = {
        "id": analysis_id,
        "domain": domain,
        "situation": situation,
        "result": payload,
        "timestamp": datetime.now().isoformat(),
        "fallback_mode": fallback_mode,
    }
    return payload


def get_output_schema(domain):
    if domain == "cross":
        return {"name": "anatolia_q_cross_analysis", "schema": CROSS_SCHEMA}
    return {"name": "anatolia_q_standard_analysis", "schema": STANDARD_SCHEMA}


def get_session_from_token(token):
    session = active_sessions.get(token)
    if not session:
        raise HTTPException(401, "Gecersiz oturum.")
    return session


def patch_frontend(html):
    injected = """
<script>
(() => {
  const API_BASE = location.origin.includes("localhost") ? "https://anatolia-q.onrender.com" : location.origin;
  const SESSION_KEYS = ["anatolia_q_session", "AQ_SESSION", "aq_session"];

  function getSession() {
    for (const key of SESSION_KEYS) {
      try {
        const raw = localStorage.getItem(key);
        if (!raw) continue;
        const data = JSON.parse(raw);
        if (data && (data.token || data.sessionToken || data.user || data.username)) return data;
      } catch (_) {}
    }
    return {};
  }

  function setStatus(kind, message) {
    const box = document.getElementById("centerStatus");
    if (!box) return;
    if (kind) box.dataset.kind = kind;
    else box.removeAttribute("data-kind");
    box.textContent = message || "";
  }

  function setLoading(active) {
    const track = document.getElementById("centerLoad");
    if (track) track.classList.toggle("active", !!active);
  }

  function patchVisibleText() {
    const loginLabel = document.querySelector('label[for="loginUser"]');
    const passLabel = document.querySelector('label[for="loginPass"]');
    const loginInput = document.getElementById("loginUser");
    const userBadge = document.getElementById("userBadge");
    const contactButton = document.getElementById("contactCenterBtn");
    const centerCopy = document.querySelector('.center-copy');
    const note = document.getElementById("centerNote");
    const companyLines = Array.from(document.querySelectorAll('.company-line, .foot-chip, .contact-line'));

    if (loginLabel) loginLabel.textContent = "Kullanici kodu";
    if (passLabel) passLabel.textContent = "Sifre";
    if (loginInput) {
      loginInput.placeholder = "6 haneli kullanici kodunu girin";
      loginInput.inputMode = "numeric";
      loginInput.maxLength = 6;
      loginInput.addEventListener("input", () => {
        loginInput.value = loginInput.value.replace(/\D/g, "").slice(0, 6);
      });
    }
    if (contactButton) contactButton.textContent = "Merkeze ulas";
    if (centerCopy) centerCopy.textContent = "Bu panelden merkeze ulas talebi birakabilir, giris yapan kullanici koduyla otomatik bildirim gonderebilirsiniz.";
    if (note && !note.placeholder) note.placeholder = "Isterseniz kisa bir not ekleyin";
    companyLines.forEach((node) => {
      node.textContent = node.textContent
        .replace(/sinir hatti/gi, "sinir hatti")
        .replace(/Kullanici adi/gi, "Kullanici kodu")
        .replace(/Kullanici:/gi, "Kullanici kodu:");
    });

    const syncUser = () => {
      const session = getSession();
      const code = session.user || session.username || session.sessionUser || "--";
      if (userBadge) userBadge.textContent = `Kullanici kodu: ${code}`;
    };
    syncUser();
    setInterval(syncUser, 1000);
  }

  async function contactCenter(event) {
    event.preventDefault();
    event.stopPropagation();
    const session = getSession();
    const token = session.token || session.sessionToken || "";
    const note = document.getElementById("centerNote");
    const button = document.getElementById("contactCenterBtn");

    if (!token) {
      setStatus("error", "Once giris yapmaniz gerekiyor.");
      return;
    }

    if (button) button.disabled = true;
    setLoading(true);
    setStatus("", "");

    try {
      const response = await fetch(`${API_BASE}/api/contact-center`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
          "X-Auth-Token": token,
        },
        body: JSON.stringify({ token, note: note ? note.value.trim() : "" }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.detail || data.message || `Istek basarisiz (${response.status})`);
      setStatus("success", data.message || "Merkez iletisim talebiniz gonderildi.");
      if (note) note.value = "";
    } catch (error) {
      setStatus("error", error.message || "Merkez bildirimi gonderilemedi.");
    } finally {
      if (button) button.disabled = false;
      setLoading(false);
    }
  }

  document.addEventListener("DOMContentLoaded", () => {
    patchVisibleText();
    const button = document.getElementById("contactCenterBtn");
    if (button) {
      button.removeAttribute("href");
      button.onclick = null;
      button.addEventListener("click", contactCenter, true);
    }
  });
})();
</script>
"""
    return html.replace("</body>", injected + "\n</body>")


@app.get("/")
async def root():
    html_path = os.path.join(os.path.dirname(__file__), "index.html")
    if os.path.exists(html_path):
        with open(html_path, "r", encoding="utf-8") as handle:
            return HTMLResponse(patch_frontend(handle.read()))
    return HTMLResponse("<h1>T.C. ANATOLIA-Q</h1>")


@app.get("/health")
async def health():
    return {"status": "online", "system": "T.C. ANATOLIA-Q", "version": "1.4.2", "provider": "openai-with-fallback"}


@app.post("/api/login")
async def login(data: dict):
    username = data.get("username", "").strip()
    password = data.get("password", "")
    user = USERS.get(username)

    if not user or user["password"] != password:
        raise HTTPException(401, "Kullanici kodu veya sifre hatali.")

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
    return {"token": token, "name": user["name"], "role": user["role"], "username": username, "user": username}


@app.post("/api/contact-center")
async def contact_center(req: dict):
    token = req.get("token", "").strip()
    note = req.get("note", "").strip()
    session = get_session_from_token(token)

    if not GMAIL_USER or not GMAIL_PASS:
        raise HTTPException(500, "Merkez bildirim e-posta ayarlari eksik.")

    try:
        send_center_contact_email(session["name"], session["username"], session["role"], note)
    except Exception as exc:
        raise HTTPException(500, f"Merkez bildirimi gonderilemedi: {str(exc)}")

    return {"message": "Merkez iletisim talebiniz gonderildi."}


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
        "Kisa, net ve karar destek odakli bir cikti uret."
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
            "dom": item["domain"],
            "timestamp": item["result"].get("timestamp", ""),
            "time": item["result"].get("time", ""),
            "summary": item["result"].get("ozet", "")[:130],
            "ozet": item["result"].get("ozet", "")[:130],
            "fallback_mode": item.get("fallback_mode", False),
            "result": item["result"],
        }
        for item in items[:20]
    ]
