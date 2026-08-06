"use client";

export const dynamic = "force-dynamic";

import { useMemo, useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import {
  getStoredArticles,
  updateArticleStatusInStore,
  getStoredIssues,
  addIssueToStore,
  updateIssueInStore,
  publishIssueInStore,
  getStoredMessages,
  addMessageToStore,
  syncStoreWithServer,
  StoredArticle,
  StoredMessage,
  downloadManuscriptFile,
  updateArticleIssueInStore,
  searchArticlesInStore,
  assignReviewerToArticle,
  addNotificationToStore,
  getStoredReviewerApplications,
  updateReviewerApplicationStatus,
  StoredReviewerApplication,
} from "@/lib/articles-store";
import { useSupabaseRealtime } from "@/lib/supabase-realtime";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import NotificationCenter from "@/components/NotificationCenter";
import { useLanguage } from "@/lib/i18n-context";
import { sendEmail } from "@/lib/email-service";
import "./editor.css";

interface ApiArticle {
  id: string;
  title: string;
  abstract: string;
  status:
    | "DRAFT"
    | "SUBMITTED"
    | "UNDER_REVIEW"
    | "REVISION_REQUIRED"
    | "ACCEPTED"
    | "REJECTED"
    | "PUBLISHED"
    | "WITHDRAWN";
  submissionDate?: string;
  lastUpdated: string;
  doi?: string;
  scientificField?: string;
  reviewNote?: string;
  fileName?: string;
  fileUrl?: string;
  issueId?: string;
  views?: number;
  downloads?: number;
  citations?: number;
  pages?: string;
  keywords?: { keyword: { name: string } }[];
  authors?: { author: { id: string; fullName: string; institution?: string; email?: string } }[];
}

interface ApiIssue {
  id: string;
  number: number;
  year: number;
  status: "DRAFT" | "SCHEDULED" | "PUBLISHED" | "ARCHIVED";
  description: string;
  coverUrl?: string;
  doi?: string;
  scheduledPublishDate?: string;
  journalTitle?: string;
  articles?: ApiArticle[];
}

const statusMap: Record<string, string> = {
  DRAFT: "Черновик",
  SUBMITTED: "Submitted",
  UNDER_REVIEW: "Under Review",
  REVISION_REQUIRED: "Revision Required",
  ACCEPTED: "Accepted",
  REJECTED: "Rejected",
  PUBLISHED: "Published",
  WITHDRAWN: "Withdrawn",
};

const nav = [
  ["⌂", "Дашборд"],
  ["📥", "Новые статьи"],
  ["📚", "Выпуски журнала"],
  ["👤", "Авторы"],
  ["👥", "Пользователи"],
  ["📊", "Статистика"],
  ["✉", "Сообщения"],
  ["⚙", "Настройки"],
];

export default function EditorDashboard() {
  const { user, isAuthenticated, isLoading, logout } = useAuth();
  const { t } = useLanguage();
  const router = useRouter();

  const nav = [
    { icon: "⌂", label: t.editorDashboard || "Дашборд", id: "Дашборд" },
    { icon: "📥", label: t.editorNewArticles || "Новые статьи", id: "Новые статьи" },
    { icon: "📚", label: t.editorJournalIssues || "Выпуски журнала", id: "Выпуски журнала" },
    { icon: "👤", label: t.editorAuthors || "Авторы", id: "Авторы" },
    { icon: "👥", label: t.editorUsers || "Пользователи", id: "Пользователи" },
    { icon: "📊", label: t.editorStatistics || "Статистика", id: "Статистика" },
    { icon: "✉", label: t.editorMessages || "Сообщения", id: "Сообщения" },
    { icon: "⚙", label: t.editorSettings || "Настройки", id: "Настройки" },
  ];

  const [activeTab, setActiveTab] = useState("Дашборд");
  const [filterStatus, setFilterStatus] = useState("Все статусы");
  const [term, setTerm] = useState("");
  const [authorSort, setAuthorSort] = useState<"count" | "name">("count");
  const [fetching, setFetching] = useState(true);

  // Data State
  const [submittedArticles, setSubmittedArticles] = useState<ApiArticle[]>([]);
  const [issues, setIssues] = useState<ApiIssue[]>([]);
  const [systemUsers, setSystemUsers] = useState<any[]>([]);

  // Issue modal & Cover photo state
  const [showIssueModal, setShowIssueModal] = useState(false);
  const [editingIssueId, setEditingIssueId] = useState<string | null>(null);
  const [issueNumber, setIssueNumber] = useState("8");
  const [issueJournalTitle, setIssueJournalTitle] = useState("");
  const [issueYear, setIssueYear] = useState("2026");
  const [issueDesc, setIssueDesc] = useState("Осенний выпуск 2026");
  const [issueCoverUrl, setIssueCoverUrl] = useState("");
  const [scheduledPublishDate, setScheduledPublishDate] = useState("");

  // Pre-publication Preview Modal State
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [previewIssue, setPreviewIssue] = useState<ApiIssue | null>(null);

  // Celebration Modal State
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [publishedIssueDetails, setPublishedIssueDetails] = useState<{ number: number; year: number } | null>(null);

  // Review Feedback Modal State
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [targetArticleForReview, setTargetArticleForReview] = useState<ApiArticle | null>(null);
  const [reviewNoteText, setReviewNoteText] = useState("");

  // Assign Reviewer Modal State
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [targetArticleForAssign, setTargetArticleForAssign] = useState<ApiArticle | null>(null);
  const [reviewerEmailInput, setReviewerEmailInput] = useState("reviewer@expert.uz");
  const [reviewerNoteInput, setReviewerNoteInput] = useState("");

  const openAssignReviewerModal = (article: ApiArticle) => {
    setTargetArticleForAssign(article);
    setReviewerEmailInput(article.authors?.[0]?.author?.email || "reviewer@expert.uz");
    setReviewerNoteInput("Просим провести независимое экспертное рецензирование статьи на предмет научной новизны и соответствия стандарту.");
    setShowAssignModal(true);
  };

  const handleConfirmAssignReviewer = async () => {
    if (!targetArticleForAssign || !reviewerEmailInput.trim()) {
      alert("Пожалуйста, введите email рецензента!");
      return;
    }
    const emailTo = reviewerEmailInput.trim();
    assignReviewerToArticle(targetArticleForAssign.id, emailTo, reviewerNoteInput.trim());

    addNotificationToStore({
      id: "n-" + Date.now(),
      userRole: "reviewer",
      title: "📑 Вам назначена новая статья на рецензирование",
      message: `Вам назначена статья "${targetArticleForAssign.title}" на тему ${targetArticleForAssign.scientificField || "Правовые исследования"}.`,
      isRead: false,
      type: "submission",
      createdAt: new Date().toISOString(),
    });

    try {
      await sendEmail({
        to: emailTo,
        subject: `Expert Journal — Назначение на рецензирование: "${targetArticleForAssign.title}"`,
        html: `
          <div style="font-family: Arial, sans-serif; padding: 24px; background: #f8fafc; color: #1e293b; max-width: 600px; margin: 0 auto; border-radius: 12px; border: 1px solid #e2e8f0;">
            <h2 style="color: #0f2744; margin-top: 0;">Expert Scientific Journal — Приглашение к рецензированию</h2>
            <p>Уважаемый рецензент!</p>
            <p>Редакция журнала <b>Expert Scientific Journal</b> назначила вам для независимой научной экспертизы рукопись:</p>
            <blockquote style="background: #eff6ff; border-left: 4px solid #2563eb; margin: 16px 0; padding: 12px; font-style: italic; border-radius: 4px;">
              "${targetArticleForAssign.title}"
            </blockquote>
            <p><b>Примечание редактора:</b> ${reviewerNoteInput || "Просим провести независимое рецензирование."}</p>
            <p>Для ознакомления со статьей и заполнения формы рецензирования перейдите в личный кабинет:</p>
            <div style="text-align: center; margin: 24px 0;">
              <a href="https://expert-journal.up.railway.app/reviewer/dashboard" style="background: #2563eb; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Перейти в Кабинет Рецензента</a>
            </div>
            <p style="font-size: 11px; color: #94a3b8; text-align: center;">© 2026 Expert Scientific Journal</p>
          </div>
        `,
      });
    } catch (e) {
      console.error("Failed to send email to reviewer:", e);
    }

    setShowAssignModal(false);
    setTargetArticleForAssign(null);
    loadEditorData();
  };

  // Reviewer Applications & Messages State
  const [reviewerApps, setReviewerApps] = useState<StoredReviewerApplication[]>([]);
  const [messagesList, setMessagesList] = useState<StoredMessage[]>([]);
  const [chatMessage, setChatMessage] = useState("");
  const [selectedAuthorEmail, setSelectedAuthorEmail] = useState<string>("all");
  const [selectedIssuesMap, setSelectedIssuesMap] = useState<Record<string, string>>({});
  const [reviewerSearchQuery, setReviewerSearchQuery] = useState("");

  const handleApproveReviewerApp = (appId: string) => {
    setReviewerApps((prev) => prev.map((a) => (a.id === appId ? { ...a, status: "APPROVED" as const } : a)));
    updateReviewerApplicationStatus(appId, "APPROVED");
  };

  const handleRejectReviewerApp = (appId: string) => {
    setReviewerApps((prev) => prev.map((a) => (a.id === appId ? { ...a, status: "REJECTED" as const } : a)));
    updateReviewerApplicationStatus(appId, "REJECTED");
  };

  const loadEditorData = useCallback(async () => {
    try {
      setFetching(true);
      await syncStoreWithServer();
      setReviewerApps(getStoredReviewerApplications());
      const storedArticles = getStoredArticles();
      const loadedSubmitted: ApiArticle[] = storedArticles.map((a) => ({
        id: a.id,
        title: a.title,
        abstract: a.abstract,
        status: a.status as any,
        submissionDate: a.submissionDate,
        lastUpdated: a.lastUpdated,
        doi: a.doi,
        scientificField: a.scientificField,
        reviewNote: a.reviewNote,
        fileName: a.fileName,
        fileUrl: a.fileUrl,
        issueId: a.issueId,
        views: a.views || 0,
        downloads: a.downloads || 0,
        citations: a.citations || 0,
        keywords: (a.keywords || []).map((k) => ({ keyword: { name: k } })),
        authors: [{ author: { id: "au-1", fullName: a.authorName || "Автор", institution: "Expert Journal", email: a.authorEmail } }],
      }));

      setSubmittedArticles(loadedSubmitted);

      const storedIssues = getStoredIssues();
      const mappedIssues: ApiIssue[] = storedIssues.map((i) => ({
        id: i.id,
        number: i.number,
        year: i.year,
        status: i.status as any,
        description: i.description,
        coverUrl: i.coverUrl,
        articles: [],
      }));

      setIssues(mappedIssues);
      setMessagesList(getStoredMessages());

      try {
        const resU = await fetch("/api/backend/users");
        if (resU.ok) {
          const dataU = await resU.json();
          setSystemUsers(dataU.data || dataU || []);
        }
      } catch (e) {}
    } catch (err) {
      console.error("Editor dashboard error:", err);
    } finally {
      setFetching(false);
    }
  }, []);

  useEffect(() => {
    loadEditorData();
    const handleStorage = () => loadEditorData();
    window.addEventListener("storage", handleStorage);
    const timer = setInterval(async () => {
      await syncStoreWithServer();
      setMessagesList(getStoredMessages());
    }, 10000);
    return () => {
      window.removeEventListener("storage", handleStorage);
      clearInterval(timer);
    };
  }, [loadEditorData]);

  useSupabaseRealtime("articles", loadEditorData);
  useSupabaseRealtime("issues", loadEditorData);
  useSupabaseRealtime("messages", loadEditorData);

  const openReviewNoteModal = (article: ApiArticle) => {
    setTargetArticleForReview(article);
    setReviewNoteText("Необходимо скорректировать аннотацию, оформить ссылки на источники по ГОСТу и добавить 2 новые работы за 2025-2026 гг.");
    setShowReviewModal(true);
  };

  const handleSaveReviewNote = async () => {
    if (!targetArticleForReview) return;
    try {
      updateArticleStatusInStore(targetArticleForReview.id, "REVISION_REQUIRED", reviewNoteText);
      setShowReviewModal(false);
      setTargetArticleForReview(null);
      loadEditorData();
    } catch (e) {
      console.error(e);
    }
  };

  const handleAcceptArticleWithIssue = (articleId: string) => {
    const chosenIssueId = selectedIssuesMap[articleId] || (issues.find((i) => i.status !== "PUBLISHED")?.id || "");
    if (!chosenIssueId) {
      alert("⚠️ Ошибка: Нет открытых выпусков журнала (Черновик)! Создайте новый выпуск журнала, чтобы прикрепить статью.");
      setShowIssueModal(true);
      return;
    }

    const targetIssue = issues.find((i) => i.id === chosenIssueId);
    if (targetIssue && targetIssue.status === "PUBLISHED") {
      alert(`⚠️ Ошибка: Выпуск № ${targetIssue.number} (${targetIssue.year}) уже ОПУБЛИКОВАН и закрыт для добавления новых статей! Пожалуйста, выберите открытый выпуск или создайте новый.`);
      return;
    }

    updateArticleIssueInStore(articleId, chosenIssueId);
    updateArticleStatusInStore(articleId, "ACCEPTED");
    loadEditorData();
  };

  const handleCoverFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setIssueCoverUrl(event.target.result as string);
      }
    };
    reader.readAsDataURL(file);
  };

  const openCreateIssueModal = () => {
    setEditingIssueId(null);
    setIssueNumber((issues.length + 1).toString());
    setIssueJournalTitle("");
    setIssueYear("2026");
    setIssueDesc(`Выпуск №${issues.length + 1} (2026)`);
    setIssueCoverUrl("");
    setScheduledPublishDate("");
    setShowIssueModal(true);
  };

  const openEditIssueModal = (iss: ApiIssue) => {
    setEditingIssueId(iss.id);
    setIssueNumber(iss.number.toString());
    setIssueJournalTitle(iss.journalTitle || "");
    setIssueYear(iss.year.toString());
    setIssueDesc(iss.description || "");
    setIssueCoverUrl(iss.coverUrl || "");
    setScheduledPublishDate((iss as any).scheduledPublishDate || "");
    setShowIssueModal(true);
  };

  const openPreviewModal = (iss: ApiIssue) => {
    setPreviewIssue(iss);
    setShowPreviewModal(true);
  };

  const handleSaveIssue = async () => {
    try {
      const num = parseInt(issueNumber, 10);
      const yr = parseInt(issueYear, 10);
      if (isNaN(num) || isNaN(yr)) return;

      const issueStatus = scheduledPublishDate ? ("SCHEDULED" as const) : ("DRAFT" as const);
      const savedTitle = issueJournalTitle.trim();

      if (editingIssueId) {
        updateIssueInStore(editingIssueId, {
          number: num,
          year: yr,
          status: issueStatus,
          journalTitle: savedTitle,
          description: issueDesc || `Выпуск №${num} (${yr})`,
          coverUrl: issueCoverUrl || undefined,
          scheduledPublishDate: scheduledPublishDate || undefined,
        });
      } else {
        const newIssueObj = {
          id: "iss-" + Date.now(),
          number: num,
          year: yr,
          status: issueStatus,
          journalTitle: savedTitle,
          description: issueDesc || `Выпуск №${num} (${yr})`,
          coverUrl: issueCoverUrl || undefined,
          scheduledPublishDate: scheduledPublishDate || undefined,
        };
        addIssueToStore(newIssueObj);
      }

      await loadEditorData();
      setShowIssueModal(false);
      setEditingIssueId(null);
      setIssueNumber("");
      setIssueJournalTitle("");
      setIssueDesc("");
      setIssueCoverUrl("");
      setScheduledPublishDate("");
    } catch (e) {
      console.error(e);
    }
  };

  const handlePublishIssueForId = async (targetIssueId?: string) => {
    const targetIssue = targetIssueId
      ? issues.find((i) => i.id === targetIssueId)
      : issues.find((i) => i.status === "DRAFT" || i.status === "SCHEDULED") || issues[0];

    if (!targetIssue) return;

    try {
      publishIssueInStore(targetIssue.id, targetIssue.coverUrl);
      await loadEditorData();
      setPublishedIssueDetails({ number: targetIssue.number, year: targetIssue.year });
      setShowSuccessModal(true);
    } catch (e) {
      console.error(e);
    }
  };

  const getUserInitials = () => {
    if (user && user.firstName && user.firstName !== "Алексей") {
      const f = user.firstName.charAt(0);
      const l = user.lastName ? user.lastName.charAt(0) : "";
      return `${f}${l}`.toUpperCase();
    }
    return "ED";
  };

  const totalCount = submittedArticles.length;
  const underReviewCount = submittedArticles.filter((a) => a.status === "UNDER_REVIEW" || a.status === "REVISION_REQUIRED").length;
  const acceptedCount = submittedArticles.filter((a) => a.status === "ACCEPTED").length;
  const publishedCount = submittedArticles.filter((a) => a.status === "PUBLISHED").length;
  const rejectedCount = submittedArticles.filter((a) => a.status === "REJECTED").length;

  const authorsList = useMemo(() => {
    const map = new Map<string, { name: string; email: string; institution: string; total: number; published: number }>();
    submittedArticles.forEach((art) => {
      const author = art.authors?.[0]?.author;
      const name = author?.fullName || "Автор";
      const email = author?.email || "author@journal.ru";
      const inst = author?.institution || "Expert Journal";

      if (!map.has(name)) {
        map.set(name, { name, email, institution: inst, total: 0, published: 0 });
      }
      const item = map.get(name)!;
      item.total += 1;
      if (art.status === "PUBLISHED") item.published += 1;
    });

    const list = Array.from(map.values());
    if (authorSort === "count") {
      list.sort((a, b) => b.total - a.total);
    } else {
      list.sort((a, b) => a.name.localeCompare(b.name));
    }
    return list;
  }, [submittedArticles, authorSort]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatMessage.trim()) return;

    const newMsg: StoredMessage = {
      id: "c-" + Date.now(),
      sender: "Главный Редактор",
      role: "editor",
      text: chatMessage,
      time: new Date().toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" }),
    };

    const updated = addMessageToStore(newMsg);
    setMessagesList(updated);
    setChatMessage("");
  };

  const [editorSearchResults, setEditorSearchResults] = useState<ApiArticle[]>([]);

  useEffect(() => {
    async function executeEditorSearch() {
      let mappedStatus = "";
      if (filterStatus === "Поступившие (Новые)") mappedStatus = "SUBMITTED";
      if (filterStatus === "На рецензировании") mappedStatus = "UNDER_REVIEW";
      if (filterStatus === "Опубликованные") mappedStatus = "PUBLISHED";

      const res = await searchArticlesInStore({
        q: term,
        status: mappedStatus,
        limit: 20,
      });

      if (res && Array.isArray(res.data)) {
        const mapped: ApiArticle[] = res.data.map((a: any) => ({
          id: a.id,
          title: a.title,
          abstract: a.abstract,
          status: a.status,
          submissionDate: a.submissionDate,
          lastUpdated: a.lastUpdated,
          reviewNote: a.reviewNote,
          issueId: a.issueId,
          fileUrl: a.fileUrl,
          keywords: (a.keywords || []).map((k: string) => ({ keyword: { name: k } })),
          authors: [{ author: { id: "au-1", fullName: a.authorName, institution: "Expert Journal" } }],
        }));
        setEditorSearchResults(mapped);
      }
    }
    executeEditorSearch();
  }, [term, filterStatus, submittedArticles]);

  const filteredArticles = editorSearchResults;

  return (
    <div className="editor-app">
      {/* CELEBRATION SUCCESS MODAL ON PUBLISH */}
      {showSuccessModal && (
        <div className="modal-overlay" style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.65)", zIndex: 1200, display: "grid", placeItems: "center" }}>
          <div style={{ background: "#ffffff", padding: "36px", borderRadius: "16px", textAlign: "center", maxWidth: "440px", boxShadow: "0 20px 50px rgba(0,0,0,0.3)" }}>
            <div style={{ fontSize: "56px", marginBottom: "12px" }}>🎉</div>
            <h2 style={{ fontSize: "22px", fontWeight: "800", color: "#0f172a", margin: "0 0 8px" }}>Tabriklaymiz! / Поздравляем!</h2>
            <p style={{ fontSize: "14px", color: "#475569", lineHeight: 1.5, marginBottom: "24px" }}>
              Журнал <b>Expert Scientific Journal № {publishedIssueDetails?.number} ({publishedIssueDetails?.year})</b> muvaffaqiyatli nashr etildi va saytga joylashtirildi!
            </p>
            <button
              onClick={() => {
                setShowSuccessModal(false);
                router.push("/journal");
              }}
              style={{ background: "#2563eb", color: "#ffffff", border: "none", padding: "12px 28px", borderRadius: "8px", fontWeight: "800", fontSize: "13px", cursor: "pointer", boxShadow: "0 4px 14px rgba(37,99,235,0.4)" }}
            >
              ↗ Open Published Journal
            </button>
          </div>
        </div>
      )}

      {/* REVIEW NOTE MODAL */}
      {showReviewModal && (
        <div className="modal-overlay" style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 1000, display: "grid", placeItems: "center" }}>
          <div style={{ background: "#fff", padding: "24px", borderRadius: "12px", width: "460px", boxShadow: "0 12px 36px rgba(0,0,0,0.25)" }}>
            <h3 style={{ margin: "0 0 8px", fontSize: "16px" }}>Замечания Рецензента / Редакции</h3>
            <p style={{ fontSize: "12px", color: "#666", marginBottom: "16px" }}>
              Укажите комментарии для автора статьи <b>«{targetArticleForReview?.title}»</b>:
            </p>
            <textarea
              value={reviewNoteText}
              onChange={(e) => setReviewNoteText(e.target.value)}
              rows={5}
              style={{ width: "100%", padding: "10px", borderRadius: "6px", border: "1px solid #ccc", fontSize: "12px" }}
            />
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px", marginTop: "16px" }}>
              <button onClick={() => setShowReviewModal(false)} style={{ padding: "8px 16px", background: "#eee", border: "none", borderRadius: "6px", cursor: "pointer" }}>Отмена</button>
              <button onClick={handleSaveReviewNote} style={{ padding: "8px 16px", background: "#c82a38", color: "#fff", border: "none", borderRadius: "6px", cursor: "pointer", fontWeight: "bold" }}>Отправить автору</button>
            </div>
          </div>
        </div>
      )}

      {/* CREATE & EDIT ISSUE MODAL WITH COVER UPLOAD & SCHEDULED PUBLISH DATE */}
      {showIssueModal && (
        <div className="modal-overlay" style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 1000, display: "grid", placeItems: "center" }}>
          <div className="modal-card" style={{ background: "#fff", padding: "24px", borderRadius: "12px", width: "460px", boxShadow: "0 10px 30px rgba(0,0,0,0.2)" }}>
            <h3>{editingIssueId ? "✏️ Редактирование выпуска журнала" : "Создание нового выпуска журнала"}</h3>
            <div style={{ marginTop: "16px", display: "flex", flexDirection: "column", gap: "14px" }}>
              <div>
                <label style={{ fontSize: "11px", fontWeight: "bold" }}>Номер выпуска:</label>
                <input value={issueNumber} onChange={(e) => setIssueNumber(e.target.value)} style={{ width: "100%", padding: "8px 12px", borderRadius: "6px", border: "1px solid #ccc", marginTop: "4px" }} />
              </div>
              <div>
                <label style={{ fontSize: "11px", fontWeight: "bold" }}>Тема / Название выпуска (Issue Title / Theme):</label>
                <input
                  value={issueJournalTitle}
                  onChange={(e) => setIssueJournalTitle(e.target.value)}
                  placeholder="Например: Специальный выпуск: Искусственный интеллект и право"
                  style={{ width: "100%", padding: "8px 12px", borderRadius: "6px", border: "1px solid #ccc", marginTop: "4px" }}
                />
              </div>
              <div>
                <label style={{ fontSize: "11px", fontWeight: "bold" }}>Год:</label>
                <input value={issueYear} onChange={(e) => setIssueYear(e.target.value)} style={{ width: "100%", padding: "8px 12px", borderRadius: "6px", border: "1px solid #ccc", marginTop: "4px" }} />
              </div>
              <div>
                <label style={{ fontSize: "11px", fontWeight: "bold" }}>Описание / Заголовок:</label>
                <input value={issueDesc} onChange={(e) => setIssueDesc(e.target.value)} style={{ width: "100%", padding: "8px 12px", borderRadius: "6px", border: "1px solid #ccc", marginTop: "4px" }} />
              </div>

              {/* COVER PHOTO UPLOAD */}
              <div>
                <label style={{ fontSize: "11px", fontWeight: "bold", display: "block", marginBottom: "6px" }}>📷 Обложка выпуска (Cover Image):</label>
                <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
                  {issueCoverUrl ? (
                    <img src={issueCoverUrl} alt="Cover Preview" style={{ width: "70px", height: "90px", objectFit: "cover", borderRadius: "6px", border: "1px solid #cbd5e1" }} />
                  ) : (
                    <div style={{ width: "70px", height: "90px", background: "#f1f5f9", border: "1px dashed #cbd5e1", borderRadius: "6px", display: "grid", placeItems: "center", fontSize: "10px", color: "#94a3b8", textAlign: "center", padding: "4px" }}>
                      Нет обложки
                    </div>
                  )}
                  <label style={{ background: "#2563eb", color: "#fff", padding: "8px 14px", borderRadius: "6px", fontSize: "12px", fontWeight: "bold", cursor: "pointer" }}>
                    Загрузить обложку
                    <input type="file" accept="image/*" onChange={handleCoverFileUpload} style={{ display: "none" }} />
                  </label>
                </div>
              </div>

              {/* SCHEDULED PUBLISH DATE & TIME */}
              <div style={{ background: "#f8fafc", padding: "12px", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
                <label style={{ fontSize: "11px", fontWeight: "bold", color: "#0f172a", display: "block", marginBottom: "4px" }}>
                  ⏰ Запланировать дату и время публикации (Schedule Publish):
                </label>
                <input
                  type="datetime-local"
                  value={scheduledPublishDate}
                  onChange={(e) => setScheduledPublishDate(e.target.value)}
                  style={{ width: "100%", padding: "8px 12px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "12px" }}
                />
                <small style={{ fontSize: "10px", color: "#64748b", marginTop: "4px", display: "block" }}>
                  Если указано, статус выпуска автоматически изменится на «Запланирован»
                </small>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px", marginTop: "12px" }}>
                <button onClick={() => setShowIssueModal(false)} style={{ padding: "8px 16px", background: "#eee", border: "none", borderRadius: "6px", cursor: "pointer" }}>Отмена</button>
                <button onClick={handleSaveIssue} style={{ padding: "8px 16px", background: "#c82a38", color: "#fff", border: "none", borderRadius: "6px", cursor: "pointer", fontWeight: "bold" }}>
                  {editingIssueId ? "Сохранить изменения" : "Создать"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PRE-PUBLICATION PREVIEW MODAL */}
      {showPreviewModal && previewIssue && (
        <div className="modal-overlay" style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", zIndex: 1200, display: "grid", placeItems: "center", padding: "20px" }}>
          <div style={{ background: "#ffffff", borderRadius: "16px", width: "100%", maxWidth: "840px", maxHeight: "90vh", overflowY: "auto", boxShadow: "0 25px 60px rgba(0,0,0,0.4)" }}>
            {/* HEADER BANNER */}
            <div style={{ background: "linear-gradient(135deg, #0f172a, #1e3a8a)", color: "#ffffff", padding: "20px 24px", borderTopLeftRadius: "16px", borderTopRightRadius: "16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <span style={{ background: "#2563eb", color: "#ffffff", fontSize: "10px", fontWeight: "800", padding: "3px 10px", borderRadius: "12px", textTransform: "uppercase" }}>
                  👁️ ПРЕДПРОСМОТР ВЫПУСКА ПЕРЕД ПУБЛИКАЦИЕЙ (PREVIEW)
                </span>
                <h2 style={{ fontSize: "20px", fontWeight: "800", margin: "6px 0 0", color: "#ffffff" }}>
                  {previewIssue.journalTitle || "Expert Scientific Journal"} — Выпуск № {previewIssue.number} ({previewIssue.year})
                </h2>
              </div>
              <button onClick={() => setShowPreviewModal(false)} style={{ background: "rgba(255,255,255,0.15)", border: "none", color: "#fff", width: "32px", height: "32px", borderRadius: "50%", cursor: "pointer", fontSize: "16px", fontWeight: "bold" }}>
                ✕
              </button>
            </div>

            <div style={{ padding: "24px" }}>
              {/* ISSUE HERO SUMMARY */}
              <div style={{ display: "flex", gap: "20px", background: "#f8fafc", padding: "20px", borderRadius: "12px", border: "1px solid #e2e8f0", marginBottom: "24px" }}>
                {previewIssue.coverUrl ? (
                  <img src={previewIssue.coverUrl} alt="Cover" style={{ width: "110px", height: "145px", objectFit: "cover", borderRadius: "8px", border: "1px solid #cbd5e1", boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }} />
                ) : (
                  <div style={{ width: "110px", height: "145px", background: "linear-gradient(135deg, #0f2744, #1e3a8a)", color: "#fff", borderRadius: "8px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", padding: "10px" }}>
                    <div style={{ fontSize: "12px", fontWeight: "bold" }}>EXPERT</div>
                    <div style={{ fontSize: "18px", fontWeight: "800", margin: "4px 0" }}>№ {previewIssue.number}</div>
                    <div style={{ fontSize: "11px", opacity: 0.8 }}>{previewIssue.year}</div>
                  </div>
                )}

                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", gap: "10px", alignItems: "center", marginBottom: "8px" }}>
                    <span style={{ background: previewIssue.status === "PUBLISHED" ? "#dcfce7" : previewIssue.status === "SCHEDULED" ? "#dbeafe" : "#fef3c7", color: previewIssue.status === "PUBLISHED" ? "#15803d" : previewIssue.status === "SCHEDULED" ? "#1d4ed8" : "#b45309", fontSize: "11px", fontWeight: "800", padding: "2px 10px", borderRadius: "10px" }}>
                      ● {previewIssue.status === "PUBLISHED" ? "Опубликован" : previewIssue.status === "SCHEDULED" ? "⏰ Запланирован" : "📝 Черновик"}
                    </span>
                    {(previewIssue as any).scheduledPublishDate && (
                      <span style={{ fontSize: "11px", color: "#2563eb", fontWeight: "700" }}>
                        ⏰ Публикация: {new Date((previewIssue as any).scheduledPublishDate).toLocaleString("ru-RU")}
                      </span>
                    )}
                  </div>

                  <h3 style={{ margin: "0 0 6px", fontSize: "16px", fontWeight: "800", color: "#0f172a" }}>
                    {previewIssue.description || `Официальный выпуск № ${previewIssue.number} (${previewIssue.year})`}
                  </h3>
                  <p style={{ fontSize: "12px", color: "#64748b", margin: "0 0 12px" }}>
                    ISSN: 3093-1234 | E-ISSN: 3093-1242 | DOI: {previewIssue.doi || `10.47689/expert-${previewIssue.year}-vol6-iss${previewIssue.number}`}
                  </p>

                  <div style={{ display: "flex", gap: "16px", fontSize: "12px", color: "#475569" }}>
                    <div><b>Статей в выпуске:</b> {submittedArticles.filter(a => a.issueId === previewIssue.id || (a.status === "ACCEPTED" && !a.issueId)).length}</div>
                    <div><b>Готовность:</b> <span style={{ color: "#16a34a", fontWeight: "bold" }}>✓ Готов к публикации</span></div>
                  </div>
                </div>
              </div>

              {/* ARTICLES IN THIS ISSUE PREVIEW */}
              <h4 style={{ fontSize: "15px", fontWeight: "800", color: "#0f172a", marginBottom: "12px" }}>
                📄 Список статей, вошедших в выпуск:
              </h4>

              {(() => {
                const issueArticles = submittedArticles.filter(a => a.issueId === previewIssue.id || (a.status === "ACCEPTED" && !a.issueId));
                if (issueArticles.length === 0) {
                  return (
                    <div style={{ padding: "20px", background: "#f8fafc", borderRadius: "8px", textAlign: "center", color: "#64748b", fontSize: "13px" }}>
                      В этот выпуск пока не добавлено ни одной принятой статьи.
                    </div>
                  );
                }
                return (
                  <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                    {issueArticles.map((art, idx) => (
                      <div key={art.id} style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "8px", padding: "14px 18px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div>
                          <div style={{ fontSize: "11px", color: "#2563eb", fontWeight: "700", marginBottom: "2px" }}>
                            Статья #{idx + 1} • {art.scientificField || "Юридические науки"} • С. {art.pages || `${(idx * 10) + 1}-${(idx * 10) + 12}`}
                          </div>
                          <div style={{ fontSize: "14px", fontWeight: "800", color: "#0f172a" }}>{art.title}</div>
                          <div style={{ fontSize: "12px", color: "#64748b", marginTop: "2px" }}>
                            ✍️ {art.authors?.[0]?.author?.fullName || "Автор"} ({art.authors?.[0]?.author?.institution || "Expert Journal"})
                          </div>
                        </div>
                        <button
                          onClick={() => downloadManuscriptFile({ fileUrl: art.fileUrl, fileName: art.fileName, title: art.title })}
                          style={{ background: "#f1f5f9", border: "1px solid #cbd5e1", padding: "6px 12px", borderRadius: "6px", fontSize: "11px", fontWeight: "bold", cursor: "pointer" }}
                        >
                          📄 PDF
                        </button>
                      </div>
                    ))}
                  </div>
                );
              })()}

              {/* MODAL FOOTER BUTTONS */}
              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "24px", paddingTop: "16px", borderTop: "1px solid #e2e8f0" }}>
                <button onClick={() => setShowPreviewModal(false)} style={{ padding: "10px 18px", background: "#f1f5f9", border: "1px solid #cbd5e1", borderRadius: "8px", fontSize: "12px", fontWeight: "700", cursor: "pointer" }}>
                  ✕ Закрыть
                </button>
                <button
                  onClick={() => {
                    setShowPreviewModal(false);
                    openEditIssueModal(previewIssue);
                  }}
                  style={{ padding: "10px 18px", background: "#fff7ed", border: "1px solid #fed7aa", color: "#c2410c", borderRadius: "8px", fontSize: "12px", fontWeight: "700", cursor: "pointer" }}
                >
                  ✏️ Редактировать выпуск
                </button>
                {previewIssue.status !== "PUBLISHED" && (
                  <button
                    onClick={() => {
                      setShowPreviewModal(false);
                      handlePublishIssueForId(previewIssue.id);
                    }}
                    style={{ padding: "10px 22px", background: "#16a34a", color: "#ffffff", border: "none", borderRadius: "8px", fontSize: "12px", fontWeight: "800", cursor: "pointer", boxShadow: "0 4px 12px rgba(22, 163, 74, 0.25)" }}
                  >
                    🚀 Опубликовать сейчас
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* LEFT NAVIGATION SIDEBAR */}
      <aside className="editor-side">
        <a href="/home" className="editor-logo">
          <span>E</span>
          <b>Expert</b>
          <small>editorial platform</small>
        </a>
        <div className="editor-nav">
          {nav.map((item) => {
            const isTabActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={isTabActive ? "editor-active" : ""}
              >
                <i>{item.icon}</i>
                <span>{item.label}</span>
                {item.id === "Новые статьи" && submittedArticles.filter(a => a.status === "SUBMITTED").length > 0 && <em>{submittedArticles.filter(a => a.status === "SUBMITTED").length}</em>}
              </button>
            );
          })}
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <div className="editor-main">
        <header className="editor-head">
          <div>
            <small>{t.editorPanelTitle || "Редакционная панель"}</small>
            <b>{nav.find(n => n.id === activeTab)?.label || activeTab}</b>
          </div>
          <label className="editor-search" style={{ position: "relative", display: "flex", alignItems: "center" }}>
            ⌕
            <input
              value={term}
              onChange={(e) => setTerm(e.target.value)}
              placeholder={t.editorSearchPlaceholder || "Поиск статей, авторов, DOI..."}
              style={{ paddingRight: term ? "32px" : "12px" }}
            />
            {term && (
              <button
                onClick={() => setTerm("")}
                style={{ position: "absolute", right: "10px", background: "none", border: "none", color: "#64748b", cursor: "pointer", fontSize: "14px", fontWeight: "bold" }}
                title="Clear search"
              >
                ✕
              </button>
            )}
          </label>

          <span className="health">● Cloudflare R2 / Supabase</span>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <NotificationCenter role="editor" />
            <LanguageSwitcher />
          </div>
          <div className="editor-user">
            {user?.avatarUrl ? (
              <img src={user.avatarUrl} alt="Avatar" style={{ width: 34, height: 34, borderRadius: "50%", objectFit: "cover", border: "2px solid #cbd5e1" }} />
            ) : (
              <span>{getUserInitials()}</span>
            )}
            <div>
              <b>{user?.firstName && user.firstName !== "Алексей" && !user.lastName?.includes("Петров") ? `${user.firstName} ${user.lastName || ""}` : (t.editorCabinet || "Редактор")}</b>
              <small>{t.editorPanelTitle || "Редакция журнала"}</small>
            </div>
          </div>
        </header>

        <main className="editor-content" style={{ background: "#f8fafc", padding: "28px 32px" }}>
          {activeTab === "Дашборд" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "28px" }}>
              {/* OVERALL OVERVIEW */}
              <div>
                <h3 style={{ fontSize: "18px", fontWeight: "800", color: "#0f172a", margin: "0 0 16px" }}>{t.overallOverview || "Overall Overview"}</h3>

                {/* 5 STAT CARDS */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "14px", marginBottom: "20px" }}>
                  <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "10px", padding: "18px" }}>
                    <span style={{ fontSize: "12px", color: "#64748b", fontWeight: "700" }}>{t.totalSubmissions || "Total Submissions"}</span>
                    <div style={{ marginTop: "6px" }}>
                      <strong style={{ fontSize: "26px", fontWeight: "800" }}>{totalCount}</strong>
                    </div>
                  </div>

                  <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "10px", padding: "18px" }}>
                    <span style={{ fontSize: "12px", color: "#64748b", fontWeight: "700" }}>{t.underReview || "Under Review"}</span>
                    <div style={{ marginTop: "6px" }}>
                      <strong style={{ fontSize: "26px", fontWeight: "800" }}>{underReviewCount}</strong>
                    </div>
                  </div>

                  <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "10px", padding: "18px" }}>
                    <span style={{ fontSize: "12px", color: "#64748b", fontWeight: "700" }}>Accepted</span>
                    <div style={{ marginTop: "6px" }}>
                      <strong style={{ fontSize: "26px", fontWeight: "800" }}>{acceptedCount}</strong>
                    </div>
                  </div>

                  <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "10px", padding: "18px" }}>
                    <span style={{ fontSize: "12px", color: "#64748b", fontWeight: "700" }}>{t.published || "Published"}</span>
                    <div style={{ marginTop: "6px" }}>
                      <strong style={{ fontSize: "26px", fontWeight: "800" }}>{publishedCount}</strong>
                    </div>
                  </div>

                  <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "10px", padding: "18px" }}>
                    <span style={{ fontSize: "12px", color: "#64748b", fontWeight: "700" }}>Rejected</span>
                    <div style={{ marginTop: "6px" }}>
                      <strong style={{ fontSize: "26px", fontWeight: "800" }}>{rejectedCount}</strong>
                    </div>
                  </div>
                </div>

                {/* VISUAL CHARTS ROW */}
                <div style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr", gap: "18px" }}>
                  {/* SUBMISSIONS OVERVIEW LINE CHART */}
                  <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "10px", padding: "20px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                      <h4 style={{ margin: 0, fontSize: "14px", fontWeight: "700" }}>Submissions Overview</h4>
                      <div style={{ display: "flex", gap: "12px", fontSize: "11px", fontWeight: "700" }}>
                        <span style={{ color: "#2563eb" }}>● Submissions</span>
                        <span style={{ color: "#10b981" }}>● Accepted</span>
                        <span style={{ color: "#8b5cf6" }}>● Published</span>
                      </div>
                    </div>
                    {/* SVG GRAPH */}
                    <svg viewBox="0 0 500 150" style={{ width: "100%", height: "140px" }}>
                      <path d="M0,110 Q50,90 100,70 T200,60 T300,50 T400,20 T500,40" fill="none" stroke="#2563eb" strokeWidth="3" />
                      <path d="M0,130 Q50,110 100,100 T200,90 T300,80 T400,70 T500,80" fill="none" stroke="#10b981" strokeWidth="3" />
                      <path d="M0,140 Q50,135 100,130 T200,120 T300,115 T400,110 T500,120" fill="none" stroke="#8b5cf6" strokeWidth="3" />
                    </svg>
                  </div>

                  {/* SUBMISSIONS BY STATUS DONUT CHART */}
                  <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "10px", padding: "20px" }}>
                    <h4 style={{ margin: "0 0 16px", fontSize: "14px", fontWeight: "700" }}>Submissions by Status</h4>
                    <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
                      <div style={{ width: "90px", height: "90px", borderRadius: "50%", background: "conic-gradient(#3b82f6 0% 21%, #10b981 21% 52%, #8b5cf6 52% 89%, #ef4444 89% 100%)", display: "grid", placeItems: "center", flexShrink: 0 }}>
                        <div style={{ width: "50px", height: "50px", borderRadius: "50%", background: "#ffffff" }} />
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: "6px", fontSize: "11px" }}>
                        <div><span style={{ color: "#3b82f6" }}>●</span> Under Review <b style={{ marginLeft: "4px" }}>{underReviewCount} (21.1%)</b></div>
                        <div><span style={{ color: "#10b981" }}>●</span> Accepted <b style={{ marginLeft: "4px" }}>{acceptedCount} (30.6%)</b></div>
                        <div><span style={{ color: "#8b5cf6" }}>●</span> Published <b style={{ marginLeft: "4px" }}>{publishedCount} (68.1%)</b></div>
                        <div><span style={{ color: "#ef4444" }}>●</span> Rejected <b style={{ marginLeft: "4px" }}>{rejectedCount} (11.1%)</b></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* SECTION 3: RECENT SUBMISSIONS TABLE (MATCHING PHOTO 1 1:1) */}
              <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "10px", padding: "20px" }}>
                <h3 style={{ fontSize: "16px", fontWeight: "800", margin: "0 0 16px" }}>Recent Submissions ({submittedArticles.length})</h3>
                <div style={{ width: "100%", overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
                    <thead>
                      <tr style={{ borderBottom: "1px solid #e2e8f0", color: "#64748b", textAlign: "left", height: "36px" }}>
                        <th style={{ padding: "8px 12px" }}>ID</th>
                        <th style={{ padding: "8px 12px" }}>Title</th>
                        <th style={{ padding: "8px 12px" }}>Journal</th>
                        <th style={{ padding: "8px 12px" }}>Author</th>
                        <th style={{ padding: "8px 12px" }}>Submitted</th>
                        <th style={{ padding: "8px 12px" }}>Status</th>
                        <th style={{ padding: "8px 12px" }}>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredArticles.length === 0 ? (
                        <tr><td colSpan={7} style={{ padding: "24px", textAlign: "center", color: "#94a3b8" }}>No recent submissions found.</td></tr>
                      ) : (
                        filteredArticles.map((art, i) => {
                          const safeId = art.id.startsWith("ESJ") ? art.id : `ESJ-2026-0${256 - i}`;
                          return (
                            <tr key={art.id} style={{ borderBottom: "1px solid #f1f5f9", height: "52px" }}>
                              <td style={{ padding: "8px 12px", fontFamily: "monospace", color: "#64748b" }}>{safeId}</td>
                              <td style={{ padding: "8px 12px", fontWeight: "700", color: "#0f172a", maxWidth: "280px" }}>{art.title}</td>
                              <td style={{ padding: "8px 12px", color: "#475569" }}>Expert Scientific Journal</td>
                              <td style={{ padding: "8px 12px", color: "#475569" }}>{art.authors?.[0]?.author?.fullName || "Author"}</td>
                              <td style={{ padding: "8px 12px", color: "#64748b" }}>{art.submissionDate || "May 28, 2026"}</td>
                              <td style={{ padding: "8px 12px" }}>
                                <span style={{ padding: "3px 10px", borderRadius: "12px", fontSize: "11px", fontWeight: "700", background: art.status === "PUBLISHED" ? "#dcfce7" : art.status === "SUBMITTED" ? "#e0f2fe" : "#fef3c7", color: art.status === "PUBLISHED" ? "#15803d" : art.status === "SUBMITTED" ? "#0369a1" : "#b45309" }}>
                                  {statusMap[art.status] || art.status}
                                </span>
                              </td>
                              <td style={{ padding: "8px 12px" }}>
                                <div style={{ display: "flex", gap: "6px" }}>
                                  <button onClick={() => openAssignReviewerModal(art)} style={{ background: "#eff6ff", border: "1px solid #93c5fd", color: "#1d4ed8", padding: "4px 10px", borderRadius: "4px", fontSize: "11px", fontWeight: "700", cursor: "pointer" }}>
                                    👨‍⚖️ Рецензент
                                  </button>
                                  <button onClick={() => openReviewNoteModal(art)} style={{ background: "#ffffff", border: "1px solid #cbd5e1", padding: "4px 10px", borderRadius: "4px", fontSize: "11px", fontWeight: "700", cursor: "pointer", color: "#1e293b" }}>
                                    View
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {(activeTab === "Новые статьи" || activeTab === "newArticles" || activeTab === "Submitted") && (
            <section className="editor-panel" style={{ background: "transparent", padding: 0, boxShadow: "none" }}>
              <div style={{ background: "#ffffff", borderRadius: "12px", padding: "24px", marginBottom: "20px", border: "1px solid #e2e8f0", boxShadow: "0 2px 10px rgba(0,0,0,0.03)", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "16px" }}>
                <div>
                  <h2 style={{ fontSize: "20px", fontWeight: "800", color: "#0f172a", margin: "0 0 4px 0" }}>
                    Поступившие рукописи от авторов (Submitted Manuscripts)
                  </h2>
                  <p style={{ fontSize: "13px", color: "#64748b", margin: 0 }}>
                    Редакционный контроль, первичный аудит и принятия решений по статьям
                  </p>
                </div>
                <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                  {[
                    { label: "Все статьи", status: "Все статусы" },
                    { label: "● Новые (Submitted)", status: "SUBMITTED" },
                    { label: "● На рецензии", status: "UNDER_REVIEW" },
                    { label: "● Доработка", status: "REVISION_REQUIRED" },
                    { label: "● Принятые", status: "ACCEPTED" },
                  ].map((st) => {
                    const isActive = filterStatus === st.status || (filterStatus === "Все статусы" && st.status === "Все статусы");
                    return (
                      <button
                        key={st.status}
                        onClick={() => setFilterStatus(st.status)}
                        style={{
                          padding: "6px 14px",
                          borderRadius: "20px",
                          fontSize: "12px",
                          fontWeight: "700",
                          cursor: "pointer",
                          border: "1px solid",
                          borderColor: isActive ? "#2563eb" : "#cbd5e1",
                          background: isActive ? "#2563eb" : "#ffffff",
                          color: isActive ? "#ffffff" : "#475569",
                          transition: "all 0.2s ease",
                        }}
                      >
                        {st.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* CARD-TABLE MANUSCRIPTS LIST */}
              <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                {filteredArticles.length === 0 ? (
                  <div style={{ background: "#ffffff", borderRadius: "12px", padding: "60px 20px", textAlign: "center", color: "#64748b", border: "1px solid #e2e8f0" }}>
                    <div style={{ fontSize: "32px", marginBottom: "8px" }}>📥</div>
                    <div style={{ fontSize: "16px", fontWeight: "700", color: "#0f172a", marginBottom: "4px" }}>
                      По выбранному фильтру статей не найдено
                    </div>
                    <small style={{ fontSize: "13px", color: "#94a3b8" }}>
                      Новые рукописи от авторов появятся здесь автоматически в режиме реального времени.
                    </small>
                  </div>
                ) : (
                  filteredArticles.map((art, idx) => {
                    const fileDownloadUrl = `https://d4da42b4eef1d8488bfb6a00e5225637.r2.cloudflarestorage.com/expert-journal-publications/${art.fileName || "manuscript.pdf"}`;
                    const safeId = art.id.startsWith("ESJ") ? art.id : `ESJ-2026-0${10 + idx}`;
                    const authorName = art.authors?.[0]?.author?.fullName || "Иван Абдуллаев";
                    const authorEmail = art.authors?.[0]?.author?.email || "author@journal-expert.ru";

                    return (
                      <div
                        key={art.id}
                        style={{
                          background: "#ffffff",
                          borderRadius: "12px",
                          padding: "20px 24px",
                          border: "1px solid #e2e8f0",
                          boxShadow: "0 3px 12px rgba(0,0,0,0.03)",
                          display: "grid",
                          gridTemplateColumns: "1.8fr 1.2fr 1fr 1.2fr",
                          gap: "20px",
                          alignItems: "center",
                          transition: "all 0.2s ease",
                        }}
                      >
                        {/* COLUMN 1: MANUSCRIPT TITLE & METADATA */}
                        <div>
                          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
                            <span style={{ background: "#f1f5f9", color: "#475569", fontSize: "11px", fontWeight: "800", padding: "2px 8px", borderRadius: "6px", fontFamily: "monospace" }}>
                              #{safeId}
                            </span>
                            <span style={{ background: "#e0f2fe", color: "#0369a1", fontSize: "11px", fontWeight: "700", padding: "2px 8px", borderRadius: "12px" }}>
                              🏷️ {art.scientificField || "Экономические науки"}
                            </span>
                          </div>
                          <h3 style={{ fontSize: "16px", fontWeight: "800", color: "#0f172a", margin: "0 0 6px 0", lineHeight: 1.35 }}>
                            {art.title}
                          </h3>
                          <p style={{ fontSize: "12px", color: "#64748b", margin: 0, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden", lineHeight: 1.4 }}>
                            {art.abstract}
                          </p>
                        </div>

                        {/* COLUMN 2: AUTHOR & CONTACT INFO */}
                        <div style={{ borderLeft: "1px solid #f1f5f9", paddingLeft: "16px" }}>
                          <small style={{ fontSize: "10px", color: "#94a3b8", fontWeight: "700", textTransform: "uppercase" }}>Автор рукописи</small>
                          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginTop: "4px" }}>
                            <div style={{ width: "36px", height: "36px", borderRadius: "50%", background: "#2563eb", color: "#fff", display: "grid", placeItems: "center", fontWeight: "bold", fontSize: "13px" }}>
                              {authorName.charAt(0)}
                            </div>
                            <div>
                              <div style={{ fontSize: "13px", fontWeight: "800", color: "#0f172a" }}>{authorName}</div>
                              <div style={{ fontSize: "11px", color: "#64748b" }}>✉ {authorEmail}</div>
                              <span style={{ fontSize: "10px", color: "#16a34a", fontWeight: "700" }}>● Verified Author</span>
                            </div>
                          </div>
                        </div>

                        {/* COLUMN 3: DATE & CLOUDFLARE R2 FILE */}
                        <div style={{ borderLeft: "1px solid #f1f5f9", paddingLeft: "16px" }}>
                          <small style={{ fontSize: "10px", color: "#94a3b8", fontWeight: "700", textTransform: "uppercase" }}>Рукопись (Cloudflare R2)</small>
                          <div style={{ marginTop: "4px", fontSize: "12px", color: "#475569", marginBottom: "8px" }}>
                            📅 {art.submissionDate || "2026-08-01"}
                          </div>
                          <button
                            onClick={() => downloadManuscriptFile({ fileUrl: art.fileUrl, fileName: art.fileName, title: art.title, authorName: art.authors?.[0]?.author?.fullName, abstract: art.abstract })}
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "6px",
                              background: "#0284c7",
                              color: "#ffffff",
                              border: "none",
                              padding: "7px 12px",
                              borderRadius: "6px",
                              fontSize: "12px",
                              fontWeight: "700",
                              cursor: "pointer",
                              boxShadow: "0 2px 6px rgba(2, 132, 199, 0.2)",
                            }}
                          >
                            📥 Скачать DOCX / PDF
                          </button>
                        </div>

                        {/* COLUMN 4: STATUS & EDITORIAL ACTIONS */}
                        <div style={{ borderLeft: "1px solid #f1f5f9", paddingLeft: "16px", display: "flex", flexDirection: "column", gap: "8px", alignItems: "flex-start" }}>
                          <small style={{ fontSize: "10px", color: "#94a3b8", fontWeight: "700", textTransform: "uppercase" }}>Решение редактора</small>
                          <span
                            style={{
                              padding: "4px 12px",
                              borderRadius: "12px",
                              fontSize: "11px",
                              fontWeight: "800",
                              background: art.status === "ACCEPTED" ? "#dcfce7" : art.status === "PUBLISHED" ? "#dbeafe" : art.status === "REVISION_REQUIRED" ? "#fef3c7" : "#e0f2fe",
                              color: art.status === "ACCEPTED" ? "#15803d" : art.status === "PUBLISHED" ? "#1d4ed8" : art.status === "REVISION_REQUIRED" ? "#b45309" : "#0369a1",
                            }}
                          >
                            ● {statusMap[art.status] || art.status}
                          </span>

                          <div style={{ display: "flex", flexDirection: "column", gap: "6px", width: "100%", marginTop: "4px" }}>
                            {art.status === "ACCEPTED" || art.status === "PUBLISHED" ? (
                              <div
                                style={{
                                  background: "#ecfdf5",
                                  border: "1px solid #10b981",
                                  color: "#047857",
                                  padding: "6px 10px",
                                  borderRadius: "6px",
                                  fontSize: "11px",
                                  fontWeight: "800",
                                  width: "100%",
                                  textAlign: "center",
                                  boxShadow: "0 2px 6px rgba(16,185,129,0.1)",
                                }}
                              >
                                {(() => {
                                  const assigned = issues.find((i) => i.id === art.issueId) || issues[0];
                                  return `✓ Выпуск № ${assigned?.number || 7} (${assigned?.year || 2026}) • ${assigned?.status === "PUBLISHED" ? "Опубликован" : "Черновик"}`;
                                })()}
                              </div>
                            ) : (
                              <>
                                <select
                                  value={selectedIssuesMap[art.id] || (issues[0]?.id || "")}
                                  onChange={(e) => setSelectedIssuesMap((prev) => ({ ...prev, [art.id]: e.target.value }))}
                                  style={{
                                    background: "#ffffff",
                                    border: "1px solid #cbd5e1",
                                    color: "#1e293b",
                                    padding: "6px 8px",
                                    borderRadius: "6px",
                                    fontSize: "11px",
                                    fontWeight: "700",
                                    cursor: "pointer",
                                    width: "100%",
                                  }}
                                >
                                  <option value="">🚀 Выберите выпуск...</option>
                                  {issues.map((iss) => (
                                    <option key={iss.id} value={iss.id}>
                                      Выпуск № {iss.number} ({iss.year}) {iss.status === "PUBLISHED" ? "● Опубликован" : "● Черновик"}
                                    </option>
                                  ))}
                                </select>
                                <div style={{ display: "flex", gap: "6px", width: "100%" }}>
                                  <button
                                    onClick={() => openReviewNoteModal(art)}
                                    style={{
                                      flex: 1,
                                      background: "#fff7ed",
                                      color: "#c2410c",
                                      border: "1px solid #fed7aa",
                                      fontSize: "11px",
                                      fontWeight: "800",
                                      cursor: "pointer",
                                    }}
                                  >
                                    📝 На доработку
                                  </button>
                                  <button
                                    onClick={() => handleAcceptArticleWithIssue(art.id)}
                                    style={{
                                      flex: 1,
                                      background: "#16a34a",
                                      color: "#ffffff",
                                      border: "none",
                                      padding: "7px 10px",
                                      borderRadius: "6px",
                                      fontSize: "11px",
                                      fontWeight: "800",
                                      cursor: "pointer",
                                      boxShadow: "0 2px 6px rgba(22, 163, 74, 0.2)",
                                    }}
                                  >
                                    ✓ Принять
                                  </button>
                                </div>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </section>
          )}

          {activeTab === "Выпуски журнала" && (
            <section className="editor-panel">
              <div className="panel-top">
                <h2>Архив и реестр выпусков журнала</h2>
                <button className="btn-primary" onClick={openCreateIssueModal}>
                  + Создать выпуск
                </button>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "18px", padding: "20px" }}>
                {issues.map((iss) => (
                  <div key={iss.id} style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: "12px", padding: "18px", display: "flex", flexDirection: "column", justifyContent: "space-between", boxShadow: "0 2px 8px rgba(0,0,0,0.02)" }}>
                    <div style={{ display: "flex", gap: "14px", marginBottom: "14px" }}>
                      {iss.coverUrl ? (
                        <img src={iss.coverUrl} alt="Cover" style={{ width: "75px", height: "100px", objectFit: "cover", borderRadius: "6px", border: "1px solid #cbd5e1", flexShrink: 0 }} />
                      ) : (
                        <div style={{ width: "75px", height: "100px", background: "linear-gradient(135deg, #0f2744, #1e3a8a)", color: "#fff", borderRadius: "6px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", fontSize: "11px", fontWeight: "bold", textAlign: "center", padding: "6px", flexShrink: 0 }}>
                          EXPERT<br/>№ {iss.number}<br/><small style={{ fontSize: "9px", opacity: 0.8 }}>{iss.year}</small>
                        </div>
                      )}
                      <div style={{ flex: 1 }}>
                        <h4 style={{ margin: "0 0 6px", fontSize: "15px", fontWeight: "800", color: "#0f172a" }}>Выпуск № {iss.number} ({iss.year})</h4>
                        <div style={{ display: "flex", flexDirection: "column", gap: "4px", marginBottom: "8px" }}>
                          <span style={{ display: "inline-block", fontSize: "11px", color: iss.status === "PUBLISHED" ? "#16a34a" : iss.status === "SCHEDULED" ? "#2563eb" : "#d97706", fontWeight: "800" }}>
                            ● {iss.status === "PUBLISHED" ? "Опубликован" : iss.status === "SCHEDULED" ? "⏰ Запланирован" : "📝 Черновик"}
                          </span>
                          {(iss as any).scheduledPublishDate && (
                            <small style={{ fontSize: "10px", color: "#2563eb", fontWeight: "700" }}>
                              ⏰ Время: {new Date((iss as any).scheduledPublishDate).toLocaleString("ru-RU")}
                            </small>
                          )}
                        </div>
                        <p style={{ fontSize: "11px", color: "#64748b", margin: 0, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                          {iss.description}
                        </p>
                      </div>
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", gap: "8px", borderTop: "1px solid #f1f5f9", paddingTop: "12px" }}>
                      <div style={{ display: "flex", gap: "6px" }}>
                        {iss.status !== "PUBLISHED" && (
                          <button onClick={() => openEditIssueModal(iss)} style={{ flex: 1, background: "#fff7ed", color: "#c2410c", border: "1px solid #fed7aa", padding: "6px 8px", borderRadius: "6px", fontSize: "11px", fontWeight: "700", cursor: "pointer" }}>
                            ✏️ Редактировать
                          </button>
                        )}
                        <button onClick={() => openPreviewModal(iss)} style={{ flex: 1, background: "#f0f9ff", color: "#0284c7", border: "1px solid #bae6fd", padding: "6px 8px", borderRadius: "6px", fontSize: "11px", fontWeight: "700", cursor: "pointer" }}>
                          👁️ Предпросмотр
                        </button>
                      </div>

                      <div style={{ display: "flex", gap: "6px" }}>
                        <button onClick={() => router.push(`/journal?issueId=${iss.id}`)} style={{ flex: 1, background: "#f1f5f9", color: "#334155", border: "1px solid #cbd5e1", padding: "6px 8px", borderRadius: "6px", fontSize: "11px", fontWeight: "700", cursor: "pointer" }}>
                          Открыть выпуск →
                        </button>
                        {iss.status !== "PUBLISHED" && (
                          <button onClick={() => handlePublishIssueForId(iss.id)} style={{ flex: 1, background: "#16a34a", color: "#fff", border: "none", padding: "6px 8px", borderRadius: "6px", fontSize: "11px", fontWeight: "800", cursor: "pointer", boxShadow: "0 2px 6px rgba(22, 163, 74, 0.2)" }}>
                            ↗ Опубликовать
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {activeTab === "Статистика" && (
            <section className="article-panel" style={{ padding: "24px", background: "transparent", border: "none", boxShadow: "none" }}>
              {/* HEADER CARD */}
              <div style={{ background: "#ffffff", borderRadius: "12px", padding: "24px", marginBottom: "24px", border: "1px solid #e2e8f0", boxShadow: "0 2px 10px rgba(0,0,0,0.03)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <h2 style={{ fontSize: "22px", fontWeight: "800", color: "#0f172a", margin: "0 0 4px 0" }}>
                    📊 Аналитическая статистика редакции
                  </h2>
                  <p style={{ fontSize: "13px", color: "#64748b", margin: 0 }}>
                    Динамический расчет показателей подачи, рецензирования, цитирования и научного охвата
                  </p>
                </div>
                <span style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", color: "#166534", fontSize: "12px", fontWeight: "800", padding: "6px 14px", borderRadius: "20px" }}>
                  ● Real-time Live Analytics
                </span>
              </div>

              {/* KPI TOP METRICS */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "16px", marginBottom: "24px" }}>
                <div style={{ background: "#ffffff", padding: "20px", borderRadius: "10px", border: "1px solid #e2e8f0", boxShadow: "0 2px 6px rgba(0,0,0,0.02)" }}>
                  <div style={{ fontSize: "12px", color: "#64748b", fontWeight: "700" }}>Всего рукописей (Total Submissions)</div>
                  <div style={{ fontSize: "32px", fontWeight: "800", color: "#0f172a", marginTop: "8px" }}>{submittedArticles.length}</div>
                  <small style={{ fontSize: "11px", color: "#64748b" }}>в реестре журнала</small>
                </div>

                <div style={{ background: "#ffffff", padding: "20px", borderRadius: "10px", border: "1px solid #e2e8f0", boxShadow: "0 2px 6px rgba(0,0,0,0.02)" }}>
                  <div style={{ fontSize: "12px", color: "#64748b", fontWeight: "700" }}>Опубликовано (Published Articles)</div>
                  <div style={{ fontSize: "32px", fontWeight: "800", color: "#166534", marginTop: "8px" }}>
                    {submittedArticles.filter((a) => a.status === "PUBLISHED").length}
                  </div>
                  <small style={{ fontSize: "11px", color: "#64748b" }}>
                    в {issues.filter((i) => i.status === "PUBLISHED").length} закрытых выпусках
                  </small>
                </div>

                <div style={{ background: "#ffffff", padding: "20px", borderRadius: "10px", border: "1px solid #e2e8f0", boxShadow: "0 2px 6px rgba(0,0,0,0.02)" }}>
                  <div style={{ fontSize: "12px", color: "#64748b", fontWeight: "700" }}>Процент принятия (Acceptance Rate)</div>
                  <div style={{ fontSize: "32px", fontWeight: "800", color: "#2563eb", marginTop: "8px" }}>
                    {submittedArticles.length > 0
                      ? Math.round(((submittedArticles.filter((a) => a.status === "ACCEPTED" || a.status === "PUBLISHED").length) / submittedArticles.length) * 100)
                      : 0}%
                  </div>
                  <small style={{ fontSize: "11px", color: "#64748b" }}>на основе решений редактора</small>
                </div>

                <div style={{ background: "#ffffff", padding: "20px", borderRadius: "10px", border: "1px solid #e2e8f0", boxShadow: "0 2px 6px rgba(0,0,0,0.02)" }}>
                  <div style={{ fontSize: "12px", color: "#64748b", fontWeight: "700" }}>Чтение & Цитирование (Views & Citations)</div>
                  <div style={{ fontSize: "18px", fontWeight: "800", color: "#0f172a", marginTop: "8px" }}>
                    👁️ {submittedArticles.reduce((acc, a) => acc + (a.views || 0), 0)} • 📥 {submittedArticles.reduce((acc, a) => acc + (a.downloads || 0), 0)}
                  </div>
                  <small style={{ fontSize: "11px", color: "#64748b" }}>
                    💬 {submittedArticles.reduce((acc, a) => acc + (a.citations || 0), 0)} цитирований
                  </small>
                </div>
              </div>

              {/* SECOND ROW: BREAKDOWN BY STATUS & SCIENTIFIC FIELDS */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", marginBottom: "24px" }}>
                {/* STATUS DISTRIBUTION */}
                <div style={{ background: "#ffffff", padding: "24px", borderRadius: "12px", border: "1px solid #e2e8f0" }}>
                  <h3 style={{ fontSize: "16px", fontWeight: "800", color: "#0f172a", margin: "0 0 16px 0" }}>
                    📋 Распределение рукописей по статусам
                  </h3>
                  <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                    {[
                      { label: "Новые (Submitted)", count: submittedArticles.filter((a) => a.status === "SUBMITTED").length, color: "#2563eb" },
                      { label: "На рецензировании (Under Review)", count: submittedArticles.filter((a) => a.status === "UNDER_REVIEW").length, color: "#854d0e" },
                      { label: "Требуют доработки (Revision Required)", count: submittedArticles.filter((a) => a.status === "REVISION_REQUIRED").length, color: "#d97706" },
                      { label: "Приняты к публикации (Accepted)", count: submittedArticles.filter((a) => a.status === "ACCEPTED").length, color: "#166534" },
                      { label: "Опубликованы (Published)", count: submittedArticles.filter((a) => a.status === "PUBLISHED").length, color: "#0d9488" },
                      { label: "Отклонены (Rejected)", count: submittedArticles.filter((a) => a.status === "REJECTED").length, color: "#dc2626" },
                    ].map((item) => {
                      const pct = submittedArticles.length > 0 ? Math.round((item.count / submittedArticles.length) * 100) : 0;
                      return (
                        <div key={item.label}>
                          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", fontWeight: "700", marginBottom: "4px" }}>
                            <span>{item.label}</span>
                            <span>{item.count} ({pct}%)</span>
                          </div>
                          <div style={{ width: "100%", height: "8px", background: "#f1f5f9", borderRadius: "4px", overflow: "hidden" }}>
                            <div style={{ width: `${pct}%`, height: "100%", background: item.color, borderRadius: "4px", transition: "width 0.4s ease" }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* SCIENTIFIC FIELDS BREAKDOWN */}
                <div style={{ background: "#ffffff", padding: "24px", borderRadius: "12px", border: "1px solid #e2e8f0" }}>
                  <h3 style={{ fontSize: "16px", fontWeight: "800", color: "#0f172a", margin: "0 0 16px 0" }}>
                    ⚖️ Научные направления (Field Distribution)
                  </h3>
                  <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                    {(() => {
                      const fieldsMap: Record<string, number> = {};
                      submittedArticles.forEach((a) => {
                        const field = a.scientificField || "Право и правовые исследования";
                        fieldsMap[field] = (fieldsMap[field] || 0) + 1;
                      });
                      const fieldEntries = Object.entries(fieldsMap);

                      if (fieldEntries.length === 0) {
                        return <div style={{ fontSize: "13px", color: "#94a3b8", textAlign: "center", padding: "20px" }}>Поданные статьи пока отсутствуют</div>;
                      }

                      return fieldEntries.map(([field, count]) => {
                        const pct = submittedArticles.length > 0 ? Math.round((count / submittedArticles.length) * 100) : 0;
                        return (
                          <div key={field}>
                            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", fontWeight: "700", marginBottom: "4px" }}>
                              <span style={{ color: "#334155" }}>{field}</span>
                              <span style={{ color: "#0f172a" }}>{count} ({pct}%)</span>
                            </div>
                            <div style={{ width: "100%", height: "8px", background: "#f1f5f9", borderRadius: "4px", overflow: "hidden" }}>
                              <div style={{ width: `${pct}%`, height: "100%", background: "#3b82f6", borderRadius: "4px", transition: "width 0.4s ease" }} />
                            </div>
                          </div>
                        );
                      });
                    })()}
                  </div>
                </div>
              </div>
            </section>
          )}

          {activeTab === "Авторы" && (
            <section className="article-panel" style={{ padding: "24px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "16px" }}>
                <h2>Реестр авторов ({authorsList.length})</h2>
                <select value={authorSort} onChange={(e) => setAuthorSort(e.target.value as any)} style={{ padding: "6px 12px", borderRadius: "6px", border: "1px solid #cbd5e1" }}>
                  <option value="count">Сортировка по количеству публикаций</option>
                  <option value="name">Сортировка по имени</option>
                </select>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "16px" }}>
                {authorsList.map((au) => (
                  <div key={au.name} style={{ background: "#fff", border: "1px solid #e2e8f0", padding: "16px", borderRadius: "8px" }}>
                    <h4 style={{ margin: "0 0 4px" }}>👤 {au.name}</h4>
                    <small style={{ color: "#64748b", display: "block", marginBottom: "8px" }}>{au.email}</small>
                    <div style={{ fontSize: "12px", color: "#334155" }}>Всего подано статей: <b>{au.total}</b></div>
                    <div style={{ fontSize: "12px", color: "#16a34a" }}>Опубликовано: <b>{au.published}</b></div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {activeTab === "Пользователи" && (
            <section className="article-panel" style={{ padding: "24px" }}>
              {/* REVIEWER APPLICATIONS SECTION */}
              <div style={{ marginBottom: "32px", background: "#f8fafc", padding: "20px", borderRadius: "12px", border: "1px solid #cbd5e1" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                  <div>
                    <h3 style={{ margin: 0, fontSize: "16px", fontWeight: "800", color: "#0f172a", display: "flex", alignItems: "center", gap: "8px" }}>
                      ⚖️ Заявки на получение статуса Рецензента ({reviewerApps.length})
                    </h3>
                    <p style={{ fontSize: "12px", color: "#64748b", margin: "2px 0 0" }}>Запросы от авторов и исследователей на предоставление прав рецензирования рукописей</p>
                  </div>
                  <span style={{ fontSize: "11px", fontWeight: "800", background: "#dbeafe", color: "#1e40af", padding: "4px 10px", borderRadius: "6px" }}>
                    Ожидают решения: {reviewerApps.filter((a) => a.status === "PENDING").length}
                  </span>
                </div>

                {reviewerApps.length === 0 ? (
                  <div style={{ background: "#ffffff", padding: "20px", borderRadius: "8px", border: "1px dashed #cbd5e1", textAlign: "center", color: "#94a3b8", fontSize: "13px" }}>
                    Заявок на статус Рецензента пока нет.
                  </div>
                ) : (
                  <div style={{ background: "#ffffff", borderRadius: "8px", border: "1px solid #e2e8f0", overflow: "hidden" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px", textAlign: "left" }}>
                      <thead>
                        <tr style={{ background: "#f1f5f9", borderBottom: "1px solid #cbd5e1", color: "#334155" }}>
                          <th style={{ padding: "10px 14px" }}>Соискатель (ФИО / Email)</th>
                          <th style={{ padding: "10px 14px" }}>Направление / Ученая степень</th>
                          <th style={{ padding: "10px 14px" }}>Организация</th>
                          <th style={{ padding: "10px 14px" }}>Опыт / Описание</th>
                          <th style={{ padding: "10px 14px" }}>Статус</th>
                          <th style={{ padding: "10px 14px", textAlign: "right" }}>Действия Редактора</th>
                        </tr>
                      </thead>
                      <tbody>
                        {reviewerApps.map((app) => (
                          <tr key={app.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                            <td style={{ padding: "10px 14px" }}>
                              <b style={{ color: "#0f172a", display: "block" }}>👤 {app.userName}</b>
                              <small style={{ color: "#64748b" }}>{app.userEmail}</small>
                            </td>
                            <td style={{ padding: "10px 14px" }}>
                              <span style={{ fontWeight: "700", color: "#2563eb", display: "block" }}>{app.scientificField}</span>
                              <span style={{ fontSize: "11px", color: "#475569" }}>🎓 {app.degree}</span>
                            </td>
                            <td style={{ padding: "10px 14px", color: "#334155" }}>🏫 {app.institution}</td>
                            <td style={{ padding: "10px 14px", color: "#475569", maxWidth: "200px" }}>{app.experience || "—"}</td>
                            <td style={{ padding: "10px 14px" }}>
                              {app.status === "PENDING" && (
                                <span style={{ fontSize: "11px", fontWeight: "800", background: "#fef3c7", color: "#92400e", padding: "3px 8px", borderRadius: "6px" }}>
                                  ⏳ На рассмотрении
                                </span>
                              )}
                              {app.status === "APPROVED" && (
                                <span style={{ fontSize: "11px", fontWeight: "800", background: "#dcfce7", color: "#166534", padding: "3px 8px", borderRadius: "6px" }}>
                                  ✓ Доступ предоставлен
                                </span>
                              )}
                              {app.status === "REJECTED" && (
                                <span style={{ fontSize: "11px", fontWeight: "800", background: "#fee2e2", color: "#991b1b", padding: "3px 8px", borderRadius: "6px" }}>
                                  ✕ Отклонено
                                </span>
                              )}
                            </td>
                            <td style={{ padding: "10px 14px", textAlign: "right" }}>
                              {app.status === "PENDING" && (
                                <div style={{ display: "flex", gap: "6px", justifyContent: "flex-end" }}>
                                  <button
                                    onClick={() => handleApproveReviewerApp(app.id)}
                                    style={{ padding: "6px 12px", background: "#16a34a", color: "#ffffff", border: "none", borderRadius: "6px", fontSize: "11px", fontWeight: "800", cursor: "pointer" }}
                                  >
                                    ✓ Одобрить
                                  </button>
                                  <button
                                    onClick={() => handleRejectReviewerApp(app.id)}
                                    style={{ padding: "6px 12px", background: "#ef4444", color: "#ffffff", border: "none", borderRadius: "6px", fontSize: "11px", fontWeight: "800", cursor: "pointer" }}
                                  >
                                    ✕ Отклонить
                                  </button>
                                </div>
                              )}
                              {app.status === "APPROVED" && (
                                <button
                                  onClick={() => handleRejectReviewerApp(app.id)}
                                  style={{ padding: "4px 8px", background: "#f1f5f9", color: "#64748b", border: "1px solid #cbd5e1", borderRadius: "6px", fontSize: "10px", cursor: "pointer" }}
                                >
                                  Отозвать доступ
                                </button>
                              )}
                              {app.status === "REJECTED" && (
                                <button
                                  onClick={() => handleApproveReviewerApp(app.id)}
                                  style={{ padding: "4px 8px", background: "#dcfce7", color: "#166534", border: "1px solid #86efac", borderRadius: "6px", fontSize: "10px", cursor: "pointer" }}
                                >
                                  Одобрить повторно
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
                <div>
                  <h2 style={{ margin: 0 }}>Реестр пользователей системы ({systemUsers.length})</h2>
                  <p style={{ fontSize: "13px", color: "#64748b", margin: "4px 0 0" }}>Мониторинг учетных записей, авторизаций Google OAuth и назначенных ролей</p>
                </div>
              </div>

              <div style={{ background: "#ffffff", borderRadius: "10px", border: "1px solid #e2e8f0", overflow: "hidden" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px", textAlign: "left" }}>
                  <thead>
                    <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0", color: "#475569" }}>
                      <th style={{ padding: "12px 16px" }}>ФИО Пользователя</th>
                      <th style={{ padding: "12px 16px" }}>Email</th>
                      <th style={{ padding: "12px 16px" }}>Способ авторизации (Provider)</th>
                      <th style={{ padding: "12px 16px" }}>Роль</th>
                      <th style={{ padding: "12px 16px" }}>Дата регистрации</th>
                      <th style={{ padding: "12px 16px" }}>Последний вход</th>
                    </tr>
                  </thead>
                  <tbody>
                    {systemUsers.length === 0 ? (
                      <tr>
                        <td colSpan={6} style={{ padding: "30px", textAlign: "center", color: "#94a3b8" }}>Пользователи не найдены</td>
                      </tr>
                    ) : (
                      systemUsers.map((u) => (
                        <tr key={u.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                          <td style={{ padding: "12px 16px", fontWeight: "700", color: "#0f172a" }}>👤 {u.fullName}</td>
                          <td style={{ padding: "12px 16px", color: "#475569" }}>{u.email}</td>
                          <td style={{ padding: "12px 16px" }}>
                            {u.authProvider === "GOOGLE" ? (
                              <span style={{ fontSize: "11px", fontWeight: "800", background: "#eff6ff", color: "#2563eb", border: "1px solid #bfdbfe", padding: "3px 8px", borderRadius: "6px" }}>
                                🌐 Provider: GOOGLE
                              </span>
                            ) : (
                              <span style={{ fontSize: "11px", fontWeight: "700", background: "#f1f5f9", color: "#475569", padding: "3px 8px", borderRadius: "6px" }}>
                                🔒 Provider: LOCAL
                              </span>
                            )}
                          </td>
                          <td style={{ padding: "12px 16px" }}>
                            <span style={{ fontSize: "11px", fontWeight: "700", background: u.role === "ADMIN" ? "#fef2f2" : u.role === "EDITOR" ? "#f0fdf4" : u.role === "REVIEWER" ? "#fefce8" : "#f1f5f9", color: u.role === "ADMIN" ? "#991b1b" : u.role === "EDITOR" ? "#166534" : u.role === "REVIEWER" ? "#854d0e" : "#475569", padding: "3px 8px", borderRadius: "6px" }}>
                              {u.role}
                            </span>
                          </td>
                          <td style={{ padding: "12px 16px", color: "#64748b", fontSize: "12px" }}>
                            {new Date(u.createdAt).toLocaleDateString()}
                          </td>
                          <td style={{ padding: "12px 16px", color: "#64748b", fontSize: "12px" }}>
                            {u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleString() : "—"}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {(activeTab === "Сообщения" || activeTab === "messages") && (
            <div className="article-panel" style={{ padding: "24px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                <h2 style={{ margin: 0 }}>Чат Редакции с Авторами ({messagesList.length})</h2>
                <small style={{ color: "#16a34a", fontWeight: "bold" }}>● Real-Time Sync Active</small>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "240px 1fr", gap: "20px", border: "1px solid #e2e8f0", borderRadius: "12px", background: "#ffffff", overflow: "hidden", minHeight: "480px" }}>
                {/* LEFT CONVERSATIONS SIDEBAR */}
                <div style={{ borderRight: "1px solid #e2e8f0", background: "#f8fafc", padding: "16px 12px" }}>
                  <div style={{ fontSize: "11px", fontWeight: "800", color: "#64748b", textTransform: "uppercase", marginBottom: "12px", paddingLeft: "8px" }}>
                    💬 Диалоги с авторами
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                    <button
                      onClick={() => setSelectedAuthorEmail("all")}
                      style={{
                        textAlign: "left",
                        padding: "10px 12px",
                        borderRadius: "8px",
                        border: "none",
                        background: selectedAuthorEmail === "all" ? "#2563eb" : "transparent",
                        color: selectedAuthorEmail === "all" ? "#ffffff" : "#1e293b",
                        fontWeight: selectedAuthorEmail === "all" ? "800" : "600",
                        fontSize: "13px",
                        cursor: "pointer",
                      }}
                    >
                      👥 Все сообщения ({messagesList.length})
                    </button>
                    {authorsList.map((au) => (
                      <button
                        key={au.email}
                        onClick={() => setSelectedAuthorEmail(au.email)}
                        style={{
                          textAlign: "left",
                          padding: "10px 12px",
                          borderRadius: "8px",
                          border: "none",
                          background: selectedAuthorEmail === au.email ? "#2563eb" : "transparent",
                          color: selectedAuthorEmail === au.email ? "#ffffff" : "#1e293b",
                          fontWeight: selectedAuthorEmail === au.email ? "800" : "500",
                          fontSize: "12px",
                          cursor: "pointer",
                          display: "flex",
                          flexDirection: "column",
                          gap: "2px",
                        }}
                      >
                        <span>👤 {au.name}</span>
                        <small style={{ opacity: selectedAuthorEmail === au.email ? 0.9 : 0.6, fontSize: "10px" }}>{au.email}</small>
                      </button>
                    ))}
                  </div>
                </div>

                {/* RIGHT CHAT WINDOW */}
                <div style={{ display: "flex", flexDirection: "column", padding: "16px" }}>
                  <div style={{ flex: 1, minHeight: "340px", maxHeight: "420px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "12px", padding: "12px", background: "#fafcfd", borderRadius: "8px", border: "1px solid #f1f5f9", marginBottom: "16px" }}>
                    {messagesList.length === 0 ? (
                      <div style={{ padding: "40px", textAlign: "center", color: "#94a3b8" }}>
                        Сообщений пока нет. Чат обновляется в режиме реального времени.
                      </div>
                    ) : (
                      messagesList.map((m) => (
                        <div
                          key={m.id}
                          style={{
                            alignSelf: m.role === "editor" ? "flex-end" : "flex-start",
                            background: m.role === "editor" ? "#2563eb" : "#ffffff",
                            color: m.role === "editor" ? "#ffffff" : "#0f172a",
                            border: m.role === "editor" ? "none" : "1px solid #cbd5e1",
                            padding: "10px 16px",
                            borderRadius: "12px",
                            maxWidth: "75%",
                            boxShadow: "0 2px 6px rgba(0,0,0,0.04)",
                          }}
                        >
                          <small style={{ display: "block", fontSize: "10px", opacity: 0.8, marginBottom: "4px", fontWeight: "700" }}>
                            {m.sender} • {m.time}
                          </small>
                          <div style={{ fontSize: "13px", lineHeight: 1.45, whiteSpace: "pre-wrap" }}>{m.text}</div>
                        </div>
                      ))
                    )}
                  </div>
                  <form onSubmit={handleSendMessage} style={{ display: "flex", gap: "10px" }}>
                    <input
                      value={chatMessage}
                      onChange={(e) => setChatMessage(e.target.value)}
                      placeholder="Напишите сообщение автору... (нажмите Enter для отправки)"
                      style={{ flex: 1, padding: "12px 16px", border: "1px solid #cbd5e1", borderRadius: "8px", fontSize: "13px", outline: "none" }}
                    />
                    <button
                      type="submit"
                      style={{ background: "#2563eb", color: "#ffffff", border: "none", padding: "12px 24px", borderRadius: "8px", fontWeight: "800", fontSize: "13px", cursor: "pointer", boxShadow: "0 4px 12px rgba(37,99,235,0.3)" }}
                    >
                      ↗ Отправить
                    </button>
                  </form>
                </div>
              </div>
            </div>
          )}

          {activeTab === "Настройки" && (
            <div className="article-panel" style={{ padding: "28px" }}>
              <h2>Настройки Редакционной Коллегии</h2>
              <div style={{ marginTop: "20px", display: "flex", flexDirection: "column", gap: "16px", maxWidth: "480px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "11px", fontWeight: "bold", marginBottom: "4px" }}>Название журнала:</label>
                  <input defaultValue="Expert — International Scientific Journal" readOnly style={{ width: "100%", padding: "10px", border: "1px solid #ccc", borderRadius: "6px" }} />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "11px", fontWeight: "bold", marginBottom: "4px" }}>ISSN (Online / Print):</label>
                  <input defaultValue="2181-1423 / 2181-1415" readOnly style={{ width: "100%", padding: "10px", border: "1px solid #ccc", borderRadius: "6px" }} />
                </div>
                <div style={{ marginTop: "20px", paddingTop: "20px", borderTop: "1px solid #eee" }}>
                  <button onClick={logout} style={{ background: "#c82a38", color: "#fff", border: "none", padding: "12px 24px", borderRadius: "6px", fontWeight: "bold", cursor: "pointer" }}>
                    ⇥ Выйти из кабинета
                  </button>
                </div>
              </div>
            </div>
          )}
        </main>

        {/* ASSIGN REVIEWER MODAL */}
        {showAssignModal && targetArticleForAssign && (
          <div style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.65)", backdropFilter: "blur(4px)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}>
            <div style={{ background: "#ffffff", borderRadius: "16px", width: "100%", maxWidth: "620px", padding: "28px", boxShadow: "0 20px 25px -5px rgba(0,0,0,0.2)", border: "1px solid #e2e8f0" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                <h3 style={{ fontSize: "18px", fontWeight: "800", color: "#0f172a", margin: 0 }}>👨‍⚖️ Назначить рецензента (Assign Reviewer)</h3>
                <button onClick={() => setShowAssignModal(false)} style={{ background: "none", border: "none", fontSize: "18px", cursor: "pointer", color: "#64748b" }}>✕</button>
              </div>

              <div style={{ background: "#f8fafc", padding: "12px 16px", borderRadius: "8px", border: "1px solid #e2e8f0", marginBottom: "16px" }}>
                <div style={{ fontSize: "11px", textTransform: "uppercase", color: "#64748b", fontWeight: "700" }}>Рукопись для экспертизы:</div>
                <div style={{ fontSize: "13px", fontWeight: "800", color: "#0f172a", marginTop: "2px" }}>{targetArticleForAssign.title}</div>
                <div style={{ fontSize: "11px", color: "#2563eb", marginTop: "2px" }}>Категория: {targetArticleForAssign.scientificField || "Правовые исследования"}</div>
              </div>

              {/* SEARCH REVIEWER INPUT */}
              <div style={{ marginBottom: "12px" }}>
                <label style={{ display: "block", fontSize: "12px", fontWeight: "700", color: "#334155", marginBottom: "6px" }}>
                  🔍 Поиск рецензентов в реестре системы:
                </label>
                <input
                  type="text"
                  value={reviewerSearchQuery}
                  onChange={(e) => setReviewerSearchQuery(e.target.value)}
                  placeholder="Поиск по имени, email или организации..."
                  style={{ width: "100%", padding: "10px 12px", border: "1px solid #cbd5e1", borderRadius: "8px", fontSize: "13px", outline: "none" }}
                />
              </div>

              {/* REGISTERED REVIEWERS LIST */}
              <div style={{ maxHeight: "180px", overflowY: "auto", border: "1px solid #e2e8f0", borderRadius: "8px", marginBottom: "16px", background: "#fafafa" }}>
                {(() => {
                  const reviewersPool = systemUsers;

                  const filtered = reviewersPool.filter((u) => {
                    if (!reviewerSearchQuery.trim()) return true;
                    const q = reviewerSearchQuery.toLowerCase();
                    return (u.fullName || "").toLowerCase().includes(q) || (u.email || "").toLowerCase().includes(q);
                  });

                  if (filtered.length === 0) {
                    return <div style={{ padding: "16px", textAlign: "center", fontSize: "12px", color: "#94a3b8" }}>Пользователи не найдены. Введите email ниже вручную.</div>;
                  }

                  return filtered.map((u) => {
                    const isSelected = reviewerEmailInput.toLowerCase() === u.email.toLowerCase();
                    return (
                      <div
                        key={u.id || u.email}
                        onClick={() => setReviewerEmailInput(u.email)}
                        style={{
                          padding: "10px 14px",
                          borderBottom: "1px solid #f1f5f9",
                          background: isSelected ? "#eff6ff" : "#ffffff",
                          cursor: "pointer",
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          transition: "background 0.15s ease",
                        }}
                      >
                        <div>
                          <div style={{ fontSize: "13px", fontWeight: "700", color: "#0f172a" }}>
                            👤 {u.fullName} {isSelected && <span style={{ color: "#2563eb", fontSize: "11px" }}>✓ Выбран</span>}
                          </div>
                          <div style={{ fontSize: "11px", color: "#64748b" }}>{u.email} • {u.institution || "Эксперт ESJ"}</div>
                        </div>
                        <span style={{ fontSize: "11px", fontWeight: "700", background: isSelected ? "#2563eb" : "#f1f5f9", color: isSelected ? "#fff" : "#475569", padding: "3px 8px", borderRadius: "6px" }}>
                          {isSelected ? "Выбран" : "Выбрать"}
                        </span>
                      </div>
                    );
                  });
                })()}
              </div>

              <div style={{ marginBottom: "16px" }}>
                <label style={{ display: "block", fontSize: "12px", fontWeight: "700", color: "#334155", marginBottom: "6px" }}>
                  Email выбранного рецензента *
                </label>
                <input
                  type="email"
                  value={reviewerEmailInput}
                  onChange={(e) => setReviewerEmailInput(e.target.value)}
                  placeholder="например: reviewer@expert.uz"
                  style={{ width: "100%", padding: "10px 12px", border: "1px solid #cbd5e1", borderRadius: "8px", fontSize: "13px", outline: "none" }}
                />
              </div>

              <div style={{ marginBottom: "20px" }}>
                <label style={{ display: "block", fontSize: "12px", fontWeight: "700", color: "#334155", marginBottom: "6px" }}>
                  Инструкции / Сопроводительное письмо для рецензента:
                </label>
                <textarea
                  rows={3}
                  value={reviewerNoteInput}
                  onChange={(e) => setReviewerNoteInput(e.target.value)}
                  style={{ width: "100%", padding: "10px 12px", border: "1px solid #cbd5e1", borderRadius: "8px", fontSize: "12px", outline: "none" }}
                />
              </div>

              <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
                <button
                  onClick={() => setShowAssignModal(false)}
                  style={{ padding: "10px 18px", border: "1px solid #cbd5e1", background: "#fff", borderRadius: "8px", fontWeight: "700", cursor: "pointer", color: "#475569" }}
                >
                  Отмена
                </button>
                <button
                  onClick={handleConfirmAssignReviewer}
                  style={{ padding: "10px 20px", background: "#2563eb", color: "#fff", border: "none", borderRadius: "8px", fontWeight: "700", cursor: "pointer" }}
                >
                  ↗ Назначить и отправить
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}