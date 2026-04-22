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
    `;
    document.head.appendChild(style);
  }

  function activateDomain(domain, jump) {
    if (typeof window.setDomain === "function") window.setDomain(domain, jump);
    if (typeof window.switchPage === "function") window.switchPage(jump ? "analysis" : "dashboard");
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
      heading.textContent = "Operasyon görünümünü sadeleştir, alanı seç ve doğrudan ilerle.";
    }

    const copy = q("#page-dashboard .panel .body-copy");
    if (copy) {
      copy.textContent = "Tek merkez, Türkiye alarm haritası ve görev modülleri aynı akışta tutulur. Gereksiz tekrarlar kaldırıldı.";
    }
  }

  function trimSidebar() {
    const moduleCard = q("#moduleList")?.closest(".sidebar-card");
    if (moduleCard) moduleCard.classList.add("aq-layout-hidden");

    const centerCard = q("#centerBtnSide")?.closest(".sidebar-card");
    if (centerCard) centerCard.classList.add("aq-layout-hidden");

    const noteCard = q("#sidebarDomain")?.closest(".sidebar-card");
    if (noteCard) {
      const title = q("h3", noteCard);
      if (title) title.textContent = "Oturum özeti";
    }
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
        copy.textContent = "Bu alanı etkinleştir, paneli sadeleştir ve gerektiğinde tek tuşla analize geç.";
      }

      card.addEventListener("click", (event) => {
        if (event.target.closest("button")) return;
        activateDomain(card.dataset.domain || "savunma", false);
      });
    });
  }

  function run() {
    ensureStyle();
    trimDashboard();
    trimSidebar();
    trimModuleCards();
  }

  run();
  window.setInterval(run, 1200);
})();
