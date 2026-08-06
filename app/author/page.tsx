"use client";

import { useMemo, useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import {
  getStoredArticles,
  addArticleToStore,
  getStoredMessages,
  addMessageToStore,
  getStoredIssues,
  StoredArticle,
  StoredMessage,
  downloadManuscriptFile,
  syncStoreWithServer,
  searchArticlesInStore,
} from "@/lib/articles-store";
import { useSupabaseRealtime } from "@/lib/supabase-realtime";
import { useLanguage } from "@/lib/i18n-context";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import NotificationCenter from "@/components/NotificationCenter";
import "./author.css";

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
  keywords?: { keyword: { name: string } }[];
  authors?: { author: { id: string; fullName: string; institution?: string } }[];
}

const statusMap: Record<string, string> = {
  DRAFT: "Черновик",
  SUBMITTED: "На рассмотрении",
  UNDER_REVIEW: "На рассмотрении",
  REVISION_REQUIRED: "Требует доработки",
  ACCEPTED: "Принято",
  REJECTED: "Отклонено",
  PUBLISHED: "Опубликовано",
  WITHDRAWN: "Отозвано",
};

const nav = [
  ["⌂", "Главная"],
  ["▤", "Мои статьи"],
  ["↗", "Подать статью"],
  ["✉", "Сообщения"],
  ["⚙", "Настройки"],
];

