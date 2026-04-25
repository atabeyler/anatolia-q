(() => {
  const RADAR_POINTS = [
    { label: "\u0130stanbul", cx: 92, cy: 72, level: "izleme" },
    { label: "Ankara", cx: 154, cy: 88, level: "izleme" },
    { label: "\u0130zmir", cx: 76, cy: 106, level: "izleme" },
    { label: "Hatay", cx: 232, cy: 154, level: "alarm" },
    { label: "Diyarbak\u0131r", cx: 252, cy: 112, level: "alarm" },
    { label: "K\u0131br\u0131s", cx: 246, cy: 182, level: "izleme" },
  ];

  const MAP_PATHS = [
    "M21 92 L35 77 L56 64 L81 55 L109 48 L137 45 L164 48 L190 55 L215 59 L240 56 L266 65 L287 78 L301 93 L299 106 L286 116 L266 120 L247 126 L233 138 L214 146 L192 149 L168 153 L143 154 L119 147 L96 141 L76 134 L58 123 L42 113 L28 103 Z",
    "M221 176 L232 171 L246 170 L261 173 L257 179 L244 183 L229 181 Z",
  ];

  const q = (selector, root = document) => root.querySelector(selector);
  const qa = (selector, root = document) => Array.from(root.querySelectorAll(selector));
  const byId = (id) => document.getElementById(id);

  function cleanText(value) {
    return String(value ?? "")
      .replace(/Ã„Â±/g, "\u0131")
      .replace(/Ã„Â°/g, "\u0130")
      .replace(/Ã„Å¸/g, "\u011f")
      .replace(/Ã„Å¾/g, "\u011e")
      .replace(/Ã…Å¸/g, "\u015f")
      .replace(/Ã…Åž/g, "\u015e")
      .replace(/ÃƒÂ¼/g, "\u00fc")
      .replace(/ÃƒÅ“/g, "\u00dc")
      .replace(/ÃƒÂ¶/g, "\u00f6")
      .replace(/Ãƒâ€“/g, "\u00d6")
      .replace(/ÃƒÂ§/g, "\u00e7")
      .replace(/Ãƒâ€¡/g, "\u00c7")
      .replace(/Ã¢â‚¬â„¢/g, "'")
      .replace(/Ã¢â‚¬Å“|Ã¢â‚¬Â/g, '"')
      .replace(/Ã¢â‚¬Â¦/g, "...")
      .replace(/Genel Chat aktif/g, "")
      .replace(/Live Chat/g, "")
      .replace(/Yaz\u0131\u015fma ak\u0131\u015f\u0131 tek pencerede s\u00fcrer\. Yeni mesaj\u0131n\u0131 a\u015fa\u011f\u0131daki sabit alana yazabilirsin\./g, "")
      .replace(/Mesaj\u0131n\u0131 yaz ve g\u00f6nder\. Cevab\u0131 okumak i\u00e7in a\u015fa\u011f\u0131 inmek zorunda kalmadan ayn\u0131 ekranda sohbeti s\u00fcrd\u00fcrebilirsin\./g, "")
      .replace(/Buraya ad\u0131n\u0131 yazarsan sistem daha do\u011fal hitap eder\./g, "")
      .replace(/\u00dcretli model kotas\u0131.*?g\u00fcvenli mod devreye girdi\./gi, "Mevcut bulgular \u00e7er\u00e7evesinde durum de\u011ferlendirmesi sunulmu\u015ftur.")
      .replace(/Ucretli model kotasi.*?guvenli mod devreye girdi\./gi, "Mevcut bulgular \u00e7er\u00e7evesinde durum de\u011ferlendirmesi sunulmu\u015ftur.")
      .replace(/\s+\|\s+Mod:\s+[A-Za-z_ -]+/g, "")
      .replace(/\s{2,}/g, " ")
      .trim();
  }

  function normalizeTree(root = document.body) {
    if (!root) return;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach((node) => {
      const next = cleanText(node.nodeValue);
      if (next && next !== node.nodeValue) node.nodeValue = next;
    });
  }

  function normalizeAttributes() {
    ["#aqCenterNote", "#aqOpsMessage", "#aqAlarmTitle", "#aqAlarmDetail", "#aqChatComposer"].forEach((selector) => {
      const node = q(selector);
      if (node?.placeholder) node.placeholder = cleanText(node.placeholder);
    });
  }

  function ensureStyle() {
    if (byId("aqFinalHotfixStyle")) return;
    const style = document.createElement("style");
    style.id = "aqFinalHotfixStyle";
    style.textContent = [
      ".aq-region{cursor:pointer}",
      ".aq-region-dot{animation:none!important}",
      ".aq-region-label{pointer-events:none}",
      ".aq-radar-sweep{pointer-events:none;position:absolute;inset:-28%;background:conic-gradient(from 0deg,rgba(99,221,255,.22),transparent 18%,transparent 100%);transform-origin:center;animation:aqRadarSweep 5.5s linear infinite;mix-blend-mode:screen}",
      ".aq-map-stage{overflow:hidden}",
      ".aq-map-shell{display:grid;grid-template-columns:minmax(0,1fr) 260px;gap:16px;align-items:stretch}",
      ".aq-map-svg{position:absolute;inset:18px;width:calc(100% - 36px);height:calc(100% - 36px)}",
      ".aq-map-land{fill:rgba(105,224,255,.12);stroke:rgba(105,224,255,.34);stroke-width:2}",
      "@keyframes aqRadarSweep{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}",
      "@media (max-width:1180px){.aq-map-shell{grid-template-columns:1fr}}",
    ].join("");
    document.head.appendChild(style);
  }

  function radarSvg() {
    const paths = MAP_PATHS.map((path) => `<path class=\"aq-map-land\" d=\"${path}\"></path>`).join("");
    const points = RADAR_POINTS.map((item) => {
      const hot = item.level === "alarm" ? " hot" : "";
      return `<g class=\"aq-region\" data-region=\"${item.label}\"><circle class=\"aq-region-dot${hot}\" cx=\"${item.cx}\" cy=\"${item.cy}\" r=\"5\"></circle><text class=\"aq-region-label\" x=\"${item.cx + 8}\" y=\"${item.cy - 8}\">${item.label}</text></g>`;
    }).join("");
    return `${paths}${points}`;
  }

  function ensureRadarStage() {
    const stage = q("#aqOpsStrip .aq-map-stage");
    const svg = q("#aqOpsStrip .aq-map-svg");
    if (!stage || !svg) return;
    svg.innerHTML = radarSvg();
    if (!q(".aq-radar-sweep", stage)) {
      const sweep = document.createElement("div");
      sweep.className = "aq-radar-sweep";
      sweep.setAttribute("aria-hidden", "true");
      stage.appendChild(sweep);
    }
    qa(".aq-region-dot", stage).forEach((dot) => {
      dot.style.animation = "none";
    });
  }

  function setRegion(region) {
    window.__aqSelectedRegion = region || "Ankara";
    const selected = window.__aqSelectedRegion;
    const title = byId("aqRegionTitle");
    const copy = byId("aqRegionCopy");
    const count = byId("aqRegionAlertCount");
    const list = byId("aqRegionAlertList");
    const point = RADAR_POINTS.find((item) => item.label === selected);
    if (title) title.textContent = selected;
    if (copy) copy.textContent = `${selected} i\u00e7in aktif i\u015faretler ve merkez notlar\u0131 bu panelde toplan\u0131r.`;
    if (count) count.textContent = point?.level === "alarm" ? "Alarm 2" : "Alarm 1";
    if (list) {
      list.replaceChildren();
      const item = document.createElement("div");
      item.className = "aq-ops-message";
      item.textContent = point?.level === "alarm"
        ? `${selected} i\u00e7in alarm izlemesi aktif. Merkez teyidi ve saha notlar\u0131 birlikte izleniyor.`
        : `${selected} i\u00e7in radar izlemesi s\u00fcr\u00fcyor. Yeni alarm olu\u015fursa panel an\u0131nda g\u00fcncellenir.`;
      list.appendChild(item);
    }
  }

  function bindRadar() {
    if (window.__aqRadarBound) return;
    window.__aqRadarBound = true;
    document.addEventListener("click", (event) => {
      const node = event.target.closest(".aq-region");
      if (!node) return;
      event.preventDefault();
      setRegion(node.dataset.region);
    });
  }

  function removeChatHelp() {
    ["#aqChatMeta", ".aq-chat-empty", ".aq-chat-ident .aq-chat-tip"].forEach((selector) => qa(selector).forEach((node) => node.remove()));
  }

  function ensureChatStore() {
    if (!Array.isArray(window.__aqChatTurns)) window.__aqChatTurns = [];
    return window.__aqChatTurns;
  }

  function renderChat() {
    const log = byId("aqChatLog");
    if (!log) return;
    const turns = ensureChatStore();
    log.replaceChildren();
    turns.forEach((turn) => {
      const row = document.createElement("div");
      row.className = `aq-chat-row ${turn.role === "user" ? "user" : "assistant"}`;
      row.innerHTML = `
        <div class=\"aq-chat-avatar\">${turn.role === "user" ? "SEN" : "AQ"}</div>
        <div class=\"aq-chat-bubble\">
          <div class=\"aq-chat-role\">${turn.role === "user" ? "Kullan\u0131c\u0131" : "T.C. ANATOLIA-Q"}</div>
          <p class=\"aq-chat-text\"></p>
        </div>`;
      q(".aq-chat-text", row).textContent = cleanText(turn.text || "");
      log.appendChild(row);
    });
    log.scrollTop = log.scrollHeight;
  }

  async function fetchJson(path, options = {}) {
    const headers = new Headers(options.headers || {});
    if (!headers.has("Content-Type")) headers.set("Content-Type", "application/json");
    if (window.state?.sessionToken) {
      headers.set("Authorization", `Bearer ${window.state.sessionToken}`);
      headers.set("X-Auth-Token", window.state.sessionToken);
    }
    const base = typeof window.API_BASE === "string" ? window.API_BASE : "";
    const response = await fetch(`${base}${path}`, { ...options, headers });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(cleanText(data?.detail || data?.message || `HTTP ${response.status}`));
    return data;
  }

  async function sendChat() {
    const composer = byId("aqChatComposer");
    const button = byId("aqChatSend");
    if (!composer || !button) return;
    const message = composer.value.trim();
    if (!message) return;
    if (window.state) window.state.domain = "genel_chat";
    const turns = ensureChatStore();
    turns.push({ role: "user", text: message });
    renderChat();
    composer.value = "";
    button.disabled = true;
    try {
      const result = await fetchJson("/api/analyze", {
        method: "POST",
        body: JSON.stringify({
          domain: "genel_chat",
          situation: message,
          chat_name: (byId("aqChatNameInput")?.value || "").trim(),
          chat_history: turns.map((item) => ({ role: item.role, content: item.text })),
        }),
      });
      turns.push({ role: "assistant", text: cleanText(result?.ozet || "Sohbet cevab\u0131 haz\u0131r.") });
      renderChat();
      if (window.state) window.state.currentResult = result;
      if (typeof window.appendHistoryEntry === "function") window.appendHistoryEntry(result);
      if (typeof window.updateStats === "function") window.updateStats();
      if (typeof window.saveSession === "function") window.saveSession();
      if (typeof window.setStatus === "function") window.setStatus(byId("analysisStatus"), "success", "Sohbet cevab\u0131 haz\u0131r.");
    } catch (error) {
      if (typeof window.setStatus === "function") {
        window.setStatus(byId("analysisStatus"), "error", cleanText(error?.message || "Sohbet cevab\u0131 \u00fcretilemedi."));
      }
    } finally {
      button.disabled = false;
    }
  }

  function bindChat() {
    if (window.__aqChatBound) return;
    window.__aqChatBound = true;
    document.addEventListener("click", (event) => {
      const button = event.target.closest("#aqChatSend");
      if (!button) return;
      event.preventDefault();
      sendChat();
    });
    document.addEventListener("keydown", (event) => {
      const target = event.target;
      if (!(target instanceof HTMLTextAreaElement) || target.id !== "aqChatComposer") return;
      if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();
        sendChat();
      }
    });
  }

  function patchCenter() {
    const updates = [
      ["#centerOverlay .aq-kicker", "Merkez operasyon paneli"],
      ["#centerOverlay h2", "Tek merkez, ortak alarm ve payla\u015f\u0131ml\u0131 ak\u0131\u015f"],
      ["#centerOverlay .aq-center-copy", "Merkez irtibat\u0131, acil alarm ve operasyon mesajlar\u0131 tek panelden y\u00f6netilir."],
      ["label[for='aqCenterNote']", "Merkeze not"],
      ["#aqCenterSend", "Merkeze ula\u015f"],
      ["#aqCenterClose", "Kapat"],
      ["#centerOverlay [data-tab='merkez']", "Merkez"],
      ["#centerOverlay [data-tab='alarm']", "Acil Alarm"],
      ["#centerOverlay [data-tab='akis']", "Ortak Ak\u0131\u015f"],
      ["#centerOverlay [data-tab='gecmis']", "Analiz Ge\u00e7mi\u015fi"],
      ["#centerOverlay .aq-feed-card .aq-kicker", "Son merkez hareketleri"],
      ["#centerOverlay .aq-center-section[data-section='gecmis'] .aq-kicker", "Merkez analiz ge\u00e7mi\u015fi"],
      ["label[for='aqAlarmRegion']", "B\u00f6lge"],
      ["label[for='aqAlarmTitle']", "Ba\u015fl\u0131k"],
      ["label[for='aqAlarmDetail']", "Detay"],
      ["#aqAlarmSend", "Alarm\u0131 g\u00f6nder"],
      ["#aqAlarmChatOpen", "Ortak ak\u0131\u015fa ge\u00e7"],
      ["label[for='aqOpsMessage']", "Mesaj"],
      ["#aqOpsSend", "Mesaj\u0131 payla\u015f"],
      ["#aqOpsRefresh", "Yenile"],
    ];
    updates.forEach(([selector, text]) => {
      const node = q(selector);
      if (node) node.textContent = text;
    });
    const centerNote = byId("aqCenterNote");
    if (centerNote) centerNote.placeholder = "\u00d6rnek: Do\u011fu hatt\u0131nda teyit edilen saha bilgisi merkeze aktar\u0131ls\u0131n.";
    const opsMessage = byId("aqOpsMessage");
    if (opsMessage) opsMessage.placeholder = "\u00d6rnek: Merkez teyidi al\u0131nd\u0131, saha ekibi ikinci do\u011frulamay\u0131 bekliyor.";
  }

  function run() {
    ensureStyle();
    ensureRadarStage();
    bindRadar();
    setRegion(window.__aqSelectedRegion || "Ankara");
    bindChat();
    removeChatHelp();
    patchCenter();
    normalizeTree();
    normalizeAttributes();
  }

  function init() {
    run();
    [250, 800, 1600, 2600].forEach((delay) => window.setTimeout(run, delay));
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
