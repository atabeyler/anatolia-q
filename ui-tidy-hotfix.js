(() => {
  const HIDE_TITLES = ["merkez kanal", "merkez kanalı", "gorev modulleri", "görev modülleri"];
  const STORAGE_KEY = "aq_ui_lang";

  const COPY = {
    tr: {
      heroKicker: "Kuantum tabanlı ulusal karar destek sistemi",
      brandSub: "Merkez onaylı kapalı erişim terminali.",
      loginUserLabel: "Kullanıcı kodu",
      loginPassLabel: "Ortak şifre",
      loginCodeLabel: "Doğrulama kodu",
      loginUserPlaceholder: "6 haneli kullanıcı kodu",
      loginPassPlaceholder: "Ortak şifreyi giriniz",
      loginCodePlaceholder: "6 haneli doğrulama kodu",
      loginNote: "Yetkisiz giriş yapılamaz.",
      loginBtn: "Giriş yap",
      verifyBtn: "Doğrula",
      backBtn: "Geri",
      dashboardTitle: "Operasyon görünümü",
      dashboardCopy: "Seçili alanı aç, analize geç ve operasyon akışında kal.",
      centerBtn: "Merkez",
      chatTitle: "Genel Chat",
      langLabel: "Dil"
    },
    en: {
      heroKicker: "Quantum-based national decision support system",
      brandSub: "Center-approved closed access terminal.",
      loginUserLabel: "User code",
      loginPassLabel: "Shared password",
      loginCodeLabel: "Verification code",
      loginUserPlaceholder: "6-digit user code",
      loginPassPlaceholder: "Enter shared password",
      loginCodePlaceholder: "6-digit verification code",
      loginNote: "Unauthorized access is blocked.",
      loginBtn: "Sign in",
      verifyBtn: "Verify",
      backBtn: "Back",
      dashboardTitle: "Operations overview",
      dashboardCopy: "Open the selected domain, switch to analysis and stay in the operational flow.",
      centerBtn: "Center",
      chatTitle: "General Chat",
      langLabel: "Language"
    }
  };

  function normalize(value) {
    return String(value || "")
      .toLocaleLowerCase("tr-TR")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9 ]+/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function getLang() {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved === "en" ? "en" : "tr";
  }

  function setLang(lang) {
    localStorage.setItem(STORAGE_KEY, lang === "en" ? "en" : "tr");
    applyLanguage();
  }

  function ensureStyle() {
    if (document.getElementById("aq-final-polish")) return;
    const style = document.createElement("style");
    style.id = "aq-final-polish";
    style.textContent = `
      .space-scene{pointer-events:none!important}
      #loginScreen{position:relative;z-index:6}
      #loginScreen,#loginScreen *{pointer-events:auto}
      #loginBtn,#verifyBtn,#backBtn{position:relative;z-index:9}
      .aq-lang-switch{position:fixed;top:18px;right:18px;z-index:60;display:flex;align-items:center;gap:8px;padding:10px 12px;border-radius:999px;border:1px solid rgba(105,224,255,.18);background:rgba(6,14,24,.88);box-shadow:0 12px 30px rgba(0,0,0,.24);backdrop-filter:blur(12px)}
      .aq-lang-label{color:#8fb2d4;font:11px "IBM Plex Mono",monospace;letter-spacing:.12em;text-transform:uppercase}
      .aq-lang-btn{border:1px solid rgba(105,224,255,.16);background:rgba(8,16,28,.76);color:#9bb5d2;border-radius:999px;padding:8px 10px;font:11px "IBM Plex Mono",monospace;letter-spacing:.12em;text-transform:uppercase;cursor:pointer}
      .aq-lang-btn.active{background:linear-gradient(135deg,rgba(105,224,255,.24),rgba(94,144,255,.20));color:#eef7ff;border-color:rgba(105,224,255,.34)}
      body.aq-login-pruned #loginScreen .hero-copy,
      body.aq-login-pruned #loginScreen .hero-grid,
      body.aq-login-pruned #loginScreen .hero-console,
      body.aq-login-pruned #loginScreen .capsule-row{display:none!important}
      body.aq-login-pruned #loginScreen .hero-panel{justify-content:center;min-height:calc(100vh - 32px);background:
        radial-gradient(circle at 18% 18%, rgba(105,224,255,.18), transparent 24%),
        radial-gradient(circle at 82% 16%, rgba(94,144,255,.20), transparent 22%),
        linear-gradient(180deg, rgba(4,12,24,.96), rgba(2,8,16,.98));overflow:hidden}
      body.aq-login-pruned #loginScreen .hero-panel::before{content:"";position:absolute;inset:-12%;pointer-events:none;background:
        conic-gradient(from 0deg at 50% 50%, transparent 0 24%, rgba(105,224,255,.10) 32%, transparent 42%, rgba(94,144,255,.10) 56%, transparent 70%);filter:blur(28px);animation:aqSpin 18s linear infinite}
      body.aq-login-pruned #loginScreen .hero-panel::after{content:"";position:absolute;right:-120px;bottom:-120px;width:420px;height:420px;border-radius:50%;pointer-events:none;background:radial-gradient(circle, rgba(105,224,255,.24), transparent 64%);animation:aqFloat 9s ease-in-out infinite}
      body.aq-login-pruned #loginScreen .hero-kicker{font-size:11px;color:#89e8ff;letter-spacing:.22em;text-transform:uppercase}
      body.aq-login-pruned #loginScreen .hero-title{max-width:8ch;font-size:clamp(48px,7vw,92px)}
      body.aq-login-pruned #loginScreen .auth-panel{background:
        radial-gradient(circle at 82% 18%, rgba(105,224,255,.10), transparent 20%),
        linear-gradient(180deg, rgba(7,17,31,.94), rgba(4,10,18,.98))}
      body.aq-login-pruned #loginScreen .auth-form{box-shadow:0 20px 50px rgba(0,0,0,.26), inset 0 0 0 1px rgba(105,224,255,.06)}
      body.aq-login-pruned #loginScreen .brand-sub{max-width:32ch}
      body.aq-live-polished .app-frame{background:
        radial-gradient(circle at 8% 12%, rgba(105,224,255,.08), transparent 18%),
        radial-gradient(circle at 92% 12%, rgba(94,144,255,.08), transparent 18%),
        linear-gradient(180deg, rgba(7,17,31,.92), rgba(3,9,17,.98))}
      body.aq-live-polished .app-frame::after{content:"";position:absolute;inset:0;pointer-events:none;background:
        linear-gradient(115deg, transparent 0%, rgba(105,224,255,.05) 34%, transparent 54%),
        linear-gradient(180deg, transparent 0%, rgba(255,255,255,.03) 50%, transparent 100%);animation:aqSweep 12s linear infinite}
      body.aq-live-polished .app-body,
      body.aq-live-polished .workspace,
      body.aq-live-polished .page,
      body.aq-live-polished #page-dashboard,
      body.aq-live-polished #page-analysis{align-items:start!important;align-content:start!important;min-height:0!important}
      body.aq-live-polished #page-dashboard .quick-actions,
      body.aq-live-polished #page-dashboard .ops-radar-strip,
      body.aq-live-polished #aqModuleDeck,
      body.aq-live-polished .aq-module-grid,
      body.aq-live-polished .aq-remove,
      body.aq-live-polished .aq-dashboard-dup,
      body.aq-live-polished .aq-chat-empty:empty{display:none!important}
      body.aq-live-polished #aqOpsStrip{grid-template-columns:minmax(0,1fr)!important;margin-top:16px!important}
      body.aq-live-polished #aqOpsStrip .aq-ops-card + .aq-ops-card{display:none!important}
      body.aq-live-polished #page-dashboard .panel:first-child{overflow:hidden}
      body.aq-live-polished #page-dashboard .panel:first-child::after{content:"";position:absolute;inset:-20% auto auto -10%;width:42%;height:160%;background:linear-gradient(180deg, rgba(105,224,255,.12), transparent);transform:rotate(18deg);filter:blur(20px);pointer-events:none;animation:aqBeam 10s ease-in-out infinite}
      body.aq-live-polished .page-actions{justify-content:flex-start}
      @keyframes aqSpin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
      @keyframes aqFloat{0%,100%{transform:translateY(0)}50%{transform:translateY(-16px)}}
      @keyframes aqSweep{from{transform:translateX(-6%)}50%{transform:translateX(4%)}to{transform:translateX(-6%)}}
      @keyframes aqBeam{0%,100%{transform:translateX(0) rotate(18deg)}50%{transform:translateX(36px) rotate(18deg)}}
    `;
    document.head.appendChild(style);
  }

  function setText(selector, value) {
    const node = document.querySelector(selector);
    if (node) node.textContent = value;
  }

  function setPlaceholder(selector, value) {
    const node = document.querySelector(selector);
    if (node) node.setAttribute("placeholder", value);
  }

  function ensureLanguageSwitch() {
    if (document.getElementById("aqLangSwitch")) return;
    const wrap = document.createElement("div");
    wrap.id = "aqLangSwitch";
    wrap.className = "aq-lang-switch";
    wrap.innerHTML = `
      <span class="aq-lang-label" id="aqLangLabel">Dil</span>
      <button type="button" class="aq-lang-btn" data-lang="tr">TR</button>
      <button type="button" class="aq-lang-btn" data-lang="en">EN</button>
    `;
    wrap.querySelectorAll("[data-lang]").forEach((button) => {
      button.addEventListener("click", () => setLang(button.getAttribute("data-lang")));
    });
    document.body.appendChild(wrap);
  }

  function applyLanguage() {
    const lang = getLang();
    const copy = COPY[lang];
    document.body.classList.add("aq-login-pruned", "aq-live-polished");
    setText("#aqLangLabel", copy.langLabel);
    setText("#loginScreen .hero-kicker", copy.heroKicker);
    setText("#loginScreen .brand-sub", copy.brandSub);
    setText('label[for="loginUser"]', copy.loginUserLabel);
    setText('label[for="loginPass"]', copy.loginPassLabel);
    setText('label[for="loginCode"]', copy.loginCodeLabel);
    setPlaceholder("#loginUser", copy.loginUserPlaceholder);
    setPlaceholder("#loginPass", copy.loginPassPlaceholder);
    setPlaceholder("#loginCode", copy.loginCodePlaceholder);
    setText("#step1 .field-note", copy.loginNote);
    setText("#loginBtn", copy.loginBtn);
    setText("#verifyBtn", copy.verifyBtn);
    setText("#backBtn", copy.backBtn);
    setText("#page-dashboard .panel h2", copy.dashboardTitle);
    const dashboardCopy = document.querySelector("#page-dashboard .panel .body-copy");
    if (dashboardCopy) dashboardCopy.textContent = copy.dashboardCopy;
    const inlineCenter = document.getElementById("centerBtnInline");
    if (inlineCenter) inlineCenter.textContent = copy.centerBtn;
    setText("#aqChatHeading", copy.chatTitle);
    setText("#chatHeading", copy.chatTitle);
    document.querySelectorAll("#aqLangSwitch [data-lang]").forEach((button) => {
      button.classList.toggle("active", button.getAttribute("data-lang") === lang);
    });
  }

  function hideCardsByTitle() {
    const cards = Array.from(document.querySelectorAll(".sidebar-card, .panel, .action-card, .aq-ops-card, .aq-center-card"));
    cards.forEach((card) => {
      const title = card.querySelector("h1, h2, h3, .aq-kicker, .section-kicker, strong");
      const text = normalize(title ? title.textContent : "");
      if (HIDE_TITLES.some((value) => text.includes(normalize(value)))) {
        card.classList.add("aq-remove");
      }
    });
  }

  function hideDuplicateButtons() {
    const analyzeButtons = Array.from(document.querySelectorAll("button, .button, .ghost-button")).filter((node) => normalize(node.textContent) === normalize("Yeni analiz başlat"));
    analyzeButtons.slice(1).forEach((node) => node.classList.add("aq-dashboard-dup"));
  }

  function hideDuplicateRadar() {
    const radarBlocks = Array.from(document.querySelectorAll(".aq-ops-card, .panel, .sidebar-card, .action-card")).filter((node) => {
      const title = node.querySelector("h1, h2, h3, .aq-kicker, .section-kicker, strong");
      return normalize(title ? title.textContent : "") === normalize("Türkiye alarm radarı");
    });
    radarBlocks.slice(1).forEach((node) => node.classList.add("aq-dashboard-dup"));
  }

  function quietChatLabels() {
    const metaA = document.getElementById("aqChatMeta");
    const metaB = document.getElementById("chatMeta");
    const empty = document.querySelector(".aq-chat-empty");
    if (metaA) metaA.textContent = "";
    if (metaB) metaB.textContent = "";
    if (empty) empty.textContent = "";
    Array.from(document.querySelectorAll(".aq-pill, .signal-badge")).forEach((node) => {
      if (normalize(node.textContent) === "live chat") node.remove();
    });
  }

  function patchReportBuilder() {
    if (typeof window.buildReport !== "function" || window.__aqReportPolished) return;
    window.__aqReportPolished = true;
    const original = window.buildReport;
    window.buildReport = function patchedBuildReport(result) {
      let html = original.call(this, result);
      html = html.replace(/<p><strong>Saglayici:<\/strong>.*?<\/p>/gi, "");
      html = html.replace(/<p><strong>Sağlayıcı:<\/strong>.*?<\/p>/gi, "");
      return html;
    };
  }

  function run() {
    ensureStyle();
    ensureLanguageSwitch();
    applyLanguage();
    hideCardsByTitle();
    hideDuplicateButtons();
    hideDuplicateRadar();
    quietChatLabels();
    patchReportBuilder();
  }

  function boot() {
    run();
    [120, 500, 1200, 2200].forEach((delay) => window.setTimeout(run, delay));
    window.addEventListener("pageshow", run, { once: true });
    window.addEventListener("load", run, { once: true });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot, { once: true });
  } else {
    boot();
  }
})();
