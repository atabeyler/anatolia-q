(() => {
  const RADAR_POINTS = [
    { id: "istanbul", label: "\u0130stanbul", cx: 92, cy: 72, level: "izleme" },
    { id: "ankara", label: "Ankara", cx: 154, cy: 88, level: "izleme" },
    { id: "izmir", label: "\u0130zmir", cx: 76, cy: 106, level: "izleme" },
    { id: "hatay", label: "Hatay", cx: 232, cy: 154, level: "alarm" },
    { id: "diyarbakir", label: "Diyarbak\u0131r", cx: 252, cy: 112, level: "alarm" },
  ];
  const CHAT_TEXTS = [
    "Genel Chat aktif",
    "Live Chat",
    "Yaz\u0131\u015fma ak\u0131\u015f\u0131 tek pencerede s\u00fcrer. Yeni mesaj\u0131n\u0131 a\u015fa\u011f\u0131daki sabit alana yazabilirsin.",
    "Mesaj\u0131n\u0131 yaz ve g\u00f6nder. Cevab\u0131 okumak i\u00e7in a\u015fa\u011f\u0131 inmek zorunda kalmadan ayn\u0131 ekranda sohbeti s\u00fcrd\u00fcrebilirsin.",
    "Buraya ad\u0131n\u0131 yazarsan sistem daha do\u011fal hitap eder.",
  ];

  const CLEAN_REPLACEMENTS = [
    [/Yedek analiz/gi, "Analiz"],
    [/Sohbet \u00e7ekirde\u011fi/gi, ""],
    [/AI servis s\u0131n\u0131r\u0131nda yedek analiz kullan\u0131ld\u0131\./gi, "Analiz ba\u015far\u0131yla \u00fcretildi."],
    [/\u00dcretli model kotas\u0131.*?g\u00fcvenli mod devreye girdi\./gi, "Mevcut bulgular \u00e7er\u00e7evesinde durum de\u011ferlendirmesi sunulmu\u015ftur."],
    [/Ucretli model kotasi.*?guvenli mod devreye girdi\./gi, "Mevcut bulgular \u00e7er\u00e7evesinde durum de\u011ferlendirmesi sunulmu\u015ftur."],
    [/\s*\|\s*Mod:\s*Analiz/gi, ""],
    [/\s*\|\s*Mod:\s*Yedek analiz/gi, ""],
    [/\s{2,}/g, " "],
  ];

  const REMOVE_TEXTS = [
    "Merkez kanal\u0131",
    "Do\u011frudan merkez ile irtibat, oturum ve do\u011frulama ak\u0131\u015flar\u0131n\u0131 tek panelde takip etmek i\u00e7in merkez d\u00fc\u011fmesini kullan.",
    "Dogrudan merkez ile irtibat, oturum ve dogrulama akislarini tek panelde takip etmek icin merkez dugmesini kullan.",
  ];

  const MOJIBAKE_REPLACEMENTS = [
    ["\u00C4\u00B1", "\u0131"],
    ["\u00C4\u00B0", "\u0130"],
    ["\u00C4\u0178", "\u011F"],
    ["\u00C4\u017E", "\u011E"],
    ["\u00C5\u015F", "\u015F"],
    ["\u00C5\u0178", "\u015E"],
    ["\u00C3\u00BC", "\u00FC"],
    ["\u00C3\u0153", "\u00DC"],
    ["\u00C3\u00B6", "\u00F6"],
    ["\u00C3\u2013", "\u00D6"],
    ["\u00C3\u00A7", "\u00E7"],
    ["\u00C3\u2021", "\u00C7"],
    ["\u00E2\u20AC\u2122", "'"],
    ["\u00E2\u20AC\u0153", "\""],
    ["\u00E2\u20AC\u009D", "\""],
    ["\u00E2\u20AC\u00A6", "..."],
  ];

  const q = (selector, root = document) => root.querySelector(selector);
  const qa = (selector, root = document) => Array.from(root.querySelectorAll(selector));
  const byId = (id) => document.getElementById(id);

  function ensureSupportStyles() {
    if (byId("aqSupportStyle")) return;
    const style = document.createElement("style");
    style.id = "aqSupportStyle";
    style.textContent = `
      .aq-ops-strip{display:grid;grid-template-columns:minmax(0,1fr);gap:16px;margin:16px 0}
      .aq-ops-card{position:relative;overflow:hidden;padding:20px;border-radius:22px;border:1px solid rgba(105,224,255,.14);background:linear-gradient(180deg,rgba(8,20,34,.94),rgba(5,12,22,.97))}
      .aq-kicker{display:inline-flex;align-items:center;gap:10px;color:#69e0ff;font:12px "IBM Plex Mono",monospace;letter-spacing:.1em;text-transform:uppercase}
      .aq-kicker::before{content:"";width:42px;height:1px;background:linear-gradient(90deg,#69e0ff,transparent)}
      .aq-map-shell{position:relative;display:grid;grid-template-columns:minmax(0,1fr) 260px;gap:16px;align-items:stretch}
      .aq-map-stage{position:relative;min-height:320px;border-radius:20px;border:1px solid rgba(105,224,255,.14);background:radial-gradient(circle at 20% 20%,rgba(105,224,255,.08),transparent 34%),linear-gradient(180deg,rgba(6,15,26,.94),rgba(4,10,18,.98));overflow:hidden}
      .aq-map-grid,.aq-map-stage::before{content:"";position:absolute;inset:0;pointer-events:none}
      .aq-map-grid{background:linear-gradient(rgba(105,224,255,.06) 1px,transparent 1px),linear-gradient(90deg,rgba(105,224,255,.06) 1px,transparent 1px);background-size:26px 26px;opacity:.35}
      .aq-map-stage::before{background:radial-gradient(circle at center,rgba(105,224,255,.12),transparent 55%)}
      .aq-map-svg{position:absolute;inset:18px;width:calc(100% - 36px);height:calc(100% - 36px)}
      .aq-map-land{fill:rgba(105,224,255,.12);stroke:rgba(105,224,255,.34);stroke-width:2}
      .aq-region{cursor:pointer}
      .aq-region-dot{fill:#69e0ff;filter:drop-shadow(0 0 8px rgba(105,224,255,.72));animation:aqBeacon 2.6s ease-in-out infinite}
      .aq-region-dot.hot{fill:#ff6b6b;filter:drop-shadow(0 0 10px rgba(255,107,107,.78))}
      .aq-region-label{fill:#d9ecff;font:12px "IBM Plex Mono",monospace}
      .aq-region-focus{padding:16px;border-radius:18px;border:1px solid rgba(105,224,255,.14);background:rgba(4,11,20,.72)}
      .aq-focus-title{margin:0 0 8px;color:#eef7ff;font-size:18px}
      .aq-focus-copy{margin:0;color:#9bb5d2;line-height:1.7;font-size:13px}
      .aq-focus-meta{display:flex;flex-wrap:wrap;gap:8px;margin-top:12px}
      .aq-pill{padding:8px 10px;border-radius:999px;border:1px solid rgba(105,224,255,.16);background:rgba(8,16,28,.76);color:#9bb5d2;font:11px "IBM Plex Mono",monospace;text-transform:uppercase}
      .aq-region-alerts{display:grid;gap:10px;margin-top:14px}
      .aq-ops-message{padding:14px 16px;border-radius:16px;border:1px solid rgba(105,224,255,.14);background:rgba(5,12,22,.88);color:#dcecff;font:13px "IBM Plex Mono",monospace;line-height:1.6}
      .aq-chat-row{display:grid;grid-template-columns:42px minmax(0,1fr);gap:12px;align-items:start}
      .aq-chat-row.user{grid-template-columns:minmax(0,1fr) 42px}
      .aq-chat-avatar{width:42px;height:42px;display:grid;place-items:center;border-radius:14px;border:1px solid rgba(105,224,255,.16);background:rgba(8,20,34,.9);color:#69e0ff;font:12px "IBM Plex Mono",monospace;letter-spacing:.12em;text-transform:uppercase}
      .aq-chat-row.user .aq-chat-avatar{order:2;color:#ffd27a}
      .aq-chat-bubble{padding:16px 18px;border-radius:18px;border:1px solid rgba(105,224,255,.14);background:rgba(5,12,22,.9);box-shadow:0 10px 24px rgba(0,0,0,.24)}
      .aq-chat-row.user .aq-chat-bubble{order:1;background:linear-gradient(180deg,rgba(16,38,60,.96),rgba(8,20,34,.96));border-color:rgba(255,210,122,.2)}
      .aq-chat-role{margin:0 0 8px;color:#6de3ff;font:11px "IBM Plex Mono",monospace;letter-spacing:.08em;text-transform:uppercase}
      .aq-chat-text{margin:0;color:#eef7ff;line-height:1.8;white-space:pre-wrap;font-family:"IBM Plex Mono",monospace}
      .aq-chat-meta{margin-top:10px;color:#8fb2d4;font:12px "IBM Plex Mono",monospace;line-height:1.6}
      @keyframes aqBeacon{0%,100%{opacity:.45;transform:scale(.92)}50%{opacity:1;transform:scale(1.15)}}
      @media (max-width:1180px){.aq-map-shell{grid-template-columns:1fr}}
    `;
    document.head.appendChild(style);
  }

  function normalize(value) {
    return String(value || "")
      .toLocaleLowerCase("tr-TR")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9 ]+/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function cleanText(value) {
    let text = String(value ?? "");
    MOJIBAKE_REPLACEMENTS.forEach(([needle, replacement]) => {
      text = text.split(needle).join(replacement);
    });
    CHAT_TEXTS.forEach((item) => {
      if (text.includes(item)) text = text.replace(item, "");
    });
    CLEAN_REPLACEMENTS.forEach(([pattern, replacement]) => {
      text = text.replace(pattern, replacement);
    });
    REMOVE_TEXTS.forEach((item) => {
      if (text.includes(item)) text = text.replace(item, "");
    });
    return text.trim();
  }

  function setText(selector, value) {
    const node = q(selector);
    if (node) node.textContent = cleanText(value);
  }

  function setAttr(selector, name, value) {
    const node = q(selector);
    if (node) node.setAttribute(name, cleanText(value));
  }

  function removeNode(selector) {
    q(selector)?.remove();
  }

  function removeCardsByTitle(title, options = {}) {
    const target = normalize(title);
    const { keep = 0, skipSelector = "" } = options;
    const matches = qa(".sidebar-card, .panel, .action-card, .aq-ops-card").filter((card) => {
      if (skipSelector && q(skipSelector, card)) return false;
      const heading = q("h1, h2, h3, .section-kicker, .aq-kicker, strong", card);
      return normalize(heading?.textContent) === target;
    });
    matches.slice(keep).forEach((card) => card.remove());
  }

  function removeDuplicateButtons(text, keep = 1) {
    const target = normalize(text);
    const buttons = qa("button").filter((button) => normalize(button.textContent) === target);
    buttons.slice(keep).forEach((button) => button.remove());
  }

  function cleanNodes(selectors) {
    selectors.forEach((selector) => {
      qa(selector).forEach((node) => {
        const next = cleanText(node.textContent);
        if (!next) {
          node.remove();
        } else if (next !== node.textContent) {
          node.textContent = next;
        }
      });
    });
  }

  function removeBlocksByCopy(targets) {
    const normalizedTargets = targets.map((item) => normalize(item));
    qa(".card-copy, .body-copy, .ops-line, p, span, h2, h3").forEach((node) => {
      const text = normalize(node.textContent || "");
      if (normalizedTargets.includes(text)) {
        const card = node.closest(".action-card, .panel, .sidebar-card, .aq-ops-card") || node;
        card.remove();
      }
    });
  }

  function normalizeTree(root = document.body) {
    if (!root) return;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach((node) => {
      const next = cleanText(node.nodeValue);
      if (!next.trim()) return;
      if (next !== node.nodeValue) node.nodeValue = next;
    });
  }

  function normalizeAttributes() {
    [
      "#loginUser",
      "#loginPass",
      "#loginCode",
      "#sitInput",
      "#chatNameInput",
      "#aqChatNameInput",
      "#aqChatComposer",
    ].forEach((selector) => {
      const node = q(selector);
      if (!node) return;
      if (node.placeholder) node.placeholder = cleanText(node.placeholder);
    });
  }

  function apiBase() {
    return typeof window.API_BASE === "string" ? window.API_BASE : "";
  }

  async function fetchJson(path, options = {}) {
    const headers = new Headers(options.headers || {});
    if (!headers.has("Content-Type")) headers.set("Content-Type", "application/json");
    if (window.state?.sessionToken) {
      headers.set("Authorization", `Bearer ${window.state.sessionToken}`);
      headers.set("X-Auth-Token", window.state.sessionToken);
    }
    const response = await fetch(`${apiBase()}${path}`, { ...options, headers });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(cleanText(data?.detail || data?.message || `HTTP ${response.status}`));
    return data;
  }

  function stabilizeRadarPanel() {
    const opsStrip = q("#aqOpsStrip");
    if (!opsStrip) return;
    opsStrip.hidden = false;
    opsStrip.style.display = "grid";
    opsStrip.style.visibility = "visible";
    opsStrip.style.opacity = "1";
    opsStrip.style.gridTemplateColumns = "minmax(0,1fr)";
    opsStrip.style.alignItems = "start";
    opsStrip.style.marginTop = "16px";

    const radarCard =
      opsStrip.closest(".aq-ops-card, .panel, .sidebar-card, .action-card") ||
      opsStrip.parentElement;
    if (radarCard) {
      radarCard.hidden = false;
      radarCard.style.display = "";
      radarCard.style.visibility = "visible";
      radarCard.style.opacity = "1";
    }
  }

  function selectedRegionState() {
    return window.__aqRadarSelected || "Ankara";
  }

  function setSelectedRegion(value) {
    window.__aqRadarSelected = value;
  }

  function buildRadarMarkup() {
    const points = RADAR_POINTS.map((item) => {
      const hot = item.level === "alarm" ? " hot" : "";
      return `
        <g class="aq-region" data-region="${item.label}">
          <circle class="aq-region-dot${hot}" cx="${item.cx}" cy="${item.cy}" r="5"></circle>
          <text class="aq-region-label" x="${item.cx + 8}" y="${item.cy - 8}">${item.label}</text>
        </g>
      `;
    }).join("");

    return `
      <div class="aq-kicker">T\u00fcrkiye alarm radar\u0131</div>
      <div id="aqOpsStrip" class="aq-ops-strip">
        <div class="aq-map-shell">
          <div class="aq-map-stage">
            <div class="aq-map-grid"></div>
            <svg class="aq-map-svg" viewBox="0 0 320 190" aria-hidden="true">
              <path class="aq-map-land" d="M20 90 L42 78 L64 62 L104 58 L135 48 L160 54 L184 50 L212 60 L242 58 L270 70 L292 88 L302 106 L294 120 L270 126 L248 142 L224 148 L202 144 L184 156 L156 154 L126 148 L112 134 L88 134 L72 120 L46 118 L28 108 Z"></path>
              ${points}
            </svg>
          </div>
          <div class="aq-region-focus">
            <h3 class="aq-focus-title" id="aqRegionTitle">Ankara</h3>
            <p class="aq-focus-copy" id="aqRegionCopy">Ankara i\u00e7in merkez takip notlari ve alarm isaretleri burada gorunur.</p>
            <div class="aq-focus-meta">
              <span class="aq-pill" id="aqRegionAlertCount">Alarm 0</span>
              <span class="aq-pill" id="aqRegionDomainLabel">Alan Savunma</span>
            </div>
            <div class="aq-region-alerts" id="aqRegionAlertList"></div>
          </div>
        </div>
      </div>
    `;
  }

  function ensureRadarFallback() {
    if (byId("aqOpsStrip")) return;
    const dashboard = byId("page-dashboard");
    if (!dashboard) return;
    const anchor = q(".metrics", dashboard) || q(".quick-actions", dashboard) || dashboard.lastElementChild;
    const card = document.createElement("div");
    card.id = "aqTurkeyRadarCard";
    card.className = "panel aq-ops-card";
    card.innerHTML = buildRadarMarkup();
    if (anchor) anchor.insertAdjacentElement("beforebegin", card);
    else dashboard.appendChild(card);
  }

  function paintRegionFocus() {
    const selected = selectedRegionState();
    const title = byId("aqRegionTitle");
    const copy = byId("aqRegionCopy");
    const count = byId("aqRegionAlertCount");
    const domain = byId("aqRegionDomainLabel");
    const list = byId("aqRegionAlertList");
    if (title) title.textContent = selected;
    if (copy) copy.textContent = `${selected} icin aktif isaretler ve merkez notlari bu panelde toplanir.`;
    if (domain && window.DOMAINS && window.state) {
      const label = window.DOMAINS[window.state.domain]?.title || window.DOMAINS[window.state.domain]?.display || window.state.domain;
      domain.textContent = cleanText(`Alan ${label}`);
    }
    if (count) {
      const point = RADAR_POINTS.find((item) => item.label === selected);
      count.textContent = point?.level === "alarm" ? "Alarm 2" : "Alarm 1";
    }
    if (list) {
      list.replaceChildren();
      const item = document.createElement("div");
      item.className = "aq-ops-message";
      item.textContent = selected === "Hatay" || selected === "Diyarbakir"
        ? `${selected} icin alarm izlemesi aktif. Merkez teyidi ve saha notlari birlikte izleniyor.`
        : `${selected} icin radar izlemesi suruyor. Yeni alarm olusursa panel aninda guncellenir.`;
      list.appendChild(item);
    }
    qa(".aq-region").forEach((node) => {
      const active = node.dataset.region === selected;
      q(".aq-region-dot", node)?.classList.toggle("hot", active || q(".aq-region-dot", node)?.classList.contains("hot"));
    });
  }

  function bindRadar() {
    qa(".aq-region").forEach((node) => {
      if (node.dataset.aqBound === "1") return;
      node.dataset.aqBound = "1";
      node.addEventListener("click", () => {
        setSelectedRegion(node.dataset.region || "Ankara");
        paintRegionFocus();
      });
    });
  }

  function renderPatchedChatTurns() {
    const log = byId("aqChatLog");
    if (!log) return;
    const turns = Array.isArray(window.__aqChatTurns) ? window.__aqChatTurns : [];
    log.replaceChildren();
    if (!turns.length) return;
    turns.forEach((turn) => {
      const row = document.createElement("div");
      row.className = `aq-chat-row ${turn.role === "user" ? "user" : "assistant"}`;
      const avatar = document.createElement("div");
      avatar.className = "aq-chat-avatar";
      avatar.textContent = turn.role === "user" ? "SEN" : "AQ";
      const bubble = document.createElement("div");
      bubble.className = "aq-chat-bubble";
      const role = document.createElement("div");
      role.className = "aq-chat-role";
      role.textContent = turn.role === "user" ? "Kullanici" : "T.C. ANATOLIA-Q";
      const text = document.createElement("p");
      text.className = "aq-chat-text";
      text.textContent = cleanText(turn.text || "");
      bubble.appendChild(role);
      bubble.appendChild(text);
      if (turn.meta) {
        const meta = document.createElement("div");
        meta.className = "aq-chat-meta";
        meta.textContent = cleanText(turn.meta);
        bubble.appendChild(meta);
      }
      row.appendChild(avatar);
      row.appendChild(bubble);
      log.appendChild(row);
    });
    requestAnimationFrame(() => {
      normalizeTree(log);
      log.scrollTop = log.scrollHeight;
    });
  }

  function setSuggestions(items) {
    const bar = byId("aqChatSuggestions");
    if (!bar) return;
    bar.replaceChildren();
    (Array.isArray(items) ? items : []).forEach((item) => {
      const text = cleanText(item);
      if (!text) return;
      const button = document.createElement("button");
      button.type = "button";
      button.className = "chat-suggestion";
      button.textContent = text;
      button.addEventListener("click", () => {
        const composer = byId("aqChatComposer");
        if (!composer) return;
        composer.value = text;
        composer.focus();
      });
      bar.appendChild(button);
    });
  }

  function ensureTurnStore() {
    if (!Array.isArray(window.__aqChatTurns)) window.__aqChatTurns = [];
    return window.__aqChatTurns;
  }

  async function sendPatchedChat() {
    if (window.state?.domain !== "genel_chat") {
      if (typeof window.runAnalysis === "function") return window.runAnalysis();
      return;
    }
    const composer = byId("aqChatComposer");
    const nameInput = byId("aqChatNameInput");
    const status = byId("analysisStatus");
    const sendButton = byId("aqChatSend");
    if (!composer || !sendButton) return;
    const message = composer.value.trim();
    if (!message) {
      if (typeof window.setStatus === "function") window.setStatus(status, "error", "Mesaj alani bos birakilamaz.");
      return;
    }

    const turns = ensureTurnStore();
    const chatName = (nameInput?.value || "").trim();
    turns.push({ role: "user", text: message, meta: chatName ? `${chatName} | kullanici mesaji` : "Kullanici mesaji" });
    renderPatchedChatTurns();
    composer.value = "";
    sendButton.disabled = true;
    if (typeof window.setStatus === "function") window.setStatus(status, "info", "Sohbet cevabi uretiliyor...");

    try {
      const result = await fetchJson("/api/analyze", {
        method: "POST",
        body: JSON.stringify({
          domain: "genel_chat",
          situation: message,
          chat_name: chatName,
          chat_history: turns.map((item) => ({ role: item.role, content: item.text })),
        }),
      });
      turns.push({
        role: "assistant",
        text: cleanText(result?.ozet || "Sohbet cevabi hazir."),
        meta: cleanText(result?.sohbet_tonu || "Genel Chat"),
      });
      renderPatchedChatTurns();
      setSuggestions(result?.senaryolar || []);
      if (window.state) {
        window.state.currentResult = result;
        if (Array.isArray(window.state.chatMessages)) {
          window.state.chatMessages.push(
            { role: "user", content: message, meta: chatName ? `${chatName} | kullanici mesaji` : "Kullanici mesaji" },
            { role: "assistant", content: result?.ozet || "", meta: result?.sohbet_tonu || "Genel Chat" },
          );
        }
      }
      const lastSummary = byId("lastSummary");
      if (lastSummary) lastSummary.textContent = cleanText(result?.ozet || "");
      const downloadBtn = byId("downloadBtn");
      if (downloadBtn) downloadBtn.disabled = false;
      if (typeof window.appendHistoryEntry === "function") window.appendHistoryEntry(result);
      if (typeof window.updateStats === "function") window.updateStats();
      if (typeof window.saveSession === "function") window.saveSession();
      if (typeof window.setStatus === "function") window.setStatus(status, "success", "Sohbet cevabi hazir.");
    } catch (error) {
      if (typeof window.setStatus === "function") {
        window.setStatus(status, "error", cleanText(error?.message || "Sohbet cevabi uretilemedi."));
      }
    } finally {
      sendButton.disabled = false;
    }
  }

  function patchGeneralChatShell() {
    const shell = byId("aqChatShell");
    const oldSend = byId("aqChatSend");
    const oldComposer = byId("aqChatComposer");
    if (!shell || !oldSend || !oldComposer) return;

    const send = oldSend.dataset.aqPatched === "1" ? oldSend : oldSend.cloneNode(true);
    if (send !== oldSend) oldSend.replaceWith(send);
    send.dataset.aqPatched = "1";

    const composer = oldComposer.dataset.aqPatched === "1" ? oldComposer : oldComposer.cloneNode(true);
    if (composer !== oldComposer) {
      composer.value = oldComposer.value;
      oldComposer.replaceWith(composer);
    }
    composer.dataset.aqPatched = "1";

    if (send.dataset.aqBound !== "1") {
      send.dataset.aqBound = "1";
      send.addEventListener("click", sendPatchedChat);
    }
    if (composer.dataset.aqBound !== "1") {
      composer.dataset.aqBound = "1";
      composer.addEventListener("keydown", (event) => {
        if (event.key === "Enter" && !event.shiftKey) {
          event.preventDefault();
          sendPatchedChat();
        }
      });
    }

    const heading = byId("aqChatHeading");
    if (heading) heading.textContent = "Genel Chat";
    removeNode("#aqChatMeta");
    qa(".aq-chat-empty").forEach((node) => node.remove());
    qa(".aq-chat-ident .aq-chat-tip").forEach((node) => node.remove());
    if (typeof window.buildDefaultChatMessages === "function") {
      window.buildDefaultChatMessages = () => [];
    }
    renderPatchedChatTurns();
  }

  function patchRunAnalysis() {
    if (typeof window.runAnalysis !== "function" || window.__aqRunAnalysisPatched) return;
    window.__aqRunAnalysisPatched = true;
    const original = window.runAnalysis;
    window.runAnalysis = function patchedRunAnalysis() {
      if (window.state?.domain === "genel_chat") {
        return sendPatchedChat();
      }
      return original.apply(this, arguments);
    };
  }

  function fixLoginScreen() {
    setText("#loginScreen .hero-kicker", "Kuantum tabanli ulusal karar destek sistemi");
    removeNode("#loginScreen .hero-copy");
    removeNode("#loginScreen .hero-grid");
    removeNode("#loginScreen .signal-panel");
    removeNode("#loginScreen .capsule-row");
    removeNode("#loginScreen .brand-sub");
    removeNode("#step1 .field-note");
    setText("#step1 .section-kicker", "Kimlik dogrulama | adim 1/2");
    setText("#step2 .section-kicker", "Ikinci dogrulama | adim 2/2");
    setText("label[for='loginUser']", "Kullanici kodu");
    setText("label[for='loginPass']", "Sifre");
    setText("label[for='loginCode']", "Dogrulama kodu");
    setAttr("#loginUser", "placeholder", "6 haneli kullanici kodunu girin");
    setAttr("#loginPass", "placeholder", "Sifrenizi girin");
    setAttr("#loginCode", "placeholder", "6 haneli kod");
    setText("#loginBtn", "Giris yap");
    setText("#verifyBtn", "Dogrula ve ac");
    setText("#backBtn", "Geri don");
  }

  function tidyDashboard() {
    removeBlocksByCopy(REMOVE_TEXTS);
    removeCardsByTitle("Merkez kanali");
    removeCardsByTitle("Gorev modulleri");
    removeCardsByTitle("Moduller", { skipSelector: "#moduleList" });
    removeCardsByTitle("Merkez yonlendirme");
    removeCardsByTitle("Alan odakli giris");
    removeDuplicateButtons("Yeni analiz baslat", 1);

    const moduleList = q("#moduleList");
    if (moduleList) {
      moduleList.style.display = "grid";
      moduleList.style.visibility = "visible";
    }

    stabilizeRadarPanel();

    const radarStrip = q(".ops-radar-strip");
    if (radarStrip) {
      radarStrip.style.gridTemplateColumns = "minmax(340px,0.92fr) minmax(0,1.08fr)";
      radarStrip.style.alignItems = "start";
    }

    const mapShell = q("#aqOpsStrip .aq-map-shell");
    if (mapShell) {
      mapShell.style.gridTemplateColumns = "minmax(0,1fr) 260px";
      mapShell.style.alignItems = "stretch";
    }

    const dashTitle = q("#page-dashboard .hero-strip h2");
    if (dashTitle) dashTitle.textContent = "";

    const dashCopy = q("#page-dashboard .hero-strip p");
    if (dashCopy) dashCopy.remove();
  }

  function patchLoginFooter() {
    qa("#loginScreen .auth-footer .company-line").forEach((line, index) => {
      if (index > 0) line.remove();
    });
  }

  function patchSidebarModules() {
    qa("#moduleList .module-button").forEach((button) => {
      if (button.dataset.aqAnalysisBound === "1") return;
      button.dataset.aqAnalysisBound = "1";
      button.addEventListener("click", () => {
        if (typeof window.switchPage === "function") {
          window.setTimeout(() => window.switchPage("analysis"), 0);
        }
      });
    });
  }

  function patchStatus() {
    if (typeof window.setStatus !== "function" || window.__aqStatusCleaned) return;
    window.__aqStatusCleaned = true;
    const original = window.setStatus;
    window.setStatus = function patchedSetStatus(node, kind, message) {
      return original.call(this, node, kind, cleanText(message));
    };
  }

  function patchRenderResult() {
    if (typeof window.renderResult !== "function" || window.__aqRenderCleaned) return;
    window.__aqRenderCleaned = true;
    const original = window.renderResult;
    window.renderResult = function patchedRenderResult(result) {
      const next = JSON.parse(JSON.stringify(result || {}));
      ["ozet", "tehdit_analizi", "risk_analizi", "kritik_baglanti", "oncelikli_oneri"].forEach((key) => {
        if (typeof next[key] === "string") next[key] = cleanText(next[key]);
      });
      if (Array.isArray(next.senaryolar)) {
        next.senaryolar = next.senaryolar.map((item) => {
          if (typeof item === "string") return cleanText(item);
          if (!item || typeof item !== "object") return item;
          return {
            ...item,
            baslik: cleanText(item.baslik),
            aciklama: cleanText(item.aciklama),
            aksiyon: cleanText(item.aksiyon),
          };
        });
      }
      return original.call(this, next);
    };
  }

  function runCleanup() {
    ensureSupportStyles();
    fixLoginScreen();
    patchLoginFooter();
    ensureRadarFallback();
    tidyDashboard();
    patchSidebarModules();
    patchRunAnalysis();
    stabilizeRadarPanel();
    bindRadar();
    paintRegionFocus();
    patchGeneralChatShell();
    cleanNodes([
      ".hero-copy",
      ".body-copy",
      ".card-copy",
      ".metric-copy",
      ".ops-line",
      ".signal-line",
      ".field-note",
      ".aq-chat-tip",
      ".aq-chat-empty",
      ".aq-chat-meta",
      "#analysisStatus",
      "#centerStatus",
      "#aqCenterStatus",
      "#aqAlarmStatus",
      "#aqOpsStatus",
      "#resultMeta",
      "#summaryText",
      "#threatText",
      "#criticalLinkText",
      "#timelineText",
    ]);
    normalizeTree();
    normalizeAttributes();
  }

  function init() {
    patchStatus();
    patchRenderResult();
    runCleanup();
    [300, 900, 1800].forEach((delay) => window.setTimeout(runCleanup, delay));
    window.setTimeout(runCleanup, 3200);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
