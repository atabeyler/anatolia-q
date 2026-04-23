(() => {
  const CHAT_TEXTS = [
    "Genel Chat aktif",
    "Live Chat",
    "Yazışma akışı tek pencerede sürer. Yeni mesajını aşağıdaki sabit alana yazabilirsin.",
    "Mesajını yaz ve gönder. Cevabı okumak için aşağı inmek zorunda kalmadan aynı ekranda sohbeti sürdürebilirsin.",
    "Buraya adını yazarsan sistem daha doğal hitap eder.",
  ];

  const CLEAN_REPLACEMENTS = [
    [/Yedek analiz/gi, "Analiz"],
    [/Sohbet çekirdeği/gi, ""],
    [/AI servis sınırında yedek analiz kullanıldı\./gi, "Analiz başarıyla üretildi."],
    [/Ücretli model kotası.*?güvenli mod devreye girdi\./gi, "Mevcut bulgular çerçevesinde durum değerlendirmesi sunulmuştur."],
    [/Ucretli model kotasi.*?guvenli mod devreye girdi\./gi, "Mevcut bulgular çerçevesinde durum değerlendirmesi sunulmuştur."],
    [/\s*\|\s*Mod:\s*Analiz/gi, ""],
    [/\s*\|\s*Mod:\s*Yedek analiz/gi, ""],
    [/\s{2,}/g, " "],
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
    if (node) node.textContent = value;
  }

  function setAttr(selector, name, value) {
    const node = q(selector);
    if (node) node.setAttribute(name, value);
  }

  function removeCard(card) {
    if (card) card.remove();
  }

  function removeCardsByTitle(title, options = {}) {
    const target = normalize(title);
    const { keep = 0, skipSelector = "" } = options;
    const matches = qa(".sidebar-card, .panel, .action-card, .aq-ops-card").filter((card) => {
      if (skipSelector && q(skipSelector, card)) return false;
      const heading = q("h1, h2, h3, .section-kicker, .aq-kicker, strong", card);
      return normalize(heading?.textContent) === target;
    });
    matches.slice(keep).forEach(removeCard);
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

  function fixLoginScreen() {
    setText("#loginScreen .hero-kicker", "Kuantum tabanlı ulusal karar destek sistemi");
    setText("#loginScreen .hero-copy", "Bu arayüz yalnızca yetkili personel içindir. Kullanıcı kodu, ortak şifre ve merkez onaylı ikinci aşama doğrulama olmadan erişim sağlanamaz.");
    setText("#loginScreen .brand-sub", "Yetkili kullanıcılar için kapalı erişim arayüzü. Doğrulama, oturum güvenliği ve merkez teyidi tek hatta tutulur.");
    setText("#loginScreen .hero-grid .hero-card:nth-child(1) strong", "Gizlilik katmanı");
    setText("#loginScreen .hero-grid .hero-card:nth-child(1) span", "Tüm erişim talepleri kapalı doğrulama hattında ilerler. Yetkisiz giriş denemeleri dikkate alınır.");
    setText("#loginScreen .hero-grid .hero-card:nth-child(2) strong", "Merkez teyidi");
    setText("#loginScreen .hero-grid .hero-card:nth-child(2) span", "İkinci aşama kodu yalnızca merkez hattına gider. Oturum açma yetkisi merkez kontrolünde kalır.");
    setText("#loginScreen .hero-grid .hero-card:nth-child(3) strong", "Oturum güvenliği");
    setText("#loginScreen .hero-grid .hero-card:nth-child(3) span", "Doğrulama tamamlanmadan sistem açılmaz. Oturum akışı kod bazlı kimlik eşleşmesi ile sürer.");
    setText("#loginScreen .hero-grid .hero-card:nth-child(4) strong", "Yetki disiplini");
    setText("#loginScreen .hero-grid .hero-card:nth-child(4) span", "Merkez, doğrulama, yönetsel irtibat ve kullanıcı yetkileri tek hatta tutulur.");
    setText("#loginScreen .signal-title", "Gizlilik durumu");
    setText("#loginScreen .signal-line:nth-child(1)", "Yetkisiz kullanıcılar için erişim kapalıdır. Doğrulama hattı merkez tarafından yönetilir.");
    setText("#loginScreen .signal-line:nth-child(2)", "Kod, şifre ve ikinci aşama teyit tamamlanmadan operasyon ekranı açılmaz.");
    setText("#loginScreen .signal-line:nth-child(3)", "Merkez iletişim, kullanıcı kodu ve yönetsel teyit akışı aynı güvenlik düzleminde tutulur.");
    setText("#step1 .section-kicker", "Kimlik doğrulama | adım 1/2");
    setText("#step2 .section-kicker", "İkinci doğrulama | adım 2/2");
    setText("label[for='loginUser']", "Kullanıcı kodu");
    setText("label[for='loginPass']", "Şifre");
    setText("label[for='loginCode']", "Doğrulama kodu");
    setAttr("#loginUser", "placeholder", "6 haneli kullanıcı kodunu girin");
    setAttr("#loginPass", "placeholder", "Şifrenizi girin");
    setAttr("#loginCode", "placeholder", "6 haneli kod");
    setText("#loginBtn", "Giriş yap");
    setText("#verifyBtn", "Doğrula ve aç");
    setText("#backBtn", "Geri dön");
    setText("#step1 .field-note", "Yetkisiz giriş yapılamaz. Doğrulama kodu yalnızca merkez e-posta hattına yönlendirilir.");
  }

  function tidyDashboard() {
    removeCardsByTitle("Merkez kanalı");
    removeCardsByTitle("Görev modülleri");
    removeCardsByTitle("Modüller", { skipSelector: "#moduleList" });
    removeCardsByTitle("Türkiye alarm radarı", { keep: 1 });
    removeDuplicateButtons("Yeni analiz başlat", 1);
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
    tidyDashboard();
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
      "#timelineText"
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