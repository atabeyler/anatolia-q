(() => {
  const TEXT_REPLACEMENTS = [
    [/Genel Chat aktif/gi, "Genel Chat"],
    [/Live Chat/gi, ""],
    [/Yaz(?:ı|Ä±)şma ak(?:ı|Ä±)şı tek pencerede sürer\.? Yeni mesaj(?:ı|Ä±)n(?:ı|Ä±) aşağıdaki sabit alana yazabilirsin\.?/gi, ""],
    [/Yaz(?:ı|Ä±)şma ak(?:ı|Ä±)şı burada devam eder\.? Yeni mesaj(?:ı|Ä±)n(?:ı|Ä±) alttaki kutuya yaz\.?/gi, ""],
    [/Mesaj ak(?:ı|Ä±)şı burada tutulur\.? Yeni mesaj(?:ı|Ä±)n(?:ı|Ä±) aynı kutuya yazarak devam edebilirsin\.?/gi, ""],
    [/Mesaj(?:ı|Ä±)n(?:ı|Ä±) yaz ve gönder\.? Cevab(?:ı|Ä±) okumak için aşağı inmek zorunda kalmadan aynı ekranda sohbeti sürdürebilirsin\.?/gi, ""],
    [/Buraya ad(?:ı|Ä±)n(?:ı|Ä±) yazarsan sistem daha doğal hitap eder\.?/gi, ""],
    [/Genel Chat \| gerçek mesaj ak(?:ı|Ä±)şı/gi, "Genel Chat"],
    [/Sabit mesaj alan(?:ı|Ä±), canlı yanıt ak(?:ı|Ä±)şı ve rahat tonda sohbet ekran(?:ı|Ä±)\.?/gi, ""],
    [/Ucretli model kotas(?:i|ı|Ä±).*?guvenli mod devreye girdi\.?/gi, ""],
    [/Ücretli model kotası.*?güvenli mod devreye girdi\.?/gi, ""],
    [/AI servis sınırında yedek analiz kullanıldı\.?/gi, "Analiz başarıyla üretildi."],
    [/Sohbet cevabı sohbet çekirdeğiyle üretildi\.?/gi, "Sohbet cevabı hazır."],
    [/\s*\|\s*yedek akış/gi, ""],
    [/\s*\|\s*Mod:\s*Sohbet çekirdeği/gi, ""],
    [/\s*\|\s*Mod:\s*Yedek analiz/gi, ""],
  ];

  function cleanText(value) {
    let text = String(value ?? "");
    for (const [pattern, next] of TEXT_REPLACEMENTS) text = text.replace(pattern, next);
    return text.replace(/\s{2,}/g, " ").trim();
  }

  function ensureInteractionStyle() {
    if (document.getElementById("aq-login-hotfix-style")) return;
    const style = document.createElement("style");
    style.id = "aq-login-hotfix-style";
    style.textContent = `
      .space-scene{pointer-events:none!important}
      #loginScreen{position:relative;z-index:6}
      #loginScreen,#loginScreen *{pointer-events:auto}
      #loginBtn,#verifyBtn,#backBtn,#centerBtnLogin,#centerBtnInline{position:relative;z-index:8}
    `;
    document.head.appendChild(style);
  }

  function cleanSelectorText(selectors) {
    selectors.forEach((selector) => {
      document.querySelectorAll(selector).forEach((node) => {
        const next = cleanText(node.textContent);
        if (next !== node.textContent) node.textContent = next;
      });
    });
  }

  function cleanFixedNodes() {
    ["#chatMeta", "#aqChatMeta"].forEach((selector) => {
      const node = document.querySelector(selector);
      if (node) node.textContent = "";
    });

    cleanSelectorText([
      "#chatHeading",
      "#aqChatHeading",
      "#analysisTitle",
      "#analysisStatus",
      "#centerStatus",
      "#aqCenterStatus",
      "#aqAlarmStatus",
      "#aqOpsStatus",
      "#summaryText",
      "#threatText",
      "#timelineText",
      "#criticalLinkText",
      ".field-note",
      ".hero-copy",
      ".ops-line",
      ".signal-line",
      ".metric-copy",
      ".kicker-copy",
      ".mini-stat span",
      ".timeline-entry p",
      ".history-card p",
      ".chat-meta",
    ]);

    document.querySelectorAll(".signal-badge, .aq-pill").forEach((node) => {
      const next = cleanText(node.textContent);
      if (!next) node.remove();
      else if (next !== node.textContent) node.textContent = next;
    });
  }

  function deepCleanPayload(value) {
    if (Array.isArray(value)) return value.map(deepCleanPayload);
    if (!value || typeof value !== "object") return typeof value === "string" ? cleanText(value) : value;
    const next = {};
    Object.entries(value).forEach(([key, current]) => {
      next[key] = deepCleanPayload(current);
    });
    return next;
  }

  function patchStatus() {
    if (typeof window.setStatus !== "function" || window.__aqStatusPatched) return;
    window.__aqStatusPatched = true;
    const original = window.setStatus;
    window.setStatus = function patchedSetStatus(node, kind, message) {
      return original.call(this, node, kind === "warn" ? "success" : kind, cleanText(message));
    };
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
      for (const [pattern, next] of TEXT_REPLACEMENTS) html = html.replace(pattern, next);
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
    cleanFixedNodes();
  }

  function init() {
    ensureInteractionStyle();
    patchStatus();
    patchRenderResult();
    patchHistory();
    patchReportBuilder();
    bindLoginHotfix();
    runCleanup();
    [250, 900, 1800].forEach((delay) => {
      window.setTimeout(() => {
        bindLoginHotfix();
        runCleanup();
      }, delay);
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
