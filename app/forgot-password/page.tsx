"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setError("Пожалуйста, введите ваш email.");
      return;
    }

    setIsLoading(true);
    setError("");
    setMessage("");

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Ошибка отправки запроса.");
      }

      setMessage(data.message || "Инструкции по сбросу пароля отправлены на ваш email.");
    } catch (err: any) {
      setError(err.message || "Не удалось отправить запрос.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: "#f8fafc", padding: "20px" }}>
      <div style={{ background: "#ffffff", padding: "32px", borderRadius: "12px", border: "1px solid #e2e8f0", width: "100%", maxWidth: "420px", boxShadow: "0 10px 25px rgba(0,0,0,0.05)" }}>
        <h2 style={{ margin: "0 0 8px", fontSize: "20px", fontWeight: "800", color: "#0f172a" }}>Восстановление пароля</h2>
        <p style={{ fontSize: "13px", color: "#64748b", marginBottom: "20px" }}>
          Введите ваш email для получения ссылки на сброс пароля.
        </p>

        {error && <div style={{ background: "#fef2f2", border: "1px solid #fecaca", color: "#991b1b", padding: "10px 14px", borderRadius: "6px", fontSize: "12px", marginBottom: "16px" }}>{error}</div>}
        {message && <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", color: "#166534", padding: "10px 14px", borderRadius: "6px", fontSize: "12px", marginBottom: "16px" }}>{message}</div>}

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div>
            <label style={{ fontSize: "12px", fontWeight: "700", color: "#334155", display: "block", marginBottom: "4px" }}>Email адрес</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="author@journal-expert.ru"
              style={{ width: "100%", padding: "10px 14px", border: "1px solid #cbd5e1", borderRadius: "6px", fontSize: "13px" }}
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            style={{ background: "#2563eb", color: "#ffffff", border: "none", padding: "12px", borderRadius: "6px", fontWeight: "800", fontSize: "13px", cursor: "pointer", opacity: isLoading ? 0.7 : 1 }}
          >
            {isLoading ? "Отправка..." : "Отправить ссылку"}
          </button>
        </form>

        <div style={{ marginTop: "20px", textAlign: "center", fontSize: "12px" }}>
          <a href="/login" style={{ color: "#2563eb", textDecoration: "none", fontWeight: "700" }}>← Вернуться к входу</a>
        </div>
      </div>
    </div>
  );
}
