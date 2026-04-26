(() => {
  if (window.__aqChatPatchActive) return;
  window.__aqChatPatchActive = true;

  const chatState = {
    busy: false,
    messages: [],
  };

  const FIXES = [
    ["\u00c4\u00b1", "\u0131"],
    ["\u00c4\u00b0", "\u0130"],
    ["\u00c4\u0178", "\u011f"],
    ["\u00c4\u017e", "\u011e"],
    ["\u00c5\u0178", "\u015f"],
    ["\u00c5\u017e", "\u015e"],
    ["\u00c3\u00bc", "\u00fc"],
    ["\u00c3\u0153", "\u00dc"],
    ["\u00c3\u00b6", "\u00f6"],
    ["\u00c3\u2013", "\u00d6"],
    ["\u00c3\u00a7", "\u00e7"],
    ["\u00c3\u2021", "\u00c7"],
    ["\u00e2\u20ac\u2122", "'"],
    ["\u00e2\u20ac\u0153", '"'],
    ["\u00e2\u20ac\u009d", '"'],
    ["\u00e2\u20ac\u00a6", "..."],
  ];

  const norm = (value) => {
    let text = String(value ?? "");
    FIXES.forEach(([from, to]) => {
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
      const raw = localStorage.getItem("anatolia_q_session_v4") || localStorage.getItem("anatolia_q_session_v3");
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
    const bar = byId("analysisLoad");
    if (bar) bar.classList.toggle("active", active);
    const button = byId("runBtn");
    if (button) button.disabled = active;
  };

  const ensureThread = () => {
    let shell = byId("chatShell") || q(".chat-shell");
    const resultArea = byId("resultArea");
    if (!shell) {
      const anchor = q("#page-analysis .analysis-grid") || q("#page-analysis .panel");
      if (!anchor) return null;
      shell = document.createElement("div");
      shell.id = "chatShell";
      shell.className = "chat-shell active";
      shell.innerHTML = [
        '<div class="result-card full">',
        '  <div class="section-kicker">Genel Chat</div>',
        '  <h3 id="chatHeading">Genel Chat</h3>',
        '  <p id="chatMeta" class="card-copy"></p>',
        '  <div id="chatThread" class="chat-thread"></div>',
        "</div>",
      ].join("");
      anchor.insertBefore(shell, anchor.firstChild);
    }
    shell.classList.add("active");
    if (resultArea) resultArea.classList.add("hidden");
    return shell;
  };

  const render = () => {
    const shell = ensureThread();
    const thread = byId("chatThread");
    if (!shell || !thread) return;

    thread.replaceChildren();

    chatState.messages.forEach((message) => {
      const row = document.createElement("div");
      row.className = `chat-row ${message.role === "user" ? "user" : "assistant"}`;

      const avatar = document.createElement("div");
      avatar.className = "chat-avatar";
      avatar.textContent = message.role === "user" ? "SEN" : "AQ";

      const bubble = document.createElement("div");
      bubble.className = "chat-bubble";

      const meta = document.createElement("p");
      meta.className = "chat-meta";
      meta.textContent = norm(message.meta || (message.role === "user" ? "Kullan\u0131c\u0131 mesaj\u0131" : "T.C. ANATOLIA-Q"));

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
    const entry = {
      role,
      content: norm(content),
      meta: norm(meta),
    };
    const last = chatState.messages[chatState.messages.length - 1];
    if (last && last.role === entry.role && last.content === entry.content && last.meta === entry.meta) return;
    chatState.messages.push(entry);
    render();
  };

  const syncFromExisting = () => {
    if (chatState.messages.length) return;
    document.querySelectorAll("#chatThread .chat-row").forEach((row) => {
      const role = row.classList.contains("user") ? "user" : "assistant";
      const content = norm(q(".chat-text", row)?.textContent || "");
      const meta = norm(q(".chat-meta", row)?.textContent || "");
      if (content) pushMessage(role, content, meta);
    });
  };

  const sendChat = async () => {
    if (!isChatMode() || chatState.busy) return;

    const input = byId("sitInput");
    const chatName = byId("chatNameInput");
    if (!input) return;

    const situation = input.value.trim();
    if (!situation) {
      setStatus("error", "Mesaj alan\u0131 bo\u015f b\u0131rak\u0131lamaz.");
      return;
    }

    syncFromExisting();
    chatState.busy = true;
    setLoading(true);
    setStatus("", "");
    pushMessage(
      "user",
      situation,
      chatName?.value?.trim() ? `${chatName.value.trim()} | kullan\u0131c\u0131 mesaj\u0131` : "Kullan\u0131c\u0131 mesaj\u0131",
    );

    try {
      const token = getToken();
      const headers = { "Content-Type": "application/json" };
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
          chat_history: chatState.messages
            .filter((item) => item.role === "user" || item.role === "assistant")
            .slice(0, -1)
            .map((item) => ({ role: item.role, content: item.content })),
        }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.detail || data.message || `\u0130stek ba\u015far\u0131s\u0131z (${response.status})`);
      }

      pushMessage("assistant", data.ozet || "K\u0131sa sohbet cevab\u0131 haz\u0131r.", data.sohbet_tonu || "Rahat sohbet");

      const lastSummary = byId("lastSummary");
      if (lastSummary) lastSummary.textContent = norm(data.ozet || "");
      const downloadBtn = byId("downloadBtn");
      if (downloadBtn) downloadBtn.disabled = false;
      input.value = "";
      setStatus("success", "Sohbet cevab\u0131 haz\u0131r.");
    } catch (error) {
      chatState.messages.pop();
      render();
      setStatus("error", error.message || "Sohbet cevab\u0131 \u00fcretilemedi.");
    } finally {
      chatState.busy = false;
      setLoading(false);
    }
  };

  document.addEventListener(
    "click",
    (event) => {
      if (!isChatMode()) return;
      const button = event.target.closest("#runBtn");
      if (!button) return;
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
      if (!input || event.key !== "Enter") return;
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

