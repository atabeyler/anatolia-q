const scrollLinks = document.querySelectorAll("[data-scroll-target]");
const revealItems = document.querySelectorAll("[data-reveal]");
const langButtons = document.querySelectorAll(".lang-btn");
const centerFab = document.getElementById("center-fab");
const centerMenu = document.getElementById("center-menu");
const centerDock = document.getElementById("center-dock");
const dockClose = document.getElementById("dock-close");
const dockTitle = document.getElementById("center-dock-title");
const dockKicker = document.getElementById("center-dock-kicker");
const dockCopy = document.getElementById("center-dock-copy");
const dockText = document.getElementById("center-text");
const dockSend = document.getElementById("dock-send");
const dockStatus = document.getElementById("center-dock-status");
const centerMenuButtons = document.querySelectorAll(".center-menu-btn");

const translations = {
  tr: {
    brand_sub: "Kuantum tabanlı ulusal karar destek sistemi",
    center_nav: "Merkez",
    radar_kicker: "Radar",
    radar_title: "Türkiye Operasyon Ağı",
    radar_copy: "Merkez izleme katmanı",
    signal_title: "Aktif hatlar",
    signal_badge: "Canlı",
    signal_1: "Avrupa yakası izleme aktif",
    signal_2: "Ankara merkez düğümü çevrim içi",
    signal_3: "KKTC bağlantı hattı görünür",
    panel_kicker: "Panel",
    panel_title: "Merkez Girişi",
    status_active: "Hat aktif",
    verify_lane: "Doğrulama hattı",
    field_code: "Kullanıcı Kodu",
    field_password: "Şifre",
    placeholder_code: "Operasyon kodu",
    placeholder_password: "Yetki şifresi",
    open_center: "Merkez Erişimini Aç",
    rights: "Tüm hakları saklıdır.",
    menu_direct: "Direkt mesaj",
    menu_hq: "Merkeze acil bildirim",
    menu_users: "Kullanıcılara acil bildirim",
    dock_send: "Gönder",
    dock_placeholder: "Mesaj içeriği",
  },
  en: {
    brand_sub: "Quantum-based national decision support system",
    center_nav: "Center",
    radar_kicker: "Radar",
    radar_title: "Turkey Operations Grid",
    radar_copy: "Central monitoring layer",
    signal_title: "Active lines",
    signal_badge: "Live",
    signal_1: "European side watch active",
    signal_2: "Ankara core node online",
    signal_3: "TRNC connection line visible",
    panel_kicker: "Panel",
    panel_title: "Center Access",
    status_active: "Line active",
    verify_lane: "Verification line",
    field_code: "User Code",
    field_password: "Password",
    placeholder_code: "Operation code",
    placeholder_password: "Authorization password",
    open_center: "Open Center Access",
    rights: "All rights reserved.",
    menu_direct: "Direct message",
    menu_hq: "Emergency to center",
    menu_users: "Emergency to users",
    dock_send: "Send",
    dock_placeholder: "Message body",
  },
};

const centerModes = {
  direct: {
    tr: {
      kicker: "Merkez",
      title: "Direkt Mesaj",
      copy: "Merkez hattı üzerinden doğrudan mesaj taslağı hazırlayın.",
      status: "Direkt mesaj kanalı hazır.",
    },
    en: {
      kicker: "Center",
      title: "Direct Message",
      copy: "Prepare a direct message through the central line.",
      status: "Direct message channel ready.",
    },
  },
  hq: {
    tr: {
      kicker: "Acil",
      title: "Merkeze Bildirim",
      copy: "Yüksek öncelikli uyarıyı merkez kanalına iletin.",
      status: "Merkez acil bildirim kanalı hazır.",
    },
    en: {
      kicker: "Urgent",
      title: "Notify Center",
      copy: "Route a high-priority alert to the central channel.",
      status: "Center emergency channel ready.",
    },
  },
  users: {
    tr: {
      kicker: "Acil",
      title: "Kullanıcılara Bildirim",
      copy: "Diğer kullanıcılara hızlı uyarı taslağı hazırlayın.",
      status: "Kullanıcı bildirim kanalı hazır.",
    },
    en: {
      kicker: "Urgent",
      title: "Notify Users",
      copy: "Prepare a rapid alert for other users.",
      status: "User alert channel ready.",
    },
  },
};

