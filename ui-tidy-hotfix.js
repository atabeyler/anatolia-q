(() => {
  const CHAT_TEXT_REPLACEMENTS = [
    [/Genel Chat aktif/gi, "Genel Chat"],
    [/Live Chat/gi, ""],
    [/Yazışma akışı tek pencerede sürer\. Yeni mesajını aşağıdaki sabit alana yazabilirsin\./gi, ""],
    [/YazÄ±ÅŸma akÄ±ÅŸÄ± tek pencerede sÃ¼rer\. Yeni mesajÄ±nÄ± aÅŸaÄŸÄ±daki sabit alana yazabilirsin\./gi, ""],
    [/Yazışma akışı burada devam eder\. Yeni mesajını alttaki kutuya yaz\./gi, ""],
    [/YazÄ±ÅŸma akÄ±ÅŸÄ± burada devam eder\. Yeni mesajÄ±nÄ± alttaki kutuya yaz\./gi, ""],
    [/Mesaj akışı burada tutulur\. Yeni mesajını aynı kutuya yazarak devam edebilirsin\./gi, ""],
    [/Mesaj akÄ±ÅŸÄ± burada tutulur\. Yeni mesajÄ±nÄ± aynÄ± kutuya yazarak devam edebilirsin\./gi, ""],
    [/Buraya adını yazarsan sistem daha doğal hitap eder\./gi, ""],
    [/Buraya adÄ±nÄ± yazarsan sistem daha doÄŸal hitap eder\./gi, ""],
    [/Genel Chat \| gerçek mesaj akışı/gi, "Genel Chat"],
    [/Genel Chat \| gerÃ§ek mesaj akÄ±ÅŸÄ±/gi, "Genel Chat"],
    [/Sabit mesaj alanı, canlı yanıt akışı ve rahat tonda sohbet ekranı\./gi, ""],
    [/Sabit mesaj alanÄ±, canlÄ± yanÄ±t akÄ±ÅŸÄ± ve rahat tonda sohbet ekranÄ±\./gi, ""],
  ];

  const ANALYSIS_TEXT_REPLACEMENTS = [
    [/ucretsiz yedek analiz uretildi/gi, "degerlendirme uretildi"],
    [/ücretsiz yedek analiz üretildi/gi, "değerlendirme üretildi"],
    [/Ã¼cretsiz yedek analiz Ã¼retildi/gi, "değerlendirme üretildi"],
    [/Ucretli model kotas[iı].*?guvenli mod devreye girdi\./gi, "Mevcut bulgular çerçevesinde durum değerlendirmesi sunulmuştur."],
    [/Ücretli model kotası.*?güvenli mod devreye girdi\./gi, "Mevcut bulgular çerçevesinde durum değerlendirmesi sunulmuştur."],
    [/Ãœcretli model kotasÄ±.*?gÃ¼venli mod devreye girdi\./gi, "Mevcut bulgular çerçevesinde durum değerlendirmesi sunulmuştur."],
    [/\s*\|\s*yedek akış/gi, ""],
    [/\s*\|\s*yedek akis/gi, ""],
    [/\s*\|\s*yedek akÄ±ÅŸ/gi, ""],
    [/\s*\|\s*Mod:\s*Sohbet çekirdeği/gi, ""],
    [/\s*\|\s*Mod:\s*Sohbet Ã§ekirdeÄŸi/gi, ""],
    [/\s*\|\s*Mod:\s*Yedek analiz/gi, ""],
    [/AI servis sınırında yedek analiz kullanıldı\./gi, "Analiz başarıyla üretildi."],
    [/AI servis sÄ±nÄ±rÄ±nda yedek analiz kullanÄ±ldÄ±\./gi, "Analiz başarıyla üretildi."],
    [/Sohbet cevabı sohbet çekirdeğiyle üretildi\./gi, "Sohbet cevabı hazır."],
    [/Sohbet cevabÄ± sohbet Ã§ekirdeÄŸiyle Ã¼retildi\./gi, "Sohbet cevabı hazır."],
    [/\bYedek\b/gi, "Analiz"],
  ];

  function cleanText(value) {
    let text = String(value ?? "");
    [...CHAT_TEXT_REPLACEMENTS, ...ANALYSIS_TEXT_REPLACEMENTS].forEach(([pattern, next]) => {
      text = text.replace(pattern, next);
    });
    return text.replace(/\s{2,}/g, " ").trim();
  }

  function cleanNodeText(root) {
    if (!root) return;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const changed = [];
    while (walker.nextNode()) {
      const node = walker.currentNode;
      const next = cleanText(node.nodeValue);
      if (next !== node.nodeValue) changed.push([node, next]);
    }
    changed.forEach(([node, next]) => {
      node.nodeValue = next;
    });
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
      html = html.replace(/<p><strong>SaÄŸlayÄ±cÄ±:<\/strong>.*?<\/p>/gi, "");
      html = html.replace(/<p><strong>Saglayici:<\/strong>.*?<\/p>/gi, "");
      [...CHAT_TEXT_REPLACEMENTS, ...ANALYSIS_TEXT_REPLACEMENTS].forEach(([pattern, next]) => {
        html = html.replace(pattern, next);
      });
      return html;
    };
  }

  function runCleanup() {
    clearSelectors();
    cleanResultCards();
    cleanNodeText(document.body);
  }

  function init() {
    patchStatus();
    patchRenderResult();
    patchHistory();
    patchReportBuilder();
    runCleanup();
    const observer = new MutationObserver(() => runCleanup());
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
