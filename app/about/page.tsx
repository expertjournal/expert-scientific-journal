"use client";

import { useState } from "react";
import "../globals.css";
import "./about.css";
import Header from "@/components/Header";
import { useLanguage } from "@/lib/i18n-context";

export default function AboutPage() {
  const { language, t } = useLanguage();
  const [activeTab, setActiveTab] = useState<"scope" | "ethics" | "fields" | "indexing">("scope");

  const legalDisciplines = [
    {
      code: "5.1.1",
      title: language === "UZ" ? "Nazariy-tarixiy huquqiy fanlar" : language === "EN" ? "Theoretical & Historical Legal Sciences" : "Теоретико-исторические правовые науки",
      desc: language === "UZ" ? "Davlat va huquq nazariyasi, huquqiy ta'limotlar tarixi, qiyosiy huquqshunoslik." : language === "EN" ? "Theory and history of state and law, history of legal doctrines, comparative jurisprudence." : "Теория и история государства и права, история правовых учений, сравнительное правоведение."
    },
    {
      code: "5.1.2",
      title: language === "UZ" ? "Ommaviy-huquqiy (davlat-huquqiy) fanlar" : language === "EN" ? "Public Law & State Sciences" : "Публично-правовые (государственно-правовые) науки",
      desc: language === "UZ" ? "Konstitutsiyaviy huquq, ma'muriy huquq, moliya va soliq huquqi, ekologiya huquqi." : language === "EN" ? "Constitutional law, administrative law, financial & tax law, environmental law." : "Конституционное право, административное право, финансовое и налоговое право, экологическое право."
    },
    {
      code: "5.1.3",
      title: language === "UZ" ? "Xususiy-huquqiy (fuqarolik-huquqiy) fanlar" : language === "EN" ? "Private Law & Civil Sciences" : "Частно-правовые (цивилистические) науки",
      desc: language === "UZ" ? "Fuqarolik huquqi, mehnati va oila huquqi, tadbirkorlik va tijorat huquqi, xalqaro xususiy huquq." : language === "EN" ? "Civil law, labor and family law, commercial and business law, private international law." : "Гражданское право, предпринимательское право, семейное право, международное частное право."
    },
    {
      code: "5.1.4",
      title: language === "UZ" ? "Jinoyat-huquqiy fanlar va kriminologiya" : language === "EN" ? "Criminal Law Sciences & Criminology" : "Уголовно-правовые науки и криминология",
      desc: language === "UZ" ? "Jinoyat huquqi, jinoyat-protsessual huquq, kriminologiya, kriminalistika va ekspertiza." : language === "EN" ? "Criminal law, criminal procedure, criminology, forensics and legal expertise." : "Уголовное право, уголовный процесс, криминология, криминалистика и судебная экспертиза."
    },
    {
      code: "5.1.5",
      title: language === "UZ" ? "Xalqaro-huquqiy fanlar va raqamli huquq" : language === "EN" ? "International Law & Digital Legal Tech" : "Международно-правовые науки и цифровое право",
      desc: language === "UZ" ? "Xalqaro ommaviy huquq, inson huquqlari, raqamli huquq va sun'iy intellektni huquqiy tartibga solish." : language === "EN" ? "Public international law, human rights, digital law and AI legal regulations." : "Международное публичное право, права человека, цифровое право и правовое регулирование ИИ."
    }
  ];

  const indexingServices = [
    { name: "Crossref (DOI)", desc: "Каждой статье присваивается префикс DOI 10.47689", status: "active", url: "https://www.crossref.org" },
    { name: "Google Scholar", desc: "Академическая индексация цитирований и поисковая база", status: "active", url: "https://scholar.google.com" },
    { name: "OpenAlex", desc: "Глобальный открытый каталог научных фундаментальных работ", status: "active", url: "https://openalex.org" },
    { name: "ROAD (ISSN)", desc: "Каталог ресурсов открытого доступа под эгидой ЮНЕСКО", status: "active", url: "https://road.issn.org" },
    { name: "DOAJ", desc: "Директория рецензируемых журналов открытого доступа", status: "pending", url: "https://doaj.org" },
    { name: "WorldCat", desc: "Объединенный мировой библиотечный каталог", status: "active", url: "https://www.worldcat.org" }
  ];

  return (
    <div className="about-page">
      <Header activePage="/about" />

      {/* TOP PROFESSIONAL LEGAL HERO BANNER */}
      <section style={{ background: "linear-gradient(135deg, #091e3a 0%, #1e3a8a 60%, #1d4ed8 100%)", color: "#fff", padding: "60px 20px", textAlign: "center", position: "relative" }}>
        <div style={{ maxWidth: "1000px", margin: "0 auto" }}>
          <div style={{ display: "inline-block", background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.3)", padding: "4px 14px", borderRadius: "20px", fontSize: "12px", fontWeight: "bold", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "16px" }}>
            ⚖️ {language === "UZ" ? "Huquqiy tadqiqotlar jurnali" : language === "EN" ? "Legal Studies Scientific Journal" : "Журнал правовых исследований"}
          </div>
          <h1 style={{ fontSize: "36px", fontWeight: "800", margin: "0 0 16px", lineHeight: 1.2 }}>
            Expert Scientific Journal
          </h1>
          <p style={{ fontSize: "16px", color: "#e2e8f0", maxWidth: "800px", margin: "0 auto 24px", lineHeight: 1.6 }}>
            {language === "UZ"
              ? "Huquqshunoslik, davlat va huquq nazariyasi, qiyosiy huquqshunoslik hamda qonunchilikni takomillashtirish masalalariga bag'ishlangan xalqaro taqrizlanuvchi ilmiy jurnal."
              : language === "EN"
              ? "International peer-reviewed scientific journal dedicated to law, legal studies, comparative jurisprudence, and legislative advancements."
              : "Международный рецензируемый научный журнал, посвященный фундаментальным и прикладным исследованиям в области права, юриспруденции и совершенствования законодательства."}
          </p>

          <div style={{ display: "flex", gap: "20px", justifyContent: "center", flexWrap: "wrap" }}>
            <div style={{ background: "rgba(255,255,255,0.1)", padding: "10px 18px", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.2)", fontSize: "13px" }}>
              <b>ISSN (Print):</b> 2181-1415
            </div>
            <div style={{ background: "rgba(255,255,255,0.1)", padding: "10px 18px", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.2)", fontSize: "13px" }}>
              <b>ISSN (Online):</b> 2181-1423
            </div>
            <div style={{ background: "rgba(255,255,255,0.1)", padding: "10px 18px", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.2)", fontSize: "13px" }}>
              <b>DOI Prefix:</b> 10.47689
            </div>
          </div>
        </div>
      </section>

      <main className="about-main">
        {/* NAV TABS */}
        <div style={{ display: "flex", gap: "10px", justifyContent: "center", marginBottom: "32px", borderBottom: "1px solid #e2e8f0", paddingBottom: "12px" }}>
          <button
            onClick={() => setActiveTab("scope")}
            style={{ padding: "10px 20px", border: "none", borderRadius: "6px", fontWeight: "700", cursor: "pointer", fontSize: "14px", background: activeTab === "scope" ? "#1e3a8a" : "#f1f5f9", color: activeTab === "scope" ? "#fff" : "#475569" }}
          >
            🎯 {language === "UZ" ? "Maqsad va sohalar" : language === "EN" ? "Aims & Scope" : "Цели и область"}
          </button>
          <button
            onClick={() => setActiveTab("fields")}
            style={{ padding: "10px 20px", border: "none", borderRadius: "6px", fontWeight: "700", cursor: "pointer", fontSize: "14px", background: activeTab === "fields" ? "#1e3a8a" : "#f1f5f9", color: activeTab === "fields" ? "#fff" : "#475569" }}
          >
            📜 {language === "UZ" ? "Yuridik yo'nalishlar" : language === "EN" ? "Legal Disciplines" : "Юридические специальности"}
          </button>
          <button
            onClick={() => setActiveTab("ethics")}
            style={{ padding: "10px 20px", border: "none", borderRadius: "6px", fontWeight: "700", cursor: "pointer", fontSize: "14px", background: activeTab === "ethics" ? "#1e3a8a" : "#f1f5f9", color: activeTab === "ethics" ? "#fff" : "#475569" }}
          >
            ⚖️ {language === "UZ" ? "Taqriz va Etika" : language === "EN" ? "Peer-Review & Ethics" : "Рецензирование и этика"}
          </button>
          <button
            onClick={() => setActiveTab("indexing")}
            style={{ padding: "10px 20px", border: "none", borderRadius: "6px", fontWeight: "700", cursor: "pointer", fontSize: "14px", background: activeTab === "indexing" ? "#1e3a8a" : "#f1f5f9", color: activeTab === "indexing" ? "#fff" : "#475569" }}
          >
            🌐 {language === "UZ" ? "Indeksatsiya" : language === "EN" ? "Indexing" : "Индексация"}
          </button>
        </div>

        {/* SECTION 1: AIMS & SCOPE */}
        {activeTab === "scope" && (
          <section className="about-section">
            <div className="section-content">
              <h2>{language === "UZ" ? "Jurnal haqida umumiy ma'lumot" : language === "EN" ? "About the Journal" : "О журнале Эксперт"}</h2>
              <p className="description">
                {language === "UZ"
                  ? "«Expert Scientific Journal» — huquq va yuridik fanlar bo'yicha ilmiy izlanishlarni chop etishga ixtisoslashgan ochiq kirishli (Open Access) xalqaro jurnal. Jurnal 2020-yilda tashkil etilgan bo'lib, o'zbek, rus va ingliz tillaridagi dolzarb huquqiy maqolalarni nashr etadi."
                  : language === "EN"
                  ? "Expert Scientific Journal is an international open-access, peer-reviewed publication specializing in legal studies, jurisprudence, public & private law, and legislative analysis. Founded in 2020, it publishes research articles in English, Russian, and Uzbek."
                  : "«Expert Scientific Journal» — международный научный журнал открытого доступа, публикующий исследования в области права, юриспруденции, законодательства и судебной практики. Журнал основан в 2020 году и предоставляет исследователям авторитетную академическую площадку."}
              </p>

              <div className="key-points">
                <div className="point">
                  <span className="icon">⚖️</span>
                  <div>
                    <strong>{language === "UZ" ? "Huquqiy ixtisoslik" : language === "EN" ? "Legal Specialization" : "Юридическая специализация"}</strong>
                    <p>{language === "UZ" ? "Faqat huquqshunoslik va yuridik fanlar sohasidagi sifatli tadqiqotlar" : language === "EN" ? "Exclusively focused on jurisprudence and legal sciences" : "Публикация исследований строго в сфере юридических наук и правоприменения"}</p>
                  </div>
                </div>
                <div className="point">
                  <span className="icon">👥</span>
                  <div>
                    <strong>{language === "UZ" ? "Yopiq taqriz tizimi" : language === "EN" ? "Double-Blind Review" : "Двойное слепое рецензирование"}</strong>
                    <p>{language === "UZ" ? "Har bir maqola 2 nafar mustaqil huquqshunos ekspert taqrizidan o'tadi" : language === "EN" ? "Every manuscript is evaluated by two independent legal scholars" : "Два независимых рецензента — доктора и кандидаты юридических наук"}</p>
                  </div>
                </div>
                <div className="point">
                  <span className="icon">🔓</span>
                  <div>
                    <strong>Open Access (CC BY 4.0)</strong>
                    <p>{language === "UZ" ? "Chop etilgan barcha maqolalarga bepul va erkin kirish" : language === "EN" ? "Free immediate online access to full text articles" : "Свободный бесплатный доступ к научным публикациям по всему миру"}</p>
                  </div>
                </div>
                <div className="point">
                  <span className="icon">🏛️</span>
                  <div>
                    <strong>{language === "UZ" ? "OAK Talablariga Mos" : language === "EN" ? "VAK Standards" : "Соответствие ВАК"}</strong>
                    <p>{language === "UZ" ? "OAK talablari va xalqaro ilmiy standartlarga to'liq javob beradi" : language === "EN" ? "Full compliance with Higher Attestation Commission standards" : "Полный учет требований Высшей Аттестационной Комиссии"}</p>
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* SECTION 2: LEGAL DISCIPLINES (ПАСПОРТ СПЕЦИАЛЬНОСТЕЙ) */}
        {activeTab === "fields" && (
          <section className="about-section">
            <h2 style={{ fontSize: "24px", fontWeight: "800", color: "#0f172a", marginBottom: "16px" }}>
              {language === "UZ" ? "Ilmiy ixtisosliklar va yo'nalishlar" : language === "EN" ? "Legal Specializations & Scientific Fields" : "Паспорт юридических специальностей"}
            </h2>
            <p style={{ color: "#64748b", fontSize: "14px", marginBottom: "24px" }}>
              {language === "UZ"
                ? "Jurnal quyidagi huquqiy fanlar va ixtisosliklar bo'yicha ilmiy maqolalarni qabul qiladi:"
                : language === "EN"
                ? "The journal accepts original research across the following legal fields:"
                : "Журнал принимает к публикации научные статьи по следующим номенклатурным специальностям в области юридических наук:"}
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              {legalDisciplines.map((item) => (
                <div key={item.code} style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "10px", padding: "18px 22px", display: "flex", gap: "18px", alignItems: "flex-start" }}>
                  <span style={{ background: "#1e3a8a", color: "#fff", padding: "6px 12px", borderRadius: "6px", fontSize: "13px", fontWeight: "bold" }}>
                    {item.code}
                  </span>
                  <div>
                    <h4 style={{ fontSize: "16px", fontWeight: "700", color: "#0f172a", margin: "0 0 6px" }}>{item.title}</h4>
                    <p style={{ fontSize: "13px", color: "#475569", margin: 0, lineHeight: 1.5 }}>{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* SECTION 3: PEER REVIEW & ETHICS */}
        {activeTab === "ethics" && (
          <section className="editorial-section">
            <h2>{language === "UZ" ? "Tahririyat siyosati va Nashr etish odob-axloqi" : language === "EN" ? "Editorial Policy & Publication Ethics" : "Редакционная политика и этика публикаций"}</h2>
            <div className="policy-content">
              <div className="policy-item">
                <h3>📋 Процесс рецензирования</h3>
                <p>Все поступающие рукописи проходят обязательное двустороннее слепое рецензирование (Double-Blind Peer Review). Время экспертной оценки составляет от 7 до 14 дней.</p>
              </div>
              <div className="policy-item">
                <h3>⚖️ Принципы COPE</h3>
                <p>Журнал неукоснительно соблюдает этические стандарты Комитета по этике научных публикаций (Committee on Publication Ethics — COPE). Плагиат и самоплагиат категорически недопустимы.</p>
              </div>
              <div className="policy-item">
                <h3>🔍 Проверка на антиплагиат</h3>
                <p>Каждая статья перед передачей рецензентам проходит автоматическую проверку в системе «Антиплагиат». Минимальный порог оригинальности составляет 85%.</p>
              </div>
              <div className="policy-item">
                <h3>🔒 Цифровое архивирование</h3>
                <p>Опубликованные статьи получают постоянный цифровой идентификатор Crossref DOI и бессрочно сохраняются в цифровом архиве журнала.</p>
              </div>
            </div>
          </section>
        )}

        {/* SECTION 4: INDEXING & DATABASES */}
        {activeTab === "indexing" && (
          <section className="indexing-section">
            <h2>Индексация и репозитории</h2>
            <p className="section-description">Научный журнал Expert индексируется в ведущих международных базах данных и электронно-библиотечных системах</p>
            <div className="indexing-grid">
              {indexingServices.map((service, index) => (
                <div key={index} className="indexing-card">
                  <div className={`status-indicator ${service.status}`}></div>
                  <h3>{service.name}</h3>
                  <p style={{ fontSize: "11px", color: "#64748b", margin: "0 0 10px" }}>{service.desc}</p>
                  <a href={service.url} target="_blank" rel="noopener noreferrer">
                    {service.url}
                  </a>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* GENERAL METADATA GRID */}
        <section className="journal-details">
          <h2>Реквизиты и метаданные издания</h2>
          <div className="details-grid">
            <div className="detail-item">
              <strong>Официальное название</strong>
              <span>Expert Scientific Journal</span>
            </div>
            <div className="detail-item">
              <strong>Специализация</strong>
              <span>Право и правовые исследования</span>
            </div>
            <div className="detail-item">
              <strong>ISSN (печать)</strong>
              <span>2181–1415</span>
            </div>
            <div className="detail-item">
              <strong>ISSN (онлайн)</strong>
              <span>2181–1423</span>
            </div>
            <div className="detail-item">
              <strong>DOI Префикс</strong>
              <span>10.47689</span>
            </div>
            <div className="detail-item">
              <strong>Периодичность</strong>
              <span>Ежемесячно (12 выпусков в год)</span>
            </div>
            <div className="detail-item full-width">
              <strong>Языки публикаций</strong>
              <div className="languages">
                <span className="language-tag">Русский</span>
                <span className="language-tag">Oʻzbekcha</span>
                <span className="language-tag">English</span>
              </div>
            </div>
          </div>
        </section>

        {/* EDITORIAL CONTACTS SECTION */}
        <section className="contact-section">
          <h2>Контакты Редакции</h2>
          <div className="contact-content">
            <div className="contact-item">
              <span className="icon">📧</span>
              <div>
                <strong>Электронная почта редакции</strong>
                <p>editor@expert-journal.uz</p>
              </div>
            </div>
            <div className="contact-item">
              <span className="icon">📍</span>
              <div>
                <strong>Адрес редакционного совета</strong>
                <p>100000, г. Ташкент, пр. Амира Темура, 107</p>
              </div>
            </div>
            <div className="contact-item">
              <span className="icon">📱</span>
              <div>
                <strong>Телефон поддержки авторов</strong>
                <p>+998 71 200-45-67</p>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="about-footer">
        <p>© 2026 Expert Scientific Journal — Международный научный журнал правовых исследований. All rights reserved.</p>
      </footer>
    </div>
  );
}