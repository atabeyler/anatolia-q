(() => {
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

  function fixLoginScreen() {
    setText("#loginScreen .hero-kicker", "Kuantum tabanl\u0131 ulusal karar destek sistemi");
    removeNode("#loginScreen .hero-copy");
    removeNode("#loginScreen .hero-grid");
    removeNode("#loginScreen .signal-panel");
    removeNode("#loginScreen .capsule-row");
    removeNode("#loginScreen .brand-sub");
    removeNode("#step1 .field-note");
    setText("#step1 .section-kicker", "Kimlik do\u011frulama | ad\u0131m 1/2");
    setText("#step2 .section-kicker", "\u0130kinci do\u011frulama | ad\u0131m 2/2");
    setText("label[for='loginUser']", "Kullan\u0131c\u0131 kodu");
    setText("label[for='loginPass']", "\u015eifre");
    setText("label[for='loginCode']", "Do\u011frulama kodu");
    setAttr("#loginUser", "placeholder", "6 haneli kullan\u0131c\u0131 kodunu girin");
    setAttr("#loginPass", "placeholder", "\u015eifrenizi girin");
    setAttr("#loginCode", "placeholder", "6 haneli kod");
    setText("#loginBtn", "Giri\u015f yap");
    setText("#verifyBtn", "Do\u011frula ve a\u00e7");
    setText("#backBtn", "Geri d\u00f6n");
  }

  function tidyDashboard() {
    removeCardsByTitle("Merkez kanal\u0131");
    removeCardsByTitle("G\u00f6rev mod\u00fclleri");
    removeCardsByTitle("Mod\u00fcller", { skipSelector: "#moduleList" });
    removeCardsByTitle("Merkez y\u00f6nlendirme");
    removeCardsByTitle("Alan odakl\u0131 giri\u015f");
    removeDuplicateButtons("Yeni analiz ba\u015flat", 1);

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
    fixLoginScreen();
    patchLoginFooter();
    tidyDashboard();
    patchSidebarModules();
    stabilizeRadarPanel();
    removeNode("#aqChatMeta");
    qa(".aq-chat-empty").forEach((node) => node.remove());
    qa(".aq-chat-ident .aq-chat-tip").forEach((node) => node.remove());
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
  }

  function init() {
    patchStatus();
    patchRenderResult();
    runCleanup();
    [300, 900, 1800].forEach((delay) => window.setTimeout(runCleanup, delay));
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
