from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, HTMLResponse
from pydantic import BaseModel
from typing import Optional
import anthropic, json, uuid, os
from datetime import datetime

app = FastAPI(title="ANATOLIA-Q", version="1.0.0")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

DOMAIN_PROMPTS = {
    "savunma": 'Sen ANATOLIA-Q Savunma Analiz Modülüsün. SADECE JSON formatında yanıt ver: {"ozet":"...","tehdit_seviyesi":"KRİTİK","tehdit_analizi":"...","senaryolar":[{"baslik":"...","olasilik":"Yüksek","aciklama":"...","aksiyon":"..."},{"baslik":"...","olasilik":"Orta","aciklama":"...","aksiyon":"..."},{"baslik":"...","olasilik":"Düşük","aciklama":"...","aksiyon":"..."}],"oncelikli_oneri":"...","etkilenen_kurumlar":["MSB","SGK"],"zaman_cercevesi":"Acil (0-48 saat)"}',
    "ekonomi": 'Sen ANATOLIA-Q Ekonomi Analiz Modülüsün. SADECE JSON formatında yanıt ver: {"ozet":"...","tehdit_seviyesi":"YÜKSEK","tehdit_analizi":"...","senaryolar":[{"baslik":"...","olasilik":"Yüksek","aciklama":"...","aksiyon":"..."},{"baslik":"...","olasilik":"Orta","aciklama":"...","aksiyon":"..."},{"baslik":"...","olasilik":"Düşük","aciklama":"...","aksiyon":"..."}],"oncelikli_oneri":"...","etkilenen_kurumlar":["Hazine","TCMB"],"zaman_cercevesi":"Kısa (1-2 hafta)"}',
    "enerji": 'Sen ANATOLIA-Q Enerji Analiz Modülüsün. SADECE JSON formatında yanıt ver: {"ozet":"...","tehdit_seviyesi":"ORTA","tehdit_analizi":"...","senaryolar":[{"baslik":"...","olasilik":"Yüksek","aciklama":"...","aksiyon":"..."},{"baslik":"...","olasilik":"Orta","aciklama":"...","aksiyon":"..."},{"baslik":"...","olasilik":"Düşük","aciklama":"...","aksiyon":"..."}],"oncelikli_oneri":"...","etkilenen_kurumlar":["BOTAŞ","EPDK"],"zaman_cercevesi":"Orta (1-3 ay)"}',
    "dis_politika": 'Sen ANATOLIA-Q Dış Politika Analiz Modülüsün. SADECE JSON formatında yanıt ver: {"ozet":"...","tehdit_seviyesi":"YÜKSEK","tehdit_analizi":"...","senaryolar":[{"baslik":"...","olasilik":"Yüksek","aciklama":"...","aksiyon":"..."},{"baslik":"...","olasilik":"Orta","aciklama":"...","aksiyon":"..."},{"baslik":"...","olasilik":"Düşük","aciklama":"...","aksiyon":"..."}],"oncelikli_oneri":"...","etkilenen_kurumlar":["Dışişleri","MİT"],"zaman_cercevesi":"Acil (0-48 saat)"}',
    "cross": 'Sen ANATOLIA-Q Çapraz Alan Sentez Motorusun. SADECE JSON formatında yanıt ver: {"ozet":"...","genel_tehdit_seviyesi":"KRİTİK","alan_etkileri":{"savunma":{"etki":"yüksek","aciklama":"..."},"ekonomi":{"etki":"orta","aciklama":"..."},"enerji":{"etki":"düşük","aciklama":"..."},"dis_politika":{"etki":"yüksek","aciklama":"..."}},"kritik_baglanti":"...","tehdit_analizi":"...","senaryolar":[{"baslik":"...","olasilik":"Yüksek","aciklama":"...","aksiyon":"..."},{"baslik":"...","olasilik":"Orta","aciklama":"...","aksiyon":"..."},{"baslik":"...","olasilik":"Düşük","aciklama":"...","aksiyon":"..."}],"oncelikli_oneri":"...","etkilenen_kurumlar":["MSB","Dışişleri"],"zaman_cercevesi":"Acil (0-48 saat)"}'
}

analysis_store = {}

@app.get("/")
async def root():
    html_path = os.path.join(os.path.dirname(__file__), "index.html")
    if os.path.exists(html_path):
        return FileResponse(html_path)
    return HTMLResponse("<h1>ANATOLIA-Q</h1><p>index.html bulunamadı.</p>")

@app.get("/health")
async def health():
    return {"status": "online", "system": "ANATOLIA-Q", "version": "1.0.0"}

@app.post("/api/analyze")
async def analyze(req: dict):
    domain = req.get("domain", "")
    situation = req.get("situation", "")
    api_key = os.environ.get("ANTHROPIC_API_KEY", req.get("api_key", ""))

    if domain not in DOMAIN_PROMPTS:
        raise HTTPException(400, "Geçersiz alan.")
    if not situation:
        raise HTTPException(400, "Durum bildirimi boş.")
    if not api_key:
        raise HTTPException(400, "API anahtarı eksik.")

    client = anthropic.Anthropic(api_key=api_key)
    user_msg = f"Durum:\n{situation}\n\nTarih: {datetime.now().strftime('%d.%m.%Y %H:%M')}\n\nSADECE JSON formatında yanıt ver."

    try:
        msg = client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=2000,
            system=DOMAIN_PROMPTS[domain],
            messages=[{"role": "user", "content": user_msg}]
        )
        raw = msg.content[0].text.strip()
        if "```json" in raw: raw = raw.split("```json")[1].split("```")[0].strip()
        elif "```" in raw: raw = raw.split("```")[1].split("```")[0].strip()

        result = json.loads(raw)
        aid = "AQ-" + uuid.uuid4().hex[:6].upper()
        analysis_store[aid] = {"id": aid, "domain": domain, "situation": situation, "result": result, "timestamp": datetime.now().isoformat()}
        return {"analysis_id": aid, "timestamp": datetime.now().strftime('%d.%m.%Y %H:%M'), **result}

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
