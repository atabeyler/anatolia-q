(() => {
  if (window.__aqChatPatchActive) return;
  window.__aqChatPatchActive = true;

  const state = {
    busy: false,
    messages: [],
  };

  const textFixes = [
    ["b1", "31"],
    ["b0", "30"],
    ["8", "f"],
    ["e", "e"],
    ["8", "f"],
    ["e", "e"],
    ["bc", "c"],
    ["3", "c"],
    ["b6", "6"],
    ["", "6"],
    ["a7", "7"],
    ["", "7"],
    [" ", "'"],
    [" 3", '"'],
    [" 	d", '"'],
    [" 
6", "..."],
  ];

  const norm = (value) => {
    let text = String(value ?? "");
    textFixes.forEach(([from, to]) => {
      text = text.replaceAll(from, to);
    });
    return text;
  };

  const byId = (id) => document.getElementById(id);
  const q = (selector, root = document) => root.querySelector(selector);

  const isChatMode = () => {
    if (window.state?.domain) return window.state.domain === "genel_chat";
    return Boolean(q('[data-domain="genel_chat"].active'));
  };

  const getApiBase = () => {
    if (window.API_BASE) return window.API_BASE;
    const fallback = "https://anatolia-q.onrender.com";
    const host = window.location.hostname;
    const local = host === "localhost" || host === "127.0.0.1";
    return window.location.protocol.startsWith("http") && !local ? window.location.origin : fallback;
  };

  const getToken = () => {
    if (window.state?.sessionToken) return window.state.sessionToken;
    try {
      const raw = localStorage.getItem("anatolia_q_session_v3") || localStorage.getItem("anatolia_q_session_v4");
      if (!raw) return "";
      const parsed = JSON.parse(raw);
      return parsed.token || parsed.sessionToken || "";
    } catch (_) {
      return "";
    }
  };

  const setStatus = (kind, message) => {
    const node = byId("analysisStatus");
    if (!node) return;
    node.className = "status-box";
    if (!message) {
      node.textContent = "";
      node.removeAttribute("data-kind");
      return;
    }
    node.dataset.kind = kind;
    node.textContent = norm(message);
  };

  const setLoading = (active) => {
    const load = byId("analysisLoad");
    if (load) load.classList.toggle("active", active);
    const runBtn = byId("runBtn");
    if (runBtn) runBtn.disabled = active;
  };

  const ensureThread = () => {
    const shell = byId("chatShell") || q(".chat-shell");
    const resultArea = byId("resultArea");
    if (shell) {
      shell.classList.add("active");
      if (resultArea) resultArea.classList.add("hidden");
      return shell;
    }

    const anchor = q("#page-analysis .analysis-grid") || q("#page-analysis .panel");
    if (!anchor) return null;

    const wrap = document.createElement("div");
    wrap.id = "chatShell";
    wrap.className = "chat-shell active";
    wrap.innerHTML = `
      <div class="result-card full">
        <div class="section-kicker">Genel Chat</div>
        <h3 id="chatHeading">Genel Chat</h3>
        <p id="chatMeta" class="card-copy"></p>
        <div id="chatThread" class="chat-thread"></div>
      </div>
    `;
    anchor.insertBefore(wrap, anchor.firstChild);
    if (resultArea) resultArea.classList.add("hidden");
    return wrap;
  };

  const render = () => {
    const shell = ensureThread();
    if (!shell) return;

    const thread = byId("chatThread");
    if (!thread) return;
    thread.replaceChildren();

    state.messages.forEach((message) => {
      const row = document.createElement("div");
      row.className = `chat-row ${message.role === "user" ? "user" : "assistant"}`;

      const avatar = document.createElement("div");
      avatar.className = "chat-avatar";
      avatar.textContent = message.role === "user" ? "SEN" : "AQ";

      const bubble = document.createElement("div");
      bubble.className = "chat-bubble";

      const meta = document.createElement("p");
      meta.className = "chat-meta";
      meta.textContent = norm(message.meta || (message.role === "user" ? "Kullan1c1 mesaj1" : "T.C. ANATOLIA-Q"));

      const text = document.createElement("p");
      text.className = "chat-text";
      text.textContent = norm(message.content || "");

      bubble.appendChild(meta);
      bubble.appendChild(text);
      row.appendChild(avatar);
      row.appendChild(bubble);
      thread.appendChild(row);
    });

    requestAnimationFrame(() => {
      thread.scrollTop = thread.scrollHeight;
    });
  };

  const pushMessage = (role, content, meta) => {
    const message = { role, content: norm(content), meta: norm(meta) };
    const last = state.messages[state.messages.length - 1];
    if (last && last.role === message.role && last.content === message.content && last.meta === message.meta) return;
    state.messages.push(message);
    render();
  };

  const syncFromExisting = () => {
    if (state.messages.length) return;
    const rows = document.querySelectorAll("#chatThread .chat-row");
    rows.forEach((row) => {
      const role = row.classList.contains("user") ? "user" : "assistant";
      const content = norm(q(".chat-text", row)?.textContent || "");
      const meta = norm(q(".chat-meta", row)?.textContent || "");
      if (content) pushMessage(role, content, meta);
    });
  };

  const sendChat = async () => {
    if (!isChatMode() || state.busy) return;

    const input = byId("sitInput");
    const chatName = byId("chatNameInput");
    if (!input) return;

    const situation = input.value.trim();
    if (!situation) {
      setStatus("error", "Mesaj alan1 bo b1rak1lamaz.");
      return;
    }

    syncFromExisting();

    state.busy = true;
    setLoading(true);
    setStatus("", "");
    pushMessage("user", situation, chatName?.value?.trim() ? `${chatName.value.trim()} | kullan1c1 mesaj1` : "Kullan1c1 mesaj1");

    try {
      const token = getToken();
      const headers = {
        "Content-Type": "application/json",
      };
      if (token) {
        headers.Authorization = `Bearer ${token}`;
        headers["X-Auth-Token"] = token;
      }

      const response = await fetch(`${getApiBase()}/api/analyze`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          domain: "genel_chat",
          situation,
          chat_name: chatName?.value?.trim() || "",
          chat_history: state.messages
            .filter((item) => item.role === "user" || item.role === "assistant")
            .slice(0, -1)
            .map((item) => ({ role: item.role, content: item.content })),
        }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.detail || data.message || `0stek baar1s1z (${response.status})`);

      pushMessage("assistant", data.ozet || "K1sa sohbet cevab1 haz1r.", data.sohbet_tonu || "Rahat sohbet");

      const lastSummary = byId("lastSummary");
      if (lastSummary) lastSummary.textContent = norm(data.ozet || "");
      const downloadBtn = byId("downloadBtn");
      if (downloadBtn) downloadBtn.disabled = false;
      input.value = "";
      setStatus("success", "Sohbet cevab1 haz1r.");
    } catch (error) {
      state.messages.pop();
      render();
      setStatus("error", error.message || "Sohbet cevab1 cretilemedi.");
    } finally {
      state.busy = false;
      setLoading(false);
    }
  };

  document.addEventListener(
    "click",
    (event) => {
      if (!isChatMode()) return;
      const runBtn = event.target.closest("#runBtn");
      if (!runBtn) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      sendChat();
    },
    true,
  );

  document.addEventListener(
    "keydown",
    (event) => {
      if (!isChatMode()) return;
      const input = event.target.closest("#sitInput, #chatNameInput");
      if (!input) return;
      if (event.key !== "Enter") return;
      if (input.id === "sitInput" && event.shiftKey) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      sendChat();
    },
    true,
  );

  document.addEventListener("DOMContentLoaded", render);
  window.addEventListener("load", render);
})();
