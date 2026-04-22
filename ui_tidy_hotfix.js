(() => {
  const q = (selector, root = document) => root.querySelector(selector);
  const qa = (selector, root = document) => Array.from(root.querySelectorAll(selector));

  function ensureStyle() {
    if (document.getElementById("aq-layout-hotfix-style")) return;
    const style = document.createElement("style");
    style.id = "aq-layout-hotfix-style";
    style.textContent = `
      .aq-layout-hidden{display:none!important}
      #aqModuleDeck .aq-module-card{cursor:pointer}
      #page-dashboard{display:grid;gap:16px}
      #page-dashboard .metrics{display:none!important}
      #aqOpsStrip{display:grid!important;grid-template-columns:minmax(0,1.12fr) minmax(380px,.88fr)!important;gap:16px!important;align-items:start}
      #aqOpsStrip .aq-ops-card{height:100%}
      #aqOpsStrip .aq-map-shell{grid-template-columns:minmax(0,1fr) 250px!important;align-items:stretch}
      #aqModuleDeck{display:grid!important;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px!important}
      #aqModuleDeck .aq-module-card{min-height:0}
      @media (min-width:1440px){#aqModuleDeck{grid-template-columns:repeat(3,minmax(0,1fr))}}
      @media (max-width:1180px){#aqOpsStrip{grid-template-columns:1fr!important}#aqOpsStrip .aq-map-shell{grid-template-columns:1fr!important}}
      @media (max-width:760px){#aqModuleDeck{grid-template-columns:1fr!important}}
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

    const footerInfo = qa(".auth-footer .company-line")[1];
    if (footerInfo) footerInfo.textContent = "Doğrulama kurumsal merkez hattı üzerinden yürütülür.";

    qa(".hero-grid, .hero-console, .capsule-row").forEach((node) => node.classList.add("aq-layout-hidden"));
    qa(".signal-line").forEach((node) => node.classList.add("aq-layout-hidden"));
  }

  function trimDashboard() {
    const legacyRadar = q("#page-dashboard .ops-radar-strip");
    if (legacyRadar) legacyRadar.classList.add("aq-layout-hidden");

    qa("#page-dashboard .quick-actions").forEach((node) => node.classList.add("aq-layout-hidden"));
    qa("#page-dashboard .action-card").forEach((node) => node.classList.add("aq-layout-hidden"));

    const duplicateAnalyze = document.getElementById("aqDashboardAnalyze");
    if (duplicateAnalyze) duplicateAnalyze.remove();

    const heading = q("#page-dashboard .panel h2");
    if (heading) {
      heading.textContent = "Görev alanını seç ve doğrudan ilerle.";
    }

    const copy = q("#page-dashboard .panel p");
    if (copy) {
      copy.textContent = "Operasyon ekranı aktif.";
    }
  }

  function trimSidebar() {
    qa(".sidebar .sidebar-card").forEach((card) => {
      if (q("#sidebarDomain", card)) return;
      card.classList.add("aq-layout-hidden");
    });

    const summaryCard = q("#sidebarDomain")?.closest(".sidebar-card");
    if (summaryCard) {
      const title = q("h3", summaryCard);
      if (title) title.textContent = "Oturum özeti";
    }

    const topbarSub = q(".brand-mini p");
    if (topbarSub) topbarSub.textContent = "Yetkili kullanıcı oturumu";
  }

  function ensureSingleMissionDeck() {
    const strips = qa("#aqOpsStrip");
    strips.forEach((node, index) => {
      if (index > 0) node.remove();
    });
  }

  function trimModuleCards() {
    qa("#aqModuleDeck .aq-module-card").forEach((card) => {
      if (card.dataset.tidyBound === "1") return;
      card.dataset.tidyBound = "1";

      const armButton = q('[data-action="arm"]', card);
      if (armButton) armButton.remove();

      const analyzeButton = q('[data-action="analyze"]', card);
      if (analyzeButton) analyzeButton.textContent = "Analize geç";

      const copy = q(".aq-module-copy", card);
      if (copy) {
        copy.textContent = "Bu alanı etkinleştir ve gerekirse analize geç.";
      }

      card.addEventListener("click", (event) => {
        if (event.target.closest("button")) return;
        activateDomain(card.dataset.domain || "savunma", false);
      });
    });
  }

  function run() {
    ensureStyle();
    trimLoginCopy();
    ensureSingleMissionDeck();
    trimDashboard();
    trimSidebar();
    trimModuleCards();
  }

  run();
  window.setInterval(run, 1200);
})();