let currentLang = "tr";
let currentCenterMode = "direct";

function scrollToSection(event) {
  event.preventDefault();

  const targetId = event.currentTarget.getAttribute("data-scroll-target");
  const target = document.getElementById(targetId);

  if (!target) {
    return;
  }

  const topbar = document.querySelector(".topbar");
  const offset = topbar ? topbar.offsetHeight + 24 : 0;
  const top = target.getBoundingClientRect().top + window.scrollY - offset;

  window.scrollTo({
    top,
    behavior: "smooth",
  });
}

function applyLanguage(lang) {
  currentLang = lang;

  document.documentElement.lang = lang;

  document.querySelectorAll("[data-i18n]").forEach((node) => {
    const key = node.getAttribute("data-i18n");
    node.textContent = translations[lang][key] || node.textContent;
  });

  document.querySelectorAll("[data-i18n-placeholder]").forEach((node) => {
    const key = node.getAttribute("data-i18n-placeholder");
    node.setAttribute("placeholder", translations[lang][key] || "");
  });

  langButtons.forEach((button) => {
    button.classList.toggle("active", button.dataset.lang === lang);
  });

  dockSend.textContent = translations[lang].dock_send;
  dockText.setAttribute("placeholder", translations[lang].dock_placeholder);
  updateCenterDock(currentCenterMode);
}

function updateCenterDock(mode) {
  currentCenterMode = mode;
  const pack = centerModes[mode][currentLang];

  dockKicker.textContent = pack.kicker;
  dockTitle.textContent = pack.title;
  dockCopy.textContent = pack.copy;
  dockStatus.textContent = pack.status;
}

function toggleCenterMenu() {
  const isHidden = centerMenu.hasAttribute("hidden");

  if (isHidden) {
    centerMenu.removeAttribute("hidden");
  } else {
    centerMenu.setAttribute("hidden", "");
  }
}

function openCenterDock(mode) {
  updateCenterDock(mode);
  centerMenu.setAttribute("hidden", "");
  centerDock.removeAttribute("hidden");
  dockText.focus();
}

function closeCenterDock() {
  centerDock.setAttribute("hidden", "");
}

function sendCenterDraft() {
  const message = dockText.value.trim();

  if (!message) {
    dockStatus.textContent =
      currentLang === "tr" ? "Mesaj içeriği girin." : "Enter a message body.";
    return;
  }

  dockStatus.textContent =
    currentLang === "tr"
      ? "Taslak merkez kanalına hazırlandı."
      : "Draft prepared for the center channel.";
  dockText.value = "";
}

scrollLinks.forEach((link) => {
  link.addEventListener("click", scrollToSection);
});

if ("IntersectionObserver" in window) {
  const revealObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("in-view");
          revealObserver.unobserve(entry.target);
        }
      });
    },
    {
      threshold: 0.18,
    }
  );

  revealItems.forEach((item) => revealObserver.observe(item));
} else {
  revealItems.forEach((item) => item.classList.add("in-view"));
}

langButtons.forEach((button) => {
  button.addEventListener("click", () => applyLanguage(button.dataset.lang));
});

centerFab.addEventListener("click", toggleCenterMenu);
dockClose.addEventListener("click", closeCenterDock);
dockSend.addEventListener("click", sendCenterDraft);

centerMenuButtons.forEach((button) => {
  button.addEventListener("click", () => openCenterDock(button.dataset.centerMode));
});

document.addEventListener("click", (event) => {
  if (!centerFab.contains(event.target) && !centerMenu.contains(event.target)) {
    centerMenu.setAttribute("hidden", "");
  }
});

applyLanguage("tr");
