(() => {
  if (window.__aqUiPatchActive) return;
  window.__aqUiPatchActive = true;

  const FIXES = [
    ["\u00c4\u00b1", "\u0131"],
    ["\u00c4\u00b0", "\u0130"],
    ["\u00c4\u0178", "\u011f"],
    ["\u00c4\u017e", "\u011e"],
    ["\u00c5\u0178", "\u015f"],
    ["\u00c5\u017e", "\u015e"],
    ["\u00c3\u00bc", "\u00fc"],
    ["\u00c3\u0153", "\u00dc"],
    ["\u00c3\u00b6", "\u00f6"],
    ["\u00c3\u2013", "\u00d6"],
    ["\u00c3\u00a7", "\u00e7"],
    ["\u00c3\u2021", "\u00c7"],
    ["\u00e2\u20ac\u2122", "'"],
    ["\u00e2\u20ac\u0153", '"'],
    ["\u00e2\u20ac\u009d", '"'],
    ["\u00e2\u20ac\u00a6", "..."],
  ];

  const q = (selector, root = document) => root.querySelector(selector);
  const qa = (selector, root = document) => Array.from(root.querySelectorAll(selector));

  const norm = (value) => {
    let text = String(value ?? "");
    FIXES.forEach(([from, to]) => {
      text = text.split(from).join(to);
    });
    return text;
  };

  const clean = (value) =>
    norm(value)
      .toLocaleLowerCase("tr-TR")
      .replace(/[^\p{L}\p{N}\s]/gu, " ")
      .replace(/\s+/g, " ")
      .trim();

  const normalizeTree = (root = document.body) => {
    if (!root) return;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach((node) => {
      const fixed = norm(node.nodeValue);
      if (fixed !== node.nodeValue) node.nodeValue = fixed;
    });
    qa("input[placeholder], textarea[placeholder]", root).forEach((node) => {
      node.placeholder = norm(node.placeholder);
    });
  };

  const removeFooterEmailLine = () => {
    qa(".auth-footer .company-line").forEach((line) => {
      const text = clean(line.textContent);
      if (text.includes(clean("Merkez dogrulama ve oturum yonetimi kurumsal e posta hatti uzerinden ilerler"))) {
        line.remove();
      }
    });
  };

  const removeCenterCard = () => {
    qa(".sidebar-card").forEach((card) => {
      const title = clean(q("h3", card)?.textContent || card.textContent);
      const body = clean(q("p", card)?.textContent || "");
      if (
        title.includes(clean("Merkez kanali")) ||
        body.includes(clean("Dogrudan merkez ile irtibat oturum ve dogrulama akislarini tek panelde takip etmek icin merkez dugmesini kullan"))
      ) {
        card.remove();
      }
    });
  };

  const removeOperationCards = () => {
    qa(".hero-card, .guide-item").forEach((card) => {
      const text = clean(card.textContent);
      if (
        text.includes(clean("Tek vitrinde komuta")) ||
        text.includes(clean("Operasyon notu hizli analiz gecmis ve rapor ciktilari daginik ekran hissi olusturmadan ayni akista kalir")) ||
        text.includes(clean("Aktor zaman yer tetikleyici ve belirsizlik seviyesi gibi ayrintilar sonuc kalitesini artirir"))
      ) {
        card.remove();
      }
    });
  };

  const dedupeButtons = () => {
    const seen = [];
    qa("button, .button, .ghost-button").forEach((node) => {
      const text = clean(node.textContent);
      if (text !== clean("Yeni analiz baslat")) return;
      seen.push(node);
    });
    seen.slice(1).forEach((node) => {
      const box = node.closest(".action-card, .panel, .sidebar-card, .result-card");
      if (box) box.remove();
      else node.remove();
    });
  };

  const ensureRadarStyle = () => {
    if (q("#aqRadarRepairStyle")) return;
    const style = document.createElement("style");
    style.id = "aqRadarRepairStyle";
    style.textContent = `
      .aq-radar-panel .tr-radar-shell {
        display: grid;
        grid-template-columns: minmax(280px, 1fr) minmax(220px, 0.82fr);
        gap: 16px;
        align-items: stretch;
      }
      .aq-radar-stage {
        position: relative;
        min-height: 280px;
        border-radius: 20px;
        overflow: hidden;
        border: 1px solid rgba(117,182,255,.14);
        background:
          radial-gradient(circle at center, rgba(99,221,255,.14), transparent 52%),
          linear-gradient(180deg, rgba(6,16,28,.95), rgba(4,10,18,.98));
      }
      .aq-radar-stage::before {
        content: "";
        position: absolute;
        inset: 24px;
        border-radius: 50%;
        border: 1px solid rgba(99,221,255,.12);
      }
      .aq-radar-stage::after {
        content: "";
        position: absolute;
        inset: 12% 18%;
        border-radius: 50%;
        background: conic-gradient(from 0deg, rgba(99,221,255,.2), transparent 20%, transparent 100%);
        mix-blend-mode: screen;
        pointer-events: none;
        animation: aqRadarSpin 6s linear infinite;
      }
      .aq-radar-map {
        position: relative;
        z-index: 1;
        width: 100%;
        height: 100%;
        padding: 18px;
      }
      .aq-radar-land {
        fill: rgba(54,110,160,.25);
        stroke: rgba(117,222,255,.46);
        stroke-width: 2;
      }
      .aq-radar-point {
        cursor: pointer;
      }
      .aq-radar-point circle {
        fill: #63ddff;
        filter: drop-shadow(0 0 10px rgba(99,221,255,.7));
      }
      .aq-radar-point.active circle {
        fill: #ffcd73;
      }
      .aq-radar-point text {
        fill: #dff6ff;
        font: 12px "IBM Plex Mono", monospace;
        pointer-events: none;
      }
      .aq-radar-detail {
        padding: 18px;
        border-radius: 20px;
        border: 1px solid rgba(117,182,255,.14);
        background: linear-gradient(180deg, rgba(7,18,31,.95), rgba(4,11,20,.99));
      }
      .aq-radar-list {
        display: grid;
        gap: 10px;
      }
      @keyframes aqRadarSpin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
      }
      @media (max-width: 980px) {
        .aq-radar-panel .tr-radar-shell {
          grid-template-columns: 1fr;
        }
      }
    `;
    document.head.appendChild(style);
  };

  const radarMarkup = () => [
    '<div class="section-kicker">Turkiye alarm radari</div>',
    '<div class="tr-radar-shell" style="margin-top:14px;">',
    '  <div class="aq-radar-stage">',
    '    <svg id="trRadarMap" class="aq-radar-map" viewBox="0 0 320 220" aria-label="Turkiye alarm haritasi" role="img">',
    '      <path class="aq-radar-land" d="M26 113 L48 95 L73 92 L101 79 L126 82 L150 72 L173 80 L198 74 L220 82 L247 78 L272 93 L289 111 L301 128 L288 143 L262 149 L236 145 L215 150 L188 146 L160 156 L133 149 L110 156 L81 150 L57 141 L34 126 Z"></path>',
    '      <path class="aq-radar-land" d="M228 176 L246 172 L256 178 L247 188 L231 186 Z"></path>',
    '      <g class="aq-radar-point" data-region="Istanbul" tabindex="0"><circle cx="70" cy="98" r="5"></circle><text x="78" y="92">Istanbul</text></g>',
    '      <g class="aq-radar-point" data-region="Ankara" tabindex="0"><circle cx="144" cy="106" r="5"></circle><text x="152" y="100">Ankara</text></g>',
    '      <g class="aq-radar-point" data-region="Izmir" tabindex="0"><circle cx="64" cy="126" r="5"></circle><text x="72" y="120">Izmir</text></g>',
    '      <g class="aq-radar-point" data-region="Hatay" tabindex="0"><circle cx="232" cy="144" r="5"></circle><text x="240" y="138">Hatay</text></g>',
    '      <g class="aq-radar-point" data-region="Diyarbakir" tabindex="0"><circle cx="208" cy="118" r="5"></circle><text x="216" y="112">Diyarbakir</text></g>',
    '      <g class="aq-radar-point" data-region="Kibris" tabindex="0"><circle cx="244" cy="181" r="5"></circle><text x="252" y="175">Kibris</text></g>',
    "    </svg>",
    "  </div>",
    '  <div class="aq-radar-detail">',
    '    <div class="section-kicker">Canli izleme</div>',
    '    <h3 id="trRadarTitle">Ankara</h3>',
    '    <div class="threat-chip" id="trRadarCount" data-level="ORTA">Alarm 1</div>',
    '    <p id="trRadarCopy" class="card-copy">Ankara icin radar izlemesi suruyor. Yeni alarm olusursa panel guncellenir.</p>',
    '    <div class="aq-radar-list" id="trRadarList"></div>',
    "  </div>",
    "</div>",
  ].join("");

  const RADAR_META = {
    Ankara: { level: "IZLEME", count: "Alarm 1", text: "Ankara icin radar izlemesi suruyor. Yeni alarm olusursa panel guncellenir." },
    Istanbul: { level: "IZLEME", count: "Alarm 1", text: "Istanbul icin radar izlemesi suruyor. Yeni alarm olusursa panel guncellenir." },
    Izmir: { level: "IZLEME", count: "Alarm 1", text: "Izmir icin radar izlemesi suruyor. Yeni alarm olusursa panel guncellenir." },
    Hatay: { level: "ALARM", count: "Alarm 2", text: "Hatay icin alarm izlemesi aktif. Merkez teyidi ve saha notlari birlikte izleniyor." },
    Diyarbakir: { level: "ALARM", count: "Alarm 2", text: "Diyarbakir icin alarm izlemesi aktif. Merkez teyidi ve saha notlari birlikte izleniyor." },
    Kibris: { level: "IZLEME", count: "Alarm 1", text: "Kibris icin radar izlemesi suruyor. Yeni alarm olusursa panel guncellenir." },
  };

  const renderRadarInfo = (region) => {
    const meta = RADAR_META[region] || RADAR_META.Ankara;
    const title = q("#trRadarTitle");
    const count = q("#trRadarCount");
    const copy = q("#trRadarCopy");
    const list = q("#trRadarList");
    if (title) title.textContent = region;
    if (count) {
      count.textContent = meta.count;
      count.dataset.level = meta.level;
    }
    if (copy) copy.textContent = meta.text;
    if (list) {
      list.replaceChildren();
      const line = document.createElement("div");
      line.className = "ops-line";
      line.textContent = meta.text;
      list.appendChild(line);
    }
    qa(".aq-radar-point").forEach((point) => {
      point.classList.toggle("active", point.dataset.region === region);
    });
  };

  const bindRadar = () => {
    const map = q("#trRadarMap");
    if (!map || map.dataset.bound === "1") return;
    map.dataset.bound = "1";
    const pick = (target) => {
      const point = target.closest(".aq-radar-point");
      if (!point) return;
      renderRadarInfo(point.dataset.region);
    };
    map.addEventListener("click", (event) => pick(event.target));
    map.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      pick(event.target);
    });
    renderRadarInfo("Ankara");
  };

  const ensureRadar = () => {
    let host = q("#page-dashboard .ops-radar-card");
    if (!host) {
      const dashboard = q("#page-dashboard .hero-grid") || q("#page-dashboard .page-actions")?.parentElement;
      if (!dashboard) return;
      host = document.createElement("div");
      host.className = "panel ops-radar-card aq-radar-panel";
      dashboard.appendChild(host);
    }
    host.classList.add("aq-radar-panel");
    host.innerHTML = radarMarkup();
    bindRadar();
  };

  const run = () => {
    ensureRadarStyle();
    normalizeTree();
    removeFooterEmailLine();
    removeCenterCard();
    removeOperationCards();
    dedupeButtons();
    ensureRadar();
    normalizeTree();
  };

  document.addEventListener("DOMContentLoaded", run);
  window.addEventListener("load", run);
  setInterval(run, 1200);
})();
