"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Header from "@/components/Header";
import "./article.css";
import { getStoredArticles, syncStoreWithServer, downloadManuscriptFile, incrementArticleViews, incrementArticleDownloads, incrementArticleCitations } from "@/lib/articles-store";
import { useLanguage } from "@/lib/i18n-context";

const R2_BUCKET_URL = "https://d4da42b4eef1d8488bfb6a00e5225637.r2.cloudflarestorage.com/expert-journal-publications";

function ArticleDetailContent() {
  const searchParams = useSearchParams();
  const articleId = searchParams.get("id") || "";
  const router = useRouter();
  const { t } = useLanguage();

  const [article, setArticle] = useState(null);
  const [citationFormat, setCitationFormat] = useState("APA");
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);

  // PDF Viewer State
  const [pdfPage, setPdfPage] = useState(1);
  const [pdfTotalPages, setPdfTotalPages] = useState(12);
  const [pdfZoom, setPdfZoom] = useState(100);
  const [isPdfFullscreen, setIsPdfFullscreen] = useState(false);

  useEffect(() => {
    async function loadData() {
      try {
        await syncStoreWithServer();
        const all = getStoredArticles();
        const found = all.find((a) => a.id === articleId) || all[0];
        if (found) {
          const updatedList = incrementArticleViews(found.id);
          const fresh = updatedList.find((a) => a.id === found.id) || found;
          setArticle(fresh);
        } else {
          setArticle(null);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [articleId]);

  if (loading) {
    return <div style={{ padding: "60px", textAlign: "center", color: "#64748b" }}>Loading article from database...</div>;
  }

  if (!article) {
    return (
      <div style={{ minHeight: "100vh", background: "#f8fafc" }}>
        <Header activePage="/journal" />
        <div style={{ maxWidth: "600px", margin: "80px auto", padding: "40px", background: "#fff", borderRadius: "12px", textAlign: "center", boxShadow: "0 4px 14px rgba(0,0,0,0.05)" }}>
          <h2 style={{ fontSize: "20px", fontWeight: "800", color: "#0f172a", marginBottom: "12px" }}>Maqola topilmadi / Article not found</h2>
          <p style={{ fontSize: "14px", color: "#64748b", marginBottom: "24px" }}>Bazada maqolalar yo'q yoki so'ralgan maqola mavjud emas.</p>
          <button onClick={() => router.push("/journal")} style={{ background: "#2563eb", color: "#fff", border: "none", padding: "10px 22px", borderRadius: "6px", fontWeight: "700", cursor: "pointer" }}>
            {t.backToJournal}
          </button>
        </div>
      </div>
    );
  }

  const pdfUrl = `${R2_BUCKET_URL}/${article.fileName || "manuscript.pdf"}`;

  const authorsList = [
    { name: article.authorName, affiliation: t.authorRole },
    ...(article.coAuthors || []).map((ca) => ({ name: ca, affiliation: t.coAuthorRole })),
  ];

  const citationText =
    citationFormat === "APA"
      ? `${article.authorName}${article.coAuthors && article.coAuthors.length > 0 ? `, & ${article.coAuthors.join(", ")}` : ""}. (2026). ${article.title}. Expert Scientific Journal. https://doi.org/${article.doi || "10.47689/expert-2026"}`
      : `${article.authorName}. "${article.title}." Expert Scientific Journal, 2026.`;

  const handleDownload = () => {
    if (article) {
      const updatedList = incrementArticleDownloads(article.id);
      const fresh = updatedList.find((a) => a.id === article.id);
      if (fresh) setArticle(fresh);
      downloadManuscriptFile(article);
    }
  };

  const copyCitation = () => {
    navigator.clipboard.writeText(citationText);
    if (article) {
      const updatedList = incrementArticleCitations(article.id);
      const fresh = updatedList.find((a) => a.id === article.id);
      if (fresh) setArticle(fresh);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="article-detail-page">
      <Header activePage="/journal" />

      {/* TOP NAVIGATION BAR WITH PROMINENT BACK BUTTON */}
      <div style={{ maxWidth: "1140px", margin: "16px auto 0", padding: "0 20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <button
          onClick={() => router.back()}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            background: "#ffffff",
            border: "1px solid #cbd5e1",
            color: "#0f172a",
            padding: "8px 16px",
            borderRadius: "8px",
            fontSize: "13px",
            fontWeight: "700",
            cursor: "pointer",
            boxShadow: "0 2px 6px rgba(0,0,0,0.03)",
          }}
        >
          {t.back}
        </button>

        <div style={{ display: "flex", gap: "10px" }}>
          <button
            onClick={() => router.push("/journal")}
            style={{ background: "#f1f5f9", color: "#475569", border: "1px solid #e2e8f0", padding: "6px 14px", borderRadius: "6px", fontSize: "12px", fontWeight: "600", cursor: "pointer" }}
          >
            {t.backToJournal}
          </button>
          <button
            onClick={() => router.push("/archive")}
            style={{ background: "#f1f5f9", color: "#475569", border: "1px solid #e2e8f0", padding: "6px 14px", borderRadius: "6px", fontSize: "12px", fontWeight: "600", cursor: "pointer" }}
          >
            {t.backToArchives}
          </button>
        </div>
      </div>

      <main className="article-detail-main">
        <div className="article-detail-grid">
          {/* LEFT COLUMN */}
          <div className="article-main-card">
            {/* BADGES ROW */}
            <div className="article-badges-row">
              <span className="badge-open-access">{t.openAccess}</span>
              <span className="badge-peer-reviewed">{t.peerReviewed}</span>
              <span className="article-pub-date">{t.publishedOn} {article.submissionDate || "2026-07-31"}</span>
            </div>

            {/* TITLE */}
            <h1 className="article-main-title">{article.title}</h1>

            {/* AUTHORS LIST WITH ORCID */}
            <div className="authors-list-block">
              {authorsList.map((au, idx) => (
                <div key={idx} className="author-item">
                  <div className="author-name-row">
                    <span className="author-icon">👤</span>
                    <span>{au.name}</span>
                    <sup style={{ color: "#15803d", fontWeight: "bold" }}>{idx + 1}</sup>
                    <span className="orcid-icon">🟢</span>
                  </div>
                  <div className="author-affiliation">{au.affiliation}</div>
                </div>
              ))}
            </div>

            {/* DOI & PAGES */}
            <div className="doi-pages-box">
              <div className="doi-col">
                <label>DOI:</label>
                <span>
                  <a
                    href={`/doi/${article.doi || `10.47689/expert-2026-iss10-${article.id}`}`}
                    style={{ color: "#2563eb", textDecoration: "underline", fontWeight: "bold" }}
                  >
                    https://doi.org/{article.doi || `10.47689/expert-2026-iss10-${article.id}`}
                  </a>
                  <button className="copy-btn" title="Copy DOI" onClick={() => navigator.clipboard.writeText(`https://doi.org/${article.doi || `10.47689/expert-2026-iss10-${article.id}`}`)}>📋</button>
                </span>
              </div>
              <div className="pages-col">
                <label>{t.pages}</label>
                <span>{article.pages || (pdfTotalPages ? `1 - ${pdfTotalPages}` : "1 - 12")}</span>
              </div>
            </div>

            {/* ABSTRACT */}
            <h2 className="section-heading">{t.abstract}</h2>
            <p className="abstract-text">{article.abstract || "No abstract available."}</p>

            {/* KEYWORDS */}
            <h2 className="section-heading">{t.keywords}</h2>
            <div className="keywords-flex">
              {(article.keywords && article.keywords.length > 0 ? article.keywords : ["science", "research"]).map((kw, i) => (
                <span key={i} className="keyword-badge">{kw}</span>
              ))}
            </div>

            {/* ARTICLE INFO METADATA TABLE */}
            <h2 className="section-heading">{t.articleInfo}</h2>
            <div className="article-info-grid">
              <div className="info-cell">
                <label>{t.journal}</label>
                <span>Expert Scientific Journal</span>
              </div>
              <div className="info-cell">
                <label>Received:</label>
                <span>{article.submissionDate}</span>
              </div>
              <div className="info-cell">
                <label>Issue / Year:</label>
                <span>Issue {article.issueNumber || 2} ({article.year || 2026})</span>
              </div>
              <div className="info-cell">
                <label>Accepted:</label>
                <span>{article.lastUpdated}</span>
              </div>
              <div className="info-cell">
                <label>Field:</label>
                <span>{article.scientificField || "Multidisciplinary Science"}</span>
              </div>
              <div className="info-cell">
                <label>{t.publishedOn}</label>
                <span>{article.lastUpdated || article.submissionDate}</span>
              </div>
              <div className="info-cell">
                <label>Language:</label>
                <span>{article.language || "English, Uzbek, Russian"}</span>
              </div>
              <div className="info-cell">
                <label>Article Type:</label>
                <span>Research Article</span>
              </div>
            </div>

            {/* PEER REVIEW & PUBLISHING LIFECYCLE INFO */}
            <h2 className="section-heading">Peer Review & Publishing Lifecycle</h2>
            <div className="article-info-grid" style={{ marginBottom: "24px" }}>
              <div className="info-cell">
                <label>Review Type:</label>
                <span>{article.reviewType || "Double Blind Peer Review"}</span>
              </div>
              <div className="info-cell">
                <label>Review Round:</label>
                <span>{article.reviewRound || "2"}</span>
              </div>
              <div className="info-cell">
                <label>Editorial Decision:</label>
                <span style={{ color: "#15803d", fontWeight: "bold" }}>{article.decision || "Accepted"}</span>
              </div>
              <div className="info-cell">
                <label>Accepted Date:</label>
                <span>{article.acceptedDate || "15 June 2026"}</span>
              </div>
              <div className="info-cell">
                <label>Published Date:</label>
                <span>{article.publishedDate || "30 June 2026"}</span>
              </div>
            </div>

            {/* FILES DOWNLOAD */}
            <h2 className="section-heading">{t.files}</h2>
            <div className="file-download-row">
              <div className="file-info">
                <span style={{ color: "#b91c1c", fontSize: "18px" }}>📕</span>
                <span>{article.title} (PDF)</span>
                <span className="file-size">1.2 MB</span>
              </div>
              <button onClick={handleDownload} className="btn-download-dark" style={{ border: "none", cursor: "pointer" }}>
                {t.download}
              </button>
            </div>
            <div className="file-download-row">
              <div className="file-info">
                <span style={{ color: "#2563eb", fontSize: "18px" }}>📘</span>
                <span>{article.title} (DOCX)</span>
                <span className="file-size">845 KB</span>
              </div>
              <button onClick={handleDownload} className="btn-download-dark" style={{ border: "none", cursor: "pointer" }}>
                {t.download}
              </button>
            </div>

            {/* HOW TO CITE */}
            <h2 className="section-heading">{t.howToCite}</h2>
            <div className="citation-tabs">
              {["APA", "MLA", "Chicago", "BibTeX", "RIS"].map((fmt) => (
                <button
                  key={fmt}
                  className={`tab-btn ${citationFormat === fmt ? "active" : ""}`}
                  onClick={() => setCitationFormat(fmt)}
                >
                  {fmt}
                </button>
              ))}
            </div>
            <div className="citation-box">
              <div>{citationText}</div>
              <button className="copy-btn" onClick={copyCitation} title="Copy citation">
                {copied ? t.copied : "📋"}
              </button>
            </div>
          </div>

          {/* RIGHT SIDEBAR */}
          <aside className="sidebar-column">
            {/* STYLISH INTERACTIVE ONLINE PDF VIEWER CARD */}
            <div className="sidebar-box" style={{ background: "#ffffff", borderRadius: "12px", border: "1px solid #e2e8f0", padding: "18px", boxShadow: "0 4px 14px rgba(0,0,0,0.03)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                <h3 className="sidebar-title" style={{ margin: 0 }}>{t.pdfPreview}</h3>
                <span style={{ background: "#b91c1c", color: "#fff", fontSize: "9px", fontWeight: "bold", padding: "3px 8px", borderRadius: "4px" }}>
                  PDF MANUSCRIPT
                </span>
              </div>

              {/* TOOLBAR FOR PAGE SWITCHING, ZOOM, FULLSCREEN & DOWNLOAD */}
              <div style={{ background: "#0f172a", color: "#f8fafc", padding: "8px 12px", borderRadius: "8px 8px 0 0", display: "flex", justifyContent: "space-between", alignItems: "center", gap: "6px", flexWrap: "wrap", fontSize: "12px" }}>
                {/* Page Switcher */}
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <button
                    disabled={pdfPage <= 1}
                    onClick={() => setPdfPage((prev) => Math.max(1, prev - 1))}
                    style={{ background: pdfPage <= 1 ? "#334155" : "#1e293b", color: "#fff", border: "1px solid #475569", borderRadius: "4px", padding: "3px 8px", cursor: pdfPage <= 1 ? "not-allowed" : "pointer", fontSize: "11px", fontWeight: "bold" }}
                    title="Олдинги бет (Previous Page)"
                  >
                    ◀
                  </button>
                  <span style={{ fontSize: "11px", fontWeight: "600", color: "#cbd5e1" }}>
                    {pdfPage} / {pdfTotalPages}
                  </span>
                  <button
                    disabled={pdfPage >= pdfTotalPages}
                    onClick={() => setPdfPage((prev) => Math.min(pdfTotalPages, prev + 1))}
                    style={{ background: pdfPage >= pdfTotalPages ? "#334155" : "#1e293b", color: "#fff", border: "1px solid #475569", borderRadius: "4px", padding: "3px 8px", cursor: pdfPage >= pdfTotalPages ? "not-allowed" : "pointer", fontSize: "11px", fontWeight: "bold" }}
                    title="Keyingi bet (Next Page)"
                  >
                    ▶
                  </button>
                </div>

                {/* Zoom Controls */}
                <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                  <button
                    onClick={() => setPdfZoom((prev) => Math.max(50, prev - 25))}
                    style={{ background: "#1e293b", color: "#fff", border: "1px solid #475569", borderRadius: "4px", padding: "3px 6px", cursor: "pointer", fontSize: "11px" }}
                    title="Kichiklashtirish (Zoom Out)"
                  >
                    🔍-
                  </button>
                  <span style={{ fontSize: "11px", color: "#94a3b8", width: "36px", textAlign: "center" }}>{pdfZoom}%</span>
                  <button
                    onClick={() => setPdfZoom((prev) => Math.min(200, prev + 25))}
                    style={{ background: "#1e293b", color: "#fff", border: "1px solid #475569", borderRadius: "4px", padding: "3px 6px", cursor: "pointer", fontSize: "11px" }}
                    title="Kattalashtirish (Zoom In)"
                  >
                    🔍+
                  </button>
                </div>

                {/* Fullscreen Button */}
                <button
                  onClick={() => setIsPdfFullscreen(true)}
                  style={{ background: "#2563eb", color: "#fff", border: "none", borderRadius: "4px", padding: "4px 10px", cursor: "pointer", fontSize: "11px", fontWeight: "bold", display: "flex", alignItems: "center", gap: "4px" }}
                  title="Бутун экранга (Fullscreen)"
                >
                  ⛶ Ekran
                </button>
              </div>

              {/* CANVAS / IFRAME DISPLAY CONTAINER */}
              <div style={{ height: "320px", background: "#cbd5e1", borderRadius: "0 0 8px 8px", overflow: "hidden", position: "relative", border: "1px solid #cbd5e1", borderTop: "none" }}>
                {article.fileUrl ? (
                  <iframe
                    src={`${article.fileUrl}#page=${pdfPage}`}
                    style={{
                      width: `${pdfZoom}%`,
                      height: `${pdfZoom}%`,
                      transformOrigin: "top left",
                      border: "none",
                      background: "#fff",
                    }}
                    title="PDF Online Viewer"
                  />
                ) : (
                  <div style={{ height: "100%", width: "100%", background: "#f8fafc", padding: "20px", overflowY: "auto", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                    <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: "6px", padding: "16px", boxShadow: "0 2px 6px rgba(0,0,0,0.03)" }}>
                      <div style={{ fontSize: "9px", color: "#2563eb", fontWeight: "bold", marginBottom: "4px" }}>
                        ONLINE PREVIEW — PAGE {pdfPage} OF {pdfTotalPages}
                      </div>
                      <h4 style={{ fontSize: "13px", fontWeight: "800", color: "#0f172a", margin: "0 0 6px" }}>
                        {article.title}
                      </h4>
                      <div style={{ fontSize: "11px", color: "#475569", marginBottom: "8px" }}>
                        👤 {article.authorName} · {article.scientificField || "Право и правовые исследования"}
                      </div>
                      <p style={{ fontSize: "11px", color: "#334155", lineHeight: 1.5, margin: 0 }}>
                        {article.abstract ? article.abstract.substring(0, 180) + "..." : "Полный текст рукописи доступен в PDF формате."}
                      </p>
                    </div>
                    <div style={{ background: "#eff6ff", border: "1px solid #bfdbfe", padding: "8px 12px", borderRadius: "6px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <span style={{ fontSize: "11px", color: "#1e40af", fontWeight: "bold" }}>● Peer-Reviewed PDF Document</span>
                      <span style={{ fontSize: "10px", color: "#3b82f6" }}>1.2 MB</span>
                    </div>
                  </div>
                )}
              </div>

              {/* DOWNLOAD BUTTON BELOW VIEWER */}
              <button
                onClick={handleDownload}
                className="btn-download-crimson"
                style={{ marginTop: "14px", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", width: "100%", border: "none", cursor: "pointer" }}
              >
                📥 {t.downloadPdf} (1.2 MB)
              </button>
            </div>

            {/* METRICS BOX */}
            <div className="sidebar-box">
              <h3 className="sidebar-title">{t.metrics}</h3>
              <div className="metrics-grid">
                <div className="metric-cell">
                  <label>👁️ {t.views}</label>
                  <strong>{article.views || 248}</strong>
                </div>
                <div className="metric-cell">
                  <label>📥 {t.downloads}</label>
                  <strong>{article.downloads || 94}</strong>
                </div>
                <div className="metric-cell">
                  <label>💬 {t.citations}</label>
                  <strong>{article.citations || 12}</strong>
                </div>
                <div className="metric-cell">
                  <label>📅 {t.updated}</label>
                  <strong>{article.lastUpdated || "2026-07-31"}</strong>
                </div>
              </div>
            </div>

            {/* SHARE BOX */}
            <div className="sidebar-box">
              <h3 className="sidebar-title">{t.share}</h3>
              <div className="share-icons-flex">
                <a href="#fb" className="share-icon-btn share-fb">f</a>
                <a href="#tw" className="share-icon-btn share-tw">t</a>
                <a href="#in" className="share-icon-btn share-in">in</a>
                <a href="#tg" className="share-icon-btn share-tg">✈</a>
                <a href="#wa" className="share-icon-btn share-wa">w</a>
                <a href="#em" className="share-icon-btn share-em">✉</a>
              </div>
            </div>
          </aside>
        </div>
      </main>

      <footer style={{ background: "#0f172a", color: "#94a3b8", padding: "24px", textAlign: "center", fontSize: "13px" }}>
        © 2026 Expert Scientific Journal. All rights reserved.
      </footer>

      {/* FULLSCREEN MODAL VIEWER */}
      {isPdfFullscreen && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(15, 23, 42, 0.94)", zIndex: 9999, display: "flex", flexDirection: "column" }}>
          {/* FULLSCREEN TOOLBAR */}
          <div style={{ background: "#0f172a", color: "#fff", padding: "12px 24px", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #1e293b" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
              <b style={{ fontSize: "15px", color: "#60a5fa" }}>📖 PDF Fullscreen Viewer</b>
              <span style={{ fontSize: "13px", color: "#94a3b8" }}>{article.title}</span>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
              {/* Page Switcher */}
              <div style={{ display: "flex", alignItems: "center", gap: "8px", background: "#1e293b", padding: "4px 12px", borderRadius: "6px", border: "1px solid #334155" }}>
                <button
                  disabled={pdfPage <= 1}
                  onClick={() => setPdfPage((prev) => Math.max(1, prev - 1))}
                  style={{ background: "none", border: "none", color: pdfPage <= 1 ? "#475569" : "#fff", cursor: pdfPage <= 1 ? "not-allowed" : "pointer", fontSize: "14px", fontWeight: "bold" }}
                >
                  ◀
                </button>
                <span style={{ fontSize: "13px", fontWeight: "bold" }}>
                  Bet (Page) {pdfPage} / {pdfTotalPages}
                </span>
                <button
                  disabled={pdfPage >= pdfTotalPages}
                  onClick={() => setPdfPage((prev) => Math.min(pdfTotalPages, prev + 1))}
                  style={{ background: "none", border: "none", color: pdfPage >= pdfTotalPages ? "#475569" : "#fff", cursor: pdfPage >= pdfTotalPages ? "not-allowed" : "pointer", fontSize: "14px", fontWeight: "bold" }}
                >
                  ▶
                </button>
              </div>

              {/* Zoom */}
              <div style={{ display: "flex", alignItems: "center", gap: "6px", background: "#1e293b", padding: "4px 10px", borderRadius: "6px", border: "1px solid #334155" }}>
                <button onClick={() => setPdfZoom((prev) => Math.max(50, prev - 25))} style={{ background: "none", border: "none", color: "#fff", cursor: "pointer", fontSize: "13px" }}>🔍-</button>
                <span style={{ fontSize: "12px", color: "#cbd5e1" }}>{pdfZoom}%</span>
                <button onClick={() => setPdfZoom((prev) => Math.min(200, prev + 25))} style={{ background: "none", border: "none", color: "#fff", cursor: "pointer", fontSize: "13px" }}>🔍+</button>
              </div>

              {/* Download */}
              <button
                onClick={handleDownload}
                style={{ background: "#2563eb", color: "#fff", border: "none", padding: "6px 14px", borderRadius: "6px", fontWeight: "bold", cursor: "pointer", fontSize: "13px" }}
              >
                📥 Yuklab olish
              </button>

              {/* Close Modal */}
              <button
                onClick={() => setIsPdfFullscreen(false)}
                style={{ background: "#ef4444", color: "#fff", border: "none", padding: "6px 14px", borderRadius: "6px", fontWeight: "bold", cursor: "pointer", fontSize: "13px" }}
              >
                ✕ Yopish
              </button>
            </div>
          </div>

          {/* FULLSCREEN VIEW CANVAS / IFRAME */}
          <div style={{ flex: 1, overflow: "auto", display: "flex", justifyContent: "center", alignItems: "flex-start", padding: "24px" }}>
            {article.fileUrl ? (
              <iframe
                src={`${article.fileUrl}#page=${pdfPage}`}
                style={{
                  width: `${Math.max(60, pdfZoom)}%`,
                  height: "90vh",
                  border: "none",
                  borderRadius: "8px",
                  boxShadow: "0 10px 40px rgba(0,0,0,0.5)",
                  background: "#fff",
                }}
                title="Fullscreen PDF Viewer"
              />
            ) : (
              <div style={{ width: `${Math.max(50, pdfZoom)}%`, minHeight: "80vh", background: "#ffffff", color: "#0f172a", padding: "40px 60px", borderRadius: "8px", boxShadow: "0 10px 40px rgba(0,0,0,0.5)" }}>
                <div style={{ borderBottom: "2px solid #0f172a", paddingBottom: "16px", marginBottom: "24px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <b style={{ fontSize: "18px" }}>EXPERT SCIENTIFIC JOURNAL</b>
                    <div style={{ fontSize: "12px", color: "#64748b" }}>International Multidisciplinary Research Journal</div>
                  </div>
                  <span style={{ background: "#0f172a", color: "#fff", padding: "4px 12px", borderRadius: "4px", fontSize: "12px", fontWeight: "bold" }}>PAGE {pdfPage} / {pdfTotalPages}</span>
                </div>

                <h2 style={{ fontSize: "22px", fontWeight: "800", marginBottom: "12px" }}>{article.title}</h2>
                <div style={{ fontSize: "14px", color: "#475569", marginBottom: "24px" }}>
                  👤 <b>{article.authorName}</b> · {article.scientificField || "Право и правовые исследования"}
                </div>

                <div style={{ background: "#f8fafc", borderLeft: "4px solid #2563eb", padding: "16px 20px", marginBottom: "24px", borderRadius: "0 8px 8px 0" }}>
                  <h4 style={{ margin: "0 0 6px 0", fontSize: "14px", color: "#1e40af" }}>ABSTRACT / ANNOTATSIYA</h4>
                  <p style={{ fontSize: "13px", lineHeight: 1.6, color: "#334155", margin: 0 }}>
                    {article.abstract || "Аннотация научной статьи."}
                  </p>
                </div>

                <div style={{ fontSize: "13px", lineHeight: 1.8, color: "#334155" }}>
                  <p>
                    <b>1. ВВЕДЕНИЕ / KIRISH</b><br />
                    В данной исследовательской работе рассмотрены ключевые вопросы законодательства и судебной практики.
                  </p>
                  <p>
                    <b>2. МЕТОДОЛОГИЯ И АНАЛИЗ</b><br />
                    Проведен сравнительно-правовой анализ нормативно-правовых актов и теоретических правовых данных.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function ArticleDetailPage() {
  return (
    <Suspense fallback={<div style={{ padding: "60px", textAlign: "center" }}>Loading...</div>}>
      <ArticleDetailContent />
    </Suspense>
  );
}
