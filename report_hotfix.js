(() => {
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

  function ensureReportPackage(result) {
    if (result?.report_package && typeof result.report_package === "object") {
      return result.report_package;
    }

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
              body { font-family: Arial, sans-serif; padding: 28px; color: #111827; }
              h1, h2 { margin-bottom: 10px; }
              p, li { line-height: 1.6; }
              .meta { margin-bottom: 18px; padding: 16px; background: #f3f6fb; border-radius: 12px; }
            </style>
          </head>
          <body>
            <h1>T.C. ANATOLIA-Q Genel Chat Notu</h1>
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
            body { font-family: Arial, sans-serif; padding: 34px; color: #111827; }
            h1, h2, h3 { margin-bottom: 10px; }
            p, li { line-height: 1.7; }
            .cover { border: 2px solid #111827; padding: 34px; margin-bottom: 28px; }
            .meta { margin-bottom: 18px; padding: 16px; background: #f3f6fb; border-radius: 12px; }
            .muted { color: #4b5563; }
            .section { margin-top: 26px; }
            .section h2 { border-bottom: 1px solid #cbd5e1; padding-bottom: 8px; }
            .pill { display: inline-block; margin-right: 8px; margin-bottom: 8px; padding: 7px 10px; border: 1px solid #cbd5e1; border-radius: 999px; background: #f8fafc; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; }
            th, td { border: 1px solid #cbd5e1; text-align: left; vertical-align: top; padding: 10px; }
          </style>
        </head>
        <body>
          <section class="cover">
            <p><strong>${escape(report.kapak?.kurum || "")}</strong></p>
            <p class="muted">${escape(report.kapak?.birim || "")}</p>
            <h1>${escape(report.kapak?.sistem || "T.C. ANATOLIA-Q")}</h1>
            <p><strong>Proje Kodu:</strong> ${escape(report.kapak?.proje_kodu || "QTR-202412")}</p>
            <p><strong>Sistem Ciktisi No:</strong> ${escape(report.kapak?.cikti_no || result?.analysis_id || "--")}</p>
            <h2 style="border:none;padding:0;margin-top:22px">${escape(report.kapak?.baslik || "Analiz Raporu")}</h2>
            <p><strong>Belge No:</strong> ${escape(report.kapak?.belge_no || result?.analysis_id || "--")}</p>
            <p><strong>Tarih:</strong> ${escape(report.kapak?.tarih || result?.timestamp || "--")}</p>
            <p><strong>Kapsam:</strong> ${escape(report.kapak?.kapsam || domainLabel(state?.domain))}</p>
            <p><strong>Durum:</strong> ${escape(report.kapak?.gizlilik || "GIZLI")}</p>
          </section>
          <div class="meta">
            <p><strong>Analiz ID:</strong> ${escape(result?.analysis_id || "--")}</p>
            <p><strong>Alan:</strong> ${escape(domainLabel(state?.domain))}</p>
            <p><strong>Tehdit Seviyesi:</strong> ${escape(result?.tehdit_seviyesi || result?.genel_tehdit_seviyesi || "--")}</p>
            <p><strong>Zaman Cercevesi:</strong> ${escape(result?.zaman_cercevesi || "--")}</p>
            <p><strong>Saglayici:</strong> ${escape(result?.provider || "fallback")}</p>
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
