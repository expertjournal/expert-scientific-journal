"use client";

import { useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token") || "";

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password || password.length < 6) {
      setError("Пароль должен содержать не менее 6 символов.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Пароли не совпадают.");
      return;
    }

    setIsLoading(true);
    setError("");
    setMessage("");

    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Ошибка при обновлении пароля.");
      }

      setMessage("Пароль успешно изменен! Перенаправление на страницу входа...");
      setTimeout(() => router.push("/login"), 2500);
    } catch (err: any) {
      setError(err.message || "Не удалось сбросить пароль.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: "#f8fafc", padding: "20px" }}>
      <div style={{ background: "#ffffff", padding: "32px", borderRadius: "12px", border: "1px solid #e2e8f0", width: "100%", maxWidth: "420px", boxShadow: "0 10px 25px rgba(0,0,0,0.05)" }}>
        <h2 style={{ margin: "0 0 8px", fontSize: "20px", fontWeight: "800", color: "#0f172a" }}>Установка нового пароля</h2>
        <p style={{ fontSize: "13px", color: "#64748b", marginBottom: "20px" }}>
          Введите новый пароль для вашего аккаунта.
        </p>

        {error && <div style={{ background: "#fef2f2", border: "1px solid #fecaca", color: "#991b1b", padding: "10px 14px", borderRadius: "6px", fontSize: "12px", marginBottom: "16px" }}>{error}</div>}
        {message && <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", color: "#166534", padding: "10px 14px", borderRadius: "6px", fontSize: "12px", marginBottom: "16px" }}>{message}</div>}

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div>
            <label style={{ fontSize: "12px", fontWeight: "700", color: "#334155", display: "block", marginBottom: "4px" }}>Новый пароль</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              style={{ width: "100%", padding: "10px 14px", border: "1px solid #cbd5e1", borderRadius: "6px", fontSize: "13px" }}
            />
          </div>

          <div>
            <label style={{ fontSize: "12px", fontWeight: "700", color: "#334155", display: "block", marginBottom: "4px" }}>Подтвердите новый пароль</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              style={{ width: "100%", padding: "10px 14px", border: "1px solid #cbd5e1", borderRadius: "6px", fontSize: "13px" }}
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            style={{ background: "#16a34a", color: "#ffffff", border: "none", padding: "12px", borderRadius: "6px", fontWeight: "800", fontSize: "13px", cursor: "pointer", opacity: isLoading ? 0.7 : 1 }}
          >
            {isLoading ? "Сохранение..." : "Сохранить новый пароль"}
          </button>
        </form>

        <div style={{ marginTop: "20px", textAlign: "center", fontSize: "12px" }}>
          <a href="/login" style={{ color: "#2563eb", textDecoration: "none", fontWeight: "700" }}>← Вернуться к входу</a>
        </div>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div style={{ padding: "40px", textAlign: "center" }}>Загрузка...</div>}>
      <ResetPasswordForm />
    </Suspense>
  );
}
