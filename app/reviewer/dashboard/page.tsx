"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Header from "@/components/Header";

interface ReviewAssignmentItem {
  id: string;
  status: string;
  dueDate: string;
  remainingDays: number;
  isOverdue: boolean;
  invitedAt: string;
  assignedAt: string;
  round: {
    roundNumber: number;
    article: {
      id: string;
      title: string;
      abstract: string;
      scientificField?: string;
    };
  };
  reports: any[];
}

interface ReviewerStats {
  pendingReviewsCount: number;
  completedReviewsCount: number;
  activeReviewsCount: number;
  averageReviewTimeDays: number;
}

export default function ReviewerDashboardPage() {
  const router = useRouter();
  const [assignments, setAssignments] = useState<ReviewAssignmentItem[]>([]);
  const [stats, setStats] = useState<ReviewerStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchData() {
      try {
        const [resReviews, resStats] = await Promise.all([
          fetch("/api/backend/reviews/my"),
          fetch("/api/backend/reviews/stats"),
        ]);

        if (!resReviews.ok) {
          throw new Error("Не удалось загрузить назначенные рецензии");
        }
        const dataReviews = await resReviews.json();
        setAssignments(dataReviews.data || dataReviews || []);

        if (resStats.ok) {
          const dataStats = await resStats.json();
          setStats(dataStats.data || dataStats);
        }
      } catch (err: any) {
        setError(err.message || "Ошибка сервера");
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  return (
    <div style={{ minHeight: "100vh", background: "#f8fafc" }}>
      <Header activePage="/reviewer/dashboard" />

      <main style={{ maxWidth: "1140px", margin: "32px auto", padding: "0 20px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
          <div>
            <h1 style={{ fontSize: "24px", fontWeight: "800", color: "#0f172a" }}>Кабинет рецензента</h1>
            <p style={{ fontSize: "14px", color: "#64748b" }}>Управление назначенными научными рукописями и отслеживание дедлайнов</p>
          </div>
        </div>

        {/* REVIEWER STATISTICS WIDGETS */}
        {stats && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "16px", marginBottom: "28px" }}>
            <div style={{ background: "#ffffff", padding: "18px 20px", borderRadius: "10px", border: "1px solid #e2e8f0" }}>
              <div style={{ fontSize: "12px", color: "#64748b", fontWeight: "600" }}>Активные рецензии</div>
              <div style={{ fontSize: "24px", fontWeight: "800", color: "#0f172a", marginTop: "4px" }}>{stats.activeReviewsCount}</div>
            </div>
            <div style={{ background: "#ffffff", padding: "18px 20px", borderRadius: "10px", border: "1px solid #e2e8f0" }}>
              <div style={{ fontSize: "12px", color: "#64748b", fontWeight: "600" }}>Завершенные рецензии</div>
              <div style={{ fontSize: "24px", fontWeight: "800", color: "#166534", marginTop: "4px" }}>{stats.completedReviewsCount}</div>
            </div>
            <div style={{ background: "#ffffff", padding: "18px 20px", borderRadius: "10px", border: "1px solid #e2e8f0" }}>
              <div style={{ fontSize: "12px", color: "#64748b", fontWeight: "600" }}>Ожидают решения</div>
              <div style={{ fontSize: "24px", fontWeight: "800", color: "#854d0e", marginTop: "4px" }}>{stats.pendingReviewsCount}</div>
            </div>
            <div style={{ background: "#ffffff", padding: "18px 20px", borderRadius: "10px", border: "1px solid #e2e8f0" }}>
              <div style={{ fontSize: "12px", color: "#64748b", fontWeight: "600" }}>Средний срок (дней)</div>
              <div style={{ fontSize: "24px", fontWeight: "800", color: "#2563eb", marginTop: "4px" }}>{stats.averageReviewTimeDays} дн.</div>
            </div>
          </div>
        )}

        {loading ? (
          <div style={{ padding: "40px", textAlign: "center", color: "#64748b" }}>Загрузка списков рецензирования...</div>
        ) : error ? (
          <div style={{ background: "#fef2f2", color: "#991b1b", padding: "16px", borderRadius: "8px" }}>{error}</div>
        ) : assignments.length === 0 ? (
          <div style={{ background: "#ffffff", padding: "40px", borderRadius: "12px", textAlign: "center", boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}>
            <h3 style={{ fontSize: "16px", fontWeight: "700", color: "#0f172a" }}>Назначенных рецензий пока нет</h3>
            <p style={{ fontSize: "13px", color: "#64748b", marginTop: "4px" }}>При поступлении новых приглашений статьи появятся в данном разделе.</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            {assignments.map((item) => (
              <div key={item.id} style={{ background: "#ffffff", padding: "20px 24px", borderRadius: "12px", border: "1px solid #e2e8f0", boxShadow: "0 2px 6px rgba(0,0,0,0.03)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "12px" }}>
                  <div>
                    <span style={{ fontSize: "11px", fontWeight: "700", background: "#e0f2fe", color: "#0369a1", padding: "4px 8px", borderRadius: "4px" }}>
                      Раунд {item.round.roundNumber}
                    </span>
                    <h2 style={{ fontSize: "17px", fontWeight: "700", color: "#0f172a", marginTop: "8px", marginBottom: "4px" }}>
                      {item.round.article.title}
                    </h2>
                    <span style={{ fontSize: "12px", color: "#64748b" }}>
                      Направление: {item.round.article.scientificField || "Мультидисциплинарные науки"}
                    </span>
                  </div>

                  <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                    {item.isOverdue && item.status !== "COMPLETED" && (
                      <span style={{ fontSize: "11px", fontWeight: "800", background: "#fef2f2", color: "#dc2626", border: "1px solid #fecaca", padding: "4px 8px", borderRadius: "6px" }}>
                        OVERDUE (ПРОСРОЧЕНО)
                      </span>
                    )}
                    <span style={{
                      fontSize: "12px",
                      fontWeight: "700",
                      padding: "4px 10px",
                      borderRadius: "6px",
                      background: item.status === "COMPLETED" ? "#f0fdf4" : item.status === "ACCEPTED" ? "#fefce8" : "#f1f5f9",
                      color: item.status === "COMPLETED" ? "#166534" : item.status === "ACCEPTED" ? "#854d0e" : "#475569"
                    }}>
                      {item.status === "COMPLETED" ? "Завершено" : item.status === "ACCEPTED" ? "В процессе" : item.status}
                    </span>
                  </div>
                </div>

                <p style={{ fontSize: "13px", color: "#475569", lineHeight: 1.5, marginBottom: "16px" }}>
                  {item.round.article.abstract}
                </p>

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid #f1f5f9", paddingTop: "12px" }}>
                  <div style={{ display: "flex", gap: "16px", fontSize: "12px", color: "#64748b" }}>
                    <span><b>Срок сдачи (Due Date):</b> {item.dueDate ? new Date(item.dueDate).toLocaleDateString() : "14 дней"}</span>
                    <span><b>Осталось дней:</b> <b style={{ color: item.remainingDays < 3 ? "#dc2626" : "#0f172a" }}>{item.remainingDays} дн.</b></span>
                  </div>

                  <button
                    onClick={() => router.push(`/reviewer/review/${item.id}`)}
                    style={{
                      background: "#2563eb",
                      color: "#ffffff",
                      border: "none",
                      padding: "8px 18px",
                      borderRadius: "6px",
                      fontSize: "13px",
                      fontWeight: "700",
                      cursor: "pointer",
                    }}
                  >
                    {item.status === "COMPLETED" ? "Просмотреть рецензию" : "Заполнить рецензию"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
