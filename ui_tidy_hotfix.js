(() => {
  const q = (selector, root = document) => root.querySelector(selector);
  const qa = (selector, root = document) => Array.from(root.querySelectorAll(selector));

  function ensureStyle() {
    if (document.getElementById("aq-layout-hotfix-style")) return;
    const style = document.createElement("style");
    style.id = "aq-layout-hotfix-style";
    style.textContent = `
      .aq-layout-hidden{display:none!important}
      .aq-layout-soft{opacity:.94}
      .app-body{grid-template-columns:290px minmax(0,1fr)!important;align-items:start!important}
      .app-frame{overflow:hidden}
      .app-frame::before{animation:aqNebula 12s ease-in-out infinite alternate}
      .app-topbar{position:relative;overflow:hidden}
      .app-topbar::after{content:"";position:absolute;inset:auto -10% 0 -10%;height:2px;background:linear-gradient(90deg,transparent,rgba(105,224,255,.62),transparent);box-shadow:0 0 18px rgba(105,224,255,.32);animation:aqSweepLine 7s linear infinite}
      .sidebar-card,.panel{animation:aqPanelLift 10s ease-in-out infinite}
      .sidebar-card:nth-child(2),.panel:nth-child(2){animation-delay:1.2s}
      .sidebar-card:nth-child(3),.panel:nth-child(3){animation-delay:2.4s}
      #page-dashboard{display:grid;gap:16px}
      #page-dashboard .metrics{display:none!important}
      #page-dashboard .quick-actions{display:none!important}
      #page-dashboard .action-card{display:none!important}
      #aqOpsStrip{display:grid!important;grid-template-columns:minmax(0,1fr)!important;gap:16px!important;align-items:start!important}
      #aqOpsStrip .aq-ops-card{height:auto!important}
      #aqOpsStrip .aq-map-shell{grid-template-columns:minmax(0,1fr) 260px!important;align-items:stretch!important}
      #aqModuleDeck .aq-module-card{cursor:pointer}
      #aqModuleDeck{display:grid!important;grid-template-columns:1fr!important;gap:12px!important}
      .aq-map-stage{min-height:360px!important}
      .aq-region-dot{animation-duration:2.1s!important}
      @keyframes aqSweepLine{from{transform:translateX(-35%)}to{transform:translateX(135%)}}
      @keyframes aqNebula{from{filter:blur(0px) saturate(1)}to{filter:blur(3px) saturate(1.18)}}
      @keyframes aqPanelLift{0%,100%{transform:translateY(0)}50%{transform:translateY(-2px)}}
      @media (max-width:1180px){
        .app-body{grid-template-columns:1fr!important}
        #aqOpsStrip .aq-map-shell{grid-template-columns:1fr!important}
      }
    `;
    document.head.appendChild(style);
  }

  function activateDomain(domain, jump) {
    if (typeof window.setDomain === "function") window.setDomain(domain, jump);
    if (typeof window.switchPage === "function") window.switchPage(jump ? "analysis" : "dashboard");
  }

  function trimLoginCopy() {
    const heroCopy = q(".hero-copy");
    if (heroCopy) heroCopy.textContent = "Yetkili personel girişi. İzinsiz erişim yasaktır.";

    const brandSub = q(".brand-sub");
    if (brandSub) brandSub.textContent = "Kurumsal doğrulama ekranı.";

    const authFooter = qa(".auth-footer .company-line");
    if (authFooter[1]) authFooter[1].textContent = "Doğrulama kurumsal merkez hattı üzerinden yürütülür.";

    qa(".hero-grid, .hero-console, .capsule-row").forEach((node) => node.classList.add("aq-layout-hidden"));
    qa(".signal-line").forEach((node) => node.classList.add("aq-layout-hidden"));
  }

  function trimDashboard() {
    const legacyRadar = q("#page-dashboard .ops-radar-strip");
    if (legacyRadar) legacyRadar.classList.add("aq-layout-hidden");

    const duplicateAnalyze = document.getElementById("aqDashboardAnalyze");
    if (duplicateAnalyze) duplicateAnalyze.remove();

    const heading = q("#page-dashboard .panel h2");
    if (heading) heading.textContent = "Görev alanını seç ve doğrudan ilerle.";

    const copy = q("#page-dashboard .panel p");
    if (copy) copy.textContent = "Operasyon ekranı aktif.";
  }

  function trimSidebar() {
    const moduleCard = q("#moduleList")?.closest(".sidebar-card");
    if (moduleCard) {
      moduleCard.classList.remove("aq-layout-hidden");
      const kicker = q(".section-kicker", moduleCard);
      if (kicker) kicker.textContent = "Görev modülleri";
    }

    const summaryCard = q("#sidebarDomain")?.closest(".sidebar-card");
    if (summaryCard) {
      const title = q("h3", summaryCard);
      if (title) title.textContent = "Oturum özeti";
    }

    qa(".sidebar .sidebar-card").forEach((card) => {
      const hasModules = Boolean(q("#moduleList", card));
      const hasSummary = Boolean(q("#sidebarDomain", card));
      if (!hasModules && !hasSummary) {
        card.classList.add("aq-layout-hidden");
      }
    });

    const topbarSub = q(".brand-mini p");
    if (topbarSub) topbarSub.textContent = "Yetkili kullanıcı oturumu";
  }

  function ensureSingleMissionDeck() {
    const strips = qa("#aqOpsStrip");
    strips.forEach((node, index) => {
      if (index > 0) node.remove();
    });
  }

  function simplifyMissionDeck() {
    const moduleDeck = q("#aqModuleDeck");
    const moduleCard = moduleDeck?.closest(".aq-ops-card");
    if (moduleCard) moduleCard.classList.add("aq-layout-hidden");

    const mapCard = q("#aqOpsStrip .aq-ops-card");
    if (mapCard) mapCard.classList.add("aq-layout-soft");
  }

  function bindSidebarModules() {
    qa("#moduleList .module-button").forEach((button) => {
      if (button.dataset.tidyBound === "1") return;
      button.dataset.tidyBound = "1";
      button.addEventListener("dblclick", () => activateDomain(button.dataset.domain || "savunma", true));
    });
  }

  function run() {
    ensureStyle();
    trimLoginCopy();
    ensureSingleMissionDeck();
    trimDashboard();
    trimSidebar();
    simplifyMissionDeck();
    bindSidebarModules();
  }

  run();
  window.setInterval(run, 1200);
})();
