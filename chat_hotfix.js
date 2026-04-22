(() => {
  const turns = (window.__aqChatTurns = window.__aqChatTurns || []);
  const POLL_MS = 15000;
  let pollTimer = null;
  let selectedRegion = "Ankara";
  let centerTab = "merkez";
  let alertsCache = [];
  let opsCache = [];

  const byId = (id) => document.getElementById(id);
  const q = (selector, root = document) => root.querySelector(selector);
  const qa = (selector, root = document) => Array.from(root.querySelectorAll(selector));
  const chatMode = () => typeof state !== "undefined" && state.domain === "genel_chat";

  function ensureStyles() {
    if (byId("aq-ui-hotfix-style")) return;
    const style = document.createElement("style");
    style.id = "aq-ui-hotfix-style";
    style.textContent = `
      .aq-fab{position:fixed;right:20px;bottom:20px;z-index:45;display:inline-flex;align-items:center;gap:10px;padding:14px 18px;border-radius:999px;border:1px solid rgba(105,224,255,.28);background:linear-gradient(135deg,rgba(12,26,44,.96),rgba(6,14,24,.96));box-shadow:0 18px 40px rgba(0,0,0,.34),0 0 28px rgba(105,224,255,.12);color:#eef7ff;font:12px "IBM Plex Mono",monospace;letter-spacing:.08em;text-transform:uppercase;cursor:pointer}
      .aq-fab::before{content:"";width:12px;height:12px;border-radius:50%;background:#69e0ff;box-shadow:0 0 16px rgba(105,224,255,.8);animation:aqBeacon 2.4s ease-in-out infinite}
      .aq-hide-center{display:none!important}
      .aq-guide-overlay{position:fixed;inset:0;z-index:40;display:none;align-items:center;justify-content:center;padding:24px;background:rgba(2,6,12,.76);backdrop-filter:blur(10px)}
      .aq-guide-overlay.open{display:flex}
      .aq-guide-panel{width:min(860px,100%);max-height:min(calc(100vh - 48px),900px);overflow:auto;padding:28px;border-radius:28px;border:1px solid rgba(105,224,255,.16);background:rgba(7,18,31,.94);box-shadow:0 28px 70px rgba(0,0,0,.38)}
      .aq-guide-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px;margin-top:18px}
      .aq-guide-card{padding:18px;border-radius:18px;border:1px solid rgba(105,224,255,.14);background:linear-gradient(180deg,rgba(8,20,34,.94),rgba(5,12,22,.97))}
      .aq-guide-card h3{margin:0 0 10px;color:#eef7ff;font-size:16px}
      .aq-guide-card p,.aq-guide-copy,.aq-chat-text,.aq-chat-meta,.aq-chat-tip,.aq-chat-empty,.aq-ops-line,.aq-center-copy,.aq-module-copy,.aq-alert-card p,.aq-ops-message{font-family:"IBM Plex Mono",monospace}
      .aq-guide-card p,.aq-guide-copy,.aq-chat-tip,.aq-chat-empty,.aq-ops-line,.aq-center-copy,.aq-module-copy,.aq-alert-card p,.aq-ops-message{margin:0;color:#9bb5d2;line-height:1.7;font-size:13px}
      .aq-btn-row{display:flex;flex-wrap:wrap;gap:10px}
      .aq-btn{border-radius:14px;padding:13px 16px;border:1px solid rgba(105,224,255,.18);background:linear-gradient(135deg,rgba(105,224,255,.22),rgba(94,144,255,.18));color:#eef7ff;cursor:pointer;font:12px "IBM Plex Mono",monospace;letter-spacing:.08em;text-transform:uppercase}
      .aq-btn.ghost{background:rgba(8,16,28,.76);color:#9bb5d2}
      .aq-btn.warn{border-color:rgba(255,92,92,.35);background:linear-gradient(135deg,rgba(255,92,92,.26),rgba(255,162,86,.18))}
      .aq-ops-strip{display:grid;grid-template-columns:minmax(320px,.92fr) minmax(0,1.08fr);gap:16px;margin:16px 0}
      .aq-ops-card,.aq-module-card,.aq-alert-card,.aq-feed-card,.aq-center-card{position:relative;overflow:hidden;padding:20px;border-radius:22px;border:1px solid rgba(105,224,255,.14);background:linear-gradient(180deg,rgba(8,20,34,.94),rgba(5,12,22,.97))}
      .aq-ops-card::after,.aq-module-card::after,.aq-alert-card::after,.aq-feed-card::after,.aq-center-card::after{content:"";position:absolute;inset:0;pointer-events:none;background:linear-gradient(120deg,rgba(105,224,255,.04),transparent 34%,rgba(94,144,255,.03))}
      .aq-kicker{display:inline-flex;align-items:center;gap:10px;color:#69e0ff;font:12px "IBM Plex Mono",monospace;letter-spacing:.1em;text-transform:uppercase}
      .aq-kicker::before{content:"";width:42px;height:1px;background:linear-gradient(90deg,#69e0ff,transparent)}
      .aq-map-shell{position:relative;display:grid;grid-template-columns:minmax(0,1fr) 240px;gap:16px;align-items:stretch}
      .aq-map-stage{position:relative;min-height:320px;border-radius:20px;border:1px solid rgba(105,224,255,.14);background:radial-gradient(circle at 20% 20%,rgba(105,224,255,.08),transparent 34%),linear-gradient(180deg,rgba(6,15,26,.94),rgba(4,10,18,.98));overflow:hidden}
      .aq-map-grid,.aq-map-stage::before{content:"";position:absolute;inset:0;pointer-events:none}
      .aq-map-grid{background:linear-gradient(rgba(105,224,255,.06) 1px,transparent 1px),linear-gradient(90deg,rgba(105,224,255,.06) 1px,transparent 1px);background-size:26px 26px;opacity:.35}
      .aq-map-stage::before{background:radial-gradient(circle at center,rgba(105,224,255,.12),transparent 55%)}
      .aq-map-svg{position:absolute;inset:18px;width:calc(100% - 36px);height:calc(100% - 36px)}
      .aq-map-land{fill:rgba(105,224,255,.12);stroke:rgba(105,224,255,.34);stroke-width:2}
      .aq-region{cursor:pointer}
      .aq-region-dot{fill:#69e0ff;filter:drop-shadow(0 0 8px rgba(105,224,255,.72));animation:aqBeacon 2.6s ease-in-out infinite}
      .aq-region-dot.hot{fill:#ff6b6b;filter:drop-shadow(0 0 10px rgba(255,107,107,.78))}
      .aq-region-label{fill:#d9ecff;font:12px "IBM Plex Mono",monospace}
      .aq-map-side{display:grid;gap:12px}
      .aq-region-focus{padding:16px;border-radius:18px;border:1px solid rgba(105,224,255,.14);background:rgba(4,11,20,.72)}
      .aq-focus-title{margin:0 0 8px;color:#eef7ff;font-size:18px}
      .aq-focus-meta{display:flex;flex-wrap:wrap;gap:8px;margin-top:12px}
      .aq-pill{padding:8px 10px;border-radius:999px;border:1px solid rgba(105,224,255,.16);background:rgba(8,16,28,.76);color:#9bb5d2;font:11px "IBM Plex Mono",monospace;text-transform:uppercase}
      .aq-module-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px;margin-top:16px}
      .aq-module-card{display:grid;gap:12px}
      .aq-module-card.active{border-color:rgba(105,224,255,.34);box-shadow:0 0 28px rgba(105,224,255,.08)}
      .aq-module-title{margin:0;color:#eef7ff;font-size:16px}
      .aq-chat-shell{display:none;grid-template-rows:auto minmax(0,1fr) auto auto;gap:12px;min-height:72vh;margin-top:18px}
      .aq-chat-shell.active{display:grid}
      .aq-chat-head{display:flex;justify-content:space-between;gap:12px;align-items:center;flex-wrap:wrap;padding:18px 20px;border-radius:20px;border:1px solid rgba(105,224,255,.14);background:linear-gradient(180deg,rgba(7,18,31,.92),rgba(4,11,20,.98))}
      .aq-chat-log{display:grid;align-content:start;gap:14px;min-height:0;overflow:auto;padding:18px;border-radius:20px;border:1px solid rgba(105,224,255,.14);background:linear-gradient(180deg,rgba(7,18,31,.92),rgba(4,11,20,.98))}
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
      .aq-chat-compose{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:12px;align-items:end;padding:16px;border-radius:20px;border:1px solid rgba(105,224,255,.14);background:linear-gradient(180deg,rgba(7,18,31,.92),rgba(4,11,20,.98));position:sticky;bottom:0}
      .aq-chat-compose textarea{min-height:86px;max-height:200px;resize:vertical}
      .aq-chat-compose .aq-btn{height:56px}
      .aq-chat-ident{display:grid;grid-template-columns:220px 1fr;gap:12px}
      .aq-hidden{display:none!important}
      .aq-center-tabs{display:flex;flex-wrap:wrap;gap:10px;margin:16px 0 18px}
      .aq-center-tab{padding:10px 14px;border-radius:999px;border:1px solid rgba(105,224,255,.16);background:rgba(8,16,28,.76);color:#9bb5d2;font:12px "IBM Plex Mono",monospace;letter-spacing:.08em;text-transform:uppercase;cursor:pointer}
      .aq-center-tab.active{background:linear-gradient(135deg,rgba(105,224,255,.22),rgba(94,144,255,.18));color:#eef7ff;border-color:rgba(105,224,255,.3)}
      .aq-center-body{display:grid;gap:16px}
      .aq-center-section{display:none;gap:16px}
      .aq-center-section.active{display:grid}
      .aq-two-col{display:grid;grid-template-columns:minmax(0,1fr) minmax(280px,.9fr);gap:16px}
      .aq-feed-list,.aq-alert-list{display:grid;gap:10px;max-height:320px;overflow:auto}
      .aq-alert-card strong,.aq-feed-card strong{display:block;color:#eef7ff;margin-bottom:6px}
      .aq-alert-meta,.aq-feed-meta{display:flex;flex-wrap:wrap;gap:8px;margin-top:10px}
      .aq-ops-message{padding:14px 16px;border-radius:16px;border:1px solid rgba(105,224,255,.14);background:rgba(5,12,22,.88)}
      .aq-ops-message.emergency{border-color:rgba(255,107,107,.26);background:rgba(40,12,12,.74)}
      .aq-pulse-banner{position:relative;overflow:hidden;padding:14px 16px;border-radius:18px;border:1px solid rgba(105,224,255,.16);background:linear-gradient(135deg,rgba(105,224,255,.14),rgba(94,144,255,.08))}
      .aq-pulse-banner::after{content:"";position:absolute;inset:0;background:linear-gradient(120deg,transparent 0%,rgba(255,255,255,.08) 48%,transparent 100%);animation:aqSweep 6s linear infinite}
      @keyframes aqOrbit{from{transform:rotate(0)}to{transform:rotate(360deg)}}
      @keyframes aqBeacon{0%,100%{opacity:.45;transform:scale(.92)}50%{opacity:1;transform:scale(1.15)}}
      @keyframes aqPing{0%{transform:scale(.72);opacity:.7}100%{transform:scale(1.8);opacity:0}}
      @keyframes aqSweep{from{transform:translateX(-120%)}to{transform:translateX(120%)}}
      @media (max-width:1180px){.aq-ops-strip,.aq-two-col,.aq-map-shell,.aq-chat-ident{grid-template-columns:1fr}.aq-module-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}
      @media (max-width:720px){.aq-guide-overlay{align-items:flex-start;padding:12px}.aq-guide-panel{padding:22px;max-height:calc(100vh - 24px)}.aq-fab{right:12px;bottom:12px}.aq-module-grid{grid-template-columns:1fr}.aq-chat-compose{grid-template-columns:1fr}.aq-chat-compose .aq-btn{width:100%}}
    `;
    document.head.appendChild(style);
  }

  async function fetchJson(path, options = {}) {
    if (typeof apiFetch === "function") return apiFetch(path, options);
    const response = await fetch(path, options);
    return response.json();
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
        <p class="aq-guide-copy">Giriş, alarm, merkez, operasyon akışı ve Genel Chat aynı görev omurgasında birlikte çalışır.</p>
        <div class="aq-guide-grid">
          <div class="aq-guide-card"><h3>1. Tek merkez düğmesi</h3><p>Sağ alttaki Merkez düğmesi tüm operasyon panelini açar. Merkez irtibatı, acil alarm ve ortak akış aynı yerden yönetilir.</p></div>
          <div class="aq-guide-card"><h3>2. Görev modülleri</h3><p>Modül kartına bastığında seçili alan değişir. Panel ve analiz ekranı aynı anda bu alana göre yenilenir.</p></div>
          <div class="aq-guide-card"><h3>3. Genel Chat</h3><p>Genel Chat artık sabit mesaj alanı ile çalışır. Cevabı okurken aşağı inmek zorunda kalmazsın; sohbet akışı tek pencere içinde sürer.</p></div>
          <div class="aq-guide-card"><h3>4. Radar ve alarm</h3><p>Türkiye haritasındaki bir noktaya basarak bölgesel alarm kartı açabilirsin. Kaydedilen alarm tüm kullanıcılara ortak listede görünür.</p></div>
          <div class="aq-guide-card"><h3>5. Acil alarm</h3><p>Acil alarm gönderildiğinde merkez e-posta hattına bilgi düşer ve ortak operasyon akışında ayrı mesaj kanalı açılır.</p></div>
          <div class="aq-guide-card"><h3>6. Operasyon akışı</h3><p>Merkez panelindeki ortak akış bölümü tüm kullanıcıların gördüğü paylaşımlı operasyon notlarını gösterir.</p></div>
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

  function patchLoginTexts() {
    setText(".hero-copy", "Bu arayüz yalnızca yetkili personel içindir. Kullanıcı kodu, ortak şifre ve merkez onaylı ikinci aşama doğrulama olmadan erişim sağlanamaz.");
    setText(".brand-sub", "Yetkili kullanıcılar için kapalı erişim arayüzü. Doğrulama, oturum güvenliği ve merkez teyidi tek hatta tutulur.");
    setText(".signal-title", "Gizlilik durumu");
    setText(".signal-badge", "Secure HUD");
    const heroData = [
      ["Gizlilik katmanı", "Tüm erişim talepleri kapalı doğrulama hattında ilerler. Yetkisiz giriş denemeleri dikkate alınır."],
      ["Merkez teyidi", "İkinci aşama kodu yalnızca merkez hattına gider. Oturum açma yetkisi merkez kontrolünde kalır."],
      ["Oturum güvenliği", "Doğrulama tamamlanmadan sistem açılmaz. Oturum akışı kod bazlı kimlik eşleşmesi ile sürer."],
      ["Yetki disiplini", "Merkez, doğrulama, yönetsel irtibat ve kullanıcı yetkileri tek hatta tutulur."],
    ];
    qa(".hero-grid .hero-card").forEach((card, index) => {
      const data = heroData[index];
      if (!data) return;
      const strong = q("strong", card);
      const span = q("span", card);
      if (strong) strong.textContent = data[0];
      if (span) span.textContent = data[1];
    });
    const signalData = [
      "Yetkisiz kullanıcılar için erişim kapalıdır. Doğrulama hattı merkez tarafından yönetilir.",
      "Kod, şifre ve ikinci aşama teyit tamamlanmadan operasyon ekranı açılmaz.",
      "Merkez iletişim, kullanıcı kodu ve yönetsel teyit akışı aynı güvenlik düzleminde tutulur.",
    ];
    qa(".signal-line").forEach((line, index) => {
      if (signalData[index]) line.textContent = signalData[index];
    });
    const capsuleData = [
      "<strong>gizlilik</strong> aktif erişim kilidi",
      "<strong>merkez</strong> doğrulama hattı",
      "<strong>kayıt</strong> yetki disiplini açık",
    ];
    qa(".capsule-row .capsule").forEach((capsule, index) => {
      if (capsuleData[index]) capsule.innerHTML = capsuleData[index];
    });
    const note = q("#step1 .field-note");
    if (note) note.textContent = "Yetkisiz giriş yapılamaz. Doğrulama kodu yalnızca merkez e-posta hattına yönlendirilir.";
  }

  function ensureGuideButtons() {
    if (!byId("guideBtnApp")) {
      const topbarRight = q(".topbar-right");
      const logoutBtn = byId("logoutBtn");
      if (topbarRight && logoutBtn) {
        const button = document.createElement("button");
        button.type = "button";
        button.id = "guideBtnApp";
        button.className = "ghost-button";
        button.textContent = "Kullanım Kılavuzu";
        logoutBtn.insertAdjacentElement("beforebegin", button);
      }
    }
    ["guideBtnApp", "guideBtnDash", "guideBtnInline"].forEach((id) => {
      const button = byId(id);
      if (!button || button.dataset.guideBound === "1") return;
      button.dataset.guideBound = "1";
      button.addEventListener("click", openGuide);
    });
  }

  function hideLegacyCenterButtons() {
    [
      "centerBtnLogin",
      "centerBtnInline",
      "centerBtnApp",
      "centerBtnSide",
      "centerBtnDash",
      "centerBtnAnalysis",
    ].forEach((id) => {
      const node = byId(id);
      if (node) node.classList.add("aq-hide-center");
    });
  }

  function ensureCenterFab() {
    if (byId("aqCenterFab")) return;
    const button = document.createElement("button");
    button.type = "button";
    button.id = "aqCenterFab";
    button.className = "aq-fab";
    button.textContent = "Merkez";
    button.addEventListener("click", openCenterPanel);
    document.body.appendChild(button);
  }

  function ensureUnifiedCenterPanel() {
    const panel = q("#centerOverlay .center-panel");
    if (!panel || panel.dataset.aqCenter === "1") return;
    panel.dataset.aqCenter = "1";
    panel.innerHTML = `
      <div class="aq-kicker">Merkez operasyon paneli</div>
      <h2 style="margin:14px 0 8px;font-size:clamp(24px,4vw,36px)">Tek merkez, ortak alarm ve paylaşımlı akış</h2>
      <p class="aq-center-copy">Merkez irtibatı, acil alarm ve tüm kullanıcılara açık operasyon mesajları tek panelden yönetilir.</p>
      <div class="aq-center-tabs">
        <button type="button" class="aq-center-tab active" data-tab="merkez">Merkez</button>
        <button type="button" class="aq-center-tab" data-tab="alarm">Acil Alarm</button>
        <button type="button" class="aq-center-tab" data-tab="akis">Ortak Akış</button>
      </div>
      <div class="aq-center-body">
        <section class="aq-center-section active" data-section="merkez">
          <div class="aq-two-col">
            <div class="aq-center-card">
              <div class="aq-kicker">Merkez irtibatı</div>
              <p class="aq-center-copy" style="margin-top:12px">Yetkili kullanıcı olarak merkeze not bırakabilir, yönetsel destek isteyebilir veya operasyon açıklaması paylaşabilirsin.</p>
              <div class="field" style="margin-top:16px">
                <label for="aqCenterNote">Merkeze not</label>
                <textarea id="aqCenterNote" placeholder="Örnek: Doğu hattında teyit edilen saha bilgisi merkeze aktarılsın."></textarea>
              </div>
              <div class="aq-btn-row" style="margin-top:16px">
                <button type="button" class="aq-btn" id="aqCenterSend">Merkeze ulaş</button>
                <button type="button" class="aq-btn ghost" id="aqCenterClose">Kapat</button>
              </div>
              <div class="status-box" id="aqCenterStatus" aria-live="polite" style="margin-top:16px"></div>
            </div>
            <div class="aq-feed-card">
              <div class="aq-kicker">Son merkez hareketleri</div>
              <div class="aq-feed-list" id="aqOpsMini" style="margin-top:16px"></div>
            </div>
          </div>
        </section>
        <section class="aq-center-section" data-section="alarm">
          <div class="aq-two-col">
            <div class="aq-center-card">
              <div class="aq-pulse-banner">
                <strong style="display:block;color:#eef7ff;margin-bottom:8px">Acil alarm gönder</strong>
                <span class="aq-center-copy">Alarm kaydı merkez e-posta hattına düşer ve tüm kullanıcılara ortak operasyon akışında görünür.</span>
              </div>
              <div class="field" style="margin-top:16px">
                <label for="aqAlarmRegion">Bölge</label>
                <input id="aqAlarmRegion" type="text" placeholder="Örnek: Hatay">
              </div>
              <div class="field" style="margin-top:14px">
                <label for="aqAlarmTitle">Başlık</label>
                <input id="aqAlarmTitle" type="text" placeholder="Örnek: Sınır hattında ani hareketlilik">
              </div>
              <div class="field" style="margin-top:14px">
                <label for="aqAlarmDetail">Detay</label>
                <textarea id="aqAlarmDetail" placeholder="Bölgedeki problem tüm kullanıcıların görebileceği şekilde burada tutulur."></textarea>
              </div>
              <div class="aq-btn-row" style="margin-top:16px">
                <button type="button" class="aq-btn warn" id="aqAlarmSend">Acil alarm geç</button>
                <button type="button" class="aq-btn ghost" id="aqAlarmChatOpen">Alarm sohbetini aç</button>
              </div>
              <div class="status-box" id="aqAlarmStatus" aria-live="polite" style="margin-top:16px"></div>
            </div>
            <div class="aq-feed-card">
              <div class="aq-kicker">Açık alarmlar</div>
              <div class="aq-alert-list" id="aqAlertList" style="margin-top:16px"></div>
            </div>
          </div>
        </section>
        <section class="aq-center-section" data-section="akis">
          <div class="aq-two-col">
            <div class="aq-feed-card">
              <div class="aq-kicker">Ortak operasyon akışı</div>
              <div class="aq-feed-list" id="aqOpsFeed" style="margin-top:16px"></div>
            </div>
            <div class="aq-center-card">
              <div class="aq-kicker">Operasyon mesajı</div>
              <div class="field" style="margin-top:16px">
                <label for="aqOpsMessage">Mesaj</label>
                <textarea id="aqOpsMessage" placeholder="Örnek: Merkez teyidi alındı, saha ekibi ikinci doğrulama bekliyor."></textarea>
              </div>
              <div class="aq-btn-row" style="margin-top:16px">
                <button type="button" class="aq-btn" id="aqOpsSend">Mesajı paylaş</button>
                <button type="button" class="aq-btn ghost" id="aqOpsRefresh">Yenile</button>
              </div>
              <div class="status-box" id="aqOpsStatus" aria-live="polite" style="margin-top:16px"></div>
            </div>
          </div>
        </section>
      </div>
    `;

    qa(".aq-center-tab", panel).forEach((button) => {
      button.addEventListener("click", () => switchCenterTab(button.dataset.tab));
    });
    byId("aqCenterSend").addEventListener("click", submitCenterNote);
    byId("aqCenterClose").addEventListener("click", closeCenterPanel);
    byId("aqAlarmSend").addEventListener("click", submitAlarm);
    byId("aqAlarmChatOpen").addEventListener("click", () => switchCenterTab("akis"));
    byId("aqOpsSend").addEventListener("click", submitOpsMessage);
    byId("aqOpsRefresh").addEventListener("click", refreshSharedData);
  }

  function switchCenterTab(tab) {
    centerTab = tab;
    qa(".aq-center-tab").forEach((button) => {
      button.classList.toggle("active", button.dataset.tab === tab);
    });
    qa(".aq-center-section").forEach((section) => {
      section.classList.toggle("active", section.dataset.section === tab);
    });
  }

  function openCenterPanel() {
    ensureUnifiedCenterPanel();
    const overlay = byId("centerOverlay");
    if (!overlay) return;
    overlay.classList.add("open");
    overlay.setAttribute("aria-hidden", "false");
    overlay.style.overflowY = "auto";
    refreshSharedData();
  }

  function closeCenterPanel() {
    const overlay = byId("centerOverlay");
    if (!overlay) return;
    overlay.classList.remove("open");
    overlay.setAttribute("aria-hidden", "true");
  }

  function ensureDashboardMissionDeck() {
    if (byId("aqMissionDeck")) return;
    const dashboard = byId("page-dashboard");
    const metrics = q("#page-dashboard .metrics");
    if (!dashboard || !metrics) return;

    const strip = document.createElement("section");
    strip.id = "aqOpsStrip";
    strip.className = "aq-ops-strip";
    strip.innerHTML = `
      <div class="aq-ops-card">
        <div class="aq-kicker">Türkiye alarm radarı</div>
        <div class="aq-map-shell" style="margin-top:14px">
          <div class="aq-map-stage">
            <div class="aq-map-grid"></div>
            <svg class="aq-map-svg" viewBox="0 0 760 360" aria-hidden="true">
              <path class="aq-map-land" d="M62 182L112 150L180 142L222 120L282 126L334 112L396 118L460 132L542 146L618 156L688 194L666 218L608 228L562 246L482 240L426 256L372 250L318 258L244 240L182 250L118 232L72 208Z"></path>
              <g class="aq-region" data-region="İstanbul" transform="translate(145 158)">
                <circle class="aq-region-dot" r="8"></circle><text class="aq-region-label" x="14" y="4">İstanbul</text>
              </g>
              <g class="aq-region" data-region="Ankara" transform="translate(322 173)">
                <circle class="aq-region-dot hot" r="9"></circle><text class="aq-region-label" x="14" y="4">Ankara</text>
              </g>
              <g class="aq-region" data-region="İzmir" transform="translate(128 204)">
                <circle class="aq-region-dot" r="8"></circle><text class="aq-region-label" x="14" y="4">İzmir</text>
              </g>
              <g class="aq-region" data-region="Trabzon" transform="translate(586 132)">
                <circle class="aq-region-dot" r="8"></circle><text class="aq-region-label" x="14" y="4">Trabzon</text>
              </g>
              <g class="aq-region" data-region="Diyarbakır" transform="translate(538 236)">
                <circle class="aq-region-dot" r="8"></circle><text class="aq-region-label" x="14" y="4">Diyarbakır</text>
              </g>
              <g class="aq-region" data-region="Hatay" transform="translate(462 270)">
                <circle class="aq-region-dot" r="8"></circle><text class="aq-region-label" x="14" y="4">Hatay</text>
              </g>
            </svg>
          </div>
          <div class="aq-map-side">
            <div class="aq-region-focus">
              <h3 class="aq-focus-title" id="aqRegionTitle">Ankara</h3>
              <p class="aq-center-copy" id="aqRegionCopy">Merkez teyidi, açık alarmlar ve son operasyon notları bu bölge için burada görünür.</p>
              <div class="aq-focus-meta">
                <span class="aq-pill" id="aqRegionAlertCount">Alarm 0</span>
                <span class="aq-pill" id="aqRegionDomainLabel">Alan bekliyor</span>
              </div>
              <div class="aq-btn-row" style="margin-top:14px">
                <button type="button" class="aq-btn ghost" id="aqRegionAlarmBtn">Bölge alarmı aç</button>
                <button type="button" class="aq-btn" id="aqRegionGoAnalysis">Yeni analiz başlat</button>
              </div>
            </div>
            <div class="aq-feed-card">
              <div class="aq-kicker">Bölge özeti</div>
              <div class="aq-alert-list" id="aqRegionAlertList" style="margin-top:16px"></div>
            </div>
          </div>
        </div>
      </div>
      <div class="aq-ops-card">
        <div class="aq-kicker">Görev modülleri</div>
        <div class="aq-module-grid" id="aqModuleDeck" style="margin-top:16px"></div>
      </div>
    `;
    metrics.insertAdjacentElement("beforebegin", strip);

    qa(".aq-region", strip).forEach((node) => {
      node.addEventListener("click", () => {
        selectedRegion = node.dataset.region;
        paintRegionFocus();
        switchCenterTab("alarm");
        openCenterPanel();
        const regionInput = byId("aqAlarmRegion");
        if (regionInput) regionInput.value = selectedRegion;
      });
    });
    byId("aqRegionAlarmBtn").addEventListener("click", () => {
      switchCenterTab("alarm");
      openCenterPanel();
      const regionInput = byId("aqAlarmRegion");
      if (regionInput) regionInput.value = selectedRegion;
    });
    byId("aqRegionGoAnalysis").addEventListener("click", () => {
      if (typeof setDomain === "function") setDomain(typeof state !== "undefined" ? state.domain : "savunma", true);
      if (typeof switchPage === "function") switchPage("analysis");
    });
  }

  function ensureModuleDeck() {
    ensureDashboardMissionDeck();
    const wrap = byId("aqModuleDeck");
    if (!wrap || wrap.dataset.ready === "1" || typeof DOMAINS === "undefined") return;
    wrap.dataset.ready = "1";
    Object.entries(DOMAINS).forEach(([key, item]) => {
      const card = document.createElement("div");
      card.className = "aq-module-card";
      card.dataset.domain = key;
      card.innerHTML = `
        <div class="aq-kicker">${item.title || item.display || key}</div>
        <h3 class="aq-module-title">${item.short || item.title || item.display || key}</h3>
        <p class="aq-module-copy">${item.description || "Seçili alanı bu modüle geçir ve aynı anda analiz ekranını hazırla."}</p>
        <div class="aq-btn-row">
          <button type="button" class="aq-btn" data-action="analyze">Yeni analiz başlat</button>
          <button type="button" class="aq-btn ghost" data-action="arm">Panelde etkinleştir</button>
        </div>
      `;
      wrap.appendChild(card);
      card.querySelector('[data-action="analyze"]').addEventListener("click", () => activateDomain(key, true));
      card.querySelector('[data-action="arm"]').addEventListener("click", () => activateDomain(key, false));
    });
    syncModuleCards();
  }

  function activateDomain(domain, jump) {
    if (typeof setDomain === "function") setDomain(domain, jump);
    if (typeof switchPage === "function") switchPage(jump ? "analysis" : "dashboard");
    syncModuleCards();
    paintRegionFocus();
  }

  function syncModuleCards() {
    const domain = typeof state !== "undefined" ? state.domain : "";
    qa("#aqModuleDeck .aq-module-card").forEach((card) => {
      card.classList.toggle("active", card.dataset.domain === domain);
    });
  }

  function ensureChatShell() {
    if (byId("aqChatShell")) return;
    const analysisPanel = byId("page-analysis");
    const panel = q("#page-analysis .panel");
    if (!analysisPanel || !panel) return;
    const shell = document.createElement("section");
    shell.id = "aqChatShell";
    shell.className = "aq-chat-shell";
    shell.innerHTML = `
      <div class="aq-chat-head">
        <div>
          <strong id="aqChatHeading">Genel Chat aktif</strong>
          <div class="aq-chat-tip" id="aqChatMeta">Yazışma akışı tek pencerede sürer. Yeni mesajını aşağıdaki sabit alana yazabilirsin.</div>
        </div>
        <div class="aq-pill">Live Chat</div>
      </div>
      <div class="aq-chat-log" id="aqChatLog"></div>
      <div class="aq-chat-suggestions" id="aqChatSuggestions"></div>
      <div class="aq-chat-compose">
        <div class="aq-chat-ident">
          <input id="aqChatNameInput" type="text" maxlength="24" placeholder="Hitap adı (isteğe bağlı)">
          <div class="aq-chat-tip">Buraya adını yazarsan sistem daha doğal hitap eder.</div>
        </div>
        <div style="display:grid;grid-template-columns:minmax(0,1fr) auto;gap:12px;align-items:end;grid-column:1 / -1">
          <textarea id="aqChatComposer" placeholder="Mesajını yaz. Enter ile gönder, Shift+Enter ile satır atla."></textarea>
          <button type="button" class="aq-btn" id="aqChatSend">Gönder</button>
        </div>
      </div>
    `;
    panel.appendChild(shell);
  }

  function renderChatTurns() {
    ensureChatShell();
    const log = byId("aqChatLog");
    if (!log) return;
    log.replaceChildren();
    if (!turns.length) {
      const empty = document.createElement("div");
      empty.className = "aq-chat-empty";
      empty.textContent = "Mesajını yaz ve gönder. Cevabı okumak için aşağı inmek zorunda kalmadan aynı ekranda sohbeti sürdürebilirsin.";
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
      if (!item) return;
      const button = document.createElement("button");
      button.type = "button";
      button.className = "aq-chat-chip";
      button.textContent = item;
      button.addEventListener("click", () => {
        const composer = byId("aqChatComposer");
        if (!composer) return;
        composer.value = item;
        composer.focus();
      });
      wrap.appendChild(button);
    });
  }

  function syncChatMode() {
    ensureChatShell();
    const shell = byId("aqChatShell");
    const resultArea = byId("resultArea");
    const sitInput = byId("sitInput");
    const sitField = sitInput ? sitInput.closest(".field") : null;
    const runBtn = byId("runBtn");
    const clearBtn = byId("clearBtn");
    const injectBtn = byId("injectBtn");
    const downloadBtn = byId("downloadBtn");
    const title = byId("analysisTitle");
    const sub = byId("analysisSubtitle");

    if (chatMode()) {
      if (title) title.textContent = "Genel Chat | gerçek mesaj akışı";
      if (sub) sub.textContent = "Sabit mesaj alanı, canlı yanıt akışı ve rahat tonda sohbet ekranı.";
      if (sitField) sitField.classList.add("aq-hidden");
      if (runBtn) runBtn.classList.add("aq-hidden");
      if (clearBtn) clearBtn.classList.add("aq-hidden");
      if (injectBtn) injectBtn.classList.add("aq-hidden");
      if (downloadBtn) downloadBtn.classList.add("aq-hidden");
      if (resultArea) resultArea.classList.add("aq-hidden");
      if (shell) shell.classList.add("active");
      renderChatTurns();
      return;
    }

    if (title && typeof DOMAINS !== "undefined" && state?.domain && DOMAINS[state.domain]) {
      title.textContent = DOMAINS[state.domain].short || DOMAINS[state.domain].title;
    }
    if (sub && typeof DOMAINS !== "undefined" && state?.domain && DOMAINS[state.domain]) {
      sub.textContent = DOMAINS[state.domain].description || sub.textContent;
    }
    if (sitField) sitField.classList.remove("aq-hidden");
    if (runBtn) runBtn.classList.remove("aq-hidden");
    if (clearBtn) clearBtn.classList.remove("aq-hidden");
    if (injectBtn) injectBtn.classList.remove("aq-hidden");
    if (downloadBtn) downloadBtn.classList.remove("aq-hidden");
    if (resultArea) resultArea.classList.remove("aq-hidden");
    if (shell) shell.classList.remove("active");
  }

  async function runChat() {
    const composer = byId("aqChatComposer");
    const chatNameInput = byId("aqChatNameInput");
    const text = composer ? composer.value.trim() : "";
    const status = byId("analysisStatus");
    const load = byId("analysisLoad");
    const sendBtn = byId("aqChatSend");
    if (!text) {
      if (typeof setStatus === "function") setStatus(status, "error", "Mesaj alanı boş bırakılamaz.");
      return;
    }
    const chatName = chatNameInput ? chatNameInput.value.trim() : "";
    pushTurn("user", text, chatName ? `Hitap adı: ${chatName}` : "");
    if (sendBtn) sendBtn.disabled = true;
    if (typeof setLoading === "function") setLoading(load, true);
    if (typeof setStatus === "function") setStatus(status, "", "");
    try {
      const result = await fetchJson("/api/analyze", {
        method: "POST",
        body: JSON.stringify({
          domain: typeof state !== "undefined" ? state.domain : "genel_chat",
          situation: text,
          chat_name: chatName,
        }),
      });
      const meta = [result.tehdit_analizi || "", result.sohbet_tonu || ""].filter(Boolean).join(" | ");
      pushTurn("assistant", result.ozet || "Bir cevap üretildi.", meta);
      setChatSuggestions(result.senaryolar || []);
      if (typeof appendHistoryEntry === "function") appendHistoryEntry(result);
      if (composer) composer.value = "";
      if (typeof setStatus === "function") setStatus(status, result.fallback_mode ? "warn" : "success", "Sohbet cevabı hazır.");
    } catch (error) {
      pushTurn("assistant", "Bu turda küçük bir aksaklık oldu. Aynı mesajı yeniden denersen kaldığımız yerden devam ederiz.", error.message || "Geçici hata");
      if (typeof setStatus === "function") setStatus(status, "error", error.message || "Sohbet cevabı üretilemedi.");
    } finally {
      if (sendBtn) sendBtn.disabled = false;
      if (typeof setLoading === "function") setLoading(load, false);
      renderChatTurns();
    }
  }

  function pushTurn(role, text, meta = "") {
    turns.push({ role, text, meta });
    renderChatTurns();
  }

  function bindChatComposer() {
    const sendBtn = byId("aqChatSend");
    if (sendBtn && sendBtn.dataset.bound !== "1") {
      sendBtn.dataset.bound = "1";
      sendBtn.addEventListener("click", runChat);
    }
    const composer = byId("aqChatComposer");
    if (composer && composer.dataset.bound !== "1") {
      composer.dataset.bound = "1";
      composer.addEventListener("keydown", (event) => {
        if (!chatMode()) return;
        if (event.key === "Enter" && !event.shiftKey) {
          event.preventDefault();
          runChat();
        }
      });
    }
  }

  function paintRegionFocus() {
    const title = byId("aqRegionTitle");
    const copy = byId("aqRegionCopy");
    const count = byId("aqRegionAlertCount");
    const domainLabel = byId("aqRegionDomainLabel");
    const list = byId("aqRegionAlertList");
    if (title) title.textContent = selectedRegion;
    if (copy) copy.textContent = `${selectedRegion} için aktif işaretler, paylaşılan notlar ve merkez alarm akışı burada toplanır.`;
    if (domainLabel && typeof state !== "undefined" && typeof DOMAINS !== "undefined") {
      domainLabel.textContent = `Alan ${DOMAINS[state.domain]?.title || state.domain}`;
    }
    const regionAlerts = alertsCache.filter((item) => item.region === selectedRegion);
    if (count) count.textContent = `Alarm ${regionAlerts.length}`;
    if (list) {
      list.replaceChildren();
      if (!regionAlerts.length) {
        const empty = document.createElement("div");
        empty.className = "aq-ops-message";
        empty.textContent = "Bu bölge için kaydedilmiş alarm yok. Haritadan noktaya basarak ilk kaydı oluşturabilirsin.";
        list.appendChild(empty);
      } else {
        regionAlerts.slice(0, 4).forEach((item) => {
          const card = document.createElement("div");
          card.className = "aq-alert-card";
          card.innerHTML = `<strong>${item.title}</strong><p>${item.detail}</p><div class="aq-alert-meta"><span class="aq-pill">${item.priority}</span><span class="aq-pill">${item.timestamp}</span><span class="aq-pill">${item.user}</span></div>`;
          list.appendChild(card);
        });
      }
    }
    qa(".aq-region").forEach((node) => {
      const dot = q(".aq-region-dot", node);
      if (dot) dot.classList.toggle("hot", node.dataset.region === selectedRegion || alertsCache.some((item) => item.region === node.dataset.region));
    });
  }

  function renderAlerts() {
    const alertList = byId("aqAlertList");
    const mini = byId("aqOpsMini");
    if (alertList) {
      alertList.replaceChildren();
      if (!alertsCache.length) {
        const empty = document.createElement("div");
        empty.className = "aq-ops-message";
        empty.textContent = "Henüz ortak alarm kaydı yok.";
        alertList.appendChild(empty);
      } else {
        alertsCache.slice(0, 10).forEach((item) => {
          const card = document.createElement("div");
          card.className = "aq-alert-card";
          card.innerHTML = `<strong>${item.region} | ${item.title}</strong><p>${item.detail}</p><div class="aq-alert-meta"><span class="aq-pill">${item.priority}</span><span class="aq-pill">${item.timestamp}</span><span class="aq-pill">${item.user}</span></div>`;
          card.addEventListener("click", () => {
            selectedRegion = item.region;
            paintRegionFocus();
            switchCenterTab("alarm");
          });
          alertList.appendChild(card);
        });
      }
    }
    if (mini) {
      mini.replaceChildren();
      const items = opsCache.filter((item) => item.channel === "alarm").slice(0, 4);
      if (!items.length) {
        const empty = document.createElement("div");
        empty.className = "aq-ops-message";
        empty.textContent = "Acil akış bekleniyor.";
        mini.appendChild(empty);
      } else {
        items.forEach((item) => {
          const row = document.createElement("div");
          row.className = "aq-ops-message emergency";
          row.textContent = `${item.timestamp} | ${item.message}`;
          mini.appendChild(row);
        });
      }
    }
    paintRegionFocus();
  }

  function renderOpsFeed() {
    const feed = byId("aqOpsFeed");
    if (!feed) return;
    feed.replaceChildren();
    if (!opsCache.length) {
      const empty = document.createElement("div");
      empty.className = "aq-ops-message";
      empty.textContent = "Ortak operasyon akışı henüz boş.";
      feed.appendChild(empty);
      return;
    }
    opsCache.slice(0, 18).forEach((item) => {
      const node = document.createElement("div");
      node.className = `aq-ops-message ${item.channel === "emergency" || item.channel === "alarm" ? "emergency" : ""}`;
      node.innerHTML = `<strong>${item.channel.toUpperCase()} | ${item.user}</strong><p>${item.message}</p><div class="aq-feed-meta"><span class="aq-pill">${item.priority}</span><span class="aq-pill">${item.timestamp}</span></div>`;
      feed.appendChild(node);
    });
  }

  async function refreshSharedData() {
    try {
      const [alerts, ops] = await Promise.all([fetchJson("/api/alerts"), fetchJson("/api/ops-feed")]);
      alertsCache = Array.isArray(alerts.items) ? alerts.items : [];
      opsCache = Array.isArray(ops.items) ? ops.items : [];
      renderAlerts();
      renderOpsFeed();
    } catch (_) {
      // Shared feeds are opportunistic; keep UI responsive if backend is temporarily unavailable.
    }
  }

  async function submitCenterNote() {
    const note = byId("aqCenterNote");
    const status = byId("aqCenterStatus");
    try {
      const data = await fetchJson("/api/contact-center", {
        method: "POST",
        body: JSON.stringify({ token: state?.sessionToken || "", note: note ? note.value.trim() : "" }),
      });
      if (note) note.value = "";
      if (typeof setStatus === "function") setStatus(status, "success", data.message || "Merkeze not gönderildi.");
    } catch (error) {
      if (typeof setStatus === "function") setStatus(status, "error", error.message || "Merkez iletimi başarısız.");
    }
  }

  async function submitAlarm() {
    const regionInput = byId("aqAlarmRegion");
    const titleInput = byId("aqAlarmTitle");
    const detailInput = byId("aqAlarmDetail");
    const status = byId("aqAlarmStatus");
    const payload = {
      token: state?.sessionToken || "",
      region: regionInput ? regionInput.value.trim() : selectedRegion,
      title: titleInput ? titleInput.value.trim() : "",
      detail: detailInput ? detailInput.value.trim() : "",
      priority: "KRITIK",
    };
    if (!payload.title || !payload.detail) {
      if (typeof setStatus === "function") setStatus(status, "error", "Başlık ve detay zorunludur.");
      return;
    }
    try {
      const data = await fetchJson("/api/alerts", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      selectedRegion = data.item?.region || payload.region;
      if (typeof setStatus === "function") setStatus(status, "success", data.message || "Alarm kaydedildi.");
      if (titleInput) titleInput.value = "";
      if (detailInput) detailInput.value = "";
      await refreshSharedData();
      switchCenterTab("akis");
    } catch (error) {
      if (typeof setStatus === "function") setStatus(status, "error", error.message || "Alarm gönderilemedi.");
    }
  }

  async function submitOpsMessage(channel = "ops") {
    const input = byId("aqOpsMessage");
    const status = byId("aqOpsStatus");
    const message = input ? input.value.trim() : "";
    if (!message) {
      if (typeof setStatus === "function") setStatus(status, "error", "Mesaj boş olamaz.");
      return;
    }
    try {
      const data = await fetchJson("/api/ops-feed", {
        method: "POST",
        body: JSON.stringify({
          token: state?.sessionToken || "",
          message,
          priority: channel === "emergency" ? "KRITIK" : "BILGI",
          channel,
        }),
      });
      if (input) input.value = "";
      if (typeof setStatus === "function") setStatus(status, "success", data.message || "Operasyon mesajı paylaşıldı.");
      await refreshSharedData();
    } catch (error) {
      if (typeof setStatus === "function") setStatus(status, "error", error.message || "Mesaj paylaşılamadı.");
    }
  }

  function bindLegacyEvents() {
    const overlay = byId("centerOverlay");
    if (overlay && overlay.dataset.boundOverlay !== "1") {
      overlay.dataset.boundOverlay = "1";
      overlay.addEventListener("click", (event) => {
        if (event.target === overlay) closeCenterPanel();
      });
    }
    if (!window.__aqEscapeBound) {
      window.__aqEscapeBound = true;
      document.addEventListener("keydown", (event) => {
        if (event.key === "Escape") {
          closeGuide();
          closeCenterPanel();
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
      syncModuleCards();
      paintRegionFocus();
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
      const composer = byId("aqChatComposer");
      if (!composer) return;
      composer.value = "Bana normal bir yapay zeka sohbeti gibi cevap ver. Konuyu sade anlat, hafif sıcak bir ton kullan.";
      composer.focus();
    };
  }

  function patchNavigation() {
    const dashboardAction = q("#page-dashboard .page-actions");
    if (dashboardAction && !byId("aqDashboardAnalyze")) {
      const button = document.createElement("button");
      button.type = "button";
      button.id = "aqDashboardAnalyze";
      button.className = "button";
      button.textContent = "Yeni analiz başlat";
      button.addEventListener("click", () => activateDomain(state?.domain || "savunma", true));
      dashboardAction.appendChild(button);
    }
    if (dashboardAction && !byId("aqDashboardAlarm")) {
      const button = document.createElement("button");
      button.type = "button";
      button.id = "aqDashboardAlarm";
      button.className = "ghost-button";
      button.textContent = "Acil Alarm";
      button.addEventListener("click", () => {
        switchCenterTab("alarm");
        openCenterPanel();
      });
      dashboardAction.appendChild(button);
    }
  }

  function startPolling() {
    if (pollTimer) return;
    pollTimer = window.setInterval(refreshSharedData, POLL_MS);
  }

  function init() {
    ensureStyles();
    ensureGuideOverlay();
    ensureGuideButtons();
    hideLegacyCenterButtons();
    ensureCenterFab();
    ensureUnifiedCenterPanel();
    ensureDashboardMissionDeck();
    ensureModuleDeck();
    ensureChatShell();
    patchLoginTexts();
    patchDomainChange();
    patchPreset();
    patchNavigation();
    bindChatComposer();
    bindLegacyEvents();
    syncChatMode();
    syncModuleCards();
    startPolling();
    refreshSharedData();
    renderChatTurns();
    paintRegionFocus();
  }

  document.readyState === "loading" ? document.addEventListener("DOMContentLoaded", init) : init();
})();
