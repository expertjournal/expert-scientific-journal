"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import Header from "@/components/Header";
import { submitReviewerReportInStore } from "@/lib/articles-store";

interface ReviewDetailPageProps {
  params: Promise<{ id: string }>;
}

export default function ReviewerDetailPage({ params }: ReviewDetailPageProps) {
  const { id } = use(params);
  const router = useRouter();

  const [assignment, setAssignment] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const [recommendation, setRecommendation] = useState("ACCEPT");
  const [commentsToAuthor, setCommentsToAuthor] = useState("");
  const [commentsToEditor, setCommentsToEditor] = useState("");
  const [qualityScore, setQualityScore] = useState(5);
  const [noveltyScore, setNoveltyScore] = useState(5);

  useEffect(() => {
    async function fetchDetails() {
      try {
        const res = await fetch(`/api/backend/reviews/${id}`);
        if (!res.ok) {
          throw new Error("Не удалось загрузить данные рецензирования");
        }
        const data = await res.json();
        setAssignment(data.data || data);

        if (data.reports && data.reports.length > 0) {
          const rep = data.reports[0];
          setCommentsToAuthor(rep.commentsToAuthor || "");
          setCommentsToEditor(rep.commentsToEditor || "");
          setQualityScore(rep.qualityScore || 5);
          setNoveltyScore(rep.noveltyScore || 5);
        }
      } catch (err: any) {
        setErrorMsg(err.message || "Ошибка загрузки");
      } finally {
        setLoading(false);
      }
    }
    fetchDetails();
  }, [id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentsToAuthor.trim()) {
      setErrorMsg("Комментарии для автора обязательны для заполнения");
      return;
    }

    setSubmitting(true);
    setErrorMsg("");
    setSuccessMsg("");

    try {
      submitReviewerReportInStore(
        id,
        assignment?.round?.article?.id || id,
        recommendation as any,
        commentsToAuthor,
        commentsToEditor,
        Number(qualityScore),
        Number(noveltyScore)
      );

      fetch(`/api/backend/reviews/${id}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assignmentId: id,
          recommendation,
          commentsToAuthor,
          commentsToEditor,
          qualityScore: Number(qualityScore),
          noveltyScore: Number(noveltyScore),
        }),
      }).catch(() => null);

      setSuccessMsg("Рецензия успешно отправлена редактору!");
      setTimeout(() => {
        router.push("/reviewer/dashboard");
      }, 1500);
    } catch (err: any) {
      setErrorMsg(err.message || "Ошибка при отправке");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div style={{ padding: "60px", textAlign: "center", color: "#64748b" }}>Загрузка рукописи...</div>;
  }

  const article = assignment?.round?.article;

  return (
    <div style={{ minHeight: "100vh", background: "#f8fafc" }}>
      <Header activePage="/reviewer/dashboard" />

      <main style={{ maxWidth: "900px", margin: "32px auto", padding: "0 20px" }}>
        <button
          onClick={() => router.back()}
          style={{ background: "#ffffff", border: "1px solid #cbd5e1", padding: "6px 14px", borderRadius: "6px", fontSize: "12px", fontWeight: "700", cursor: "pointer", marginBottom: "20px" }}
        >
          ← Назад в кабинет
        </button>

        {article && (
          <div style={{ background: "#ffffff", padding: "24px", borderRadius: "12px", border: "1px solid #e2e8f0", marginBottom: "24px" }}>
            <span style={{ fontSize: "11px", fontWeight: "700", background: "#e0f2fe", color: "#0369a1", padding: "4px 8px", borderRadius: "4px" }}>
              Рукопись № {article.id.slice(-6)}
            </span>
            <h1 style={{ fontSize: "20px", fontWeight: "800", color: "#0f172a", marginTop: "8px", marginBottom: "12px" }}>
              {article.title}
            </h1>
            <p style={{ fontSize: "13px", color: "#475569", lineHeight: 1.6, marginBottom: "16px" }}>
              <b>Аннотация:</b> {article.abstract}
            </p>

            <div style={{ display: "flex", gap: "12px" }}>
              <button
                onClick={() => alert("Скачивание PDF рукописи...")}
                style={{ background: "#0f172a", color: "#ffffff", border: "none", padding: "8px 16px", borderRadius: "6px", fontSize: "12px", fontWeight: "700", cursor: "pointer" }}
              >
                📕 Скачать рукопись PDF
              </button>
            </div>
          </div>
        )}

        {/* REVIEW FORM */}
        <div style={{ background: "#ffffff", padding: "28px", borderRadius: "12px", border: "1px solid #e2e8f0" }}>
          <h2 style={{ fontSize: "18px", fontWeight: "800", color: "#0f172a", marginBottom: "20px" }}>
            Форма экспертного рецензирования
          </h2>

          {successMsg && (
            <div style={{ background: "#f0fdf4", color: "#166534", padding: "14px", borderRadius: "8px", fontSize: "14px", marginBottom: "20px", fontWeight: "600" }}>
              {successMsg}
            </div>
          )}

          {errorMsg && (
            <div style={{ background: "#fef2f2", color: "#991b1b", padding: "14px", borderRadius: "8px", fontSize: "14px", marginBottom: "20px", fontWeight: "600" }}>
              {errorMsg}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            <div>
              <label style={{ display: "block", fontSize: "13px", fontWeight: "700", color: "#0f172a", marginBottom: "6px" }}>
                Решение рецензента (Recommendation)
              </label>
              <select
                value={recommendation}
                onChange={(e) => setRecommendation(e.target.value)}
                style={{ width: "100%", padding: "10px 12px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "13px" }}
              >
                <option value="ACCEPT">Принять статью (Accept)</option>
                <option value="MINOR_REVISION">Мелкая доработка (Minor Revision)</option>
                <option value="MAJOR_REVISION">Крупная доработка (Major Revision)</option>
                <option value="REJECT">Отклонить статью (Reject)</option>
              </select>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
              <div>
                <label style={{ display: "block", fontSize: "13px", fontWeight: "700", color: "#0f172a", marginBottom: "6px" }}>
                  Оценка качества (1-5)
                </label>
                <input
                  type="number"
                  min="1"
                  max="5"
                  value={qualityScore}
                  onChange={(e) => setQualityScore(Number(e.target.value))}
                  style={{ width: "100%", padding: "10px 12px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "13px" }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "13px", fontWeight: "700", color: "#0f172a", marginBottom: "6px" }}>
                  Оценка научной новизны (1-5)
                </label>
                <input
                  type="number"
                  min="1"
                  max="5"
                  value={noveltyScore}
                  onChange={(e) => setNoveltyScore(Number(e.target.value))}
                  style={{ width: "100%", padding: "10px 12px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "13px" }}
                />
              </div>
            </div>

            <div>
              <label style={{ display: "block", fontSize: "13px", fontWeight: "700", color: "#0f172a", marginBottom: "6px" }}>
                Замечания и комментарии для Автора (Comments to Author) *
              </label>
              <textarea
                rows={6}
                value={commentsToAuthor}
                onChange={(e) => setCommentsToAuthor(e.target.value)}
                placeholder="Подробно опишите преимущества, недостатки и замечания к тексту..."
                style={{ width: "100%", padding: "12px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "13px", fontFamily: "inherit" }}
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: "13px", fontWeight: "700", color: "#0f172a", marginBottom: "6px" }}>
                Конфиденциальные комментарии для Редактора (Comments to Editor)
              </label>
              <textarea
                rows={4}
                value={commentsToEditor}
                onChange={(e) => setCommentsToEditor(e.target.value)}
                placeholder="Информация, видна только главному редактору..."
                style={{ width: "100%", padding: "12px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "13px", fontFamily: "inherit" }}
              />
            </div>

            <button
              type="submit"
              disabled={submitting || assignment?.status === "COMPLETED"}
              style={{
                background: assignment?.status === "COMPLETED" ? "#94a3b8" : "#16a34a",
                color: "#ffffff",
                border: "none",
                padding: "12px 24px",
                borderRadius: "8px",
                fontSize: "14px",
                fontWeight: "700",
                cursor: "pointer",
                marginTop: "8px",
              }}
            >
              {submitting ? "Отправка..." : assignment?.status === "COMPLETED" ? "Рецензия отправлена" : "Отправить рецензию редактору"}
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
