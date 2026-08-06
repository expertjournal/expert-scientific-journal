"use client";

import React, { useState } from "react";
import CitationExporter from "@/components/CitationExporter";
import { ArticleMetadataInput } from "@/lib/services/MetadataService";
import { StoredArticle } from "@/lib/articles-store";

interface ArticleDetailClientProps {
  article: StoredArticle;
  issue: any;
  articleMetadata: ArticleMetadataInput;
}

export default function ArticleDetailClient({ article, issue, articleMetadata }: ArticleDetailClientProps) {
  const [isCitationOpen, setIsCitationOpen] = useState(false);
  const [views, setViews] = useState(article.views || 1);
  const [downloads, setDownloads] = useState(article.downloads || 0);

  const handleDownloadPdf = () => {
    setDownloads((prev) => prev + 1);
    if (article.fileUrl) {
      window.open(article.fileUrl, "_blank");
    } else {
      alert("PDF файл временно недоступен для скачивания.");
    }
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: article.title,
        text: article.abstract,
        url: window.location.href,
      }).catch(() => null);
    } else {
      navigator.clipboard.writeText(window.location.href);
      alert("Ссылка на статью скопирована в буфер обмена!");
    }
  };

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: "32px" }}>
      {/* LEFT COLUMN: MAIN ARTICLE CONTENT */}
      <div>
        {/* CATEGORY & DOI HEADER */}
        <div style={{ display: "flex", gap: "10px", alignItems: "center", marginBottom: "16px", flexWrap: "wrap" }}>
          <span
            style={{
              background: "#eff6ff",
              border: "1px solid #bfdbfe",
              color: "#1d4ed8",
              padding: "4px 12px",
              borderRadius: "20px",
              fontSize: "12px",
              fontWeight: "700",
            }}
          >
            ⚖️ {article.scientificField || "Правовые исследования"}
          </span>
          {articleMetadata.doi && (
            <a
              href={`https://doi.org/${articleMetadata.doi}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                background: "#f0fdf4",
                border: "1px solid #bbf7d0",
                color: "#166534",
                padding: "4px 12px",
                borderRadius: "20px",
                fontSize: "12px",
                fontWeight: "700",
                textDecoration: "none",
              }}
            >
              DOI: {articleMetadata.doi} ↗
            </a>
          )}
        </div>

        {/* TITLE */}
        <h1
          style={{
            fontSize: "28px",
            fontWeight: "800",
            color: "#0f172a",
            lineHeight: 1.3,
            marginBottom: "20px",
          }}
        >
          {article.title}
        </h1>

        {/* AUTHORS LIST */}
        <div style={{ background: "#ffffff", padding: "20px", borderRadius: "12px", border: "1px solid #e2e8f0", marginBottom: "24px" }}>
          <div style={{ fontSize: "12px", fontWeight: "800", color: "#64748b", textTransform: "uppercase", marginBottom: "10px" }}>
            👤 Авторы публикации
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <span style={{ fontSize: "16px", fontWeight: "700", color: "#0f172a" }}>
                  {article.authorName || "Автор статьи"}
                </span>
                <span style={{ fontSize: "12px", color: "#64748b", marginLeft: "10px" }}>
                  (Expert Scientific Journal)
                </span>
              </div>
              <span style={{ fontSize: "12px", color: "#2563eb" }}>✉️ {article.authorEmail}</span>
            </div>
          </div>
        </div>

        {/* METRICS & DOWNLOAD ACTIONS BAR */}
        <div
          style={{
            background: "#ffffff",
            padding: "16px 20px",
            borderRadius: "12px",
            border: "1px solid #e2e8f0",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "12px",
            marginBottom: "24px",
          }}
        >
          <div style={{ display: "flex", gap: "16px", fontSize: "13px", color: "#475569", fontWeight: "600" }}>
            <span>👁️ {views} просмотров</span>
            <span>📥 {downloads} скачиваний</span>
            <span>💬 0 цитирований</span>
          </div>

          <div style={{ display: "flex", gap: "10px" }}>
            <button
              onClick={() => setIsCitationOpen(true)}
              style={{
                padding: "8px 16px",
                borderRadius: "8px",
                background: "#f1f5f9",
                border: "1px solid #cbd5e1",
                color: "#1e293b",
                fontSize: "13px",
                fontWeight: "700",
                cursor: "pointer",
              }}
            >
              🎓 Цитировать
            </button>
            <button
              onClick={handleShare}
              style={{
                padding: "8px 14px",
                borderRadius: "8px",
                background: "#ffffff",
                border: "1px solid #cbd5e1",
                color: "#334155",
                fontSize: "13px",
                fontWeight: "700",
                cursor: "pointer",
              }}
            >
              🔗 Поделиться
            </button>
            <button
              onClick={handleDownloadPdf}
              style={{
                padding: "8px 18px",
                borderRadius: "8px",
                background: "#2563eb",
                border: "none",
                color: "#ffffff",
                fontSize: "13px",
                fontWeight: "700",
                cursor: "pointer",
              }}
            >
              📥 Скачать PDF
            </button>
          </div>
        </div>

        {/* ABSTRACT */}
        <div style={{ background: "#ffffff", padding: "28px", borderRadius: "12px", border: "1px solid #e2e8f0", marginBottom: "24px" }}>
          <h3 style={{ fontSize: "18px", fontWeight: "800", color: "#0f172a", margin: "0 0 12px 0" }}>
            📝 Аннотация (Abstract)
          </h3>
          <p style={{ fontSize: "15px", color: "#334155", lineHeight: 1.7, margin: 0 }}>
            {article.abstract}
          </p>
        </div>

        {/* KEYWORDS */}
        <div style={{ background: "#ffffff", padding: "24px", borderRadius: "12px", border: "1px solid #e2e8f0", marginBottom: "24px" }}>
          <h4 style={{ fontSize: "14px", fontWeight: "800", color: "#0f172a", margin: "0 0 12px 0" }}>
            🔑 Ключевые слова (Keywords)
          </h4>
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            {(article.keywords || ["право", "юридические науки"]).map((kw, i) => (
              <span
                key={i}
                style={{
                  background: "#f1f5f9",
                  color: "#475569",
                  padding: "5px 12px",
                  borderRadius: "6px",
                  fontSize: "12px",
                  fontWeight: "600",
                }}
              >
                #{kw}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* RIGHT COLUMN: JOURNAL METADATA SIDEBAR */}
      <div>
        <div style={{ background: "#ffffff", padding: "24px", borderRadius: "12px", border: "1px solid #e2e8f0", position: "sticky", top: "20px" }}>
          <h3 style={{ fontSize: "16px", fontWeight: "800", color: "#0f172a", margin: "0 0 16px 0", borderBottom: "1px solid #f1f5f9", paddingBottom: "10px" }}>
            📖 Информация об издании
          </h3>

          <div style={{ display: "flex", flexDirection: "column", gap: "12px", fontSize: "13px", color: "#334155" }}>
            <div>
              <span style={{ color: "#64748b", display: "block", fontSize: "11px", textTransform: "uppercase" }}>Издание:</span>
              <strong style={{ color: "#0f172a" }}>{issue?.journalTitle || "Expert Scientific Journal"}</strong>
            </div>

            <div>
              <span style={{ color: "#64748b", display: "block", fontSize: "11px", textTransform: "uppercase" }}>Выпуск:</span>
              <strong>Выпуск № {issue?.number || 10} ({issue?.year || 2026})</strong>
            </div>

            <div>
              <span style={{ color: "#64748b", display: "block", fontSize: "11px", textTransform: "uppercase" }}>ISSN Online:</span>
              <span>3093-1242</span>
            </div>

            <div>
              <span style={{ color: "#64748b", display: "block", fontSize: "11px", textTransform: "uppercase" }}>Страницы:</span>
              <span>{articleMetadata.pages || "1-12"}</span>
            </div>

            <div>
              <span style={{ color: "#64748b", display: "block", fontSize: "11px", textTransform: "uppercase" }}>Дата публикации:</span>
              <span>{new Date(article.submissionDate || article.lastUpdated).toLocaleDateString("ru-RU")}</span>
            </div>

            <div>
              <span style={{ color: "#64748b", display: "block", fontSize: "11px", textTransform: "uppercase" }}>Рецензирование:</span>
              <span style={{ color: "#166534", fontWeight: "700" }}>✓ Double-Blind Peer Reviewed</span>
            </div>

            <div style={{ marginTop: "12px", paddingTop: "12px", borderTop: "1px solid #f1f5f9" }}>
              <span style={{ color: "#64748b", display: "block", fontSize: "11px", textTransform: "uppercase" }}>Лицензия:</span>
              <a
                href="https://creativecommons.org/licenses/by/4.0/"
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: "#2563eb", textDecoration: "none", fontSize: "12px", fontWeight: "700" }}
              >
                Creative Commons CC BY 4.0 ↗
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* CITATION MODAL */}
      <CitationExporter article={articleMetadata} isOpen={isCitationOpen} onClose={() => setIsCitationOpen(false)} />
    </div>
  );
}
