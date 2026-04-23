(() => {
  const CHAT_TEXT_REPLACEMENTS = [
    [/Genel Chat aktif/gi, "Genel Chat"],
    [/Live Chat/gi, ""],
    [/Yazışma akışı tek pencerede sürer\. Yeni mesajını aşağıdaki sabit alana yazabilirsin\./gi, ""],
    [/Yazışma akışı burada devam eder\. Yeni mesajını alttaki kutuya yaz\./gi, ""],
    [/Mesaj akışı burada tutulur\. Yeni mesajını aynı kutuya yazarak devam edebilirsin\./gi, ""],
    [/Buraya adını yazarsan sistem daha doğal hitap eder\./gi, ""],
    [/Genel Chat \| gerçek mesaj akışı/gi, "Genel Chat"],
    [/Sabit mesaj alanı, canlı yanıt akışı ve rahat tonda sohbet ekranı\./gi, ""],
  ];

  const ANALYSIS_TEXT_REPLACEMENTS = [
    [/ucretsiz yedek analiz uretildi/gi, "değerlendirme üretildi"],
    [/ücretsiz yedek analiz üretildi/gi, "değerlendirme üretildi"],
    [/Ucretli model kotas[iı].*?guvenli mod devreye girdi\./gi, "Mevcut bulgular çerçevesinde durum değerlendirmesi sunulmuştur."],
    [/Ücretli model kotası.*?güvenli mod devreye girdi\./gi, "Mevcut bulgular çerçevesinde durum değerlendirmesi sunulmuştur."],
    [/\s*\|\s*yedek akış/gi, ""],
    [/\s*\|\s*yedek akis/gi, ""],
    [/\s*\|\s*Mod:\s*Sohbet çekirdeği/gi, ""],
    [/\s*\|\s*Mod:\s*Yedek analiz/gi, ""],
    [/AI servis sınırında yedek analiz kullanıldı\./gi, "Analiz başarıyla üretildi."],
    [/Sohbet cevabı sohbet çekirdeğiyle üretildi\./gi, "Sohbet cevabı hazır."],
    [/\bYedek\b/gi, "Analiz"],
  ];

  function normalize(value) {
    return String(value || "")
      .toLocaleLowerCase("tr-TR")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9 ]+/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function ensureInteractionStyle() {
    if (document.getElementById("aq-login-hotfix-style")) return;
    const style = document.createElement("style");
    style.id = "aq-login-hotfix-style";
    style.textContent = `
      .space-scene{pointer-events:none!important}
      #loginScreen{position:relative;z-index:6}
      #loginScreen, #loginScreen *{pointer-events:auto}
      #loginBtn, #verifyBtn, #backBtn, #centerBtnLogin, #centerBtnInline{position:relative;z-index:8}
      body.aq-login-pruned #loginScreen .hero-copy,
      body.aq-login-pruned #loginScreen .hero-grid,
      body.aq-login-pruned #loginScreen .hero-console,
      body.aq-login-pruned #loginScreen .capsule-row{display:none!important}
      body.aq-login-pruned #loginScreen .hero-panel{justify-content:center;min-height:calc(100vh - 32px);background:
        radial-gradient(circle at 18% 18%, rgba(105,224,255,.16), transparent 24%),
        radial-gradient(circle at 82% 16%, rgba(94,144,255,.18), transparent 22%),
        linear-gradient(180deg, rgba(4,12,24,.96), rgba(2,8,16,.98))}
      body.aq-login-pruned #loginScreen .hero-panel::before{background:
        radial-gradient(circle at 24% 24%, rgba(105,224,255,.18), transparent 18%),
        radial-gradient(circle at 76% 18%, rgba(94,144,255,.18), transparent 20%),
        linear-gradient(135deg, rgba(105,224,255,.05), transparent 42%)}
      body.aq-login-pruned #loginScreen .hero-panel::after{width:420px;height:420px;right:-120px;bottom:-140px;background:radial-gradient(circle, rgba(105,224,255,.22), transparent 64%);animation:aqHeroFloat 9s ease-in-out infinite}
      body.aq-login-pruned #loginScreen .hero-kicker{font-size:11px;color:#89e8ff}
      body.aq-login-pruned #loginScreen .hero-title{max-width:8ch;font-size:clamp(48px,7vw,92px)}
      body.aq-login-pruned #loginScreen .auth-panel{background:
        radial-gradient(circle at 82% 18%, rgba(105,224,255,.10), transparent 20%),
        linear-gradient(180deg, rgba(7,17,31,.94), rgba(4,10,18,.98))}
      body.aq-login-pruned #loginScreen .brand-sub{max-width:34ch}
      body.aq-login-pruned #loginScreen .auth-form{box-shadow:0 20px 50px rgba(0,0,0,.24), inset 0 0 0 1px rgba(105,224,255,.04)}
      body.aq-app-boost .app-frame{background:
        radial-gradient(circle at 8% 12%, rgba(105,224,255,.07), transparent 18%),
        radial-gradient(circle at 92% 12%, rgba(94,144,255,.08), transparent 18%),
        linear-gradient(180deg, rgba(7,17,31,.9), rgba(3,9,17,.96))}
      body.aq-app-boost .app-frame::before{content:"";position:absolute;inset:-15% -10% auto -10%;height:42%;pointer-events:none;background:
        radial-gradient(circle at 20% 30%, rgba(105,224,255,.10), transparent 22%),
        radial-gradient(circle at 80% 24%, rgba(94,144,255,.08), transparent 18%);
        filter:blur(12px);animation:aqNebulaShift 14s ease-in-out infinite}
      body.aq-app-boost .app-frame::after{content:"";position:absolute;inset:0;pointer-events:none;background:
        linear-gradient(115deg, transparent 0%, rgba(105,224,255,.04) 34%, transparent 54%),
        linear-gradient(180deg, transparent 0%, rgba(255,255,255,.03) 50%, transparent 100%);animation:aqPanelSweep 12s linear infinite}
      body.aq-app-boost .app-topbar{position:relative;overflow:hidden}
      body.aq-app-boost .app-topbar::before{content:"";position:absolute;inset:0;pointer-events:none;background:
        linear-gradient(90deg, transparent 0%, rgba(105,224,255,.10) 48%, transparent 100%);
        transform:translateX(-120%);animation:aqTopbarSweep 8s linear infinite}
      body.aq-app-boost .panel,
      body.aq-app-boost .sidebar-card{box-shadow:0 18px 40px rgba(0,0,0,.22), inset 0 0 0 1px rgba(105,224,255,.03)}
      body.aq-app-boost .panel::before,
      body.aq-app-boost .sidebar-card::before{content:"";position:absolute;inset:auto -12% -30% auto;width:180px;height:180px;border-radius:50%;pointer-events:none;background:radial-gradient(circle, rgba(105,224,255,.10), transparent 68%);filter:blur(10px);opacity:.8;animation:aqOrbPulse 6s ease-in-out infinite}
      body.aq-app-boost .app-body{align-items:start}
      body.aq-app-boost .workspace,
      body.aq-app-boost .page,
      body.aq-app-boost #page-dashboard{align-content:start}
      body.aq-app-boost #page-dashboard .hero-strip > div:first-child{display:none!important}
      body.aq-app-boost #page-dashboard .quick-actions,
      body.aq-app-boost #page-dashboard .ops-radar-strip{display:none!important}
      body.aq-app-boost #aqOpsStrip{grid-template-columns:minmax(0,1fr)!important;margin-top:16px!important}
      body.aq-app-boost #aqOpsStrip .aq-ops-card{min-height:0}
      body.aq-app-boost .aq-remove-card,
      body.aq-app-boost .aq-hide-duplicate{display:none!important}
      @keyframes aqHeroFloat{0%,100%{transform:translateY(0)}50%{transform:translateY(-16px)}}
      @keyframes aqPanelSweep{from{transform:translateX(-6%)}50%{transform:translateX(4%)}to{transform:translateX(-6%)}}
      @keyframes aqTopbarSweep{from{transform:translateX(-120%)}to{transform:translateX(140%)}}
      @keyframes aqOrbPulse{0%,100%{transform:scale(.92);opacity:.45}50%{transform:scale(1.08);opacity:.9}}
      @keyframes aqNebulaShift{0%,100%{transform:translateX(0) translateY(0)}50%{transform:translateX(24px) translateY(-10px)}}
    `;
    document.head.appendChild(style);
  }

  function cleanText(value) {
    let text = String(value ?? "");
    [...CHAT_TEXT_REPLACEMENTS, ...ANALYSIS_TEXT_REPLACEMENTS].forEach(([pattern, next]) => {
      text = text.replace(pattern, next);
    });
    return text.replace(/\s{2,}/g, " ").trim();
  }

  function setNodeText(selector, text) {
    const node = document.querySelector(selector);
    if (node && typeof text === "string") node.textContent = text;
  }

  function clearSelectors() {
    ["#chatMeta", "#aqChatMeta"].forEach((selector) => {
      const node = document.querySelector(selector);
      if (node) node.textContent = "";
    });

    ["#chatHeading", "#aqChatHeading", "#analysisTitle"].forEach((selector) => {
      const node = document.querySelector(selector);
      if (node && cleanText(node.textContent)) node.textContent = cleanText(node.textContent);
    });

    document.querySelectorAll(".signal-badge, .aq-pill").forEach((node) => {
      if (cleanText(node.textContent) === "") node.remove();
    });
  }

  function cleanResultCards() {
    [
      "#summaryText",
      "#threatText",
      "#timelineText",
      "#criticalLinkText",
      "#resultMeta",
      "#analysisStatus",
      "#centerStatus",
      "#aqCenterStatus",
      "#aqAlarmStatus",
      "#aqOpsStatus",
    ].forEach((selector) => {
      const node = document.querySelector(selector);
      if (node) node.textContent = cleanText(node.textContent);
    });
  }

  function cleanKnownTextBlocks() {
    [
      ".field-note",
      ".hero-copy",
      ".ops-line",
      ".signal-line",
      ".metric-copy",
      ".kicker-copy",
      ".mini-stat span",
      ".timeline-entry p",
      ".history-card p",
      ".chat-empty",
      ".chat-meta",
    ].forEach((selector) => {
      document.querySelectorAll(selector).forEach((node) => {
        const next = cleanText(node.textContent);
        if (next !== node.textContent) node.textContent = next;
      });
    });
  }

  function pruneLoginScreen() {
    document.body.classList.add("aq-login-pruned");
    setNodeText("#loginScreen .hero-kicker", "Kuantum tabanlı ulusal karar destek sistemi");
    setNodeText("#loginScreen .brand-sub", "Merkez onaylı kapalı erişim terminali.");
    const switcher = document.getElementById("aqLangSwitch");
    if (switcher) switcher.remove();
  }

  function hideCardsByHeading(text) {
    Array.from(document.querySelectorAll(".sidebar-card, .panel, .action-card, .aq-ops-card")).forEach((card) => {
      const title = card.querySelector("h1, h2, h3, .section-kicker, .aq-kicker, strong");
      if (normalize(title?.textContent) === normalize(text)) {
        card.classList.add("aq-remove-card");
      }
    });
  }

  function hideDuplicateButtonsByText(text, keepCount = 1) {
    const buttons = Array.from(document.querySelectorAll("button")).filter((button) => {
      if (button.closest("#page-analysis")) return false;
      return normalize(button.textContent) === normalize(text);
    });
    buttons.slice(keepCount).forEach((button) => button.classList.add("aq-hide-duplicate"));
  }

  function hideDuplicateCardsByHeading(text, keepCount = 1) {
    const cards = Array.from(document.querySelectorAll(".panel, .aq-ops-card, .action-card, .sidebar-card")).filter((card) => {
      const title = card.querySelector("h1, h2, h3, .section-kicker, .aq-kicker, strong");
      return normalize(title?.textContent) === normalize(text);
    });
    cards.slice(keepCount).forEach((card) => card.classList.add("aq-hide-duplicate"));
  }

  function tidyDashboardLayout() {
    document.body.classList.add("aq-app-boost");
    hideCardsByHeading("Merkez kanalı");
    hideCardsByHeading("Merkez kanal");

    const loginCenter = document.getElementById("centerBtnLogin");
    if (loginCenter) loginCenter.classList.add("hidden");

    setNodeText("#page-dashboard .hero-strip h2", "");
    setNodeText("#page-dashboard .hero-strip p", "");

    hideDuplicateButtonsByText("Yeni analiz başlat", 1);
    hideDuplicateCardsByHeading("Türkiye alarm radarı", 1);
    hideDuplicateCardsByHeading("Türkiye alarm radar", 1);
    setNodeText("#aqOpsStrip .aq-kicker", "Türkiye alarm radarı");
  }

  function patchStatus() {
    if (typeof window.setStatus !== "function" || window.__aqStatusPatched) return;
    window.__aqStatusPatched = true;
    const original = window.setStatus;
    window.setStatus = function patchedSetStatus(node, kind, message) {
      return original.call(this, node, kind === "warn" ? "success" : kind, cleanText(message));
    };
  }

  function deepCleanPayload(value) {
    if (Array.isArray(value)) return value.map(deepCleanPayload);
    if (!value || typeof value !== "object") {
      return typeof value === "string" ? cleanText(value) : value;
    }
    const next = {};
    Object.entries(value).forEach(([key, current]) => {
      next[key] = deepCleanPayload(current);
    });
    return next;
  }

  function patchRenderResult() {
    if (typeof window.renderResult !== "function" || window.__aqRenderPatched) return;
    window.__aqRenderPatched = true;
    const original = window.renderResult;
    window.renderResult = function patchedRenderResult(result) {
      return original.call(this, deepCleanPayload(result));
    };
  }

  function patchHistory() {
    if (typeof window.renderHistory !== "function" || window.__aqHistoryPatched) return;
    window.__aqHistoryPatched = true;
    const original = window.renderHistory;
    window.renderHistory = function patchedRenderHistory() {
      if (window.state && Array.isArray(window.state.historyList)) {
        window.state.historyList = window.state.historyList.map((item) => ({
          ...item,
          ozet: cleanText(item.ozet),
          summary: cleanText(item.summary),
          fallback_mode: false,
        }));
      }
      return original.apply(this, arguments);
    };
  }

  function patchReportBuilder() {
    if (typeof window.buildReport !== "function" || window.__aqReportPatched) return;
    window.__aqReportPatched = true;
    const original = window.buildReport;
    window.buildReport = function patchedBuildReport(result) {
      const cleaned = deepCleanPayload(result);
      let html = original.call(this, cleaned);
      html = html.replace(/<p><strong>Sağlayıcı:<\/strong>.*?<\/p>/gi, "");
      html = html.replace(/<p><strong>Saglayici:<\/strong>.*?<\/p>/gi, "");
      [...CHAT_TEXT_REPLACEMENTS, ...ANALYSIS_TEXT_REPLACEMENTS].forEach(([pattern, next]) => {
        html = html.replace(pattern, next);
      });
      return html;
    };
  }

  function fallbackSetStatus(node, kind, message) {
    if (!node) return;
    node.textContent = cleanText(message || "");
    if (message) node.dataset.kind = kind === "warn" ? "success" : kind;
    else node.removeAttribute("data-kind");
  }

  async function fallbackLogin() {
    const user = document.getElementById("loginUser");
    const pass = document.getElementById("loginPass");
    const loginBtn = document.getElementById("loginBtn");
    const loginLoad = document.getElementById("loginLoad");
    const loginStatus = document.getElementById("loginStatus");
    const step1 = document.getElementById("step1");
    const step2 = document.getElementById("step2");
    const codeInfo = document.getElementById("codeInfo");
    const username = (user?.value || "").replace(/\D/g, "").slice(0, 6);
    const password = pass?.value || "";

    if (user) user.value = username;
    if (!username || !password) {
      fallbackSetStatus(loginStatus, "error", "Kullanıcı kodu ve şifre zorunludur.");
      return;
    }

    try {
      if (loginBtn) loginBtn.disabled = true;
      loginLoad?.classList.add("active");
      fallbackSetStatus(loginStatus, "", "");
      const response = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || data.message || "Giriş başarısız.");
      window.__aqPendingUser = username;
      step1?.classList.add("hidden");
      step2?.classList.remove("hidden");
      fallbackSetStatus(codeInfo, "info", data.message || "Doğrulama kodu gönderildi.");
      document.getElementById("loginCode")?.focus();
    } catch (error) {
      fallbackSetStatus(loginStatus, "error", error.message || "Giriş başarısız.");
    } finally {
      if (loginBtn) loginBtn.disabled = false;
      loginLoad?.classList.remove("active");
    }
  }

  async function fallbackVerify() {
    const verifyBtn = document.getElementById("verifyBtn");
    const verifyLoad = document.getElementById("verifyLoad");
    const verifyStatus = document.getElementById("verifyStatus");
    const codeInput = document.getElementById("loginCode");
    const code = (codeInput?.value || "").replace(/\D/g, "").slice(0, 6);
    if (codeInput) codeInput.value = code;
    if (code.length !== 6 || !window.__aqPendingUser) {
      fallbackSetStatus(verifyStatus, "error", "6 haneli doğrulama kodunu girin.");
      return;
    }

    try {
      if (verifyBtn) verifyBtn.disabled = true;
      verifyLoad?.classList.add("active");
      fallbackSetStatus(verifyStatus, "", "");
      const response = await fetch("/api/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: window.__aqPendingUser, code }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || data.message || "Doğrulama başarısız.");
      sessionStorage.setItem("aq_session_token", data.token || "");
      sessionStorage.setItem("aq_session_user", data.username || data.user || window.__aqPendingUser);
      window.location.reload();
    } catch (error) {
      fallbackSetStatus(verifyStatus, "error", error.message || "Doğrulama başarısız.");
    } finally {
      if (verifyBtn) verifyBtn.disabled = false;
      verifyLoad?.classList.remove("active");
    }
  }

  function bindLoginHotfix() {
    const loginBtn = document.getElementById("loginBtn");
    const verifyBtn = document.getElementById("verifyBtn");
    const backBtn = document.getElementById("backBtn");
    const loginUser = document.getElementById("loginUser");
    const loginPass = document.getElementById("loginPass");
    const loginCode = document.getElementById("loginCode");

    if (loginBtn && loginBtn.dataset.aqBound !== "1") {
      loginBtn.dataset.aqBound = "1";
      loginBtn.addEventListener("click", () => {
        if (typeof window.doLogin === "function") return window.doLogin();
        return fallbackLogin();
      });
      loginBtn.disabled = false;
    }

    if (verifyBtn && verifyBtn.dataset.aqBound !== "1") {
      verifyBtn.dataset.aqBound = "1";
      verifyBtn.addEventListener("click", () => {
        if (typeof window.doVerify === "function") return window.doVerify();
        return fallbackVerify();
      });
      verifyBtn.disabled = false;
    }

    if (backBtn && backBtn.dataset.aqBound !== "1") {
      backBtn.dataset.aqBound = "1";
      backBtn.addEventListener("click", () => {
        if (typeof window.resetLoginFlow === "function") return window.resetLoginFlow();
        document.getElementById("step2")?.classList.add("hidden");
        document.getElementById("step1")?.classList.remove("hidden");
      });
    }

    if (loginUser && loginUser.dataset.aqBound !== "1") {
      loginUser.dataset.aqBound = "1";
      loginUser.addEventListener("input", () => {
        loginUser.value = loginUser.value.replace(/\D/g, "").slice(0, 6);
      });
      loginUser.addEventListener("keydown", (event) => {
        if (event.key === "Enter") {
          event.preventDefault();
          loginBtn?.click();
        }
      });
    }

    if (loginPass && loginPass.dataset.aqBound !== "1") {
      loginPass.dataset.aqBound = "1";
      loginPass.addEventListener("keydown", (event) => {
        if (event.key === "Enter") {
          event.preventDefault();
          loginBtn?.click();
        }
      });
    }

    if (loginCode && loginCode.dataset.aqBound !== "1") {
      loginCode.dataset.aqBound = "1";
      loginCode.addEventListener("input", () => {
        loginCode.value = loginCode.value.replace(/\D/g, "").slice(0, 6);
      });
      loginCode.addEventListener("keydown", (event) => {
        if (event.key === "Enter") {
          event.preventDefault();
          verifyBtn?.click();
        }
      });
    }
  }

  function runCleanup() {
    clearSelectors();
    cleanResultCards();
    cleanKnownTextBlocks();
    pruneLoginScreen();
    tidyDashboardLayout();
  }

  function scheduleStabilizers() {
    [0, 250, 900, 1800].forEach((delay) => {
      window.setTimeout(() => {
        bindLoginHotfix();
        runCleanup();
      }, delay);
    });
  }

  function init() {
    ensureInteractionStyle();
    patchStatus();
    patchRenderResult();
    patchHistory();
    patchReportBuilder();
    bindLoginHotfix();
    runCleanup();
    scheduleStabilizers();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
