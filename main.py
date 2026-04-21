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

app = FastAPI(title="T.C. ANATOLIA-Q", version="1.4.1")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

PRIMARY_EMAIL = os.environ.get("ADMIN_EMAIL", "info@boldkimya.com.tr")
OPENAI_MODEL = os.environ.get("OPENAI_MODEL", "gpt-4o-mini")
GMAIL_USER = os.environ.get("GMAIL_USER", "")
GMAIL_PASS = os.environ.get("GMAIL_APP_PASSWORD", "")

DOMAIN_CONFIG = {
    "savunma": {
        "display": "Savunma",
        "prompt": "Sen T.C. ANATOLIA-Q Savunma Analiz Modülüsün. Türkiye odaklı, net, kurumsal ve stratejik derinliği olan bir analiz üret. Cevabı sadece istenen JSON şemasına uygun doldur.",
        "kurumlar": ["MSB", "TSK", "MİT"],
        "zaman": "Acil (0-48 saat)",
        "oneri": "Saha farkındalığı ve kurumlar arası koordinasyon derhal artırılmalıdır.",
    },
    "ekonomi": {
        "display": "Ekonomi",
        "prompt": "Sen T.C. ANATOLIA-Q Ekonomi Analiz Modülüsün. Türkiye odaklı, piyasa, kurum ve algı boyutlarını ayıran bir analiz üret. Cevabı sadece istenen JSON şemasına uygun doldur.",
        "kurumlar": ["Hazine ve Maliye Bakanlığı", "TCMB", "BDDK"],
        "zaman": "Kısa (1-2 hafta)",
        "oneri": "Piyasa güveni ve likidite yönetimi için hızlı bir koordinasyon paketi açıklanmalıdır.",
    },
    "enerji": {
        "display": "Enerji",
        "prompt": "Sen T.C. ANATOLIA-Q Enerji Analiz Modülüsün. Enerji arzı, altyapı güvenliği ve kamu etkisini birlikte değerlendir. Cevabı sadece istenen JSON şemasına uygun doldur.",
        "kurumlar": ["Enerji ve Tabii Kaynaklar Bakanlığı", "EPDK", "BOTAŞ"],
        "zaman": "Kısa-Orta (1-4 hafta)",
        "oneri": "Kritik altyapı koruması ve arz sürekliliği için teknik teyit ve kriz masası devreye alınmalıdır.",
    },
    "dis_politika": {
        "display": "Dış Politika",
        "prompt": "Sen T.C. ANATOLIA-Q Dış Politika Analiz Modülüsün. Diplomatik, bölgesel ve uluslararası etkileri birlikte yorumla. Cevabı sadece istenen JSON şemasına uygun doldur.",
        "kurumlar": ["Dışişleri Bakanlığı", "Cumhurbaşkanlığı", "MİT"],
        "zaman": "Acil (0-72 saat)",
        "oneri": "Diplomatik temaslar hızlandırılmalı ve dış kamuoyu anlatısı tek merkezden yönetilmelidir.",
    },
    "toplumsal_olaylar": {
        "display": "Toplumsal Olaylar",
        "prompt": "Sen T.C. ANATOLIA-Q Toplumsal Olaylar Modülüsün. Sahadaki toplumsal hareketlilik, kamu düzeni, algı ve koordinasyon boyutlarını birlikte yorumla. Cevabı sadece istenen JSON şemasına uygun doldur.",
        "kurumlar": ["İçişleri Bakanlığı", "Emniyet Genel Müdürlüğü", "Valilikler"],
        "zaman": "Acil (0-72 saat)",
        "oneri": "Sahadaki toplumsal dinamikler erken fazda izlenmeli ve kurumlar arası bilgi akışı tek elde toplanmalıdır.",
    },
    "genel_chat": {
        "display": "Genel Chat",
        "prompt": "Sen T.C. ANATOLIA-Q Genel Chat ve Stratejik Danışma Modülüsün. Kullanıcı girdisini daha serbest ama yine kurumsal disiplinle yorumla. Cevabı sadece istenen JSON şemasına uygun doldur.",
        "kurumlar": ["Cumhurbaşkanlığı", "Strateji Birimi", "Merkez Koordinasyon"],
        "zaman": "Değişken (duruma göre)",
        "oneri": "Karar vericilere sunulacak ana mesajlar netleştirilmeli ve belirsizlikler açık şekilde ayrıştırılmalıdır.",
    },
    "cross": {
        "display": "Çapraz Sentez",
        "prompt": "Sen T.C. ANATOLIA-Q Çapraz Alan Sentez Motorususun. Savunma, ekonomi, enerji, toplumsal olaylar ve dış politika etkilerini birlikte sentezle. Cevabı sadece istenen JSON şemasına uygun doldur.",
        "kurumlar": ["Cumhurbaşkanlığı", "MSB", "Dışişleri Bakanlığı", "Hazine ve Maliye Bakanlığı"],
        "zaman": "Acil (0-72 saat)",
        "oneri": "Tek merkezli koordinasyon yapısı kurularak alanlar arası etkiler eş zamanlı izlenmelidir.",
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

USERS = {
    "158963": {"password": "Bold2026!", "email": PRIMARY_EMAIL, "name": "Merkez Yönetici", "role": "admin"},
    "274851": {"password": "Merkez2026!", "email": PRIMARY_EMAIL, "name": "Merkez Operasyon", "role": "operator"},
    "386472": {"password": "Strateji2026!", "email": PRIMARY_EMAIL, "name": "Strateji Birimi", "role": "analyst"},
    "491205": {"password": "Enerji2026!", "email": PRIMARY_EMAIL, "name": "Enerji Masası", "role": "analyst"},
    "563184": {"password": "Analiz2026!", "email": PRIMARY_EMAIL, "name": "Analiz Operatörü", "role": "operator"},
}

LEVEL_KEYWORDS = {
    "KRITIK": ["saldırı", "kriz", "çoklu", "seferber", "çatışma", "patlama", "yaygın"],
    "YUKSEK": ["baskı", "tehdit", "kesinti", "ihlal", "karıştırma", "siber", "iha", "protesto"],
    "ORTA": ["gerilim", "oynaklık", "risk", "hassas", "uyarı"],
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
      <p style='color:#b8cce0'>Sayın <b style='color:#ffffff'>{name}</b>, giriş doğrulama kodunuz:</p>
      <div style='background:#09111d;border:2px solid #7ed1ff;padding:22px;text-align:center;margin:20px 0;border-radius:16px'>
        <div style='font-family:monospace;font-size:42px;font-weight:900;letter-spacing:10px;color:#7ed1ff'>{code}</div>
        <div style='font-size:12px;color:#6a86a3;margin-top:8px'>10 dakika geçerlidir</div>
      </div>
      <p style='font-size:12px;color:#6a86a3'>Bu kodu siz talep etmediyseniz merkez yönetimini bilgilendirin.<br><br>Bold Askeri Teknoloji ve Savunma Sanayi A.Ş.</p>
    </div></body></html>"""
    send_email_message(build_email(f"T.C. ANATOLIA-Q Doğrulama Kodu: {code}", html, to_email))


def send_center_contact_email(user_name, username, role, note=""):
    note_html = f"<p style='color:#cfe2f5;line-height:1.6'><b>Not:</b> {note}</p>" if note else ""
    html = f"""<html><body style='font-family:Arial,sans-serif;background:#06101b;padding:40px'>
    <div style='max-width:560px;margin:0 auto;background:#0d1a2b;border:1px solid #49b7ff;padding:34px;border-radius:22px'>
      <div style='font-family:monospace;font-size:24px;font-weight:900;letter-spacing:5px;color:#7ed1ff;margin-bottom:4px'>T.C. ANATOLIA-Q</div>
      <div style='font-size:11px;color:#6a87a8;letter-spacing:2px;margin-bottom:24px'>MERKEZ ILETISIM BILDIRIMI</div>
      <p style='color:#d9ecff;line-height:1.7'><b>{user_name}</b> adlı kullanıcı merkez ile iletişim kurulmasını talep etti.</p>
      <div style='background:#08111d;border:1px solid #25486a;border-radius:16px;padding:18px;margin:20px 0'>
        <p style='margin:0 0 8px;color:#d9ecff'><b>Kullanıcı kodu:</b> {username}</p>
        <p style='margin:0 0 8px;color:#d9ecff'><b>Rol:</b> {role}</p>
        <p style='margin:0;color:#d9ecff'><b>Talep zamanı:</b> {datetime.now().strftime('%d.%m.%Y %H:%M:%S')}</p>
      </div>
      {note_html}
      <p style='font-size:12px;color:#6a87a8'>Bildirim merkezi e-posta hattına otomatik gönderilmiştir.<br><br>Bold Askeri Teknoloji ve Savunma Sanayi A.Ş.</p>
    </div></body></html>"""
    send_email_message(build_email("T.C. ANATOLIA-Q Merkez İletişim Talebi", html, PRIMARY_EMAIL))


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
    threat_map = {"KRITIK": "KRİTİK", "YUKSEK": "YÜKSEK", "ORTA": "ORTA", "DUSUK": "DÜŞÜK"}
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


def scenario_to_text(scenario):
    parts = [scenario.get("baslik", ""), f"Olasılık: {scenario.get('olasilik', 'Orta')}", scenario.get("aciklama", ""), f"Aksiyon: {scenario.get('aksiyon', '')}"]
    return " | ".join([part for part in parts if part and not part.endswith(": ")])


def add_ui_aliases(domain, result):
    ui_result = dict(result)
    ui_result["risk_analizi"] = ui_result.get("tehdit_analizi", "")
    ui_result["senaryo_analizi"] = [scenario_to_text(item) for item in ui_result.get("senaryolar", [])]
    ui_result["onerilen_aksiyonlar"] = [ui_result["oncelikli_oneri"]] if ui_result.get("oncelikli_oneri") else []
    if domain == "cross":
        ui_result["etki_alanlari"] = [
            f"{DOMAIN_CONFIG[key]['display']}: {value.get('etki', 'orta')} | {value.get('aciklama', '')}"
            for key, value in ui_result.get("alan_etkileri", {}).items()
            if key in DOMAIN_CONFIG
        ]
    else:
        ui_result["etki_alanlari"] = [ui_result.get("tehdit_analizi", "")]
    return ui_result


def build_standard_fallback(domain, situation, reason):
    config = DOMAIN_CONFIG[domain]
    level = detect_level(situation)
    return normalize_result(domain, {
        "ozet": f"{config['display']} için yerel yedek analiz üretildi. Girdinin ana ekseni: {situation[:220]}",
        "tehdit_seviyesi": level,
        "tehdit_analizi": f"Bulut model servisi geçici olarak kullanılamadığı için kural tabanlı değerlendirme yapıldı. Teknik neden: {reason}. Mevcut tablo hızlı kurumsal koordinasyon ihtiyacına işaret ediyor.",
        "senaryolar": [
            {"baslik": "Gerilimin kısa vadede artması", "olasilik": "Yuksek", "aciklama": "Mevcut işaretler olay akışının kısa vadede yoğunlaşabileceğini gösteriyor.", "aksiyon": "Anlık izleme ve üst düzey koordinasyon mekanizması aktif tutulmalı."},
            {"baslik": "Kontrollü dengelenme", "olasilik": "Orta", "aciklama": "Doğru kurumsal tepkiyle etkinin belirli bir eşikte tutulması mümkün olabilir.", "aksiyon": "Durum raporlaması standartlaştırılmalı ve karar ritmi sıklaştırılmalı."},
            {"baslik": "Etkisinin sınırlı kalması", "olasilik": "Dusuk", "aciklama": "Tetikleyici unsurlar zayıflarsa olaylar beklenenden daha sınırlı kalabilir.", "aksiyon": "Düşük olasılıklı ama yüksek etkili ihtimaller için yedek plan hazır tutulmalı."},
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
        "ozet": f"Çapraz alan sentezi yerel yedek modda üretildi. Girdi birden fazla kurumsal ve sektörel etki olasılığı taşıyor: {situation[:220]}",
        "genel_tehdit_seviyesi": level,
        "alan_etkileri": {
            "savunma": {"etki": impact, "aciklama": "Güvenlik ve caydırıcılık boyutunda hızlı izleme ihtiyacı doğabilir."},
            "ekonomi": {"etki": "orta", "aciklama": "Piyasa algısı ve beklenti yönetimi etkilenebilir."},
            "enerji": {"etki": "orta", "aciklama": "Kritik altyapı ve operasyonel süreklilik teyit edilmelidir."},
            "toplumsal_olaylar": {"etki": impact, "aciklama": "Toplumsal algı, meydan hareketliliği ve kamu düzeni boyutu takip edilmelidir."},
            "dis_politika": {"etki": impact, "aciklama": "Uluslararası mesajlaşma ve diplomatik denge boyutu doğabilir."},
        },
        "kritik_baglanti": "Güvenlik, toplumsal algı, ekonomi ve diplomatik anlatılar aynı zaman diliminde birbirini hızlandırabilir.",
        "tehdit_analizi": f"Bulut model servisi geçici olarak kullanılamadığı için çapraz alanlı kural tabanlı sentez üretildi. Teknik neden: {reason}. Temel risk, farklı alanlardaki etkinin birbirini büyütmesidir.",
        "senaryolar": [
            {"baslik": "Çok alanlı baskı derinleşir", "olasilik": "Yuksek", "aciklama": "Bir alandaki stres diğer alanlara hızlı şekilde yayılabilir.", "aksiyon": "Tek merkezli kriz koordinasyonu devreye alınmalı."},
            {"baslik": "Alanlar arası etki kontrol altına alınır", "olasilik": "Orta", "aciklama": "Eş zamanlı kurum tepkisi ile yayılma sınırlanabilir.", "aksiyon": "Kurumlar arası veri akışı standartlaştırılmalı."},
            {"baslik": "Etkiler parçalı ve sınırlı kalır", "olasilik": "Dusuk", "aciklama": "Tetikleyiciler beklenenden zayıf kalırsa çapraz etki daralabilir.", "aksiyon": "Yedek planlar korunurken normal operasyon ritmi izlenmeli."},
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
    ui_result = add_ui_aliases(domain, result)
    analysis_id = "AQ-" + uuid.uuid4().hex[:6].upper()
    created_iso = datetime.now().isoformat()
    created_display = datetime.now().strftime("%d.%m.%Y %H:%M")
    payload = {
        "analysis_id": analysis_id,
        "timestamp": created_display,
        "time": created_display,
        "created_at": created_display,
        "summary": ui_result.get("ozet", ""),
        "fallback_mode": fallback_mode,
        **ui_result,
    }
    analysis_store[analysis_id] = {
        "id": analysis_id,
        "domain": domain,
        "situation": situation,
        "result": payload,
        "timestamp": created_iso,
        "fallback_mode": fallback_mode,
    }
    return payload


def get_session_from_token(token):
    session = active_sessions.get(token)
    if not session:
        raise HTTPException(401, "Geçersiz oturum.")
    return session


def patch_frontend(html):
    injected = """
<script>
(() => {
  const API_BASE = location.origin.includes("localhost") ? "https://anatolia-q.onrender.com" : location.origin;
  const replacements = [
    ["Kullanici adi", "Kullanıcı kodu"],
    ["Kullanici adinizi girin", "6 haneli kullanıcı kodunu girin"],
    ["Kullanici adi ve sifre zorunludur.", "Kullanıcı kodu ve şifre zorunludur."],
    ["Kullanici:", "Kullanıcı kodu:"],
    ["Aktif kullanici", "Aktif kullanıcı kodu"],
    ["Merkeze e-posta ac", "Merkeze ulaş"],
    ["Merkeze E-posta Ac", "Merkeze ulaş"],
    ["Sinir hatti", "Sınır hattı"],
    ["sinir hatti", "sınır hattı"],
    ["Capraz Sentez", "Çapraz Sentez"],
    ["capraz sentez", "çapraz sentez"],
    ["Sifre", "Şifre"],
    ["Dogrulama", "Doğrulama"],
    ["gonderildi", "gönderildi"],
    ["Gecmis", "Geçmiş"],
    ["Ozet", "Özet"],
    ["iletisim", "iletişim"],
    ["Iletisim", "İletişim"],
    ["sirket", "şirket"],
    ["Sirket", "Şirket"]
  ];

  function patchTextNodes() {
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        const parent = node.parentElement;
        if (!parent) return NodeFilter.FILTER_REJECT;
        if (["SCRIPT", "STYLE", "NOSCRIPT"].includes(parent.tagName)) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      }
    });

    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach((node) => {
      let text = node.nodeValue;
      replacements.forEach(([from, to]) => {
        text = text.split(from).join(to);
      });
      node.nodeValue = text;
    });
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
    if (track) track.classList.toggle("active", Boolean(active));
  }

  async function contactCenter(event) {
    event.preventDefault();
    event.stopPropagation();

    const token = window.state && window.state.sessionToken;
    const note = document.getElementById("centerNote");
    const button = document.getElementById("contactCenterBtn");

    if (!token) {
      setStatus("error", "Önce giriş yapmanız gerekiyor.");
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
      if (!response.ok) throw new Error(data.detail || data.message || `İstek başarısız (${response.status})`);
      setStatus("success", data.message || "Merkez iletişim talebiniz gönderildi.");
      if (note) note.value = "";
    } catch (error) {
      setStatus("error", error.message || "Merkez bildirimi gönderilemedi.");
    } finally {
      if (button) button.disabled = false;
      setLoading(false);
    }
  }

  function patchInputs() {
    const loginLabel = document.querySelector('label[for="loginUser"]');
    const loginInput = document.getElementById("loginUser");
    const passLabel = document.querySelector('label[for="loginPass"]');
    const userBadge = document.getElementById("userBadge");
    const contactButton = document.getElementById("contactCenterBtn");
    const sitInput = document.getElementById("sitInput");

    if (loginLabel) loginLabel.textContent = "Kullanıcı kodu";
    if (passLabel) passLabel.textContent = "Şifre";
    if (loginInput) {
      loginInput.placeholder = "6 haneli kullanıcı kodunu girin";
      loginInput.setAttribute("inputmode", "numeric");
      loginInput.setAttribute("maxlength", "6");
      loginInput.addEventListener("input", () => {
        loginInput.value = loginInput.value.replace(/\D/g, "").slice(0, 6);
      });
    }
    if (userBadge) {
      const syncBadge = () => {
        const current = window.state && window.state.sessionUser ? window.state.sessionUser : "--";
        userBadge.textContent = `Kullanıcı kodu: ${current}`;
      };
      syncBadge();
      setInterval(syncBadge, 800);
    }
    if (contactButton) {
      contactButton.textContent = "Merkeze ulaş";
      contactButton.removeAttribute("href");
      contactButton.onclick = null;
      contactButton.addEventListener("click", contactCenter, true);
    }
    if (sitInput && sitInput.placeholder) {
      sitInput.placeholder = sitInput.placeholder
        .replace(/Sinir hatti/g, "Sınır hattı")
        .replace(/sinir hatti/g, "sınır hattı")
        .replace(/Capraz/g, "Çapraz");
    }
  }

  document.addEventListener("DOMContentLoaded", () => {
    patchTextNodes();
    patchInputs();
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
    return {"status": "online", "system": "T.C. ANATOLIA-Q", "version": "1.4.1", "provider": "openai-with-fallback"}


@app.post("/api/login")
async def login(data: dict):
    username = data.get("username", "").strip()
    password = data.get("password", "")
    user = USERS.get(username)

    if not user or user["password"] != password:
        raise HTTPException(401, "Kullanıcı kodu veya şifre hatalı.")

    code = generate_code()
    pending_codes[username] = {"code": code, "expires": datetime.now() + timedelta(minutes=10)}

    try:
        send_2fa_email(user["email"], code, user["name"])
    except Exception as exc:
        raise HTTPException(500, f"E-posta gönderilemedi: {str(exc)}")

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
    return {"token": token, "name": user["name"], "role": user["role"], "username": username}


@app.post("/api/contact-center")
async def contact_center(req: dict):
    token = req.get("token", "").strip()
    note = req.get("note", "").strip()
    session = get_session_from_token(token)

    if not GMAIL_USER or not GMAIL_PASS:
        raise HTTPException(500, "Merkez bildirim e-posta ayarları eksik.")

    try:
        send_center_contact_email(session["name"], session["username"], session["role"], note)
    except Exception as exc:
        raise HTTPException(500, f"Merkez bildirimi gönderilemedi: {str(exc)}")

    return {"message": "Merkez iletişim talebiniz gönderildi."}


@app.post("/api/analyze")
async def analyze(req: dict):
    domain = req.get("domain", "")
    situation = req.get("situation", "")
    api_key = os.environ.get("OPENAI_API_KEY", req.get("api_key", ""))

    if domain not in DOMAIN_CONFIG:
        raise HTTPException(400, "Geçersiz alan.")
    if not situation:
        raise HTTPException(400, "Durum bildirimi boş.")

    if not api_key:
        return save_analysis(domain, situation, build_fallback_result(domain, situation, "OPENAI_API_KEY eksik"), True)

    schema_config = get_output_schema(domain)
    client = OpenAI(api_key=api_key)
    user_msg = (
        f"Durum:\n{situation}\n\n"
        f"Tarih: {datetime.now().strftime('%d.%m.%Y %H:%M')}\n\n"
        f"Alan: {DOMAIN_CONFIG[domain]['display']}\n\n"
        "Kısa, net, kurumsal ve karar destek amacına uygun bir çıktı üret."
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
            raise ValueError("Model boş yanıt döndürdü")

        result = normalize_result(domain, json.loads(raw))
        return save_analysis(domain, situation, result, False)
    except openai.AuthenticationError:
        return save_analysis(domain, situation, build_fallback_result(domain, situation, "Geçersiz OpenAI API anahtarı"), True)
    except openai.RateLimitError:
        return save_analysis(domain, situation, build_fallback_result(domain, situation, "OpenAI kota veya rate limit sınırı"), True)
    except openai.APIConnectionError:
        return save_analysis(domain, situation, build_fallback_result(domain, situation, "OpenAI bağlantı hatası"), True)
    except openai.APIError as exc:
        return save_analysis(domain, situation, build_fallback_result(domain, situation, f"OpenAI API hatası: {str(exc)}"), True)
    except (json.JSONDecodeError, ValueError) as exc:
        return save_analysis(domain, situation, build_fallback_result(domain, situation, f"Model çıktı hatası: {str(exc)}"), True)
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
