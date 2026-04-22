(() => {
  const turns = (window.__aqChatTurns = window.__aqChatTurns || []);

  const byId = (id) => document.getElementById(id);
  const q = (selector, root = document) => root.querySelector(selector);
  const qa = (selector, root = document) => Array.from(root.querySelectorAll(selector));
  const chatMode = () => typeof state !== "undefined" && state.domain === "genel_chat";

  function ensureStyles() {
    if (byId("aq-ui-hotfix-style")) return;
    const style = document.createElement("style");
    style.id = "aq-ui-hotfix-style";
    style.textContent = `
      .aq-guide-overlay,.aq-center-overlay-fx{position:fixed;inset:0;z-index:40;display:none;align-items:center;justify-content:center;padding:24px;background:rgba(2,6,12,.76);backdrop-filter:blur(10px)}
      .aq-guide-overlay.open,.aq-center-overlay-fx.open{display:flex}
      .aq-guide-panel{width:min(860px,100%);max-height:min(calc(100vh - 48px),900px);overflow:auto;padding:28px;border-radius:28px;border:1px solid rgba(105,224,255,.16);background:rgba(7,18,31,.94);box-shadow:0 28px 70px rgba(0,0,0,.38)}
      .aq-guide-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px;margin-top:18px}
      .aq-guide-card{padding:18px;border-radius:18px;border:1px solid rgba(105,224,255,.14);background:linear-gradient(180deg,rgba(8,20,34,.94),rgba(5,12,22,.97))}
      .aq-guide-card h3{margin:0 0 10px;color:#eef7ff;font-size:16px}
      .aq-guide-card p,.aq-guide-copy,.aq-chat-text,.aq-chat-meta,.aq-chat-tip,.aq-chat-empty,.aq-ops-line{font-family:"IBM Plex Mono",monospace}
      .aq-guide-card p,.aq-guide-copy,.aq-chat-tip,.aq-chat-empty,.aq-ops-line{margin:0;color:#9bb5d2;line-height:1.7;font-size:13px}
      .aq-btn-row{display:flex;flex-wrap:wrap;gap:10px}
      .aq-btn{border-radius:14px;padding:13px 16px;border:1px solid rgba(105,224,255,.18);background:linear-gradient(135deg,rgba(105,224,255,.22),rgba(94,144,255,.18));color:#eef7ff;cursor:pointer;font:12px "IBM Plex Mono",monospace;letter-spacing:.08em;text-transform:uppercase}
      .aq-btn.ghost{background:rgba(8,16,28,.76);color:#9bb5d2}
      .aq-ops-strip{display:grid;grid-template-columns:minmax(280px,.9fr) minmax(0,1.1fr);gap:16px;margin:16px 0}
      .aq-ops-card{position:relative;overflow:hidden;padding:20px;border-radius:22px;border:1px solid rgba(105,224,255,.14);background:linear-gradient(180deg,rgba(8,20,34,.94),rgba(5,12,22,.97))}
      .aq-ops-card::after{content:"";position:absolute;inset:0;pointer-events:none;background:linear-gradient(120deg,rgba(105,224,255,.04),transparent 34%,rgba(94,144,255,.03))}
      .aq-kicker{display:inline-flex;align-items:center;gap:10px;color:#69e0ff;font:12px "IBM Plex Mono",monospace;letter-spacing:.1em;text-transform:uppercase}
      .aq-kicker::before{content:"";width:42px;height:1px;background:linear-gradient(90deg,#69e0ff,transparent)}
      .aq-radar-shell{position:relative;display:grid;place-items:center;min-height:280px;margin-top:14px;border-radius:20px;border:1px solid rgba(105,224,255,.14);background:linear-gradient(180deg,rgba(7,18,31,.92),rgba(4,11,20,.98));overflow:hidden}
      .aq-radar-shell::before,.aq-radar-shell::after{content:"";position:absolute;border-radius:50%;border:1px solid rgba(105,224,255,.12)}
      .aq-radar-shell::before{inset:18%}
      .aq-radar-shell::after{inset:31%}
      .aq-radar-core{position:relative;width:min(260px,74%);aspect-ratio:1;border-radius:50%;border:1px solid rgba(105,224,255,.18);background:radial-gradient(circle at center,rgba(105,224,255,.22),rgba(105,224,255,.03) 38%,transparent 70%),linear-gradient(rgba(105,224,255,.1) 1px,transparent 1px),linear-gradient(90deg,rgba(105,224,255,.1) 1px,transparent 1px);background-size:auto,24px 24px,24px 24px;box-shadow:inset 0 0 30px rgba(105,224,255,.08),0 0 30px rgba(94,144,255,.1)}
      .aq-radar-sweep{position:absolute;inset:0;border-radius:50%;background:conic-gradient(from 0deg,rgba(105,224,255,.34),transparent 22%,transparent 100%);filter:blur(2px);animation:aqOrbit 5s linear infinite}
      .aq-radar-dot,.aq-radar-dot::after{position:absolute;border-radius:50%}
      .aq-radar-dot{width:8px;height:8px;background:#69e0ff;box-shadow:0 0 16px rgba(105,224,255,.9);animation:aqBeacon 2.6s ease-in-out infinite}
      .aq-radar-dot::after{content:"";inset:-8px;border:1px solid rgba(105,224,255,.18);animation:aqPing 2.6s ease-out infinite}
      .aq-radar-dot.a{top:22%;left:62%}.aq-radar-dot.b{top:61%;left:27%;animation-delay:.7s}.aq-radar-dot.c{top:46%;left:74%;animation-delay:1.3s}
      .aq-ops-stack{display:grid;gap:12px;margin-top:14px}
      .aq-ops-line{position:relative;padding:14px 16px 14px 42px;border-radius:16px;border:1px solid rgba(105,224,255,.14);background:rgba(4,10,18,.74)}
      .aq-ops-line::before{content:"";position:absolute;top:50%;left:16px;width:10px;height:10px;border-radius:50%;transform:translateY(-50%);background:#69e0ff;box-shadow:0 0 16px rgba(105,224,255,.8);animation:aqBeacon 2.4s ease-in-out infinite}
      #chatShell{display:none;gap:16px;margin-top:18px}
      #chatShell.active{display:grid}
      .aq-chat-log{display:grid;gap:14px;max-height:68vh;overflow:auto;padding:18px;border-radius:20px;border:1px solid rgba(105,224,255,.14);background:linear-gradient(180deg,rgba(7,18,31,.92),rgba(4,11,20,.98))}
      .aq-chat-head{display:flex;justify-content:space-between;gap:12px;align-items:center;flex-wrap:wrap}
      .aq-chat-empty{padding:20px;border:1px dashed rgba(105,224,255,.18);border-radius:18px;background:rgba(6,14,24,.55)}
      .aq-chat-row{display:grid;grid-template-columns:42px minmax(0,1fr);gap:12px;align-items:start}
      .aq-chat-row.user{grid-template-columns:minmax(0,1fr) 42px}
      .aq-chat-avatar{width:42px;height:42px;display:grid;place-items:center;border-radius:14px;border:1px solid rgba(105,224,255,.16);background:rgba(8,20,34,.9);color:#69e0ff;font:12px "IBM Plex Mono",monospace;letter-spacing:.12em;text-transform:uppercase}
      .aq-chat-row.user .aq-chat-avatar{order:2;color:#ffd27a}
      .aq-chat-bubble{padding:16px 18px;border-radius:18px;border:1px solid rgba(105,224,255,.14);background:rgba(5,12,22,.9);box-shadow:0 10px 24px rgba(0,0,0,.24)}
      .aq-chat-row.user .aq-chat-bubble{order:1;background:linear-gradient(180deg,rgba(16,38,60,.96),rgba(8,20,34,.96));border-color:rgba(255,210,122,.2)}
      .aq-chat-role,.aq-chat-meta{font-family:"IBM Plex Mono",monospace}
      .aq-chat-role{margin:0 0 8px;color:#6de3ff;font-size:11px;letter-spacing:.08em;text-transform:uppercase}
      .aq-chat-text{margin:0;color:#eef7ff;line-height:1.8;white-space:pre-wrap}
      .aq-chat-meta{margin-top:10px;color:#8fb2d4;font-size:12px;line-height:1.6}
      .aq-chat-suggestions{display:flex;flex-wrap:wrap;gap:10px}
      .aq-chat-chip{padding:10px 14px;border-radius:999px;border:1px solid rgba(105,224,255,.18);background:rgba(8,20,34,.82);color:#9bb5d2;cursor:pointer;font:12px "IBM Plex Mono",monospace}
      .aq-chat-chip:hover{border-color:rgba(105,224,255,.34);background:rgba(10,24,40,.92)}
      @keyframes aqOrbit{from{transform:rotate(0)}to{transform:rotate(360deg)}}
      @keyframes aqBeacon{0%,100%{opacity:.45;transform:scale(.92)}50%{opacity:1;transform:scale(1.15)}}
      @keyframes aqPing{0%{transform:scale(.72);opacity:.7}100%{transform:scale(1.8);opacity:0}}
      @media (max-width:1080px){.aq-ops-strip,.aq-guide-grid{grid-template-columns:1fr}}
      @media (max-width:720px){.aq-guide-overlay{align-items:flex-start;padding:12px}.aq-guide-panel{padding:22px;max-height:calc(100vh - 24px)}}
    `;
    document.head.appendChild(style);
  }

  function setText(selector, text) {
    const node = q(selector);
    if (node) node.textContent = text;
  }

  function ensureGuideOverlay() {
    if (byId("aqGuideOverlay")) return;
    const overlay = document.createElement("div");
    overlay.id = "aqGuideOverlay";
    overlay.className = "aq-guide-overlay";
    overlay.setAttribute("aria-hidden", "true");
    overlay.innerHTML = `
      <div class="aq-guide-panel">
        <div class="aq-kicker">Kullanım kılavuzu</div>
        <h2 style="margin:14px 0 10px;font-size:clamp(24px,4vw,38px);text-transform:uppercase">Sistemi kısa sürede doğru kullan</h2>
        <p class="aq-guide-copy">Bu panel hızlı başlangıç rehberidir. Giriş, analiz, Genel Chat, merkez irtibatı ve rapor akışı aynı ekrandan yönetilir.</p>
        <div class="aq-guide-grid">
          <div class="aq-guide-card"><h3>1. Giriş ve doğrulama</h3><p>Kullanıcı kodunu ve ortak şifreyi gir. Ardından merkez hattına düşen 6 haneli doğrulama kodu ile oturumu aç.</p></div>
          <div class="aq-guide-card"><h3>2. Modül seçimi</h3><p>Sol menüden alan seç. Savunma, enerji, ekonomi, dış politika, toplumsal olaylar, Genel Chat ve çapraz sentez farklı iş akışları üretir.</p></div>
          <div class="aq-guide-card"><h3>3. Analiz akışı</h3><p>Aktör, zaman, yer, tetikleyici ve belirsizlik seviyesi gibi ayrıntılar sonuç kalitesini artırır. Analiz ekranı buna göre karar destek çıktısı üretir.</p></div>
          <div class="aq-guide-card"><h3>4. Genel Chat kullanımı</h3><p>Genel Chat yazışma mantığında çalışır. Mesajını gönder, cevabı thread içinde gör, sonra aynı kutuya yeni mesajını yazarak sohbete devam et.</p></div>
          <div class="aq-guide-card"><h3>5. Merkez ile temas</h3><p>Her ekrandaki Merkez düğmesi kullanıcı kodunla birlikte bildirim üretir. Gerekiyorsa kısa not ekleyip merkez irtibatını aç.</p></div>
          <div class="aq-guide-card"><h3>6. Geçmiş ve rapor</h3><p>Üretilen analizler geçmiş ekranında tutulur. Sonuçları rapor indir ile dışa alabilir, sunucu geçmişini tek tuşla yenileyebilirsin.</p></div>
        </div>
        <div class="aq-btn-row" style="margin-top:18px"><button type="button" class="aq-btn" id="aqGuideClose">Kapat</button></div>
      </div>
    `;
    document.body.appendChild(overlay);
    byId("aqGuideClose").addEventListener("click", closeGuide);
    overlay.addEventListener("click", (event) => {
      if (event.target === overlay) closeGuide();
    });
  }

  function openGuide() {
    const overlay = byId("aqGuideOverlay");
    if (!overlay) return;
    overlay.classList.add("open");
    overlay.setAttribute("aria-hidden", "false");
  }

  function closeGuide() {
    const overlay = byId("aqGuideOverlay");
    if (!overlay) return;
    overlay.classList.remove("open");
    overlay.setAttribute("aria-hidden", "true");
  }

  function ensureGuideButtons() {
    if (!byId("guideBtnApp")) {
      const topbarRight = q(".topbar-right");
      const centerBtn = byId("centerBtnApp");
      if (topbarRight && centerBtn) {
        const button = document.createElement("button");
        button.type = "button";
        button.id = "guideBtnApp";
        button.className = centerBtn.className;
        button.textContent = "Kullanım Kılavuzu";
        centerBtn.insertAdjacentElement("beforebegin", button);
      }
    }

    if (!byId("guideBtnDash")) {
      const pageActions = q("#page-dashboard .page-actions");
      const historyBtn = byId("loadHistoryBtn");
      if (pageActions && historyBtn) {
        const button = document.createElement("button");
        button.type = "button";
        button.id = "guideBtnDash";
        button.className = historyBtn.className;
        button.textContent = "Kullanım Kılavuzu";
        pageActions.appendChild(button);
      }
    }

    if (!byId("guideBtnInline")) {
      const quickActions = q("#page-dashboard .quick-actions");
      if (quickActions) {
        const card = document.createElement("div");
        card.className = "action-card";
        card.innerHTML = `
          <h3>Kullanım kılavuzu</h3>
          <p class="card-copy">Giriş, analiz, Genel Chat, merkez iletişimi ve rapor akışı için kısa rehberi aç.</p>
          <div class="button-row" style="margin-top:16px;">
            <button class="ghost-button" id="guideBtnInline" type="button">Kılavuzu aç</button>
          </div>
        `;
        quickActions.appendChild(card);
      }
    }

    ["guideBtnApp", "guideBtnDash", "guideBtnInline"].forEach((id) => {
      const button = byId(id);
      if (!button || button.dataset.guideBound === "1") return;
      button.dataset.guideBound = "1";
      button.addEventListener("click", openGuide);
    });
  }

  function ensureDashboardRadar() {
    if (byId("aqOpsStrip")) return;
    const dashboard = byId("page-dashboard");
    const metrics = q("#page-dashboard .metrics");
    if (!dashboard || !metrics) return;
    const strip = document.createElement("section");
    strip.id = "aqOpsStrip";
    strip.className = "aq-ops-strip";
    strip.innerHTML = `
      <div class="aq-ops-card">
        <div class="aq-kicker">Operasyon radarı</div>
        <div class="aq-radar-shell">
          <div class="aq-radar-core" aria-hidden="true">
            <div class="aq-radar-sweep"></div>
            <div class="aq-radar-dot a"></div>
            <div class="aq-radar-dot b"></div>
            <div class="aq-radar-dot c"></div>
          </div>
        </div>
      </div>
      <div class="aq-ops-card">
        <div class="aq-kicker">Canlı operasyon akışı</div>
        <div class="aq-ops-stack">
          <div class="aq-ops-line">Radar katmanı seçili alan, kullanıcı oturumu ve merkez erişimini aynı masa üzerinde görünür tutar.</div>
          <div class="aq-ops-line">Genel Chat, analiz modülleri ve geçmiş ekranı aynı operasyon çevrimi içinde birlikte çalışır.</div>
          <div class="aq-ops-line">Merkez paneli ve kullanım kılavuzu gerektiğinde ekran değiştirmeden açılır.</div>
        </div>
      </div>
    `;
    metrics.insertAdjacentElement("beforebegin", strip);
  }

  function patchLoginTexts() {
    setText(".hero-copy", "Bu arayüz yalnızca yetkili personel içindir. Kullanıcı kodu, ortak şifre ve merkez onaylı ikinci aşama doğrulama olmadan erişim sağlanamaz.");
    setText(".brand-sub", "Yetkili kullanıcılar için kapalı erişim arayüzü. Doğrulama, oturum güvenliği ve merkez teyidi tek hatta tutulur.");
    const heroCards = qa(".hero-grid .hero-card");
    const heroData = [
      ["Gizlilik katmanı", "Tüm erişim talepleri kapalı doğrulama hattında ilerler. Yetkisiz giriş denemeleri dikkate alınır."],
      ["Merkez teyidi", "İkinci aşama kodu yalnızca merkez hattına gider. Oturum açma yetkisi merkez kontrolünde kalır."],
      ["Oturum güvenliği", "Doğrulama tamamlanmadan sistem açılmaz. Oturum akışı kod bazlı kimlik eşleşmesi ile sürer."],
      ["Yetki disiplini", "Merkez, doğrulama, yönetsel irtibat ve kullanıcı yetkileri tek hatta tutulur."],
    ];
    heroCards.forEach((card, index) => {
      const data = heroData[index];
      if (!data) return;
      const strong = q("strong", card);
      const span = q("span", card);
      if (strong) strong.textContent = data[0];
      if (span) span.textContent = data[1];
    });
    setText(".signal-title", "Gizlilik durumu");
    setText(".signal-badge", "Secure HUD");
    const signalLines = qa(".signal-line");
    const signalData = [
      "Yetkisiz kullanıcılar için erişim kapalıdır. Doğrulama hattı merkez tarafından yönetilir.",
      "Kod, şifre ve ikinci aşama teyit tamamlanmadan operasyon ekranı açılmaz.",
      "Merkez iletişim, kullanıcı kodu ve yönetsel teyit akışı aynı güvenlik düzleminde tutulur.",
    ];
    signalLines.forEach((line, index) => {
      if (signalData[index]) line.textContent = signalData[index];
    });
    const capsules = qa(".capsule-row .capsule");
    const capsuleData = [
      "<strong>gizlilik</strong> aktif erişim kilidi",
      "<strong>merkez</strong> doğrulama hattı",
      "<strong>kayıt</strong> yetki disiplini açık",
    ];
    capsules.forEach((capsule, index) => {
      if (capsuleData[index]) capsule.innerHTML = capsuleData[index];
    });
    const note = q("#step1 .field-note");
    if (note) note.textContent = "Yetkisiz giriş yapılamaz. Doğrulama kodu yalnızca merkez e-posta hattına yönlendirilir.";
  }

  function ensureChatShell() {
    if (byId("chatShell")) return;
    const resultArea = byId("resultArea");
    if (!resultArea) return;
    const shell = document.createElement("section");
    shell.id = "chatShell";
    shell.innerHTML = `
      <div class="summary-banner">
        <div>
          <strong id="aqChatHeading">Genel Chat aktif</strong>
          <span id="aqChatMeta">Yazışma akışı burada tutulur. Yeni mesajını aynı kutuya yazarak devam edebilirsin.</span>
        </div>
        <div class="signal-badge">Live Chat</div>
      </div>
      <div class="aq-chat-log" id="aqChatLog"></div>
      <div class="aq-chat-suggestions" id="aqChatSuggestions"></div>
    `;
    resultArea.insertAdjacentElement("beforebegin", shell);
  }

  function renderChatTurns() {
    ensureChatShell();
    const log = byId("aqChatLog");
    if (!log) return;
    log.replaceChildren();

    if (!turns.length) {
      const empty = document.createElement("div");
      empty.className = "aq-chat-empty";
      empty.textContent = "Mesajını yaz ve gönder. Bu alanda analiz kartları yerine gerçek sohbet akışı göreceksin.";
      log.appendChild(empty);
      return;
    }

    turns.forEach((turn) => {
      const row = document.createElement("div");
      row.className = `aq-chat-row ${turn.role}`;
      const avatar = document.createElement("div");
      avatar.className = "aq-chat-avatar";
      avatar.textContent = turn.role === "user" ? "SEN" : "AQ";

      const bubble = document.createElement("div");
      bubble.className = "aq-chat-bubble";
      const role = document.createElement("div");
      role.className = "aq-chat-role";
      role.textContent = turn.role === "user" ? "Kullanıcı" : "T.C. ANATOLIA-Q";
      const text = document.createElement("p");
      text.className = "aq-chat-text";
      text.textContent = turn.text || "";
      bubble.appendChild(role);
      bubble.appendChild(text);
      if (turn.meta) {
        const meta = document.createElement("div");
        meta.className = "aq-chat-meta";
        meta.textContent = turn.meta;
        bubble.appendChild(meta);
      }
      row.appendChild(avatar);
      row.appendChild(bubble);
      log.appendChild(row);
    });

    requestAnimationFrame(() => {
      log.scrollTop = log.scrollHeight;
    });
  }

  function setChatSuggestions(items) {
    const wrap = byId("aqChatSuggestions");
    if (!wrap) return;
    wrap.replaceChildren();
    (Array.isArray(items) ? items : []).forEach((item) => {
      const text = typeof item === "string" ? item : "";
      if (!text) return;
      const button = document.createElement("button");
      button.type = "button";
      button.className = "aq-chat-chip";
      button.textContent = text;
      button.addEventListener("click", () => {
        const input = byId("sitInput");
        if (!input) return;
        input.value = text;
        if (typeof updateWordCount === "function") updateWordCount();
        input.focus();
      });
      wrap.appendChild(button);
    });
  }

  function ensureChatNameField() {
    if (byId("chatNameField")) return;
    const area = byId("sitInput");
    const field = area ? area.closest(".field") : null;
    if (!field) return;
    const wrap = document.createElement("div");
    wrap.id = "chatNameField";
    wrap.className = "field hidden";
    wrap.style.marginTop = "14px";
    wrap.innerHTML = `
      <label for="chatNameInput">Hitap adı (isteğe bağlı)</label>
      <input id="chatNameInput" type="text" maxlength="24" placeholder="Örnek: Atabey">
      <div class="field-note">Genel Chat seni bu adla karşılayabilir ve daha doğal cevap verebilir.</div>
    `;
    field.insertAdjacentElement("afterend", wrap);
    const input = byId("chatNameInput");
    if (input) {
      input.addEventListener("input", () => {
        input.value = input.value.replace(/[^\p{L}\p{N}\s.-]/gu, "").slice(0, 24);
      });
    }
  }

  function syncChatMode() {
    ensureChatNameField();
    ensureChatShell();
    const sitLabel = byId("sitLabel") || q('label[for="sitInput"]');
    const runBtn = byId("runBtn");
    const injectBtn = byId("injectBtn");
    const clearBtn = byId("clearBtn");
    const downloadBtn = byId("downloadBtn");
    const title = byId("analysisTitle");
    const sub = byId("analysisSubtitle");
    const chatNameField = byId("chatNameField");
    const resultArea = byId("resultArea");
    const chatShell = byId("chatShell");

    if (chatMode()) {
      if (sitLabel) sitLabel.textContent = "Mesajın";
      if (runBtn) runBtn.textContent = "Mesajı gönder";
      if (injectBtn) injectBtn.textContent = "Konu öner";
      if (clearBtn) clearBtn.textContent = "Yeni sohbet";
      if (downloadBtn) downloadBtn.textContent = "Sohbet indir";
      if (title) title.textContent = "Genel Chat | serbest yazışma ekranı";
      if (sub) sub.textContent = "Genel kültür, günlük bilgi ve rahat tonda gerçek sohbet akışı.";
      if (chatNameField) chatNameField.classList.remove("hidden");
      if (resultArea) resultArea.classList.add("hidden");
      if (chatShell) chatShell.classList.add("active");
      renderChatTurns();
    } else {
      if (sitLabel) sitLabel.textContent = "Durum bildirimi";
      if (runBtn) runBtn.textContent = "Analiz başlat";
      if (injectBtn) injectBtn.textContent = "Şablon ekle";
      if (clearBtn) clearBtn.textContent = "Temizle";
      if (downloadBtn) downloadBtn.textContent = "Rapor indir";
      if (chatNameField) chatNameField.classList.add("hidden");
      if (resultArea) resultArea.classList.remove("hidden");
      if (chatShell) chatShell.classList.remove("active");
    }
  }

  function pushTurn(role, text, meta = "") {
    turns.push({ role, text, meta });
    renderChatTurns();
  }

  async function runChat() {
    const input = byId("sitInput");
    const status = byId("analysisStatus");
    const load = byId("analysisLoad");
    const runBtn = byId("runBtn");
    const nameInput = byId("chatNameInput");
    const text = input ? input.value.trim() : "";

    if (!text) {
      if (typeof setStatus === "function") {
        setStatus(status, "error", chatMode() ? "Mesaj alanı boş bırakılamaz." : "Durum bildirimi boş bırakılamaz.");
      }
      return;
    }

    const chatName = nameInput ? nameInput.value.trim() : "";
    if (chatMode()) {
      pushTurn("user", text, chatName ? `Hitap adı: ${chatName}` : "");
    }

    if (runBtn) runBtn.disabled = true;
    if (typeof setLoading === "function") setLoading(load, true);
    if (typeof setStatus === "function") setStatus(status, "", "");

    try {
      const payload = {
        domain: typeof state !== "undefined" ? state.domain : "savunma",
        situation: text,
        chat_name: chatName,
      };
      const result = await apiFetch("/api/analyze", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      if (chatMode()) {
        const meta = [result.tehdit_analizi || "", result.sohbet_tonu || ""].filter(Boolean).join(" | ");
        pushTurn("assistant", result.ozet || "Bir cevap üretildi.", meta);
        setChatSuggestions(result.senaryolar || []);
        if (typeof appendHistoryEntry === "function") appendHistoryEntry(result);
        if (typeof switchPage === "function") switchPage("analysis");
        if (input) input.value = "";
        if (typeof updateWordCount === "function") updateWordCount();
        if (typeof setStatus === "function") {
          setStatus(status, result.fallback_mode ? "warn" : "success", result.fallback_mode ? "Sohbet cevabı yedek akışla üretildi." : "Sohbet cevabı hazır.");
        }
        syncChatMode();
        return;
      }

      if (typeof renderResult === "function") renderResult(result);
      if (typeof appendHistoryEntry === "function") appendHistoryEntry(result);
      if (typeof switchPage === "function") switchPage("analysis");
      if (typeof setStatus === "function") {
        setStatus(status, result.fallback_mode ? "warn" : "success", result.fallback_mode ? "AI servis sınırında yedek analiz kullanıldı." : "Analiz başarıyla üretildi.");
      }
    } catch (error) {
      if (chatMode() && turns.length && turns[turns.length - 1].role === "user") {
        pushTurn("assistant", "Bu turda küçük bir aksaklık oldu. Aynı mesajı yeniden denersen kaldığımız yerden devam ederiz.", error.message || "Geçici hata");
      }
      if (typeof setStatus === "function") {
        setStatus(status, "error", error.message || (chatMode() ? "Sohbet cevabı üretilemedi." : "Analiz üretilemedi."));
      }
    } finally {
      if (runBtn) runBtn.disabled = false;
      if (typeof setLoading === "function") setLoading(load, false);
    }
  }

  function bindRunFix() {
    const runBtn = byId("runBtn");
    if (runBtn && runBtn.dataset.chatFixed !== "1") {
      runBtn.dataset.chatFixed = "1";
      runBtn.addEventListener(
        "click",
        (event) => {
          if (!chatMode()) return;
          event.preventDefault();
          event.stopImmediatePropagation();
          runChat();
        },
        true,
      );
    }

    const clearBtn = byId("clearBtn");
    if (clearBtn && clearBtn.dataset.chatFixed !== "1") {
      clearBtn.dataset.chatFixed = "1";
      clearBtn.addEventListener(
        "click",
        (event) => {
          if (!chatMode()) return;
          event.preventDefault();
          event.stopImmediatePropagation();
          turns.length = 0;
          setChatSuggestions([]);
          const input = byId("sitInput");
          const name = byId("chatNameInput");
          if (input) input.value = "";
          if (name) name.value = "";
          if (typeof updateWordCount === "function") updateWordCount();
          if (typeof setStatus === "function") setStatus(byId("analysisStatus"), "info", "Yeni sohbet oturumu hazır.");
          renderChatTurns();
        },
        true,
      );
    }

    const input = byId("sitInput");
    if (input && input.dataset.chatFixed !== "1") {
      input.dataset.chatFixed = "1";
      input.addEventListener("keydown", (event) => {
        if (!chatMode()) return;
        if (event.key === "Enter" && !event.shiftKey) {
          event.preventDefault();
          runChat();
        }
      });
    }
  }

  function patchDomainChange() {
    if (typeof setDomain !== "function" || window.__aqDomainPatched) return;
    window.__aqDomainPatched = true;
    const original = setDomain;
    window.setDomain = function patchedSetDomain() {
      const output = original.apply(this, arguments);
      syncChatMode();
      return output;
    };
  }

  function patchPreset() {
    if (typeof injectTemplate !== "function" || window.__aqPresetPatched) return;
    window.__aqPresetPatched = true;
    const original = injectTemplate;
    window.injectTemplate = function patchedInjectTemplate() {
      original.apply(this, arguments);
      if (!chatMode()) return;
      const input = byId("sitInput");
      if (!input) return;
      input.value = "Bana normal bir yapay zeka sohbeti gibi cevap ver. Konuyu sade anlat, hafif sıcak bir ton kullan.";
      if (typeof updateWordCount === "function") updateWordCount();
    };
  }

  function patchCenterButtonText() {
    setText("#contactCenterBtn", "Merkeze ulaş");
  }

  function bindGlobalEscape() {
    if (window.__aqEscapeBound) return;
    window.__aqEscapeBound = true;
    document.addEventListener("keydown", (event) => {
      if (event.key !== "Escape") return;
      closeGuide();
    });
  }

  function init() {
    ensureStyles();
    ensureGuideOverlay();
    ensureGuideButtons();
    ensureDashboardRadar();
    ensureChatNameField();
    ensureChatShell();
    patchLoginTexts();
    patchCenterButtonText();
    patchDomainChange();
    patchPreset();
    bindRunFix();
    bindGlobalEscape();
    syncChatMode();
    renderChatTurns();
  }

  document.readyState === "loading" ? document.addEventListener("DOMContentLoaded", init) : init();
})();
