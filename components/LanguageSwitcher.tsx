"use client";

import React, { useState, useRef, useEffect } from "react";
import { useLanguage, Language } from "@/lib/i18n-context";

const langFlags: Record<Language, { flag: string; label: string }> = {
  RU: { flag: "🇷🇺", label: "Русский" },
  UZ: { flag: "🇺🇿", label: "Oʻzbekcha" },
  EN: { flag: "🇬🇧", label: "English" },
};

export default function LanguageSwitcher() {
  const { language, setLanguage } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={dropdownRef} style={{ position: "relative", display: "inline-block" }}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "6px",
          background: "#ffffff",
          border: "1px solid #cbd5e1",
          borderRadius: "6px",
          padding: "6px 12px",
          fontSize: "12px",
          fontWeight: "700",
          color: "#1e293b",
          cursor: "pointer",
          boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
          transition: "all 0.15s ease",
        }}
      >
        <span>{langFlags[language].flag}</span>
        <span>{language}</span>
        <span style={{ fontSize: "9px", color: "#64748b" }}>▼</span>
      </button>

      {isOpen && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 4px)",
            right: 0,
            background: "#ffffff",
            border: "1px solid #e2e8f0",
            borderRadius: "8px",
            boxShadow: "0 10px 25px rgba(0,0,0,0.1)",
            padding: "4px",
            zIndex: 1000,
            minWidth: "130px",
          }}
        >
          {(Object.keys(langFlags) as Language[]).map((lang) => {
            const isSelected = language === lang;
            return (
              <button
                key={lang}
                type="button"
                onClick={() => {
                  setLanguage(lang);
                  setIsOpen(false);
                }}
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  padding: "8px 10px",
                  border: "none",
                  background: isSelected ? "#f1f5f9" : "transparent",
                  color: isSelected ? "#2563eb" : "#334155",
                  fontWeight: isSelected ? "800" : "600",
                  fontSize: "12px",
                  borderRadius: "5px",
                  cursor: "pointer",
                  textAlign: "left",
                }}
              >
                <span>{langFlags[lang].flag}</span>
                <span>{langFlags[lang].label}</span>
                {isSelected && <span style={{ marginLeft: "auto", color: "#2563eb" }}>✓</span>}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
