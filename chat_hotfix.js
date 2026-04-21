(() => {
  const turns = (window.__aqChatTurns = window.__aqChatTurns || []);
  const chatMode = () => typeof state !== "undefined" && state.domain === "genel_chat";
  const chatInput = () => document.getElementById("chatNameInput");
  function ensureStyle() {
    if (document.getElementById("aqChatStyle")) return;
    const style = document.createElement("style");
    style.id = "aqChatStyle";
    style.textContent = `#chatShell{display:grid;gap:16px}#chatShell.hidden{display:none!important}.aq-chat-log{display:grid;gap:14px;max-height:62vh;overflow:auto;padding:8px 2px}.aq-chat-empty{padding:20px;border:1px dashed rgba(105,224,255,.18);border-radius:18px;color:#9bb5d2;background:rgba(6,14,24,.55);font:14px/1.7 "IBM Plex Mono",monospace}.aq-chat-row{display:flex}.aq-chat-row.user{justify-content:flex-end}.aq-chat-row.assistant{justify-content:flex-start}.aq-chat-bubble{max-width:min(78ch,82%);padding:16px 18px;border-radius:20px;box-shadow:0 16px 32px rgba(0,0,0,.22);border:1px solid rgba(105,224,255,.12)}.aq-chat-row.user .aq-chat-bubble{background:linear-gradient(135deg,rgba(105,224,255,.22),rgba(94,144,255,.18));color:#eef7ff;border-bottom-right-radius:8px}.aq-chat-row.assistant .aq-chat-bubble{background:linear-gradient(180deg,rgba(8,20,34,.96),rgba(5,12,22,.98));color:#eef7ff;border-bottom-left-radius:8px}.aq-chat-role{margin-bottom:8px;font:11px "IBM Plex Mono",monospace;letter-spacing:.12em;text-transform:uppercase;color:#69e0ff}.aq-chat-text{white-space:pre-wrap;line-height:1.8;font-family:"IBM Plex Mono",monospace}.aq-chat-meta{margin-top:10px;font:12px/1.6 "IBM Plex Mono",monospace;color:#8fb2d4}.aq-chat-head{display:flex;justify-content:space-between;gap:12px;align-items:center;flex-wrap:wrap}.aq-chat-kicker{font:12px "IBM Plex Mono",monospace;letter-spacing:.1em;text-transform:uppercase;color:#69e0ff}.aq-chat-tip{font:12px "IBM Plex Mono",monospace;color:#9bb5d2}`;
    document.head.appendChild(style);
  }
  function ensureChatField() {
    if (document.getElementById("chatNameField")) return;
    const area = document.getElementById("sitInput");
    const field = area ? area.closest(".field") : null;
    if (!field || !field.parentElement) return;
    const wrap = document.createElement("div");
    wrap.id = "chatNameField";
    wrap.className = "field hidden";
    wrap.style.marginTop = "14px";
    wrap.innerHTML = '<label for="chatNameInput">Hitap adı (isteğe bağlı)</label><input id="chatNameInput" type="text" maxlength="24" placeholder="Örnek: Atabey"><div class="field-note">Genel Chat seni bu adla karşılayabilir ve daha doğal cevap verebilir.</div>';
    field.insertAdjacentElement("afterend", wrap);
    const input = chatInput();
    if (input) {
      input.addEventListener("input", () => { input.value = input.value.replace(/[^\p{L}\p{N}\s.-]/gu, "").slice(0, 24); });
      input.addEventListener("keydown", (event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); runChat(); } });
    }
  }
  function ensureShell() {
    ensureStyle();
    if (document.getElementById("chatShell")) return;
    const resultArea = document.getElementById("resultArea");
    if (!resultArea) return;
    const shell = document.createElement("section");
    shell.id = "chatShell";
    shell.className = "panel hidden";
    shell.innerHTML = '<div class="aq-chat-head"><div><div class="aq-chat-kicker">Genel Chat</div><strong style="display:block;margin-top:8px">Yazışma ekranı</strong></div><div class="aq-chat-tip">Sanki doğrudan sohbet ediyormuşsun gibi akacak.</div></div><div id="chatLog" class="aq-chat-log"></div>';
    resultArea.insertAdjacentElement("beforebegin", shell);
  }
  function renderTurns() {
    ensureShell();
    const log = document.getElementById("chatLog");
    if (!log) return;
    log.replaceChildren();
    if (!turns.length) {
      const empty = document.createElement("div");
      empty.className = "aq-chat-empty";
      empty.textContent = "Mesajını yaz ve gönder. Bu alanda analiz kartları yerine gerçek sohbet akışı göreceksin.";
      log.appendChild(empty);
      return;
    }
    turns.forEach((item) => {
      const row = document.createElement("div");
      row.className = `aq-chat-row ${item.role}`;
      const bubble = document.createElement("div");
      bubble.className = "aq-chat-bubble";
      const role = document.createElement("div");
      role.className = "aq-chat-role";
      role.textContent = item.role === "user" ? "Sen" : "ANATOLIA-Q";
      const text = document.createElement("div");
      text.className = "aq-chat-text";
      text.textContent = item.text || "";
      bubble.appendChild(role); bubble.appendChild(text);
      if (item.meta) { const meta = document.createElement("div"); meta.className = "aq-chat-meta"; meta.textContent = item.meta; bubble.appendChild(meta); }
      row.appendChild(bubble); log.appendChild(row);
    });
    log.scrollTop = log.scrollHeight;
  }
  function pushTurn(role, text, meta = "") { turns.push({ role, text, meta }); renderTurns(); }
  function syncMode() {
    ensureChatField(); ensureShell();
    const sitLabel = document.getElementById("sitLabel") || document.querySelector('label[for="sitInput"]');
    const runBtn = document.getElementById("runBtn"); const injectBtn = document.getElementById("injectBtn"); const downloadBtn = document.getElementById("downloadBtn");
    const title = document.getElementById("analysisTitle"); const sub = document.getElementById("analysisSubtitle");
    const wrap = document.getElementById("chatNameField"); const result = document.getElementById("resultArea"); const shell = document.getElementById("chatShell");
    if (chatMode()) {
      if (sitLabel) sitLabel.textContent = "Mesajın"; if (runBtn) runBtn.textContent = "Mesajı gönder"; if (injectBtn) injectBtn.textContent = "Konu öner"; if (downloadBtn) downloadBtn.textContent = "Sohbet indir";
      if (title) title.textContent = "Serbest sohbet ve genel bilgi alanı"; if (sub) sub.textContent = "Genel kültür, günlük bilgi ve rahat tonda gerçek sohbet ekranı.";
      if (wrap) wrap.classList.remove("hidden"); if (result) result.classList.add("hidden"); if (shell) shell.classList.remove("hidden"); renderTurns();
    } else {
      if (sitLabel) sitLabel.textContent = "Durum bildirimi"; if (runBtn) runBtn.textContent = "Analiz başlat"; if (injectBtn) injectBtn.textContent = "Şablon ekle"; if (downloadBtn) downloadBtn.textContent = "Rapor indir";
      if (wrap) wrap.classList.add("hidden"); if (result) result.classList.remove("hidden"); if (shell) shell.classList.add("hidden");
    }
  }
  async function runChat() {
    const input = document.getElementById("sitInput"), status = document.getElementById("analysisStatus"), load = document.getElementById("analysisLoad"), runBtn = document.getElementById("runBtn");
    const text = input ? input.value.trim() : ""; if (!text) { if (typeof setStatus === "function") setStatus(status, "error", chatMode() ? "Mesaj alanı boş bırakılamaz." : "Durum bildirimi boş bırakılamaz."); return; }
    const name = chatInput() ? chatInput().value.trim() : ""; if (chatMode()) pushTurn("user", text, name ? `Hitap adı: ${name}` : "");
    if (runBtn) runBtn.disabled = true; if (typeof setLoading === "function") setLoading(load, true); if (typeof setStatus === "function") setStatus(status, "", "");
    try {
      const result = await apiFetch("/api/analyze", { method: "POST", body: JSON.stringify({ domain: state.domain, situation: text, chat_name: name }) });
      if (chatMode()) {
        const meta = [result.tehdit_analizi || "", result.sohbet_tonu || ""].filter(Boolean).join(" | ");
        pushTurn("assistant", result.ozet || "Bir cevap üretildi.", meta);
        if (typeof appendHistoryEntry === "function") appendHistoryEntry(result); if (typeof switchPage === "function") switchPage("analysis"); if (input) input.value = ""; if (typeof updateWordCount === "function") updateWordCount();
        if (typeof setStatus === "function") setStatus(status, result.fallback_mode ? "warn" : "success", result.fallback_mode ? "Sohbet cevabı sohbet çekirdeğiyle üretildi." : "Sohbet cevabı hazır."); syncMode();
      } else {
        if (typeof renderResult === "function") renderResult(result); if (typeof appendHistoryEntry === "function") appendHistoryEntry(result); if (typeof switchPage === "function") switchPage("analysis");
        if (typeof setStatus === "function") setStatus(status, result.fallback_mode ? "warn" : "success", result.fallback_mode ? "AI servis sınırında yedek analiz kullanıldı." : "Analiz başarıyla üretildi.");
      }
    } catch (error) {
      if (chatMode() && turns.length && turns[turns.length - 1].role === "user") pushTurn("assistant", "Bu turda yanıt üretirken küçük bir aksaklık oldu. Aynı mesajı tekrar denersen devam ederiz.", error.message || "Geçici hata");
      if (typeof setStatus === "function") setStatus(status, "error", error.message || (chatMode() ? "Sohbet cevabı üretilemedi." : "Analiz üretilemedi."));
    } finally { if (runBtn) runBtn.disabled = false; if (typeof setLoading === "function") setLoading(load, false); }
  }
  function bindRunFix() {
    const runBtn = document.getElementById("runBtn");
    if (runBtn && runBtn.dataset.chatFixed !== "1") { runBtn.dataset.chatFixed = "1"; runBtn.addEventListener("click", (event) => { event.preventDefault(); event.stopImmediatePropagation(); runChat(); }, true); }
    const clearBtn = document.getElementById("clearBtn");
    if (clearBtn && clearBtn.dataset.chatFixed !== "1") { clearBtn.dataset.chatFixed = "1"; clearBtn.addEventListener("click", (event) => { if (!chatMode()) return; event.preventDefault(); event.stopImmediatePropagation(); const input = document.getElementById("sitInput"); if (input) input.value = ""; if (chatInput()) chatInput().value = ""; if (typeof updateWordCount === "function") updateWordCount(); if (typeof setStatus === "function") setStatus(document.getElementById("analysisStatus"), "", ""); }, true); }
  }
  function patchDomain() { if (typeof setDomain !== "function" || window.__aqChatDomainPatched) return; window.__aqChatDomainPatched = true; const original = setDomain; setDomain = function () { const output = original.apply(this, arguments); syncMode(); return output; }; }
  function patchPreset() { if (typeof injectTemplate !== "function" || window.__aqChatPresetPatched) return; window.__aqChatPresetPatched = true; const original = injectTemplate; injectTemplate = function () { original.apply(this, arguments); if (chatMode()) { const input = document.getElementById("sitInput"); if (input) input.value = "Bana normal bir yapay zeka sohbeti gibi cevap ver. Genel kültür, günlük bilgi veya herhangi bir konuyu rahat ama akıllı bir tonda anlat."; if (typeof updateWordCount === "function") updateWordCount(); } }; }
  function init() { ensureChatField(); ensureShell(); patchDomain(); patchPreset(); bindRunFix(); syncMode(); renderTurns(); }
  document.readyState === "loading" ? document.addEventListener("DOMContentLoaded", init) : init();
})();