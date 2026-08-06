"use client";

import Link from "next/link";
import { useAuth } from "@/lib/auth-context";

export default function UnauthorizedPage() {
  const { user, logout } = useAuth();

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#0f172a", color: "#ffffff", padding: "1.5rem", fontFamily: "sans-serif" }}>
      <div style={{ background: "#1e293b", padding: "2.5rem", borderRadius: "16px", maxWidth: "480px", width: "100%", textAlign: "center", boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.3)" }}>
        <div style={{ width: "64px", height: "64px", borderRadius: "50%", background: "#451a03", border: "1px solid #78350f", color: "#f97316", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 1.5rem", fontSize: "1.8rem" }}>
          🛡️
        </div>

        <h1 style={{ fontSize: "1.6rem", fontWeight: 700, marginBottom: "0.75rem", color: "#f8fafc" }}>
          Доступ ограничен (403)
        </h1>

        <p style={{ fontSize: "0.95rem", color: "#94a3b8", lineHeight: 1.6, marginBottom: "1.5rem" }}>
          У вас недостаточно прав для просмотра этой страницы. Раздел предназначен только для авторизованных пользователей с соответствующей ролью.
        </p>

        {user && (
          <div style={{ background: "#0f172a", padding: "0.75rem", borderRadius: "8px", fontSize: "0.85rem", color: "#cbd5e1", marginBottom: "1.5rem" }}>
            Вы вошли как: <strong>{user.email}</strong> (роль: <code>{user.role}</code>)
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          <Link
            href="/home"
            style={{ display: "block", padding: "0.75rem", borderRadius: "8px", background: "#c82a38", color: "#ffffff", fontWeight: 600, textDecoration: "none" }}
          >
            ← Вернуться на главную
          </Link>

          {user ? (
            <button
              onClick={() => {
                logout();
                window.location.href = "/login";
              }}
              style={{ padding: "0.75rem", borderRadius: "8px", background: "none", border: "1px solid #475569", color: "#94a3b8", fontWeight: 600, cursor: "pointer" }}
            >
              Войти под другим аккаунтом
            </button>
          ) : (
            <Link
              href="/login"
              style={{ display: "block", padding: "0.75rem", borderRadius: "8px", background: "none", border: "1px solid #475569", color: "#94a3b8", fontWeight: 600, textDecoration: "none" }}
            >
              Войти в систему
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
