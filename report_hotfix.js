(() => {
  const q = (selector, root = document) => root.querySelector(selector);

  function safeArray(value) {
    return Array.isArray(value) ? value : [];
  }

  function domainLabel(domain) {
    const item = (typeof DOMAINS !== "undefined" && DOMAINS[domain]) || {};
    return item.display || item.title || domain || "Genel";
  }

  function scenarioLines(result) {
    return safeArray(result?.senaryolar || result?.senaryo_analizi).map((item) => {
      if (typeof item === "string") return item;
      if (typeof scenarioToText === "function") return scenarioToText(item);
      return [item?.baslik, item?.olasilik, item?.aciklama, item?.aksiyon].filter(Boolean).join(" | ");
    });
  }

  function renderMetaGrid(items, escape) {
    return items
      .filter((item) => item && item.label && item.value)
      .map(
        (item) => `
          <div class="meta-item">
            <div class="meta-label">${escape(item.label)}</div>
            <div class="meta-value">${escape(item.value)}</div>
          </div>
        `,
      )
      .join("");
  }

  function ensureReportPackage(result) {
    if (result?.report_package && typeof result.report_package === "object") return result.report_package;
    return {
      kapak: {
        kurum: "BOLD Askeri Teknoloji ve Savunma Sanayi A.S.",
        birim: "Stratejik Analiz ve Politika Gelistirme Birimi",
        sistem: "T.C. ANATOLIA-Q Kuantum Tabanli Ulusal Karar Destek Sistemi",
        proje_kodu: "QTR-202412",
        cikti_no: result?.analysis_id || "--",
        belge_no: result?.analysis_id || "--",
        baslik: `${domainLabel(state?.domain)} Durum Degerlendirmesi`,
        tarih: result?.timestamp || result?.created_at || "--",
        gizlilik: "GIZLILIK DERECESI: GIZLI",
        kapsam: domainLabel(state?.domain),
      },
      yonetici_ozeti: result?.ozet || "",
      kritik_bulgular: [result?.tehdit_analizi || result?.risk_analizi || "Durum degerlendirmesi hazir."],
      temel_oneriler: [result?.oncelikli_oneri || "Koordinasyon korunmalidir."],
      tehdit_analizi_bolumu: result?.tehdit_analizi || result?.risk_analizi || "",
      mevcut_kapasite: "Mevcut gorunum karar destek perspektifinden ozetlenmistir.",
      onerilen_mimari: result?.kritik_baglanti || "Merkez koordinasyonu ve cok katmanli izleme onerilir.",
      bolgesel_analiz: result?.ozet || "",
      uygulama_plani: [
        { faz: "Faz 1", zaman: "Ilk 24 saat", icerik: "Teyit ve acil koordinasyon." },
        { faz: "Faz 2", zaman: "1-7 gun", icerik: "Kurumlar arasi esgudum ve saha takibi." },
        { faz: "Faz 3", zaman: "1-4 hafta", icerik: "Kalici tedbir ve ikinci kademe planlama." },
      ],
      kurumsal_sorumluluklar: safeArray(result?.etkilenen_kurumlar),
      teknik_standartlar: [
        "Kayit zinciri korunmalidir.",
        "Merkez bildirimleri zaman damgasi ile tutulmalidir.",
        "Rapor ciktisi ortak operasyon masasi ile uyumlu olmalidir.",
      ],
      riskler_ve_tedbirler: safeArray(result?.senaryolar).filter((item) => typeof item === "object"),
      sonuc_ve_eylem_cagrisi: result?.oncelikli_oneri || "",
    };
  }

  function buildOfficialReport(result) {
    const report = ensureReportPackage(result);
    const escape = typeof escapeHtml === "function" ? escapeHtml : (text) => String(text ?? "");
    const chatMode = typeof isChatMode === "function" ? isChatMode() : false;

    if (chatMode) {
      const transcript = safeArray(state?.chatMessages)
        .map((item) => `<li><strong>${escape(item?.role === "user" ? "Kullanici" : "T.C. ANATOLIA-Q")}:</strong> ${escape(item?.content || "")}</li>`)
        .join("");
      return `
        <html>
          <head>
            <meta charset="utf-8">
            <title>T.C. ANATOLIA-Q Sohbet Notu</title>
            <style>
              :root {
                --aq-navy: #1A3A5C;
                --aq-red: #C0392B;
                --aq-muted: #6C7A89;
                --aq-line: #D7DEE6;
                --aq-paper: #F6F8FB;
              }
              body {
                font-family: Cambria, "Times New Roman", serif;
                padding: 30pt 34pt;
                color: #111827;
                line-height: 1.55;
              }
              h1, h2 { margin: 0 0 10pt; }
              .brand { font-size: 15pt; font-weight: 700; color: var(--aq-navy); text-transform: uppercase; }
              .unit { font-size: 10pt; color: var(--aq-muted); margin-bottom: 18pt; }
              .chat-title { font-size: 19pt; color: var(--aq-navy); font-weight: 700; text-transform: uppercase; }
              .chat-subtitle { font-size: 14pt; color: var(--aq-red); font-weight: 700; text-transform: uppercase; margin-bottom: 16pt; }
              .meta {
                margin-bottom: 18pt;
                padding: 14pt 16pt;
                background: var(--aq-paper);
                border-top: 3px solid var(--aq-navy);
              }
              .meta p, li { font-size: 11pt; line-height: 1.6; }
              h2 {
                font-size: 14pt;
                color: var(--aq-navy);
                font-weight: 700;
                text-transform: uppercase;
                border-bottom: 1px solid var(--aq-line);
                padding-bottom: 6pt;
                margin-top: 18pt;
              }
            </style>
          </head>
          <body>
            <div class="brand">BOLD Askeri Teknoloji ve Savunma Sanayi A.S.</div>
            <div class="unit">Stratejik Analiz ve Politika Gelistirme Birimi</div>
            <h1 class="chat-title">T.C. ANATOLIA-Q Genel Chat Notu</h1>
            <div class="chat-subtitle">Serbest Yazisma ve Degerlendirme Ciktisi</div>
            <div class="meta">
              <p><strong>Yanit ID:</strong> ${escape(result?.analysis_id || "--")}</p>
              <p><strong>Alan:</strong> ${escape(domainLabel(state?.domain))}</p>
              <p><strong>Ton:</strong> ${escape(result?.sohbet_tonu || "Rahat ve dogal")}</p>
            </div>
            <h2>Sohbet Dokumu</h2>
            <ul>${transcript}</ul>
            <h2>Devam Secenekleri</h2>
            <ul>${scenarioLines(result).map((item) => `<li>${escape(item)}</li>`).join("")}</ul>
          </body>
        </html>
      `;
    }

    return `
      <html>
        <head>
          <meta charset="utf-8">
          <title>T.C. ANATOLIA-Q Raporu</title>
          <style>
            :root {
              --aq-navy: #1A3A5C;
              --aq-red: #C0392B;
              --aq-muted: #6C7A89;
              --aq-line: #D7DEE6;
              --aq-paper: #F6F8FB;
            }
            body {
              font-family: Cambria, "Times New Roman", serif;
              padding: 30pt 34pt;
              color: #111827;
              background: #ffffff;
            }
            h1, h2, h3, p { margin-top: 0; }
            p, li, td, th, div { font-size: 11pt; line-height: 1.55; }
            .cover {
              margin-bottom: 28pt;
              padding-bottom: 18pt;
              border-bottom: 1.5pt solid var(--aq-navy);
            }
            .brand {
              font-size: 15pt;
              color: var(--aq-navy);
              font-weight: 700;
              text-transform: uppercase;
              margin-bottom: 4pt;
            }
            .unit {
              color: var(--aq-muted);
              margin-bottom: 16pt;
            }
            .system {
              font-size: 15pt;
              color: var(--aq-navy);
              font-weight: 700;
              margin-bottom: 8pt;
            }
            .cover-title {
              font-size: 19pt;
              color: var(--aq-navy);
              font-weight: 700;
              text-transform: uppercase;
              margin-bottom: 6pt;
            }
            .cover-subtitle {
              font-size: 15pt;
              color: var(--aq-red);
              font-weight: 700;
              text-transform: uppercase;
              margin-bottom: 4pt;
            }
            .cover-strip {
              font-size: 14pt;
              color: var(--aq-red);
              font-weight: 700;
              text-transform: uppercase;
              margin-bottom: 16pt;
            }
            .intro {
              color: #1f2937;
              margin-bottom: 16pt;
            }
            .meta-grid {
              display: table;
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 18pt;
            }
            .meta-item {
              display: table-row;
            }
            .meta-label, .meta-value {
              display: table-cell;
              padding: 6pt 0;
              border-bottom: 1px solid var(--aq-line);
              vertical-align: top;
            }
            .meta-label {
              width: 24%;
              color: var(--aq-navy);
              font-weight: 700;
              padding-right: 14pt;
            }
            .meta-value {
              color: #111827;
            }
            .summary-box {
              margin: 16pt 0 20pt;
              padding: 12pt 14pt;
              background: var(--aq-paper);
              border-top: 3px solid var(--aq-navy);
            }
            .section {
              margin-top: 20pt;
            }
            .section h2 {
              font-size: 14pt;
              color: var(--aq-navy);
              font-weight: 700;
              text-transform: uppercase;
              border-bottom: 1px solid var(--aq-line);
              padding-bottom: 6pt;
              margin-bottom: 10pt;
            }
            .pill {
              display: inline-block;
              margin-right: 8px;
              margin-bottom: 8px;
              padding: 6px 10px;
              border: 1px solid var(--aq-line);
              background: #f8fafc;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 8pt;
            }
            th, td {
              border: 1px solid var(--aq-line);
              text-align: left;
              vertical-align: top;
              padding: 8pt 9pt;
            }
            th {
              background: var(--aq-paper);
              color: var(--aq-navy);
              font-weight: 700;
            }
            .muted { color: var(--aq-muted); }
          </style>
        </head>
        <body>
          <section class="cover">
            <div class="brand">${escape(report.kapak?.kurum || "")}</div>
            <div class="unit">${escape(report.kapak?.birim || "")}</div>
            <div class="system">${escape(report.kapak?.sistem || "T.C. ANATOLIA-Q")}</div>
            <div class="muted">Proje Kodu: ${escape(report.kapak?.proje_kodu || "QTR-202412")}</div>
            <div class="muted">Sistem Ciktisi No: ${escape(report.kapak?.cikti_no || result?.analysis_id || "--")}</div>
            <div class="cover-title">${escape(report.kapak?.baslik || "Analiz Raporu")}</div>
            <div class="cover-subtitle">${escape(domainLabel(state?.domain))}</div>
            <div class="cover-strip">${escape(report.kapak?.gizlilik || "GIZLI")}</div>
            <p class="intro">${escape(report.yonetici_ozeti || result?.ozet || "")}</p>
            <div class="meta-grid">
              ${renderMetaGrid(
                [
                  { label: "Belge No", value: report.kapak?.belge_no || result?.analysis_id || "--" },
                  { label: "Tarih", value: report.kapak?.tarih || result?.timestamp || "--" },
                  { label: "Hazirlayan", value: report.kapak?.kurum || "" },
                  { label: "Kapsam", value: report.kapak?.kapsam || domainLabel(state?.domain) },
                  { label: "Siniflandirma", value: report.kapak?.gizlilik || "GIZLI" },
                  { label: "Oncelik", value: result?.tehdit_seviyesi || result?.genel_tehdit_seviyesi || "--" },
                ],
                escape,
              )}
            </div>
          </section>
          <div class="summary-box">
            <div><strong>Analiz ID:</strong> ${escape(result?.analysis_id || "--")}</div>
            <div><strong>Alan:</strong> ${escape(domainLabel(state?.domain))}</div>
            <div><strong>Zaman Cercevesi:</strong> ${escape(result?.zaman_cercevesi || "--")}</div>
          </div>
          <section class="section"><h2>YONETICI OZETI</h2><p>${escape(report.yonetici_ozeti || result?.ozet || "")}</p></section>
          <section class="section"><h2>Kritik Bulgular</h2><ul>${safeArray(report.kritik_bulgular).map((item) => `<li>${escape(item)}</li>`).join("")}</ul></section>
          <section class="section"><h2>Temel Oneriler</h2><ul>${safeArray(report.temel_oneriler).map((item) => `<li>${escape(item)}</li>`).join("")}</ul></section>
          <section class="section"><h2>1. Tehdit Analizi</h2><p>${escape(report.tehdit_analizi_bolumu || result?.tehdit_analizi || result?.risk_analizi || "")}</p></section>
          <section class="section"><h2>2. Mevcut Kapasite Degerlendirmesi</h2><p>${escape(report.mevcut_kapasite || "")}</p></section>
          <section class="section"><h2>3. Onerilen Tespit / Operasyon Mimarisi</h2><p>${escape(report.onerilen_mimari || result?.kritik_baglanti || "")}</p></section>
          <section class="section"><h2>4. Bolge / Alan Bazli Degerlendirme</h2><p>${escape(report.bolgesel_analiz || result?.ozet || "")}</p></section>
          <section class="section"><h2>5. Uygulama Plani ve Zaman Cizelgesi</h2><table><thead><tr><th>Faz</th><th>Zaman</th><th>Icerik</th></tr></thead><tbody>${safeArray(report.uygulama_plani).map((item) => `<tr><td>${escape(item.faz)}</td><td>${escape(item.zaman)}</td><td>${escape(item.icerik)}</td></tr>`).join("")}</tbody></table></section>
          <section class="section"><h2>6. Kurumsal Yapi ve Sorumluluklar</h2><div>${safeArray(report.kurumsal_sorumluluklar).map((item) => `<span class="pill">${escape(item)}</span>`).join("")}</div></section>
          <section class="section"><h2>7. Teknik Standartlar ve Minimum Gereksinimler</h2><ul>${safeArray(report.teknik_standartlar).map((item) => `<li>${escape(item)}</li>`).join("")}</ul></section>
          <section class="section"><h2>8. Riskler ve Azaltici Tedbirler</h2><ul>${safeArray(report.riskler_ve_tedbirler).map((item) => `<li><strong>${escape(item.baslik || "Risk")}:</strong> ${escape(item.aciklama || "")} <em>Tedbir:</em> ${escape(item.tedbir || "")}</li>`).join("")}</ul></section>
          <section class="section"><h2>9. Sonuc ve Eylem Cagrisi</h2><p>${escape(report.sonuc_ve_eylem_cagrisi || result?.oncelikli_oneri || "")}</p></section>
          <section class="section"><h2>Ek Senaryo Seti</h2><ul>${scenarioLines(result).map((item) => `<li>${escape(item)}</li>`).join("")}</ul></section>
        </body>
      </html>
    `;
  }

  function patchReportBuilder() {
    window.buildReport = buildOfficialReport;
  }

  function init() {
    patchReportBuilder();
  }

  document.readyState === "loading" ? document.addEventListener("DOMContentLoaded", init) : init();
})();
