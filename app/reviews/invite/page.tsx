"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Header from "@/components/Header";

function ReviewInviteContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";
  const actionParam = searchParams.get("action") || "";
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [coiAccepted, setCoiAccepted] = useState(false);
  const [statusMsg, setStatusMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const handleAction = async (action: "accept" | "decline") => {
    if (!token) {
      setErrorMsg("Токен приглашения отсутствует");
      return;
    }

    if (action === "accept" && !coiAccepted) {
      setErrorMsg("Для принятия приглашения необходимо подтвердить отсутствие конфликта интересов (COI)");
      return;
    }

    setLoading(true);
    setErrorMsg("");
    setStatusMsg("");

    try {
      const res = await fetch(`/api/backend/reviews/${action}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, coiAccepted }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || data.error?.message || "Ошибка обработки приглашения");
      }

      if (action === "accept") {
        setStatusMsg("Приглашение и декларация COI успешно приняты! Переход в кабинет...");
        setTimeout(() => {
          router.push("/reviewer/dashboard");
        }, 1500);
      } else {
        setStatusMsg("Вы отклонили приглашение на рецензирование.");
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Произошла ошибка");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token && actionParam === "decline") {
      handleAction("decline");
    }
  }, [token, actionParam]);

  return (
    <div style={{ minHeight: "100vh", background: "#f8fafc" }}>
      <Header activePage="/journal" />

      <main style={{ maxWidth: "640px", margin: "60px auto", padding: "32px", background: "#ffffff", borderRadius: "12px", boxShadow: "0 4px 16px rgba(0,0,0,0.06)", textAlign: "center" }}>
        <h1 style={{ fontSize: "22px", fontWeight: "800", color: "#0f172a", marginBottom: "16px" }}>
          Приглашение на рецензирование рукописи
        </h1>

        <p style={{ fontSize: "14px", color: "#64748b", lineHeight: 1.6, marginBottom: "24px" }}>
          Вам отправлено официальное приглашение от редакции <b>Expert Scientific Journal</b> выступить экспертным рецензентом научной статьи.
        </p>

        {statusMsg && (
          <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", color: "#166534", padding: "14px", borderRadius: "8px", fontSize: "14px", marginBottom: "20px", fontWeight: "600" }}>
            {statusMsg}
          </div>
        )}

        {errorMsg && (
          <div style={{ background: "#fef2f2", border: "1px solid #fecaca", color: "#991b1b", padding: "14px", borderRadius: "8px", fontSize: "14px", marginBottom: "20px", fontWeight: "600" }}>
            {errorMsg}
          </div>
        )}

        {/* CONFLICT OF INTEREST DECLARATION BOX */}
        <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", padding: "18px", borderRadius: "8px", textAlign: "left", marginBottom: "24px" }}>
          <h4 style={{ fontSize: "13px", fontWeight: "700", color: "#0f172a", marginBottom: "8px" }}>
            Декларация об отсутствии конфликта интересов (Conflict of Interest)
          </h4>
          <label style={{ display: "flex", alignItems: "flex-start", gap: "10px", cursor: "pointer", fontSize: "13px", color: "#334155", lineHeight: 1.5 }}>
            <input
              type="checkbox"
              checked={coiAccepted}
              onChange={(e) => setCoiAccepted(e.target.checked)}
              style={{ marginTop: "3px", width: "16px", height: "16px" }}
            />
            <span>
              Я подтверждаю, что у меня отсутствует личный, финансовый или профессиональный конфликт интересов с авторами, учреждением или объектом исследования данной научной статьи.
            </span>
          </label>
        </div>

        <div style={{ display: "flex", gap: "16px", justifyContent: "center" }}>
          <button
            onClick={() => handleAction("accept")}
            disabled={loading || !coiAccepted}
            style={{
              background: coiAccepted ? "#16a34a" : "#cbd5e1",
              color: "#ffffff",
              border: "none",
              padding: "12px 24px",
              borderRadius: "8px",
              fontSize: "14px",
              fontWeight: "700",
              cursor: coiAccepted ? "pointer" : "not-allowed",
            }}
          >
            {loading ? "Обработка..." : "Принять приглашение и COI"}
          </button>

          <button
            onClick={() => handleAction("decline")}
            disabled={loading}
            style={{
              background: "#dc2626",
              color: "#ffffff",
              border: "none",
              padding: "12px 24px",
              borderRadius: "8px",
              fontSize: "14px",
              fontWeight: "700",
              cursor: "pointer",
            }}
          >
            Отклонить
          </button>
        </div>
      </main>
    </div>
  );
}

export default function ReviewInvitePage() {
  return (
    <Suspense fallback={<div style={{ padding: "60px", textAlign: "center" }}>Загрузка приглашения...</div>}>
      <ReviewInviteContent />
    </Suspense>
  );
}
