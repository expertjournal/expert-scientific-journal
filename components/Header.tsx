"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { useLanguage } from "@/lib/i18n-context";
import LanguageSwitcher from "./LanguageSwitcher";
import { getStoredArticles } from "@/lib/articles-store";

export function Mark() {
  return <span className="mark">E</span>;
}

interface HeaderProps {
  activePage?: string;
}

export default function Header({ activePage }: HeaderProps) {
  const pathname = usePathname();
  const currentPath = activePage || pathname || "/home";
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const { user, isAuthenticated, logout, hasRole } = useAuth();
  const router = useRouter();

  const handleAuthAction = () => {
    if (isAuthenticated) {
      if (hasRole(["author"])) {
        router.push("/author");
      } else if (hasRole(["editor"])) {
        router.push("/editor");
      } else if (hasRole(["reviewer"])) {
        router.push("/reviewer/dashboard");
      } else {
        router.push("/home");
      }
    } else {
      router.push("/login");
    }
  };

  const getUserInitials = () => {
    if (user) {
      const f = user.firstName ? user.firstName.charAt(0) : (user.email ? user.email.charAt(0) : "U");
      const l = user.lastName ? user.lastName.charAt(0) : "";
      return `${f}${l}`.toUpperCase();
    }
    return "";
  };

  const { t } = useLanguage();

  const navItems = [
    { label: t.home, href: "/home" },
    { label: t.journal, href: "/journal" },
    { label: t.archive, href: "/archive" },
    { label: t.about, href: "/about" },
  ];

  const searchResults = searchQuery.trim()
    ? getStoredArticles().filter((a) => {
        const q = searchQuery.toLowerCase();
        return (
          a.title?.toLowerCase().includes(q) ||
          a.abstract?.toLowerCase().includes(q) ||
          a.authorName?.toLowerCase().includes(q) ||
          a.scientificField?.toLowerCase().includes(q) ||
          a.doi?.toLowerCase().includes(q) ||
          (a.keywords || []).some((k) => k.toLowerCase().includes(q))
        );
      })
    : [];

  return (
    <header className="nav">
      <a className="brand" href="/home">
        <Mark />
        <span>
          <b>Expert</b>
          <small>SCIENTIFIC JOURNAL</small>
        </span>
      </a>

      <nav>
        {navItems.map((item) => {
          const isActive =
            currentPath === item.href ||
            (item.href === "/home" && (currentPath === "/" || currentPath === "/home"));
          return (
            <a
              key={item.href}
              href={item.href}
              className={isActive ? "active" : ""}
            >
              {item.label}
            </a>
          );
        })}
      </nav>

      <div className="nav-right">
        <button
          className="search"
          onClick={() => setSearchOpen(!searchOpen)}
          aria-label="Поиск"
        >
          ⌕
        </button>
        <LanguageSwitcher />
        {isAuthenticated ? (
          <div className="user-menu">
            <button className="user-avatar" onClick={handleAuthAction}>
              <span>{getUserInitials()}</span>
            </button>
            <div className="user-dropdown">
              <div className="user-info">
                <b>
                  {user?.firstName ? `${user.firstName} ${user.lastName || ""}` : (user?.email || "Пользователь")}
                </b>
                <small>{user?.email}</small>
              </div>
              <div className="user-role-badge">
                {user?.role === "author" && (t.authorRole || "Автор")}
                {user?.role === "editor" && (t.editorCabinet || "Редактор")}
                {user?.role === "reviewer" && (t.reviewerCabinet || "Рецензент")}
                {user?.role === "reader" && (t.profileSettings || "Читатель")}
              </div>
              <button className="user-action" onClick={handleAuthAction}>
                {hasRole(["author"]) && t.authorCabinet}
                {hasRole(["editor"]) && t.editorCabinet}
                {hasRole(["reviewer"]) && t.reviewerCabinet}
                {hasRole(["reader"]) && t.profileSettings}
              </button>
              <button className="user-action logout" onClick={logout}>
                {t.logout}
              </button>
            </div>
          </div>
        ) : (
          <a className="login" href="/login">
            {t.login}
          </a>
        )}
      </div>

      {searchOpen && (
        <div className="search-pop" style={{ width: "360px", padding: "16px" }}>
          <input
            autoFocus
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Поиск по названию, авторам, DOI, ключевым словам..."
            onKeyDown={(e) => {
              if (e.key === "Enter" && searchQuery.trim()) {
                const query = searchQuery.trim();
                if (query.includes("10.47689") || query.toLowerCase().includes("doi.org")) {
                  const cleanDoi = query.replace(/^https?:\/\/(dx\.)?doi\.org\//i, "");
                  router.push(`/doi/${cleanDoi}`);
                } else {
                  router.push(`/journal?q=${encodeURIComponent(query)}`);
                }
                setSearchOpen(false);
              }
            }}
            style={{ width: "100%", padding: "10px 12px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "12px", outline: "none" }}
          />

          {searchQuery.trim() ? (
            <div style={{ marginTop: "12px", maxHeight: "240px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "8px" }}>
              {searchResults.length === 0 ? (
                <div style={{ fontSize: "11px", color: "#94a3b8", textAlign: "center", padding: "10px" }}>По запросу ничего не найдено. Нажмите Enter для полного поиска.</div>
              ) : (
                searchResults.slice(0, 4).map((art) => (
                  <div
                    key={art.id}
                    onClick={() => {
                      router.push(`/article?id=${art.id}`);
                      setSearchOpen(false);
                    }}
                    style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "6px", padding: "8px 10px", cursor: "pointer" }}
                  >
                    <div style={{ fontSize: "11px", fontWeight: "bold", color: "#0f172a", lineHeight: 1.3, marginBottom: "2px" }}>{art.title}</div>
                    <div style={{ fontSize: "10px", color: "#64748b" }}>👤 {art.authorName} · {art.scientificField || "Наука"}</div>
                  </div>
                ))
              )}
            </div>
          ) : (
            <span style={{ fontSize: "10px", color: "#94a3b8", display: "block", marginTop: "8px" }}>Введите текст и нажмите Enter для поиска по всему журналу</span>
          )}
        </div>
      )}
    </header>
  );
}
