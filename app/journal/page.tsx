"use client";

export const dynamic = "force-dynamic";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import "../globals.css";
import "./journal.css";
import Header from "@/components/Header";
import { getStoredArticles, getStoredIssues, syncStoreWithServer, StoredIssue, StoredArticle, searchArticlesInStore, downloadManuscriptFile } from "@/lib/articles-store";
import { useLanguage } from "@/lib/i18n-context";

const R2_BUCKET_URL = "https://d4da42b4eef1d8488bfb6a00e5225637.r2.cloudflarestorage.com/expert-journal-publications";

function JournalContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { t } = useLanguage();
  const requestedIssueId = searchParams.get("issueId");
  const queryParam = searchParams.get("q") || "";

  const [activeIssue, setActiveIssue] = useState<StoredIssue | null>(null);
  const [allArticlesList, setAllArticlesList] = useState<StoredArticle[]>([]);
  const [publishedIssues, setPublishedIssues] = useState<StoredIssue[]>([]);
  const [searchQuery, setSearchQuery] = useState(queryParam);
  const [selectedKeyword, setSelectedKeyword] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        await syncStoreWithServer();
        const issues = getStoredIssues();
        const articles = getStoredArticles();

        const pubIssues = issues.filter((i) => i.status === "PUBLISHED");
        setPublishedIssues(pubIssues);

        let targetIssue: StoredIssue | undefined;
        if (requestedIssueId) {
          targetIssue = issues.find((i) => i.id === requestedIssueId);
        }
        if (!targetIssue) {
          targetIssue = pubIssues[0] || issues[0];
        }

        setActiveIssue(targetIssue || null);
        setAllArticlesList(articles);
      } catch (e) {
        console.error("Journal page load error:", e);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [requestedIssueId]);

  useEffect(() => {
    if (queryParam) {
      setSearchQuery(queryParam);
    }
  }, [queryParam]);

  const [searchResults, setSearchResults] = useState<StoredArticle[]>([]);

  useEffect(() => {
    async function executeServerSearch() {
      if (!activeIssue) return;
      const res = await searchArticlesInStore({
        q: searchQuery,
        category: selectedKeyword || undefined,
        issueId: activeIssue.id,
        limit: 20,
      });
      if (res && Array.isArray(res.data)) {
        const filtered = res.data.filter((a: StoredArticle) => a.status === "PUBLISHED" || a.status === "ACCEPTED");
        setSearchResults(filtered);
      } else {
        const fallback = allArticlesList.filter((a) => (a.status === "PUBLISHED" || a.status === "ACCEPTED") && (a.issueId === activeIssue.id || !a.issueId));
        setSearchResults(fallback);
      }
    }
    executeServerSearch();
  }, [searchQuery, selectedKeyword, activeIssue, allArticlesList]);

  if (loading) {
    return <div className="journal-main" style={{ padding: "60px 20px", textAlign: "center", color: "#64748b" }}>Загрузка журнала из базы данных...</div>;
  }

  // EMPTY STATE WHEN NO PUBLISHED ISSUES EXIST IN DATABASE
  if (!activeIssue || publishedIssues.length === 0) {
    return (
      <div className="journal-page">
        <Header activePage="/journal" />
        <main style={{ maxWidth: "800px", margin: "60px auto", padding: "40px", background: "#ffffff", borderRadius: "12px", textAlign: "center", border: "1px solid #e2e8f0", boxShadow: "0 4px 16px rgba(0,0,0,0.04)" }}>
          <div style={{ fontSize: "42px", marginBottom: "12px" }}>📖</div>
          <h2 style={{ fontSize: "20px", fontWeight: "800", color: "#0f172a", marginBottom: "8px" }}>На данный момент нет опубликованных выпусков журнала</h2>
          <p style={{ fontSize: "14px", color: "#64748b", lineHeight: 1.6, marginBottom: "24px" }}>
            Новые номера журнала будут автоматически отображаться на данной странице сразу после их утверждения и публикации главным редактором.
          </p>
          <button onClick={() => router.push("/author")} style={{ background: "#2563eb", color: "#ffffff", border: "none", padding: "10px 20px", borderRadius: "6px", fontSize: "14px", fontWeight: "700", cursor: "pointer" }}>
            Подать статью в редактирование →
          </button>
        </main>
      </div>
    );
  }

  const issueNum = activeIssue.number;
  const issueYear = activeIssue.year;
  const pubDateFormatted = activeIssue.publicationDate ? new Date(activeIssue.publicationDate).toLocaleDateString("ru-RU", { month: "long", year: "numeric" }) : `${issueYear}`;
  const issueDoi = activeIssue.doi || `10.47689/expert-${issueYear}-iss${issueNum}`;

  const allKeywords = Array.from(
    new Set(allArticlesList.flatMap((a) => [a.scientificField, ...(a.keywords || [])]).filter(Boolean))
  ) as string[];

  return (
    <div className="journal-page">
      <Header activePage="/journal" />

      {/* DYNAMIC TOP HERO BLUE BANNER WITH BLURRED BACKDROP & COVER PHOTO */}
      <section className="journal-hero-banner" style={{ background: "linear-gradient(135deg, #091e3a 0%, #1e3a8a 50%, #1d4ed8 100%)", position: "relative", overflow: "hidden" }}>
        <div className="hero-banner-container">
          <div className="hero-banner-text">
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
              <span className="hero-vol-badge" style={{ margin: 0 }}>Issue {issueNum}, {issueYear}</span>
              <span style={{ background: "rgba(255,255,255,0.15)", color: "#e2e8f0", fontSize: "11px", padding: "2px 8px", borderRadius: "10px", fontFamily: "monospace" }}>
                DOI: {issueDoi}
              </span>
            </div>
            <h1>{activeIssue.journalTitle || "Expert Scientific Journal"}</h1>
            <p>International Journal of Multidisciplinary Research — Issue {issueNum} ({issueYear})</p>

            <div className="hero-banner-btns" style={{ display: "flex", gap: "12px", marginTop: "20px" }}>
              <a href="#articles" className="btn-hero-white">{t.viewIssue}</a>
              {Boolean(requestedIssueId) && (
                <button onClick={() => router.push("/archive")} style={{ background: "rgba(255,255,255,0.2)", color: "#ffffff", border: "1px solid rgba(255,255,255,0.4)", padding: "10px 18px", borderRadius: "6px", fontSize: "13px", fontWeight: "700", cursor: "pointer" }}>
                  {t.backToArchives}
                </button>
              )}
            </div>
          </div>

          <div className="hero-banner-cover">
            {activeIssue.coverUrl ? (
              <div style={{ width: "180px", height: "240px", borderRadius: "8px", overflow: "hidden", boxShadow: "0 10px 30px rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.2)" }}>
                <img src={activeIssue.coverUrl} alt={`Cover Issue #${issueNum}`} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              </div>
            ) : (
              <div className="hero-mock-book">
                <div className="book-spine" />
                <div className="book-face">
                  <div className="book-logo">📖</div>
                  <h3>{(activeIssue.journalTitle || "EXPERT SCIENTIFIC JOURNAL").toUpperCase()}</h3>
                  <small>International Journal of Multidisciplinary Research</small>
                  <div className="book-vol">ISSUE {issueNum}<br />{pubDateFormatted.toUpperCase()}</div>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* 3-COLUMN MAIN BODY GRID */}
      <main className="journal-grid-layout">
        {/* LEFT COLUMN: DYNAMIC METADATA */}
        <aside className="journal-col-left">
          {Boolean(requestedIssueId) && (
            <button onClick={() => router.push("/archive")} style={{ width: "100%", background: "#2563eb", color: "#ffffff", border: "none", padding: "10px 14px", borderRadius: "8px", fontSize: "13px", fontWeight: "bold", cursor: "pointer", marginBottom: "16px", boxShadow: "0 2px 8px rgba(37,99,235,0.3)" }}>
              {t.backToArchives}
            </button>
          )}

          <div className="card-sidebar">
            <h4 style={{ margin: "0 0 12px", fontSize: "15px" }}>{t.journalInfo}</h4>
            <div style={{ display: "flex", flexDirection: "column", gap: "10px", fontSize: "12px", color: "#475569" }}>
              <div><b>ISSN (Print):</b> 2181-1415</div>
              <div><b>ISSN (Online):</b> 2181-1423</div>
              <div><b>DOI Prefix:</b> 10.47689</div>
              <div><b>Frequency:</b> Monthly</div>
              <div style={{ marginTop: "6px" }}>
                <span className="type-badge-oa" style={{ background: "#dcfce7", color: "#15803d", padding: "4px 8px", borderRadius: "6px", fontWeight: "bold" }}>🔓 Open Access Journal</span>
              </div>
            </div>
          </div>
        </aside>

        {/* CENTER COLUMN: CURRENT ISSUE & ARTICLES */}
        <div className="journal-col-center" id="articles">
          {/* CURRENT ISSUE & ABOUT */}
          <div className="center-top-row">
            <div className="current-issue-box">
              <h4>Current Issue</h4>
              <div className="current-issue-flex">
                {activeIssue.coverUrl ? (
                  <img src={activeIssue.coverUrl} alt="Cover" className="issue-mini-thumb" />
                ) : (
                  <div className="issue-mini-thumb mock">
                    <b>EXPERT</b>
                    <small>ISSUE {issueNum}</small>
                  </div>
                )}
                <div>
                  <h5>Issue {issueNum} ({issueYear})</h5>
                  <p>{pubDateFormatted}</p>
                  <small style={{ color: "#2563eb", fontWeight: "bold", fontSize: "10px" }}>DOI: {issueDoi}</small>
                  <div className="articles-count-tag">{searchResults.length} Articles</div>
                  <div className="current-issue-actions">
                    <a href="#latest" className="btn-small-dark">View Issue</a>
                    <a href="#latest" className="btn-small-outline">Articles</a>
                  </div>
                </div>
              </div>
            </div>

            <div className="about-journal-box">
              <h4>{t.about}</h4>
              <p style={{ lineHeight: 1.5 }}>
                {activeIssue.description || "Expert Scientific Journal — рецензируемый научный журнал открытого доступа, публикующий оригинальные научные исследования."}
              </p>
              <a href="/about" className="link-more">▶ {t.moreAboutJournal}</a>
            </div>
          </div>

          {/* KEYWORD CHIPS */}
          {allKeywords.length > 0 && (
            <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "8px", padding: "16px", display: "flex", gap: "6px", flexWrap: "wrap", alignItems: "center" }}>
              <span style={{ fontSize: "11px", color: "#64748b", fontWeight: "bold" }}>Kalit so'zlar:</span>
              {allKeywords.map((kw) => {
                const isActive = selectedKeyword === kw;
                return (
                  <button
                    key={kw}
                    onClick={() => setSelectedKeyword(isActive ? null : kw)}
                    style={{
                      padding: "4px 12px",
                      borderRadius: "12px",
                      fontSize: "11px",
                      fontWeight: "600",
                      cursor: "pointer",
                      border: "1px solid",
                      borderColor: isActive ? "#2563eb" : "#e2e8f0",
                      background: isActive ? "#2563eb" : "#f8fafc",
                      color: isActive ? "#ffffff" : "#475569",
                    }}
                  >
                    {kw}
                  </button>
                );
              })}
            </div>
          )}

          {/* ARTICLES LIST */}
          <div className="latest-articles-box" id="latest">
            <div className="articles-box-head">
              <h3>{t.articlesInThisIssue} ({searchResults.length})</h3>
            </div>

            <div className="articles-list-wrap">
              {searchResults.length === 0 ? (
                <div style={{ padding: "40px", textAlign: "center", color: "#64748b" }}>
                  {t.articlesInThisIssue}: 0
                </div>
              ) : (
                searchResults.map((art, idx) => {
                  const pageStart = 1 + idx * 15;
                  const pageEnd = pageStart + 14;

                  return (
                    <div key={art.id} className="article-item-row">
                      <div className="article-item-content">
                        <span className="type-badge-oa">🔓 Research Article</span>
                        <a href={`/article?id=${art.id}`} className="article-item-title">
                          {art.title}
                        </a>
                        <div className="article-item-authors">
                          👤 {art.authorName}
                          {art.coAuthors && art.coAuthors.length > 0 && `, ${art.coAuthors.join(", ")}`}
                        </div>
                        {art.doi && <small style={{ color: "#2563eb", fontSize: "10px" }}>DOI: {art.doi}</small>}
                      </div>
                      <div className="article-item-right" style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <span className="page-range">{art.pages || `${pageStart}-${pageEnd}`}</span>
                        <button
                          onClick={() => downloadManuscriptFile({ fileUrl: art.fileUrl, fileName: art.fileName, title: art.title, authorName: art.authorName, abstract: art.abstract })}
                          className="btn-pdf-box"
                          style={{ border: "none", cursor: "pointer" }}
                        >
                          📥 {t.downloadPdf}
                        </button>
                        <a href={`/article?id=${art.id}`} className="btn-pdf-box" style={{ background: "#f1f5f9", color: "#475569" }}>
                          View
                        </a>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: SUBMISSION & INFO */}
        <aside className="journal-col-right">
          <div className="card-sidebar sub-card">
            <h4>{t.submissionTitle}</h4>
            <p>{t.submissionSubtitle}</p>
            <button onClick={() => router.push("/author")} className="btn-submit-full">
              {t.submitNewArticle}
            </button>
          </div>

          <div className="card-sidebar" style={{ marginTop: "20px" }}>
            <h4>{t.journalInfo}</h4>
            <ul className="info-icon-list">
              <li>📄 {t.aimsAndScope}</li>
              <li>👥 {t.editorialBoard}</li>
              <li>🔍 {t.peerReviewProcess}</li>
              <li>⚖️ {t.publicationEthics}</li>
              <li>🔓 {t.openAccessPolicy}</li>
              <li>© {t.copyrightNotice}</li>
            </ul>
          </div>
        </aside>
      </main>
    </div>
  );
}

export default function JournalPage() {
  return (
    <Suspense fallback={<div style={{ padding: "60px", textAlign: "center" }}>Загрузка журнала...</div>}>
      <JournalContent />
    </Suspense>
  );
}