export default function AuthorDashboard() {
  const { user, logout, updateProfile } = useAuth();
  const router = useRouter();
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState("dashboard");
  const [filter, setFilter] = useState("ALL");
  const [query, setQuery] = useState("");

  const [articles, setArticles] = useState<ApiArticle[]>([]);
  const [fetching, setFetching] = useState(true);

  // Profile Edit State
  const [editFirstName, setEditFirstName] = useState("");
  const [editLastName, setEditLastName] = useState("");
  const [editOrcid, setEditOrcid] = useState("");
  const [editInstitution, setEditInstitution] = useState("");
  const [editAvatarUrl, setEditAvatarUrl] = useState("");
  const [profileSuccessMsg, setProfileSuccessMsg] = useState("");

  useEffect(() => {
    if (user) {
      setEditFirstName(user.firstName || "Иван");
      setEditLastName(user.lastName || "Иванов");
      setEditOrcid(user.orcid || "0009-0005-4729-1186");
      setEditInstitution(user.institution || "Автор журнала");
      setEditAvatarUrl(user.avatarUrl || "");
    }
  }, [user]);

  // Submission Form State (Simplified 4 steps: 1 Start/Upload, 2 Details, 3 Co-authors, 4 Review)
  const [submissionStep, setSubmissionStep] = useState(1);
  const [stepError, setStepError] = useState("");
  const [articleType, setArticleType] = useState("Оригинальная научная статья");
  const [newTitle, setNewTitle] = useState("");
  const [newAbstract, setNewAbstract] = useState("");
  const [newField, setNewField] = useState("Право и правовые исследования");
  const [newLanguage, setNewLanguage] = useState("Русский");
  const [newKeywords, setNewKeywords] = useState("право, юридические науки, законодательство");
  const [coAuthorsText, setCoAuthorsText] = useState("");
  const [manuscriptFile, setManuscriptFile] = useState<File | null>(null);
  const [isSubmittingForm, setIsSubmittingForm] = useState(false);

  const handleNextStepClick = () => {
    setStepError("");

    if (submissionStep === 1) {
      if (!newTitle.trim()) {
        setStepError("⚠️ Пожалуйста, введите название вашей статьи!");
        return;
      }
      if (!newAbstract.trim()) {
        setStepError("⚠️ Пожалуйста, введите аннотацию статьи!");
        return;
      }
      if (!newKeywords.trim()) {
        setStepError("⚠️ Пожалуйста, введите ключевые слова!");
        return;
      }
      if (!manuscriptFile) {
        setStepError("⚠️ Пожалуйста, загрузите файл вашей рукописи (DOCX или PDF)!");
        return;
      }
    }

    if (submissionStep === 2) {
      if (!newField.trim()) {
        setStepError("⚠️ Пожалуйста, выберите научную область!");
        return;
      }
    }

    setSubmissionStep((s) => Math.min(4, s + 1));
  };

  const handleSelectStep = (targetStep: number) => {
    setStepError("");
    if (targetStep > 1) {
      if (!newTitle.trim() || !newAbstract.trim() || !newKeywords.trim() || !manuscriptFile) {
        setStepError("⚠️ Переход невозможен! Заполните все поля Шага 1 и обязательно загрузите файл рукописи (DOCX/PDF).");
        return;
      }
    }
    setSubmissionStep(targetStep);
  };

  // Edit & Resubmit Modal State
  const [editingArticle, setEditingArticle] = useState<ApiArticle | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editModalMode, setEditModalMode] = useState<"DRAFT" | "RESUBMIT">("DRAFT");
  const [editTitle, setEditTitle] = useState("");
  const [editAbstract, setEditAbstract] = useState("");
  const [editField, setEditField] = useState("Право и правовые исследования");
  const [editKeywords, setEditKeywords] = useState("");
  const [editFile, setEditFile] = useState<File | null>(null);

  // Messages State
  const [chatInput, setChatInput] = useState("");
  const [chatMessages, setChatMessages] = useState<StoredMessage[]>([]);

  const handleOpenEditModal = (article: ApiArticle) => {
    setEditingArticle(article);
    setEditTitle(article.title);
    setEditAbstract(article.abstract);
    setEditField(article.scientificField || "Право и правовые исследования");
    setEditKeywords((article.keywords || []).map((k) => k.keyword.name).join(", "));
    setEditFile(null);
    setEditModalMode("DRAFT");
    setShowEditModal(true);
  };

  const handleOpenResubmitModal = (article: ApiArticle) => {
    setEditingArticle(article);
    setEditTitle(article.title);
    setEditAbstract(article.abstract);
    setEditField(article.scientificField || "Право и правовые исследования");
    setEditKeywords((article.keywords || []).map((k) => k.keyword.name).join(", "));
    setEditFile(null);
    setEditModalMode("RESUBMIT");
    setShowEditModal(true);
  };

  const handleSaveEditedArticle = async (asDraft = false) => {
    if (!editingArticle) return;
    if (!editTitle.trim()) {
      alert("Пожалуйста, введите название статьи!");
      return;
    }

    // Mandatory file check for resubmission or final submission
    if (!asDraft && editModalMode === "RESUBMIT" && !editFile && !editingArticle.fileUrl) {
      alert(t.fileRequiredError || "Загрузка файла рукописи (DOCX или PDF) обязательна!");
      return;
    }

    setIsSubmittingForm(true);
    try {
      let uploadedUrl = editingArticle.fileUrl;
      let uploadedName = editFile ? editFile.name : editingArticle.fileName || "manuscript.pdf";

      if (editFile) {
        try {
          const bodyFormData = new FormData();
          bodyFormData.append("file", editFile);
          const uploadRes = await fetch("/api/upload", {
            method: "POST",
            body: bodyFormData,
          });
          if (uploadRes.ok) {
            const json = await uploadRes.json();
            if (json.fileUrl) {
              uploadedUrl = json.fileUrl;
              uploadedName = json.fileName || editFile.name;
            }
          }
        } catch (e) {
          console.error("Upload error during edit:", e);
        }
      }

      const kwArray = editKeywords.split(",").map((k) => k.trim()).filter(Boolean);
      const newStatus = asDraft
        ? "DRAFT"
        : editModalMode === "RESUBMIT"
        ? "SUBMITTED"
        : editingArticle.status === "DRAFT"
        ? "SUBMITTED"
        : editingArticle.status;

      const authorName = user ? `${user.firstName} ${user.lastName}` : "Иван Абдуллаев";
      const updatedItem: StoredArticle = {
        id: editingArticle.id,
        title: editTitle,
        abstract: editAbstract,
        scientificField: editField,
        keywords: kwArray,
        status: newStatus as any,
        submissionDate: editingArticle.submissionDate || new Date().toISOString().split("T")[0],
        lastUpdated: new Date().toISOString().split("T")[0],
        authorName,
        authorEmail: user?.email,
        fileName: uploadedName,
        fileUrl: uploadedUrl,
        reviewNote: editModalMode === "RESUBMIT" ? editingArticle.reviewNote : editingArticle.reviewNote,
      };

      addArticleToStore(updatedItem);
      await loadAuthorData();
      setShowEditModal(false);
      setEditingArticle(null);
    } catch (e) {
      console.error("Error saving edited article:", e);
    } finally {
      setIsSubmittingForm(false);
    }
  };

  const loadAuthorData = useCallback(async () => {
    try {
      setFetching(true);
      await syncStoreWithServer();
      const storedList = getStoredArticles();

      // STRICT USER FILTERING: Show ONLY articles that belong to this logged-in user
      const userEmail = (user?.email || "").toLowerCase().trim();
      const userName = user ? `${user.firstName} ${user.lastName}`.toLowerCase().trim() : "";

      const userOnlyStoredList = storedList.filter((a) => {
        if (!userEmail && !userName) return false;
        const aEmail = (a.authorEmail || "").toLowerCase().trim();
        const aName = (a.authorName || "").toLowerCase().trim();

        return (
          (userEmail && aEmail && (aEmail === userEmail || aEmail.includes(userEmail))) ||
          (userName && aName && aName.includes(userName))
        );
      });

      const loadedArticles: ApiArticle[] = userOnlyStoredList.map((a) => ({
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
        keywords: (a.keywords || []).map((k) => ({ keyword: { name: k } })),
        authors: [{ author: { id: "au-1", fullName: a.authorName, institution: "Expert Journal" } }],
      }));

      setArticles(loadedArticles);
      setChatMessages(getStoredMessages());
    } catch (err) {
      console.error("Author dashboard fetch error:", err);
    } finally {
      setFetching(false);
    }
  }, [user]);

  useEffect(() => {
    loadAuthorData();
    const timer = setInterval(async () => {
      await syncStoreWithServer();
      setChatMessages(getStoredMessages());
    }, 2000);
    return () => clearInterval(timer);
  }, [loadAuthorData]);

  const handleOpenChatForArticle = (articleTitle: string) => {
    setChatInput(`📌 Обсуждение статьи: "${articleTitle}" — `);
    setActiveTab("messages");
  };

  useSupabaseRealtime("articles", loadAuthorData);
  useSupabaseRealtime("messages", loadAuthorData);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateProfile({
        firstName: editFirstName,
        lastName: editLastName,
        orcid: editOrcid,
        institution: editInstitution,
        avatarUrl: editAvatarUrl,
      });
      setProfileSuccessMsg("✓ Изменения профиля успешно сохранены!");
      setTimeout(() => setProfileSuccessMsg(""), 4000);
    } catch (error) {
      console.error("Profile update error:", error);
    }
  };

  const handleAvatarFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        const dataUrl = event.target.result as string;
        setEditAvatarUrl(dataUrl);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleCreateFullArticle = async (isDraft = false) => {
    if (!newTitle.trim()) {
      alert("Пожалуйста, введите название вашей статьи!");
      return;
    }

    if (!isDraft && !manuscriptFile) {
      alert(t.fileRequiredError || "Загрузка файла рукописи (DOCX или PDF) обязательна!");
      return;
    }

    setIsSubmittingForm(true);
    const kwArray = newKeywords.split(",").map((k) => k.trim()).filter(Boolean);
    const articleId = "art-" + Date.now();

    try {
      let uploadedFileUrl: string | undefined = undefined;
      let uploadedFileName: string = manuscriptFile ? manuscriptFile.name : "manuscript.pdf";

      if (manuscriptFile) {
        try {
          const bodyFormData = new FormData();
          bodyFormData.append("file", manuscriptFile);
          const uploadRes = await fetch("/api/upload", {
            method: "POST",
            body: bodyFormData,
          });
          if (uploadRes.ok) {
            const uploadJson = await uploadRes.json();
            if (uploadJson.fileUrl) {
              uploadedFileUrl = uploadJson.fileUrl;
              uploadedFileName = uploadJson.fileName || manuscriptFile.name;
            }
          }
        } catch (e) {
          console.error("File upload error:", e);
        }
      }

      const authorName = user ? `${user.firstName} ${user.lastName}` : "Иван Абдуллаев";
      const storedArticle: StoredArticle = {
        id: articleId,
        title: newTitle,
        abstract: newAbstract || "Аннотация статьи загружена автором.",
        scientificField: newField,
        language: newLanguage,
        keywords: kwArray,
        status: isDraft ? "DRAFT" : "SUBMITTED",
        submissionDate: new Date().toISOString().split("T")[0],
        lastUpdated: new Date().toISOString().split("T")[0],
        authorName,
        authorEmail: user?.email || "author@journal.ru",
        fileName: uploadedFileName,
        fileUrl: uploadedFileUrl,
      };

      const updatedStore = addArticleToStore(storedArticle);
      const mappedArticles: ApiArticle[] = updatedStore.map((a) => ({
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
        keywords: (a.keywords || []).map((k) => ({ keyword: { name: k } })),
        authors: [{ author: { id: "au-1", fullName: a.authorName, institution: "Expert Journal" } }],
      }));
      setArticles(mappedArticles);
      await loadAuthorData();

      setNewTitle("");
      setNewAbstract("");
      setManuscriptFile(null);
      setSubmissionStep(1);
      setActiveTab("myArticles");
    } catch (error) {
      console.error(error);
    } finally {
      setIsSubmittingForm(false);
    }
  };

  const handleSendChatMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const newMsg: StoredMessage = {
      id: "c-" + Date.now(),
      sender: `${user?.firstName || "Автор"} ${user?.lastName || ""}`,
      role: "author",
      text: chatInput,
      time: new Date().toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" }),
    };

    const updated = addMessageToStore(newMsg);
    setChatMessages(updated);
    setChatInput("");
  };

  const handleLogout = () => {
    logout();
    router.push("/home");
  };

  const initials = user ? `${user.firstName?.[0] || 'И'}${user.lastName?.[0] || 'И'}`.toUpperCase() : "ИИ";

  const pendingCount = articles.filter((a) => a.status === "SUBMITTED" || a.status === "UNDER_REVIEW").length;
  const revisionCount = articles.filter((a) => a.status === "REVISION_REQUIRED").length;
  const publishedCount = articles.filter((a) => a.status === "PUBLISHED").length;
  const draftsCount = articles.filter((a) => a.status === "DRAFT").length;

  const [authorSearchResults, setAuthorSearchResults] = useState<ApiArticle[]>([]);

  useEffect(() => {
    async function executeAuthorSearch() {
      let mappedStatus = "";
      if (filter === "На рассмотрении") mappedStatus = "SUBMITTED";
      if (filter === "Требует доработки") mappedStatus = "REVISION_REQUIRED";
      if (filter === "Опубликовано") mappedStatus = "PUBLISHED";
      if (filter === "Черновик") mappedStatus = "DRAFT";

      const res = await searchArticlesInStore({
        q: query,
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
        setAuthorSearchResults(mapped);
      }
    }
    executeAuthorSearch();
  }, [query, filter, articles]);

  const visibleArticles = authorSearchResults;

  const revisionRequiredArticles = articles.filter((a) => a.status === "REVISION_REQUIRED" && Boolean(a.reviewNote));

  const abstractWordCount = newAbstract.trim() ? newAbstract.trim().split(/\s+/).length : 0;
  const keywordsList = newKeywords.split(",").map((k) => k.trim()).filter(Boolean);

  return (
    <div className="author-app">
      <aside className="author-side">
        <a className="author-logo" href="/home">
          <span>e</span>
          <b>Expert</b>
          <small>scientific journal</small>
        </a>
        <div className="author-nav">
          {[
            { icon: "⌂", id: "dashboard", label: t.dashboard },
            { icon: "▤", id: "myArticles", label: t.myArticles, count: articles.length },
            { icon: "↗", id: "submitArticle", label: t.submitArticle },
            { icon: "✉", id: "messages", label: t.messages },
            { icon: "⚙", id: "settings", label: t.settings },
          ].map((n) => {
            const isCurrent = activeTab === n.id || activeTab === n.label || (activeTab === "Главная" && n.id === "dashboard") || (activeTab === "Подать статью" && n.id === "submitArticle") || (activeTab === "Мои статьи" && n.id === "myArticles") || (activeTab === "Сообщения" && n.id === "messages") || (activeTab === "Настройки" && n.id === "settings");
            return (
              <button
                className={isCurrent ? "nav-current" : ""}
                key={n.id}
                onClick={() => setActiveTab(n.id)}
              >
                <i>{n.icon}</i>
                <span>{n.label}</span>
                {n.count !== undefined && n.count > 0 && <em>{n.count}</em>}
              </button>
            );
          })}
        </div>
      </aside>

      <div className="author-main">
        <header className="author-head">
          <div>
            <small>{t.authorCabinet}</small>
            <b>{activeTab === "dashboard" || activeTab === "Главная" ? t.dashboard : activeTab === "myArticles" || activeTab === "Мои статьи" ? t.myArticles : activeTab === "submitArticle" || activeTab === "Подать статью" ? t.submitArticle : activeTab === "messages" || activeTab === "Сообщения" ? t.messages : t.settings}</b>
          </div>
          <label className="dash-search" style={{ position: "relative", display: "flex", alignItems: "center" }}>
            <i>⌕</i>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t.home === "Bosh sahifa" ? "Qidiruv: sarlavha, DOI, kalit so'zlar..." : t.home === "Home" ? "Search articles, DOI, keywords..." : "Поиск статей, DOI, ключевых слов..."}
              style={{ paddingRight: query ? "32px" : "12px" }}
            />
            {query && (
              <button
                onClick={() => setQuery("")}
                style={{ position: "absolute", right: "10px", background: "none", border: "none", color: "#64748b", cursor: "pointer", fontSize: "14px", fontWeight: "bold" }}
                title="Clear search"
              >
                ✕
              </button>
            )}
          </label>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <NotificationCenter role="author" />
            <LanguageSwitcher />
          </div>
          <div className="person">
            {user?.avatarUrl ? (
              <img src={user.avatarUrl} alt="Avatar" style={{ width: 34, height: 34, borderRadius: "50%", objectFit: "cover", border: "2px solid #cbd5e1" }} />
            ) : (
              <span>{initials}</span>
            )}
            <div>
              <b>{user?.firstName || "Иван"} {user?.lastName || "Иванов"}</b>
              <small>{user?.institution || "Автор журнала"}</small>
            </div>
          </div>
        </header>

        <main className="dash-content">
          {revisionRequiredArticles.length > 0 && (
            <div style={{ background: "#fefce8", border: "1px solid #fef08a", borderRadius: "10px", padding: "16px 20px", marginBottom: "24px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <span style={{ fontSize: "20px" }}>⚠️</span>
                <div>
                  <h4 style={{ margin: 0, fontSize: "14px", fontWeight: "800", color: "#854d0e" }}>{t.editorNotes || "Требуется исправление статьи"}</h4>
                  <p style={{ margin: "2px 0 0", fontSize: "12px", color: "#a16207" }}>
                    Редактор отправил замечания к вашей статье: "{revisionRequiredArticles[0].title}". Нажмите «Исправить», чтобы внести правки.
                  </p>
                </div>
              </div>
              <button
                onClick={() => handleOpenResubmitModal(revisionRequiredArticles[0])}
                style={{ background: "#eab308", color: "#fff", border: "none", padding: "8px 16px", borderRadius: "6px", fontWeight: "bold", cursor: "pointer", fontSize: "12px", whiteSpace: "nowrap" }}
              >
                🔄 Исправить статью
              </button>
            </div>
          )}

          {(activeTab === "dashboard" || activeTab === "Главная") && (
            <div className="dash-home">
              <section className="dash-welcome">
                <div>
                  <h1>Рады видеть вас, {user?.firstName || "author"}.</h1>
                  <p>Управляйте публикациями, отслеживайте статус статей и общайтесь с редакцией в одном месте.</p>
                  <small style={{ display: "block", color: "#94a3b8", fontSize: "11px", marginTop: "4px" }}>ID ORCID · 0009-0005-4729-1186</small>
                </div>
                <div style={{ display: "flex", gap: "10px" }}>
                  <button className="primary" onClick={() => setActiveTab("submitArticle")}>
                    ↗ Подать новую статью
                  </button>
                  <button className="secondary" onClick={() => setActiveTab("myArticles")}>
                    Мои статьи ({articles.length})
                  </button>
                </div>
              </section>

              <section className="dash-stats">
                <div className="dash-stat">
                  <i className="blue">▤</i>
                  <div>
                    <span>На рассмотрении</span>
                    <strong>{pendingCount}</strong>
                    <small>Отправлены в редакцию</small>
                  </div>
                </div>
                <div className="dash-stat">
                  <i className="orange">↶</i>
                  <div>
                    <span>Требуют доработки</span>
                    <strong>{revisionCount}</strong>
                    <small>Требуется действие</small>
                  </div>
                </div>
                <div className="dash-stat">
                  <i className="emerald" style={{ background: "#d1fae5", color: "#059669" }}>⚖️</i>
                  <div>
                    <span>Принято</span>
                    <strong>{articles.filter((a) => a.status === "ACCEPTED").length}</strong>
                    <small>Принято к публикации</small>
                  </div>
                </div>
                <div className="dash-stat">
                  <i className="green">✓</i>
                  <div>
                    <span>Опубликовано</span>
                    <strong>{publishedCount}</strong>
                    <small>Принято и издано</small>
                  </div>
                </div>
                <div className="dash-stat">
                  <i className="purple">◫</i>
                  <div>
                    <span>Черновики</span>
                    <strong>{draftsCount}</strong>
                    <small>В процессе</small>
                  </div>
                </div>
              </section>

              <section className="article-panel">
                <div className="panel-head">
                  <h2>Мои последние статьи</h2>
                </div>
                <div className="article-table">
                  <div className="table-head">
                    <span>Название статьи</span>
                    <span>Статус</span>
                    <span>Отправлено</span>
                    <span>Обновлено</span>
                  </div>
                  {articles.length === 0 ? (
                    <div style={{ padding: "30px", textAlign: "center", color: "#888" }}>Статей пока нет. Нажмите «Подать статью», чтобы подать новую рукопись.</div>
                  ) : (
                    articles.slice(0, 3).map((art) => (
                      <div className="table-row" key={art.id}>
                        <div>
                          <b>{art.title}</b>
                          <small>{art.scientificField || "Научное исследование"}</small>
                        </div>
                        <span className={`status ${art.status === "PUBLISHED" ? "Опубликовано" : art.status === "DRAFT" ? "Черновик" : "На-рассмотрении"}`}>
                          {statusMap[art.status] || art.status}
                        </span>
                        <span>{art.submissionDate || "2026-07-28"}</span>
                        <span>{art.lastUpdated}</span>
                      </div>
                    ))
                  )}
                </div>
              </section>
            </div>
          )}

          {(activeTab === "myArticles" || activeTab === "Мои статьи") && (
            <section className="article-panel">
              <div className="panel-head">
                <div>
                  <h2>Мои статьи ({visibleArticles.length})</h2>
                  <span>Полный реестр отправленных и подготовленных исследований</span>
                </div>
                <select value={filter} onChange={(e) => setFilter(e.target.value)} style={{ padding: "6px 12px", borderRadius: "6px", border: "1px solid #cbd5e1" }}>
                  <option>Все статусы</option>
                  <option>На рассмотрении</option>
                  <option>Требует доработки</option>
                  <option>Опубликовано</option>
                  <option>Черновик</option>
                </select>
              </div>
              <div className="article-table">
                <div className="table-head">
                  <span>Название статьи</span>
                  <span>Статус</span>
                  <span>Дата отправки</span>
                  <span>Обновление</span>
                  <span>Действия</span>
                </div>
                {visibleArticles.length === 0 ? (
                  <div style={{ padding: "30px", textAlign: "center", color: "#888" }}>В выбранном статусе статей не найдено.</div>
                ) : (
                  visibleArticles.map((art) => (
                    <div className="table-row" key={art.id}>
                      <div>
                        <b>{art.title}</b>
                        <small>{art.scientificField || "Право и правовые исследования"}</small>
                        {art.status === "REVISION_REQUIRED" && art.reviewNote && (
                          <div style={{ marginTop: "6px", fontSize: "11px", color: "#b45309", background: "#fef3c7", border: "1px solid #fde68a", padding: "6px 10px", borderRadius: "6px" }}>
                            <b>{t.editorNotes || "Замечания редактора:"}</b> {art.reviewNote}
                          </div>
                        )}
                      </div>
                      <span className={`status ${art.status === "PUBLISHED" ? "Опубликовано" : art.status === "DRAFT" ? "Черновик" : "На-рассмотрении"}`}>
                        {statusMap[art.status] || art.status}
                      </span>
                      <span>{art.submissionDate || "2026-07-28"}</span>
                      <span>{art.lastUpdated}</span>
                      <div className="row-actions" style={{ display: "flex", gap: "6px", alignItems: "center", flexWrap: "wrap" }}>
                        {art.status === "DRAFT" && (
                          <button
                            title="Редактировать черновик"
                            onClick={() => handleOpenEditModal(art)}
                            style={{ background: "#2563eb", color: "#ffffff", border: "none", padding: "5px 10px", borderRadius: "5px", cursor: "pointer", fontSize: "12px", fontWeight: "bold" }}
                          >
                            {t.editDraft || "✏️ Edit"}
                          </button>
                        )}
                        {art.status === "REVISION_REQUIRED" && (
                          <button
                            title="Исправить и отправить повторно"
                            onClick={() => handleOpenResubmitModal(art)}
                            style={{ background: "#d97706", color: "#ffffff", border: "none", padding: "5px 10px", borderRadius: "5px", cursor: "pointer", fontSize: "12px", fontWeight: "bold" }}
                          >
                            {t.resubmitArticle || "🔄 Resent"}
                          </button>
                        )}
                        <button title="Скачать файл статьи" onClick={() => downloadManuscriptFile({ fileUrl: art.fileUrl, fileName: art.fileName, title: art.title, authorName: art.authors?.[0]?.author?.fullName, abstract: art.abstract })} style={{ background: "#e0f2fe", border: "none", color: "#0284c7", padding: "5px 10px", borderRadius: "5px", cursor: "pointer", fontSize: "12px", fontWeight: "bold" }}>📥 Скачать</button>
                        <button title="Чат с редакцией" onClick={() => handleOpenChatForArticle(art.title)} style={{ background: "#f1f5f9", border: "none", color: "#475569", padding: "5px 10px", borderRadius: "5px", cursor: "pointer", fontSize: "12px" }}>✉ Чат</button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </section>
          )}

          {/* SUBMISSION PANEL WITH STEP 2 REMOVED (4 STEPS) */}
          {(activeTab === "submitArticle" || activeTab === "Подать статью") && (
            <div className="submit-article-container">
              {/* LEFT MAIN STEPPER CARD */}
              <div className="submit-main-card">
                <div className="submit-header-info">
                  <h2>{t.submissionTitle}</h2>
                  <p>{t.submissionSubtitle}</p>
                </div>

                {/* 4 STEPS STEPPER BAR */}
                <div className="stepper-nav">
                  <div className="stepper-line" />
                  <div className={`stepper-item ${submissionStep === 1 ? "active" : submissionStep > 1 ? "completed" : ""}`} onClick={() => handleSelectStep(1)}>
                    <div className="stepper-circle">{submissionStep > 1 ? "✓" : "1"}</div>
                    <span className="stepper-label">Начало</span>
                  </div>
                  <div className={`stepper-item ${submissionStep === 2 ? "active" : submissionStep > 2 ? "completed" : ""}`} onClick={() => handleSelectStep(2)}>
                    <div className="stepper-circle">{submissionStep > 2 ? "✓" : "2"}</div>
                    <span className="stepper-label">Детали</span>
                  </div>
                  <div className={`stepper-item ${submissionStep === 3 ? "active" : submissionStep > 3 ? "completed" : ""}`} onClick={() => handleSelectStep(3)}>
                    <div className="stepper-circle">{submissionStep > 3 ? "✓" : "3"}</div>
                    <span className="stepper-label">Соавторы</span>
                  </div>
                  <div className={`stepper-item ${submissionStep === 4 ? "active" : ""}`} onClick={() => handleSelectStep(4)}>
                    <div className="stepper-circle">4</div>
                    <span className="stepper-label">Проверка и отправка</span>
                  </div>
                </div>

                {stepError && (
                  <div style={{ background: "#fef2f2", border: "1px solid #f87171", color: "#991b1b", padding: "14px 18px", borderRadius: "8px", marginBottom: "20px", fontSize: "13px", fontWeight: "800", display: "flex", alignItems: "center", gap: "10px" }}>
                    <span style={{ fontSize: "18px" }}>🛑</span>
                    <span>{stepError}</span>
                  </div>
                )}

                {/* STEP 1: START SUBMISSION */}
                {submissionStep === 1 && (
                  <div>
                    <div className="step-section-title">
                      <h3>Шаг 1: Начало подачи</h3>
                      <p>Выберите тип статьи и загрузите рукопись.</p>
                    </div>

                    <div className="form-group-custom">
                      <label>Тип статьи <span>*</span></label>
                      <select value={articleType} onChange={(e) => setArticleType(e.target.value)} className="custom-select-box">
                        <option value="Оригинальная научная статья">📄 Оригинальная научная статья — Полноразмерная оригинальная исследовательская работа</option>
                        <option value="Обзорная статья">🔍 Обзорная статья — Систематический научный обзор темы</option>
                        <option value="Краткое сообщение">⚡ Краткое сообщение — Краткий научный отчет</option>
                      </select>
                    </div>

                    <div className="form-group-custom">
                      <label>Название рукописи <span>*</span></label>
                      <input
                        value={newTitle}
                        onChange={(e) => setNewTitle(e.target.value)}
                        placeholder="Введите название вашей статьи..."
                        className="custom-input-field"
                      />
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                      <div className="form-group-custom">
                        <label>Аннотация <span>*</span></label>
                        <textarea
                          value={newAbstract}
                          onChange={(e) => setNewAbstract(e.target.value)}
                          placeholder="Введите аннотацию (150–300 слов)"
                          rows={4}
                          className="custom-textarea-field"
                        />
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", color: "#94a3b8", marginTop: "4px" }}>
                          <span>{abstractWordCount} / 300 слов</span>
                        </div>
                      </div>

                      <div className="form-group-custom">
                        <label>Ключевые слова <span>*</span></label>
                        <input
                          value={newKeywords}
                          onChange={(e) => setNewKeywords(e.target.value)}
                          placeholder="Введите ключевые слова через запятую"
                          className="custom-input-field"
                        />
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", color: "#94a3b8", marginTop: "4px" }}>
                          <span>{keywordsList.length} / 6 ключевых слов</span>
                          <span>Минимум 3, максимум 6</span>
                        </div>
                      </div>
                    </div>

                    {/* DRAG & DROP FILE BOX */}
                    <div className="dropzone-box">
                      <div className="dropzone-icon">☁️</div>
                      <div className="dropzone-text">Перетащите файлы сюда</div>
                      <div className="dropzone-or">или</div>
                      <label>
                        <span className="btn-browse">Выбрать файлы</span>
                        <input type="file" accept=".pdf,.doc,.docx,.tex" onChange={(e) => setManuscriptFile(e.target.files?.[0] || null)} style={{ display: "none" }} />
                      </label>
                      {manuscriptFile && (
                        <div style={{ marginTop: "10px", fontSize: "12px", color: "#10b981", fontWeight: "bold" }}>
                          ✓ Выбран файл рукописи: {manuscriptFile.name} ({Math.round(manuscriptFile.size / 1024)} KB)
                        </div>
                      )}
                      <div className="dropzone-sub">Допустимые форматы: DOCX, PDF, TEX | Максимальный размер: 20 МБ</div>
                    </div>
                  </div>
                )}

                {/* STEP 2: DETAILS */}
                {submissionStep === 2 && (
                  <div>
                    <div className="step-section-title">
                      <h3>Шаг 2: Детали статьи</h3>
                      <p>Укажите научную область и язык публикации.</p>
                    </div>

                    <div className="form-group-custom">
                      <label>Научная область <span>*</span></label>
                      <select value={newField} onChange={(e) => setNewField(e.target.value)} className="custom-select-box">
                        <option>Экономические науки</option>
                        <option>Финансы и Банковское дело</option>
                        <option>Цифровая экономика</option>
                        <option>Юридические науки</option>
                      </select>
                    </div>

                    <div className="form-group-custom">
                      <label>Язык рукописи <span>*</span></label>
                      <select value={newLanguage} onChange={(e) => setNewLanguage(e.target.value)} className="custom-select-box">
                        <option>Русский</option>
                        <option>Английский</option>
                        <option>Узбекский</option>
                      </select>
                    </div>
                  </div>
                )}

                {/* STEP 3: CO-AUTHORS */}
                {submissionStep === 3 && (
                  <div>
                    <div className="step-section-title">
                      <h3>Шаг 3: Соавторы статьи</h3>
                      <p>Укажите ФИО и места работы соавторов (при наличии).</p>
                    </div>

                    <div className="form-group-custom">
                      <label>Список соавторов и аффилиации</label>
                      <textarea
                        value={coAuthorsText}
                        onChange={(e) => setCoAuthorsText(e.target.value)}
                        placeholder="Например: Беҳзод Мадаминов (ТДЮУ), Сарвар Тўраев (Судьялар олий кенгаши)"
                        rows={4}
                        className="custom-textarea-field"
                      />
                    </div>
                  </div>
                )}

                {/* STEP 4: REVIEW & SUBMIT */}
                {submissionStep === 4 && (
                  <div>
                    <div className="step-section-title">
                      <h3>Шаг 4: Проверка и отправка</h3>
                      <p>Проверьте введённые данные перед окончательной отправкой в редакцию.</p>
                    </div>

                    <div style={{ background: "#f8fafc", padding: "16px", borderRadius: "8px", fontSize: "13px", lineHeight: "1.6", color: "#334155", marginBottom: "20px" }}>
                      <div><b>Название:</b> {newTitle || "Не указано"}</div>
                      <div><b>Тип статьи:</b> {articleType}</div>
                      <div><b>Область:</b> {newField}</div>
                      <div><b>Файл:</b> {manuscriptFile ? manuscriptFile.name : "рукопись.pdf"}</div>
                    </div>
                  </div>
                )}

                {/* BOTTOM ACTION BAR */}
                <div className="form-action-bar">
                  <button type="button" className="btn-draft" onClick={() => handleCreateFullArticle(true)}>
                    Сохранить как черновик
                  </button>

                  <div className="action-bar-right">
                    <button type="button" className="btn-cancel" onClick={() => setActiveTab("Главная")}>
                      Отмена
                    </button>

                    {submissionStep < 4 ? (
                      <button type="button" className="btn-continue" onClick={handleNextStepClick}>
                        Сохранить и продолжить →
                      </button>
                    ) : (
                      <button type="button" className="btn-continue" disabled={isSubmittingForm} onClick={() => handleCreateFullArticle(false)}>
                        {isSubmittingForm ? "Отправка..." : "↗ Подать статью в редакцию"}
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* RIGHT SIDEBAR PANEL MATCHING PHOTO 1:1 */}
              <aside className="submit-sidebar">
                {/* SUBMISSION GUIDELINES */}
                <div className="sidebar-card">
                  <div className="sidebar-card-title">
                    <i>📖</i> Руководство по подаче
                  </div>
                  <div className="sidebar-card-text">
                    Перед отправкой убедитесь, что ваша рукопись соответствует руководству автора.
                  </div>
                  <a href="/guidelines.pdf" download="author-guidelines.pdf" target="_blank" rel="noopener noreferrer" className="btn-sidebar-link">
                    📥 Скачать руководство
                  </a>
                </div>



                {/* TIPS FOR AUTHORS */}
                <div className="sidebar-card">
                  <div className="sidebar-card-title">
                    <i>💡</i> Советы для авторов
                  </div>
                  <ul className="tips-list">
                    <li><span>✓</span> Убедитесь, что рукопись оригинальна.</li>
                    <li><span>✓</span> Тщательно соблюдайте формат журнала.</li>
                    <li><span>✓</span> Проверьте грамматику и список литературы.</li>
                    <li><span>✓</span> Предоставляйте чёткие иллюстрации высокого качества.</li>
                    <li><span>✓</span> Рекомендуйте 3–5 потенциальных рецензентов.</li>
                  </ul>
                </div>

                {/* NEED HELP */}
                <div className="sidebar-card">
                  <div className="sidebar-card-title">
                    <i>❓</i> Нужна помощь?
                  </div>
                  <div className="sidebar-card-text">
                    Если у вас есть вопросы, свяжитесь с редакцией журнала.
                  </div>
                  <button onClick={() => setActiveTab("Сообщения")} className="btn-sidebar-link">
                    ✉ Написать в редакцию
                  </button>
                </div>
              </aside>
            </div>
          )}

          {(activeTab === "messages" || activeTab === "Сообщения") && (
            <div className="article-panel" style={{ padding: "24px" }}>
              <h2>{t.messages}</h2>
              <div style={{ marginTop: "16px", border: "1px solid #eee", borderRadius: "8px", padding: "16px", background: "#fafcfd" }}>
                <div style={{ height: "300px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "12px", marginBottom: "16px" }}>
                  {chatMessages.length === 0 ? (
                    <div style={{ padding: "30px", textAlign: "center", color: "#888" }}>У вас пока нет сообщений с редакцией. Напишите сообщение ниже.</div>
                  ) : (
                    chatMessages.map((m) => (
                      <div key={m.id} style={{ alignSelf: m.role === "author" ? "flex-end" : "flex-start", background: m.role === "author" ? "#c82a38" : "#fff", color: m.role === "author" ? "#fff" : "#1c2836", border: m.role === "editor" ? "1px solid #ddd" : "none", padding: "10px 16px", borderRadius: "10px", maxWidth: "70%" }}>
                        <small style={{ display: "block", fontSize: "9px", opacity: 0.8, marginBottom: "4px" }}>{m.sender} • {m.time}</small>
                        {m.text}
                      </div>
                    ))
                  )}
                </div>
                <form onSubmit={handleSendChatMessage} style={{ display: "flex", gap: "8px" }}>
                  <input
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder="Напишите сообщение редактору..."
                    style={{ flex: 1, padding: "10px", border: "1px solid #ccc", borderRadius: "6px" }}
                  />
                  <button type="submit" style={{ background: "#c82a38", color: "#fff", border: "none", padding: "10px 18px", borderRadius: "6px", fontWeight: "bold", cursor: "pointer" }}>Отправить</button>
                </form>
              </div>
            </div>
          )}

          {/* AUTHOR PROFILE SETTINGS TAB (EDIT NAME, SURNAME & UPLOAD AVATAR PHOTO) */}
          {(activeTab === "settings" || activeTab === "Настройки") && (
            <div className="article-panel" style={{ padding: "28px" }}>
              <h2>{t.profileSettings}</h2>

              {profileSuccessMsg && (
                <div style={{ background: "#ecfdf5", border: "1px solid #6ee7b7", color: "#065f46", padding: "12px 16px", borderRadius: "6px", marginBottom: "20px", fontSize: "13px", fontWeight: "bold" }}>
                  {profileSuccessMsg}
                </div>
              )}

              <form onSubmit={handleSaveProfile} style={{ marginTop: "20px", display: "flex", flexDirection: "column", gap: "18px", maxWidth: "520px" }}>
                {/* PROFILE AVATAR PHOTO UPLOAD */}
                <div>
                  <label style={{ display: "block", fontSize: "11px", fontWeight: "bold", marginBottom: "8px", color: "#334155" }}>
                    Фотография профиля (Аватар):
                  </label>
                  <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                    {editAvatarUrl ? (
                      <img src={editAvatarUrl} alt="Avatar Preview" style={{ width: "64px", height: "64px", borderRadius: "50%", objectFit: "cover", border: "2px solid #cbd5e1" }} />
                    ) : (
                      <div style={{ width: "64px", height: "64px", borderRadius: "50%", background: "#1c2836", color: "#fff", display: "grid", placeItems: "center", fontSize: "20px", fontWeight: "bold" }}>
                        {initials}
                      </div>
                    )}
                    <label style={{ background: "#2563eb", color: "#fff", padding: "8px 16px", borderRadius: "6px", fontSize: "12px", fontWeight: "bold", cursor: "pointer" }}>
                      📷 Загрузить фото
                      <input type="file" accept="image/*" onChange={handleAvatarFileUpload} style={{ display: "none" }} />
                    </label>
                  </div>
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "11px", fontWeight: "bold", marginBottom: "4px", color: "#334155" }}>
                    Имя:
                  </label>
                  <input
                    value={editFirstName}
                    onChange={(e) => setEditFirstName(e.target.value)}
                    placeholder="Введите ваше имя"
                    style={{ width: "100%", padding: "10px 14px", border: "1px solid #cbd5e1", borderRadius: "6px", fontSize: "13px" }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "11px", fontWeight: "bold", marginBottom: "4px", color: "#334155" }}>
                    Фамилия:
                  </label>
                  <input
                    value={editLastName}
                    onChange={(e) => setEditLastName(e.target.value)}
                    placeholder="Введите вашу фамилию"
                    style={{ width: "100%", padding: "10px 14px", border: "1px solid #cbd5e1", borderRadius: "6px", fontSize: "13px" }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "11px", fontWeight: "bold", marginBottom: "4px", color: "#334155" }}>
                    Email пользователя (Логин):
                  </label>
                  <input
                    value={user?.email || "author@journal.ru"}
                    readOnly
                    style={{ width: "100%", padding: "10px 14px", border: "1px solid #e2e8f0", background: "#f8fafc", borderRadius: "6px", fontSize: "13px", color: "#64748b" }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "11px", fontWeight: "bold", marginBottom: "4px", color: "#334155" }}>
                    Организация / Место работы:
                  </label>
                  <input
                    value={editInstitution}
                    onChange={(e) => setEditInstitution(e.target.value)}
                    placeholder="Например: Ташкентский государственный юридический университет"
                    style={{ width: "100%", padding: "10px 14px", border: "1px solid #cbd5e1", borderRadius: "6px", fontSize: "13px" }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "11px", fontWeight: "bold", marginBottom: "4px", color: "#334155" }}>
                    Идентификатор ORCID:
                  </label>
                  <input
                    value={editOrcid}
                    onChange={(e) => setEditOrcid(e.target.value)}
                    placeholder="0009-0005-4729-1186"
                    style={{ width: "100%", padding: "10px 14px", border: "1px solid #cbd5e1", borderRadius: "6px", fontSize: "13px" }}
                  />
                </div>

                <div style={{ display: "flex", gap: "12px", marginTop: "10px" }}>
                  <button type="submit" style={{ background: "#0f172a", color: "#fff", border: "none", padding: "11px 24px", borderRadius: "6px", fontWeight: "bold", cursor: "pointer", fontSize: "13px" }}>
                    💾 Сохранить изменения профиля
                  </button>
                </div>

                <div style={{ marginTop: "20px", paddingTop: "20px", borderTop: "1px solid #eee" }}>
                  <button type="button" onClick={handleLogout} style={{ background: "#c82a38", color: "#fff", border: "none", padding: "12px 24px", borderRadius: "6px", fontWeight: "bold", cursor: "pointer" }}>
                    ⇥ Выйти из системы
                  </button>
                </div>
              </form>
            </div>
          )}
        </main>
      </div>

      {/* EDIT / RESUBMIT MODAL FOR DRAFTS & REVISIONS */}
      {showEditModal && editingArticle && (
        <div className="modal-overlay" onClick={() => setShowEditModal(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 1000, display: "grid", placeItems: "center" }}>
          <div className="modal-card wide-modal" onClick={(e) => e.stopPropagation()} style={{ background: "#fff", padding: "24px", borderRadius: "12px", width: "560px", maxWidth: "90vw", maxHeight: "90vh", overflowY: "auto" }}>
            <div className="modal-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", borderBottom: "1px solid #e2e8f0", paddingBottom: "12px" }}>
              <h2 style={{ fontSize: "18px", fontWeight: "800", color: "#0f172a", margin: 0 }}>
                {editModalMode === "RESUBMIT" ? (t.resubmitArticle || "🔄 Исправить и отправить повторно") : (t.editDraft || "✏️ Редактировать черновик")}
              </h2>
              <button className="modal-close" onClick={() => setShowEditModal(false)} style={{ background: "none", border: "none", fontSize: "18px", cursor: "pointer" }}>✕</button>
            </div>

            {/* EDITOR NOTES BANNER IF RESUBMIT */}
            {editModalMode === "RESUBMIT" && editingArticle.reviewNote && (
              <div style={{ background: "#fffbeb", border: "1px solid #fde68a", padding: "14px 16px", borderRadius: "8px", marginBottom: "18px" }}>
                <h4 style={{ fontSize: "13px", fontWeight: "800", color: "#92400e", margin: "0 0 4px" }}>
                  ⚠️ {t.editorNotes || "Замечания редактора:"}
                </h4>
                <p style={{ fontSize: "13px", color: "#78350f", margin: 0, lineHeight: 1.5 }}>
                  {editingArticle.reviewNote}
                </p>
              </div>
            )}

            <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              <div className="form-group-custom">
                <label style={{ fontSize: "12px", fontWeight: "bold" }}>Название статьи *</label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  style={{ width: "100%", padding: "8px 12px", borderRadius: "6px", border: "1px solid #ccc", marginTop: "4px" }}
                />
              </div>

              <div className="form-group-custom">
                <label style={{ fontSize: "12px", fontWeight: "bold" }}>Аннотация (Abstract) *</label>
                <textarea
                  rows={4}
                  value={editAbstract}
                  onChange={(e) => setEditAbstract(e.target.value)}
                  style={{ width: "100%", padding: "8px 12px", borderRadius: "6px", border: "1px solid #ccc", marginTop: "4px" }}
                />
              </div>

              <div className="form-group-custom">
                <label style={{ fontSize: "12px", fontWeight: "bold" }}>Научная область *</label>
                <select
                  value={editField}
                  onChange={(e) => setEditField(e.target.value)}
                  style={{ width: "100%", padding: "8px 12px", borderRadius: "6px", border: "1px solid #ccc", marginTop: "4px" }}
                >
                  <option>Право и правовые исследования</option>
                  <option>Юридические науки</option>
                  <option>Экономические науки</option>
                  <option>Цифровая экономика</option>
                </select>
              </div>

              <div className="form-group-custom">
                <label style={{ fontSize: "12px", fontWeight: "bold" }}>Ключевые слова</label>
                <input
                  type="text"
                  value={editKeywords}
                  onChange={(e) => setEditKeywords(e.target.value)}
                  style={{ width: "100%", padding: "8px 12px", borderRadius: "6px", border: "1px solid #ccc", marginTop: "4px" }}
                />
              </div>

              {/* MANDATORY MANUSCRIPT FILE UPLOAD */}
              <div className="form-group-custom" style={{ background: "#f8fafc", padding: "14px", borderRadius: "8px", border: "1px dashed #cbd5e1" }}>
                <label style={{ fontSize: "12px", fontWeight: "bold", color: "#0f172a", display: "block", marginBottom: "6px" }}>
                  📁 {editModalMode === "RESUBMIT" ? "Загрузить исправленную рукопись (DOCX/PDF) *" : "Файл рукописи (DOCX/PDF) *"}
                </label>

                {editingArticle.fileName && !editFile && (
                  <div style={{ fontSize: "11px", color: "#475569", marginBottom: "8px" }}>
                    Текущий файл: <b>{editingArticle.fileName}</b>
                  </div>
                )}

                <input
                  type="file"
                  accept=".pdf,.docx,.doc"
                  onChange={(e) => setEditFile(e.target.files?.[0] || null)}
                  style={{ fontSize: "12px" }}
                />
                <small style={{ display: "block", color: "#64748b", fontSize: "10px", marginTop: "4px" }}>
                  Поддерживаемые форматы: DOCX, PDF (макс. 25MB)
                </small>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "16px" }}>
                <button
                  onClick={() => setShowEditModal(false)}
                  style={{ padding: "8px 16px", background: "#f1f5f9", border: "none", borderRadius: "6px", cursor: "pointer", fontSize: "13px" }}
                >
                  Отмена
                </button>
                {editModalMode === "DRAFT" && (
                  <button
                    onClick={() => handleSaveEditedArticle(true)}
                    style={{ padding: "8px 16px", background: "#475569", color: "#fff", border: "none", borderRadius: "6px", cursor: "pointer", fontSize: "13px" }}
                  >
                    Сохранить черновик
                  </button>
                )}
                <button
                  onClick={() => handleSaveEditedArticle(false)}
                  disabled={isSubmittingForm}
                  style={{ padding: "8px 16px", background: "#2563eb", color: "#fff", border: "none", borderRadius: "6px", cursor: "pointer", fontWeight: "bold", fontSize: "13px" }}
                >
                  {isSubmittingForm ? "Обработка..." : editModalMode === "RESUBMIT" ? "↗ Отправить повторно" : "↗ Отправить в редакцию"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}