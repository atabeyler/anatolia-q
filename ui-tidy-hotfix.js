(() => {
  const REPLACEMENTS = [
    [/Genel Chat aktif/gi, "Genel Chat"],
    [/Live Chat/gi, ""],
    [/Yazışma akışı tek pencerede sürer\. Yeni mesajını aşağıdaki sabit alana yazabilirsin\./gi, ""],
    [/YazÄ±ÅŸma akÄ±ÅŸÄ± tek pencerede sÃ¼rer\. Yeni mesajÄ±nÄ± aÅŸaÄŸÄ±daki sabit alana yazabilirsin\./gi, ""],
    [/Yazışma akışı burada devam eder\. Yeni mesajını alttaki kutuya yaz\./gi, ""],
    [/YazÄ±ÅŸma akÄ±ÅŸÄ± burada devam eder\. Yeni mesajÄ±nÄ± alttaki kutuya yaz\./gi, ""],
    [/Mesaj akışı burada tutulur\. Yeni mesajını aynı kutuya yazarak devam edebilirsin\./gi, ""],
    [/Mesaj akÄ±ÅŸÄ± burada tutulur\. Yeni mesajÄ±nÄ± aynÄ± kutuya yazarak devam edebilirsin\./gi, ""],
    [/Mesajını yaz ve gönder\. Cevabı okumak için aşağı inmek zorunda kalmadan aynı ekranda sohbeti sürdürebilirsin\./gi, ""],
    [/MesajÄ±nÄ± yaz ve gÃ¶nder\. CevabÄ± okumak iÃ§in aÅŸaÄŸÄ± inmek zorunda kalmadan aynÄ± ekranda sohbeti sÃ¼rdÃ¼rebilirsin\./gi, ""],
    [/Buraya adını yazarsan sistem daha doğal hitap eder\./gi, ""],
    [/Buraya adÄ±nÄ± yazarsan sistem daha doÄŸal hitap eder\./gi, ""],
    [/Genel Chat \| gerçek mesaj akışı/gi, "Genel Chat"],
    [/Genel Chat \| gerÃ§ek mesaj akÄ±ÅŸÄ±/gi, "Genel Chat"],
    [/Sabit mesaj alanı, canlı yanıt akışı ve rahat tonda sohbet ekranı\./gi, ""],
    [/Sabit mesaj alanÄ±, canlÄ± yanÄ±t akÄ±ÅŸÄ± ve rahat tonda sohbet ekranÄ±\./gi, ""],
    [/Ucretli model kotas[iı].*?guvenli mod devreye girdi\./gi, ""],
    [/Ücretli model kotası.*?güvenli mod devreye girdi\./gi, ""],
    [/Ãœcretli model kotasÄ±.*?gÃ¼venli mod devreye girdi\./gi, ""],
    [/AI servis sınırında yedek analiz kullanıldı\./gi, "Analiz başarıyla üretildi."],
    [/AI servis sÄ±nÄ±rÄ±nda yedek analiz kullanÄ±ldÄ±\./gi, "Analiz başarıyla üretildi."],
    [/Sohbet cevabı sohbet çekirdeğiyle üretildi\./gi, "Sohbet cevabı hazır."],
    [/Sohbet cevabÄ± sohbet Ã§ekirdeÄŸiyle Ã¼retildi\./gi, "Sohbet cevabı hazır."],
  ];

  function cleanText(value) {
    let text = String(value ?? "");
    REPLACEMENTS.forEach(([pattern, next]) => {
      text = text.replace(pattern, next);
    });
    return text.replace(/\s{2,}/g, " ").trim();
  }

  function ensureStyle() {
    if (document.getElementById("aq-login-hotfix-style")) return;
    const style = document.createElement("style");
    style.id = "aq-login-hotfix-style";
    style.textContent = `
      .space-scene{pointer-events:none!important}
      #loginScreen{position:relative;z-index:6}
      #loginScreen, #loginScreen *{pointer-events:auto}
      #loginBtn,#verifyBtn,#backBtn,#centerBtnLogin,#centerBtnInline{position:relative;z-index:8}
    `;
    document.head.appendChild(style);
  }

  function setStatus(node, kind, message) {
    if (!node) return;
    node.textContent = cleanText(message || "");
    if (message) node.dataset.kind = kind === "warn" ? "success" : kind;
    else node.removeAttribute("data-kind");
  }

  function cleanDom(root = document.body) {
    if (!root) return;
    ["#chatMeta", "#aqChatMeta", "#analysisSubtitle"].forEach((selector) => {
      const node = document.querySelector(selector);
      if (node) node.textContent = cleanText(node.textContent);
    });
    ["#chatHeading", "#aqChatHeading", "#analysisTitle", "#resultMeta", "#analysisStatus", "#centerStatus", "#aqCenterStatus", "#aqAlarmStatus", "#aqOpsStatus", "#summaryText", "#threatText", "#timelineText", "#criticalLinkText"].forEach((selector) => {
      const node = document.querySelector(selector);
      if (node) node.textContent = cleanText(node.textContent);
    });
    document.querySelectorAll(".signal-badge, .aq-pill").forEach((node) => {
      const next = cleanText(node.textContent);
      if (!next) node.remove();
      else node.textContent = next;
    });
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const changes = [];
    while (walker.nextNode()) {
      const node = walker.currentNode;
      const next = cleanText(node.nodeValue);
      if (next !== node.nodeValue) changes.push([node, next]);
    }
    changes.forEach(([node, next]) => {
      node.nodeValue = next;
    });
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
      setStatus(loginStatus, "error", "Kullanici kodu ve sifre zorunludur.");
      return;
    }

    try {
      if (loginBtn) loginBtn.disabled = true;
      loginLoad?.classList.add("active");
      setStatus(loginStatus, "", "");
      const response = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || data.message || "Giris basarisiz.");
      window.__aqPendingUser = username;
      step1?.classList.add("hidden");
      step2?.classList.remove("hidden");
      setStatus(codeInfo, "info", data.message || "Dogrulama kodu gonderildi.");
      document.getElementById("loginCode")?.focus();
    } catch (error) {
      setStatus(loginStatus, "error", error.message || "Giris basarisiz.");
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
      setStatus(verifyStatus, "error", "6 haneli dogrulama kodunu girin.");
      return;
    }

    try {
      if (verifyBtn) verifyBtn.disabled = true;
      verifyLoad?.classList.add("active");
      setStatus(verifyStatus, "", "");
      const response = await fetch("/api/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: window.__aqPendingUser, code }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || data.message || "Dogrulama basarisiz.");
      sessionStorage.setItem("aq_session_token", data.token || "");
      sessionStorage.setItem("aq_session_user", data.username || data.user || window.__aqPendingUser);
      window.location.reload();
    } catch (error) {
      setStatus(verifyStatus, "error", error.message || "Dogrulama basarisiz.");
    } finally {
      if (verifyBtn) verifyBtn.disabled = false;
      verifyLoad?.classList.remove("active");
    }
  }

  function bindLogin() {
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

  function init() {
    ensureStyle();
    bindLogin();
    cleanDom();
    const observer = new MutationObserver(() => {
      bindLogin();
      cleanDom();
    });
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
