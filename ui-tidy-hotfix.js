(() => {
  const HIDE_TITLES = ["merkez kanal", "merkez kanalı", "gorev modulleri", "görev modülleri"];

  function normalize(value) {
    return String(value || "")
      .toLocaleLowerCase("tr-TR")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9 ]+/g, " ")
      .replace(/\s+/g, " ")
      .trim();
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

  function pruneLogin() {
    document.body.classList.add("aq-login-pruned");
    setText("#loginScreen .hero-kicker", "Kuantum tabanlı ulusal karar destek sistemi");
    setText("#loginScreen .brand-sub", "Merkez onaylı kapalı erişim terminali.");
    setText('label[for="loginUser"]', "Kullanıcı kodu");
    setText('label[for="loginPass"]', "Ortak şifre");
    setText('label[for="loginCode"]', "Doğrulama kodu");
    setPlaceholder("#loginUser", "6 haneli kullanıcı kodu");
    setPlaceholder("#loginPass", "Ortak şifreyi giriniz");
    setPlaceholder("#loginCode", "6 haneli doğrulama kodu");
    setText("#step1 .field-note", "Yetkisiz giriş yapılamaz.");
    setText("#loginBtn", "Giriş yap");
    setText("#verifyBtn", "Doğrula");
    setText("#backBtn", "Geri");
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
    const analyzeButtons = Array.from(document.querySelectorAll("button, .button, .ghost-button")).filter((node) => normalize(node.textContent) === "yeni analiz baslat");
    analyzeButtons.slice(1).forEach((node) => node.classList.add("aq-dashboard-dup"));
  }

  function hideDuplicateRadar() {
    const radarBlocks = Array.from(document.querySelectorAll(".aq-ops-card, .panel, .sidebar-card, .action-card")).filter((node) => {
      const title = node.querySelector("h1, h2, h3, .aq-kicker, .section-kicker, strong");
      return normalize(title ? title.textContent : "") === normalize("Türkiye alarm radarı");
    });
    radarBlocks.slice(1).forEach((node) => node.classList.add("aq-dashboard-dup"));
  }

  function polishDashboardCopy() {
    document.body.classList.add("aq-live-polished");
    setText("#page-dashboard .panel h2", "Operasyon görünümü");
    const copy = document.querySelector("#page-dashboard .panel .body-copy");
    if (copy) copy.textContent = "Seçili alanı aç, analize geç ve operasyon akışında kal.";
    const inlineCenter = document.getElementById("centerBtnInline");
    if (inlineCenter) inlineCenter.textContent = "Merkez";
    const centerLogin = document.getElementById("centerBtnLogin");
    if (centerLogin) centerLogin.classList.add("hidden");
  }

  function quietChatLabels() {
    setText("#aqChatHeading", "Genel Chat");
    setText("#chatHeading", "Genel Chat");
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
    pruneLogin();
    polishDashboardCopy();
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
