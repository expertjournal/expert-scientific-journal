"use client";

import React, { useState } from "react";
import { CitationService } from "@/lib/services/CitationService";
import { ArticleMetadataInput } from "@/lib/services/MetadataService";

interface CitationExporterProps {
  article: ArticleMetadataInput;
  isOpen: boolean;
  onClose: () => void;
}

export default function CitationExporter({ article, isOpen, onClose }: CitationExporterProps) {
  const [activeFormat, setActiveFormat] = useState<"BibTeX" | "RIS" | "APA" | "MLA" | "Chicago" | "Harvard" | "IEEE">("APA");
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const getCitationText = () => {
    switch (activeFormat) {
      case "BibTeX":
        return CitationService.exportBibTeX(article);
      case "RIS":
        return CitationService.exportRIS(article);
      case "APA":
        return CitationService.formatAPA(article);
      case "MLA":
        return CitationService.formatMLA(article);
      case "Chicago":
        return CitationService.formatChicago(article);
      case "Harvard":
        return CitationService.formatHarvard(article);
      case "IEEE":
        return CitationService.formatIEEE(article);
      default:
        return CitationService.formatAPA(article);
    }
  };

  const citationText = getCitationText();

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(citationText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      console.error("Failed to copy citation:", e);
    }
  };

  const handleDownload = () => {
    const ext = activeFormat === "BibTeX" ? "bib" : activeFormat === "RIS" ? "ris" : "txt";
    const filename = `citation-${article.slug || article.id}.${ext}`;
    const blob = new Blob([citationText], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: "rgba(15, 23, 42, 0.65)",
        backdropFilter: "blur(4px)",
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px",
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: "#ffffff",
          borderRadius: "16px",
          width: "100%",
          maxWidth: "650px",
          padding: "28px",
          boxShadow: "0 20px 40px rgba(0,0,0,0.2)",
          border: "1px solid #e2e8f0",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
          <div>
            <h3 style={{ margin: 0, fontSize: "20px", fontWeight: "800", color: "#0f172a" }}>
              🎓 Экспорт цитирования (Export Citation)
            </h3>
            <p style={{ margin: "4px 0 0", fontSize: "13px", color: "#64748b" }}>
              Выберите стандарт академического цитирования для использования в публикациях
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "#f1f5f9",
              border: "none",
              borderRadius: "50%",
              width: "32px",
              height: "32px",
              fontSize: "16px",
              fontWeight: "bold",
              color: "#64748b",
              cursor: "pointer",
            }}
          >
            ✕
          </button>
        </div>

        {/* FORMAT SELECTOR TABS */}
        <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginBottom: "16px" }}>
          {(["APA", "MLA", "Chicago", "Harvard", "IEEE", "BibTeX", "RIS"] as const).map((fmt) => (
            <button
              key={fmt}
              onClick={() => setActiveFormat(fmt)}
              style={{
                padding: "8px 14px",
                borderRadius: "8px",
                fontSize: "12px",
                fontWeight: "700",
                cursor: "pointer",
                border: "1px solid",
                borderColor: activeFormat === fmt ? "#2563eb" : "#cbd5e1",
                background: activeFormat === fmt ? "#2563eb" : "#ffffff",
                color: activeFormat === fmt ? "#ffffff" : "#475569",
                transition: "all 0.15s ease",
              }}
            >
              {fmt}
            </button>
          ))}
        </div>

        {/* CITATION PREVIEW TEXTAREA */}
        <div style={{ position: "relative", marginBottom: "20px" }}>
          <textarea
            readOnly
            value={citationText}
            rows={activeFormat === "BibTeX" || activeFormat === "RIS" ? 8 : 4}
            style={{
              width: "100%",
              background: "#f8fafc",
              border: "1px solid #cbd5e1",
              borderRadius: "10px",
              padding: "14px",
              fontSize: "13px",
              fontFamily: activeFormat === "BibTeX" || activeFormat === "RIS" ? "monospace" : "inherit",
              color: "#1e293b",
              lineHeight: 1.5,
              resize: "none",
            }}
          />
        </div>

        {/* BUTTON ACTIONS */}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
          <button
            onClick={handleDownload}
            style={{
              padding: "10px 18px",
              borderRadius: "8px",
              background: "#ffffff",
              border: "1px solid #cbd5e1",
              color: "#334155",
              fontSize: "13px",
              fontWeight: "700",
              cursor: "pointer",
            }}
          >
            📥 Скачать .{activeFormat === "BibTeX" ? "bib" : activeFormat === "RIS" ? "ris" : "txt"}
          </button>
          <button
            onClick={handleCopy}
            style={{
              padding: "10px 20px",
              borderRadius: "8px",
              background: copied ? "#16a34a" : "#2563eb",
              border: "none",
              color: "#ffffff",
              fontSize: "13px",
              fontWeight: "700",
              cursor: "pointer",
              transition: "background 0.2s ease",
            }}
          >
            {copied ? "✓ Скопировано!" : "📋 Скопировать текст"}
          </button>
        </div>
      </div>
    </div>
  );
}
