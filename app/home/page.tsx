"use client";

import { useState, useEffect } from "react";
import "../globals.css";
import Header from "@/components/Header";
import { getStoredArticles, getStoredIssues, syncStoreWithServer, StoredIssue, StoredArticle, downloadManuscriptFile } from "@/lib/articles-store";
import { useLanguage } from "@/lib/i18n-context";

function Arrow() { return <span className="arrow">→</span>; }

export default function HomePage() {
  const { t } = useLanguage();
  const [publishedIssues, setPublishedIssues] = useState<StoredIssue[]>([]);
  const [latestArticles, setLatestArticles] = useState<StoredArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [faq, setFaq] = useState<number | null>(0);

  useEffect(() => {
    async function loadHomeData() {
      try {
        await syncStoreWithServer();
        const allIssues = getStoredIssues();
        const allArticles = getStoredArticles();

        const pubIssues = allIssues.filter((i) => i.status === "PUBLISHED");
        const pubArticles = allArticles.filter((a) => a.status === "PUBLISHED");

        setPublishedIssues(pubIssues);
        setLatestArticles(pubArticles);
      } catch (e) {
        console.error("Home page data load error:", e);
      } finally {
        setLoading(false);
      }
    }
    loadHomeData();
  }, []);

  const latestIssue = publishedIssues.length > 0 ? publishedIssues[0] : null;

  const faqs = [
    ["Как подать статью?", "Создайте авторский профиль, заполните форму подачи и загрузите рукопись в формате DOCX или PDF."],
    ["Сколько длится рецензирование?", "Стандартный редакционный цикл занимает от 10 до 15 рабочих дней после проверки оформления."],
    ["Присваивается ли DOI?", "Да. Каждой опубликованной статье присваивается уникальный DOI через Crossref."],
  ];

  return (
    <main>
      <Header activePage="/home" />

      {/* HERO SECTION WITH DYNAMIC ISSUE PUBLICATION DATE & EDITOR COVER PHOTO */}
      <section className="hero" id="top">
        <div className="hero-copy">
          <p className="eyebrow light">{t.heroEyebrow}</p>
          <h1>{t.heroTitle1}<br /><i>{t.heroTitleHighlight}</i> {t.heroTitle2}</h1>
          <p className="hero-text">
            {t.heroSubtitle}
          </p>
          <div className="credentials">
            <span>ISSN 2181–1415</span>
            <span>✦ Open Access</span>
            <span>Crossref member</span>
          </div>
          <div className="hero-actions">
            <a className="btn primary" href={latestIssue ? `/journal?issueId=${latestIssue.id}` : "/journal"}>
              {t.journal} <Arrow />
            </a>
            <a className="btn ghost" href="/author">{t.submitArticleBtn}</a>
          </div>
        </div>

        <div className="cover-area">
          <div className="ring ring-one" />
          <div className="ring ring-two" />

          {/* DYNAMIC EDITOR COVER PHOTO OR DYNAMIC STYLED CARD */}
          {latestIssue ? (
            latestIssue.coverUrl ? (
              <div className="cover" style={{ padding: 0, overflow: "hidden", background: "none" }}>
                <img
                  src={latestIssue.coverUrl}
                  alt={`Cover Issue #${latestIssue.number}`}
                  style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "12px" }}
                />
                <div className="issue-badge">
                  № {latestIssue.number}
                  <small>{latestIssue.year}</small>
                </div>
              </div>
            ) : (
              <div className="cover" style={{ background: "linear-gradient(135deg, #0f172a, #1e3a8a)" }}>
                <div className="cover-top">
                  <b>EXPERT</b>
                  <span>ISSN 2181–1415<br />№ {latestIssue.number} / {latestIssue.year}</span>
                </div>
                <p>EXPERT<br />SCIENTIFIC JOURNAL</p>
                <div className="city"><span /><span /><span /><span /><span /></div>
                <div className="cover-bottom">LAW & LEGAL RESEARCH</div>
                <div className="issue-badge">
                  № {latestIssue.number}
                  <small>{latestIssue.year}</small>
                </div>
              </div>
            )
          ) : (
            <div className="cover" style={{ background: "linear-gradient(135deg, #1e293b, #0f172a)", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", textAlign: "center" }}>
              <div style={{ fontSize: "36px", marginBottom: "10px" }}>📖</div>
              <b style={{ color: "#ffffff", fontSize: "16px" }}>EXPERT JOURNAL</b>
              <small style={{ color: "#94a3b8", marginTop: "6px" }}>{t.noIssuesTitle}</small>
            </div>
          )}

          {/* DYNAMIC PUBLICATION BADGE FROM DATABASE */}
          {latestIssue && latestIssue.publicationDate ? (
            <div className="published">
              <span>✓</span>
              <div>
                <b>{t.published}</b>
                <small>{new Date(latestIssue.publicationDate).toLocaleDateString()}</small>
              </div>
            </div>
          ) : (
            <div className="published" style={{ background: "rgba(255,255,255,0.9)" }}>
              <span style={{ background: "#94a3b8" }}>ℹ</span>
              <div>
                <b>{t.noIssuesWait}</b>
                <small>{t.noIssuesDesc}</small>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* CURRENT ISSUE SECTION */}
      <section className="section issue-section" id="issue">
        <div className="section-heading">
          <div>
            <p className="eyebrow">{t.currentIssueEyebrow}</p>
            <h2>{t.journal}</h2>
          </div>
          <a className="text-link" href="/archive">{t.allIssuesLink} <Arrow /></a>
        </div>

        {latestIssue ? (
          <div className="issue-card">
            {latestIssue.coverUrl ? (
              <img src={latestIssue.coverUrl} alt="Cover" style={{ width: "140px", height: "190px", objectFit: "cover", borderRadius: "8px", border: "1px solid #cbd5e1" }} />
            ) : (
              <div className="mini-cover">
                <b>EXPERT</b>
                <div className="mini-city" />
                <em>№ {latestIssue.number}<br />{latestIssue.year}</em>
              </div>
            )}
            <div className="issue-detail">
              <p className="issue-number">Expert № {latestIssue.number} <span>· {latestIssue.year}</span></p>
              <h3>{latestIssue.description || "Expert Scientific Journal"}</h3>
              <p>International Journal of Multidisciplinary Research</p>
              <div className="meta">
                {latestIssue.publicationDate && (
                  <span>◷ {new Date(latestIssue.publicationDate).toLocaleDateString()}</span>
                )}
                {latestIssue.doi && <span>⌁ {latestIssue.doi}</span>}
              </div>
              <div>
                <a className="btn primary" href={`/journal?issueId=${latestIssue.id}`}>{t.viewIssue}</a>
              </div>
            </div>
            <aside className="issue-aside">
              <div><strong>{latestArticles.length}</strong><span>{t.articlesCountInIssue}</span></div>
              <div><strong>100%</strong><span>Peer Review</span></div>
              <p>PostgreSQL / Prisma Database</p>
            </aside>
          </div>
        ) : (
          <div style={{ background: "#ffffff", padding: "40px", borderRadius: "12px", textAlign: "center", color: "#64748b", border: "1px solid #e2e8f0" }}>
            <h3 style={{ fontSize: "16px", color: "#0f172a", marginBottom: "6px" }}>{t.noIssuesTitle}</h3>
            <p style={{ fontSize: "13px" }}>{t.noIssuesDesc}</p>
          </div>
        )}
      </section>

      {/* LATEST ARTICLES SECTION */}
      <section className="section articles-section" id="articles">
        <div className="section-heading">
          <div>
            <p className="eyebrow">{t.recentArticlesEyebrow}</p>
            <h2>{t.recentArticlesHeading}</h2>
          </div>
        </div>

        {latestArticles.length === 0 ? (
          <div style={{ background: "#ffffff", padding: "40px", borderRadius: "12px", textAlign: "center", color: "#64748b", border: "1px solid #e2e8f0" }}>
            <p style={{ fontSize: "14px", margin: 0 }}>{t.noArticlesDesc}</p>
          </div>
        ) : (
          <div className="article-grid">
            {latestArticles.map((a) => (
              <article className="article-card" key={a.id}>
                <div className="article-top">
                  <span className="tag">{a.scientificField || "Research"}</span>
                  <span>{new Date(a.submissionDate).toLocaleDateString()}</span>
                </div>
                <h3>{a.title}</h3>
                <p className="authors">👤 {a.authorName}</p>
                <div className="article-foot">
                  <span>PDF</span>
                  <a href={`/article/${a.slug || a.id}`}>{t.readMore} <Arrow /></a>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {/* ABOUT SECTION */}
      <section className="section about" id="about">
        <div className="about-copy">
          <p className="eyebrow">{t.aboutEyebrow}</p>
          <h2>{t.aboutTitle1}<br />{t.aboutTitle2}</h2>
          <p>{t.aboutDesc}</p>
          <a href="/about" className="text-link">{t.aboutPolicyLink} <Arrow /></a>
        </div>
        <div className="stats">
          <div><strong>{latestArticles.length}</strong><span>{t.publishedArticlesStat}</span></div>
          <div><strong>{publishedIssues.length}</strong><span>{t.journalIssuesStat}</span></div>
          <div><strong>100%</strong><span>Crossref<br />DOI</span></div>
          <div><strong>Open</strong><span>Access<br />Journal</span></div>
        </div>
      </section>

      {/* INDEXING SECTION */}
      <section className="section indexing">
        <p className="eyebrow centered">{t.partnersEyebrow}</p>
        <h2>{t.partnersHeading}</h2>
        <div className="logos">
          <span>Crossref</span>
          <span>Google<br /><b>Scholar</b></span>
          <span>OpenAlex</span>
          <span>ROAD</span>
          <span>DOAJ</span>
          <span>WorldCat</span>
        </div>
      </section>

      {/* FAQ SECTION */}
      <section className="section faq">
        <div>
          <p className="eyebrow">{t.supportEyebrow}</p>
          <h2>{t.supportHeading}</h2>
          <p>{t.supportDesc}</p>
          <a className="btn outline" href="/about">{t.contactUsBtn}</a>
        </div>
        <div className="accordion">
          {faqs.map((f, i) => (
            <button className={faq === i ? "faq-open" : ""} onClick={() => setFaq(faq === i ? null : i)} key={f[0]}>
              <span><b>{f[0]}</b>{faq === i && <em>{f[1]}</em>}</span>
              <i>{faq === i ? "−" : "+"}</i>
            </button>
          ))}
        </div>
      </section>

      {/* FOOTER */}
      <footer>
        <div className="footer-brand">
          <a href="/home"><span>e</span><b>Expert</b></a>
          <p>{t.heroEyebrow}</p>
        </div>
        <div>
          <b>{t.footerJournalGroup}</b>
          <a href="/journal">{t.journal}</a>
          <a href="/archive">{t.archive}</a>
          <a href="/about">{t.about}</a>
        </div>
        <div>
          <b>{t.footerAuthorsGroup}</b>
          <a href="/author">{t.submitArticle}</a>
          <a href="/register">{t.register}</a>
          <a href="/about">{t.submissionGuidelines}</a>
        </div>
        <div>
          <b>{t.footerServicesGroup}</b>
          <a href="/journal">{t.journal}</a>
          <a href="/about">{t.indexingAndAbstracting}</a>
          <a href="/about">{t.needHelp}</a>
        </div>
        <div className="footer-bottom">
          <small>© 2026 Expert Scientific Journal</small>
          <span>{t.allRightsReserved}</span>
          <div className="footer-links">
            <a href="/about">{t.privacyPolicy}</a>
            <a href="/about">{t.termsOfUse}</a>
          </div>
        </div>
      </footer>
    </main>
  );
}