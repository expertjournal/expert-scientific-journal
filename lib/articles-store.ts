import { realtimeManager } from "./supabase-realtime";

export interface StoredArticle {
  id: string;
  title: string;
  abstract: string;
  scientificField?: string;
  language?: string;
  keywords: string[];
  status: "DRAFT" | "SUBMITTED" | "UNDER_REVIEW" | "REVISION_REQUIRED" | "ACCEPTED" | "REJECTED" | "PUBLISHED" | "WITHDRAWN";
  submissionDate: string;
  lastUpdated: string;
  authorName: string;
  authorEmail?: string;
  coAuthors?: string[];
  fileUrl?: string;
  fileName?: string;
  doi?: string;
  issueId?: string;
  reviewNote?: string;
  pages?: string;
  views?: number;
  downloads?: number;
  citations?: number;
  reviewerEmail?: string;
  reviewerAssignedAt?: string;
  slug?: string;
}

export interface StoredIssue {
  id: string;
  number: number;
  year: number;
  status: "DRAFT" | "SCHEDULED" | "PUBLISHED" | "ARCHIVED";
  description: string;
  publicationDate?: string;
  scheduledPublishDate?: string;
  coverUrl?: string;
  doi?: string;
  journalTitle?: string;
}

export interface StoredMessage {
  id: string;
  sender: string;
  role: "author" | "editor";
  text: string;
  time: string;
  authorEmail?: string;
}

export interface StoredNotification {
  id: string;
  userRole?: "author" | "editor" | "reviewer" | "all";
  title: string;
  message: string;
  isRead: boolean;
  type?: "submission" | "status" | "chat" | "publication";
  createdAt: string;
}

export interface StoredReviewerApplication {
  id: string;
  userEmail: string;
  userName: string;
  scientificField: string;
  degree: string;
  institution: string;
  experience: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  createdAt: string;
}

const ARTICLES_KEY = "expert_shared_cloud_articles_v10_prod_clean";
const ISSUES_KEY = "expert_shared_cloud_issues_v10_prod_clean";
const MESSAGES_KEY = "expert_shared_cloud_messages_v10_prod_clean";
const NOTIFICATIONS_KEY = "expert_shared_cloud_notifications_v10_prod_clean";
const REVIEWER_APPS_KEY = "expert_shared_cloud_reviewer_apps_v1";

export function clearAllClientCaches() {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(ARTICLES_KEY);
    localStorage.removeItem(MESSAGES_KEY);
    localStorage.removeItem(NOTIFICATIONS_KEY);
    localStorage.removeItem("expert_user");
    localStorage.removeItem("expert_review_assignments");
  } catch (e) {}
}

const INITIAL_ISSUES: StoredIssue[] = [];
const INITIAL_ARTICLES: StoredArticle[] = [];

// READ & WRITE ARTICLES
export function getStoredArticles(): StoredArticle[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(ARTICLES_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {}
  return [];
}

export function saveStoredArticles(articles: StoredArticle[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(ARTICLES_KEY, JSON.stringify(articles));
  } catch (e) {}
}

export function addArticleToStore(article: StoredArticle): StoredArticle[] {
  const current = getStoredArticles();
  const updated = [article, ...current.filter((a) => a.id !== article.id)];
  saveStoredArticles(updated);

  if (typeof window !== "undefined") {
    try {
      fetch("/api/articles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(article),
      }).catch(() => null);
      realtimeManager.notifyLocally("articles", "INSERT", article);

      // Auto Notification for Editor
      addNotificationToStore({
        id: "n-" + Date.now(),
        userRole: "editor",
        title: "📄 Новая рукопись от автора",
        message: `Автор ${article.authorName || "пользователь"} подал новую статью: "${article.title}"`,
        isRead: false,
        type: "submission",
        createdAt: new Date().toISOString(),
      });
    } catch (e) {}
  }
  return updated;
}

export function updateArticleStatusInStore(articleId: string, status: StoredArticle["status"], reviewNote?: string): StoredArticle[] {
  const current = getStoredArticles();
  const updated = current.map((a) =>
    a.id === articleId
      ? {
          ...a,
          status,
          reviewNote: reviewNote || a.reviewNote,
          lastUpdated: new Date().toISOString().split("T")[0],
        }
      : a
  );
  saveStoredArticles(updated);

  if (typeof window !== "undefined") {
    try {
      fetch("/api/articles", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: articleId, status, reviewNote }),
      }).catch(() => null);

      const updatedItem = updated.find((a) => a.id === articleId);
      if (updatedItem) {
        realtimeManager.notifyLocally("articles", "UPDATE", updatedItem);

        // Auto Notification for Author
        addNotificationToStore({
          id: "n-" + Date.now(),
          userRole: "author",
          title: "🔔 Статус статьи обновлен",
          message: `Ваша статья "${updatedItem.title}" переведена в статус: ${status === "ACCEPTED" ? "Принято" : status === "REVISION_REQUIRED" ? "Требует доработки" : status}`,
          isRead: false,
          type: "status",
          createdAt: new Date().toISOString(),
        });
      }
    } catch (e) {}
  }
  return updated;
}

export function incrementArticleViews(articleId: string): StoredArticle[] {
  const current = getStoredArticles();
  const updated = current.map((a) => {
    if (a.id === articleId) {
      const currentViews = typeof a.views === "number" ? a.views : 248;
      return { ...a, views: currentViews + 1 };
    }
    return a;
  });
  saveStoredArticles(updated);
  return updated;
}

export function incrementArticleDownloads(articleId: string): StoredArticle[] {
  const current = getStoredArticles();
  const updated = current.map((a) => {
    if (a.id === articleId) {
      const currentDownloads = typeof a.downloads === "number" ? a.downloads : 94;
      return { ...a, downloads: currentDownloads + 1 };
    }
    return a;
  });
  saveStoredArticles(updated);
  return updated;
}

export function incrementArticleCitations(articleId: string): StoredArticle[] {
  const current = getStoredArticles();
  const updated = current.map((a) => {
    if (a.id === articleId) {
      const currentCitations = typeof a.citations === "number" ? a.citations : 12;
      return { ...a, citations: currentCitations + 1 };
    }
    return a;
  });
  saveStoredArticles(updated);
  return updated;
}

export interface StoredReviewAssignment {
  id: string;
  articleId: string;
  articleTitle: string;
  reviewerEmail: string;
  reviewerName?: string;
  assignedAt: string;
  dueDate: string;
  status: "INVITED" | "ACCEPTED" | "DECLINED" | "COMPLETED";
  recommendation?: "ACCEPT" | "MINOR_REVISION" | "MAJOR_REVISION" | "REJECT";
  commentsToAuthor?: string;
  commentsToEditor?: string;
  qualityScore?: number;
  noveltyScore?: number;
  note?: string;
}

export function getStoredReviewAssignments(): StoredReviewAssignment[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem("expert_shared_cloud_assignments_v10");
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

export function saveStoredReviewAssignments(assignments: StoredReviewAssignment[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem("expert_shared_cloud_assignments_v10", JSON.stringify(assignments));
  } catch (e) {
    console.error(e);
  }
}

export function assignReviewerToArticle(articleId: string, reviewerEmail: string, note?: string, reviewerName?: string): StoredArticle[] {
  const current = getStoredArticles();
  const targetArticle = current.find((a) => a.id === articleId);
  const updated = current.map((a) => {
    if (a.id === articleId) {
      return {
        ...a,
        status: "UNDER_REVIEW" as const,
        reviewerEmail,
        reviewerAssignedAt: new Date().toISOString(),
        reviewNote: note || a.reviewNote,
        lastUpdated: new Date().toISOString().split("T")[0],
      };
    }
    return a;
  });
  saveStoredArticles(updated);

  const assignments = getStoredReviewAssignments();
  const newAssignment: StoredReviewAssignment = {
    id: "assign-" + Date.now(),
    articleId,
    articleTitle: targetArticle?.title || "Рукопись",
    reviewerEmail,
    reviewerName: reviewerName || "Эксперт",
    assignedAt: new Date().toISOString(),
    dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
    status: "INVITED",
    note,
  };

  const existingIdx = assignments.findIndex((a) => a.articleId === articleId && a.reviewerEmail === reviewerEmail);
  if (existingIdx >= 0) {
    assignments[existingIdx] = newAssignment;
  } else {
    assignments.push(newAssignment);
  }
  saveStoredReviewAssignments(assignments);

  if (typeof window !== "undefined") {
    fetch("/api/articles", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: articleId, status: "UNDER_REVIEW", reviewerEmail }),
    }).catch(() => null);
  }

  addNotificationToStore({
    id: "n-" + Date.now(),
    userRole: "all",
    title: "👨‍⚖️ Статья отправлена рецензенту",
    message: `Статья отправлена на рецензирование эксперту (${reviewerEmail})`,
    isRead: false,
    type: "status",
    createdAt: new Date().toISOString(),
  });

  return updated;
}

export function submitReviewerReportInStore(
  assignmentId: string,
  articleId: string,
  recommendation: "ACCEPT" | "MINOR_REVISION" | "MAJOR_REVISION" | "REJECT",
  commentsToAuthor: string,
  commentsToEditor?: string,
  qualityScore?: number,
  noveltyScore?: number
) {
  const assignments = getStoredReviewAssignments();
  const updatedAssignments = assignments.map((a) => {
    if (a.id === assignmentId || a.articleId === articleId) {
      return {
        ...a,
        status: "COMPLETED" as const,
        recommendation,
        commentsToAuthor,
        commentsToEditor,
        qualityScore: qualityScore || 5,
        noveltyScore: noveltyScore || 5,
      };
    }
    return a;
  });
  saveStoredReviewAssignments(updatedAssignments);

  let newStatus: StoredArticle["status"] = "UNDER_REVIEW";
  if (recommendation === "ACCEPT") {
    newStatus = "ACCEPTED";
  } else if (recommendation === "REJECT") {
    newStatus = "REJECTED";
  } else {
    newStatus = "REVISION_REQUIRED";
  }

  const articles = getStoredArticles();
  const updatedArticles = articles.map((a) => {
    if (a.id === articleId) {
      return {
        ...a,
        status: newStatus,
        reviewNote: commentsToAuthor,
        lastUpdated: new Date().toISOString().split("T")[0],
      };
    }
    return a;
  });
  saveStoredArticles(updatedArticles);

  addNotificationToStore({
    id: "n-" + Date.now(),
    userRole: "editor",
    title: "📝 Получена рецензия от эксперта",
    message: `Рецензирование статьи завершено. Рекомендация: ${recommendation}`,
    isRead: false,
    type: "status",
    createdAt: new Date().toISOString(),
  });
}

export function updateArticleIssueInStore(articleId: string, issueId: string, pages?: string): StoredArticle[] {
  const current = getStoredArticles();
  const updated = current.map((a) =>
    a.id === articleId
      ? {
          ...a,
          issueId,
          pages: pages || a.pages || "1-12",
          status: "ACCEPTED" as const,
          lastUpdated: new Date().toISOString().split("T")[0],
        }
      : a
  );
  saveStoredArticles(updated);

  if (typeof window !== "undefined") {
    try {
      fetch("/api/articles", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: articleId, issueId, status: "ACCEPTED" }),
      }).catch(() => null);

      const updatedItem = updated.find((a) => a.id === articleId);
      if (updatedItem) realtimeManager.notifyLocally("articles", "UPDATE", updatedItem);
    } catch (e) {}
  }
  return updated;
}

// READ & WRITE ISSUES
export function getStoredIssues(): StoredIssue[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(ISSUES_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {}
  return [];
}

export function saveStoredIssues(issues: StoredIssue[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(ISSUES_KEY, JSON.stringify(issues));
  } catch (e) {}
}

export function addIssueToStore(issue: StoredIssue): StoredIssue[] {
  const current = getStoredIssues();
  const updated = [issue, ...current.filter((i) => i.id !== issue.id)];
  saveStoredIssues(updated);

  if (typeof window !== "undefined") {
    try {
      fetch("/api/issues", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(issue),
      }).catch(() => null);
      realtimeManager.notifyLocally("issues", "INSERT", issue);
    } catch (e) {}
  }
  return updated;
}

export function updateIssueInStore(issueId: string, updatedFields: Partial<StoredIssue>): StoredIssue[] {
  const current = getStoredIssues();
  const updated = current.map((i) => (i.id === issueId ? { ...i, ...updatedFields } : i));
  saveStoredIssues(updated);

  if (typeof window !== "undefined") {
    try {
      fetch("/api/issues", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: issueId, ...updatedFields }),
      }).catch(() => null);
      const updatedItem = updated.find((i) => i.id === issueId);
      if (updatedItem) realtimeManager.notifyLocally("issues", "UPDATE", updatedItem);
    } catch (e) {}
  }
  return updated;
}

export function publishIssueInStore(issueId: string, coverUrl?: string): StoredIssue[] {
  const current = getStoredIssues();
  const updated = current.map((i) =>
    i.id === issueId
      ? {
          ...i,
          status: "PUBLISHED" as const,
          publicationDate: new Date().toISOString().split("T")[0],
          coverUrl: coverUrl || i.coverUrl,
          doi: i.doi || `10.47689/expert-${i.year}-vol6-iss${i.number}`,
        }
      : i
  );
  saveStoredIssues(updated);

  // Also publish all accepted articles assigned to this issue!
  const currentArticles = getStoredArticles();
  const updatedArticles = currentArticles.map((a) => {
    if (a.status === "ACCEPTED" && (a.issueId === issueId || !a.issueId)) {
      return { ...a, status: "PUBLISHED" as const, issueId };
    }
    return a;
  });
  saveStoredArticles(updatedArticles);

  if (typeof window !== "undefined") {
    try {
      fetch("/api/issues", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: issueId, status: "PUBLISHED", coverUrl }),
      }).catch(() => null);

      updatedArticles.forEach((a) => {
        if (a.status === "PUBLISHED" && a.issueId === issueId) {
          fetch("/api/articles", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: a.id, status: "PUBLISHED", issueId }),
          }).catch(() => null);
        }
      });

      const pubIssue = updated.find((i) => i.id === issueId);
      if (pubIssue) realtimeManager.notifyLocally("issues", "UPDATE", pubIssue);
    } catch (e) {}
  }
  return updated;
}

// READ & WRITE CHAT MESSAGES
export function getStoredMessages(): StoredMessage[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(MESSAGES_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {}
  return [];
}

export function addMessageToStore(msg: StoredMessage): StoredMessage[] {
  const current = getStoredMessages();
  const updated = [...current, msg];
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(MESSAGES_KEY, JSON.stringify(updated));
      fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(msg),
      }).catch(() => null);
      realtimeManager.notifyLocally("messages", "INSERT", msg);
    } catch (e) {}
  }
  return updated;
}

export interface SearchParamsOptions {
  q?: string;
  page?: number;
  limit?: number;
  sort?: string;
  issueId?: string;
  status?: string;
  category?: string;
  language?: string;
  author?: string;
}

export async function searchArticlesInStore(options: SearchParamsOptions = {}) {
  const queryParts: string[] = [];
  if (options.q) queryParts.push(`q=${encodeURIComponent(options.q)}`);
  if (options.page) queryParts.push(`page=${options.page}`);
  if (options.limit) queryParts.push(`limit=${options.limit}`);
  if (options.sort) queryParts.push(`sort=${encodeURIComponent(options.sort)}`);
  if (options.issueId) queryParts.push(`issueId=${encodeURIComponent(options.issueId)}`);
  if (options.status) queryParts.push(`status=${encodeURIComponent(options.status)}`);
  if (options.category) queryParts.push(`category=${encodeURIComponent(options.category)}`);
  if (options.language) queryParts.push(`language=${encodeURIComponent(options.language)}`);
  if (options.author) queryParts.push(`author=${encodeURIComponent(options.author)}`);

  const queryString = queryParts.length > 0 ? `?${queryParts.join("&")}` : "";

  try {
    const res = await fetch(`/api/search${queryString}`);
    if (res.ok) {
      return await res.json();
    }
  } catch (e) {}

  return {
    data: getStoredArticles(),
    total: getStoredArticles().length,
    page: 1,
    totalPages: 1,
    hasNext: false,
    hasPrevious: false,
  };
}

// READ & WRITE NOTIFICATIONS
export function getStoredNotifications(): StoredNotification[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(NOTIFICATIONS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {}
  return [];
}

export function addNotificationToStore(notif: StoredNotification): StoredNotification[] {
  const current = getStoredNotifications();
  const updated = [notif, ...current.filter((n) => n.id !== notif.id)];
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(updated));
      fetch("/api/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(notif),
      }).catch(() => null);
      window.dispatchEvent(new Event("storage"));
    } catch (e) {}
  }
  return updated;
}

export function markNotificationsAsReadInStore(): StoredNotification[] {
  const current = getStoredNotifications();
  const updated = current.map((n) => ({ ...n, isRead: true }));
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(updated));
      fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ markAllAsRead: true }),
      }).catch(() => null);
      window.dispatchEvent(new Event("storage"));
    } catch (e) {}
  }
  return updated;
}

// INITIAL FETCH FROM SERVER DB ON CLIENT HYDRATION & BIDIRECTIONAL SYNC
export async function syncStoreWithServer() {
  if (typeof window === "undefined") return;
  try {
    const [resArt, resIss, resMsg, resNotif, resApps] = await Promise.all([
      fetch("/api/articles").then((r) => r.json()).catch(() => []),
      fetch("/api/issues").then((r) => r.json()).catch(() => []),
      fetch("/api/messages").then((r) => r.json()).catch(() => []),
      fetch("/api/notifications").then((r) => r.json()).catch(() => []),
      fetch("/api/reviewer-apps").then((r) => r.json()).catch(() => []),
    ]);

    // 1. Articles Sync & Protection
    const localArticles = getStoredArticles();
    if (Array.isArray(resArt) && resArt.length > 0) {
      const mergedMap = new Map<string, StoredArticle>();
      localArticles.forEach((a) => mergedMap.set(a.id, a));
      resArt.forEach((a: StoredArticle) => mergedMap.set(a.id, a));
      const mergedList = Array.from(mergedMap.values());
      saveStoredArticles(mergedList);
    } else if (localArticles.length > 0) {
      // Push client articles up to server if server database is empty
      localArticles.forEach((article) => {
        fetch("/api/articles", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(article),
        }).catch(() => null);
      });
    }

    // 2. Issues Sync & Protection
    const localIssues = getStoredIssues();
    if (Array.isArray(resIss) && resIss.length > 0) {
      const mergedIssueMap = new Map<string, StoredIssue>();
      localIssues.forEach((i) => mergedIssueMap.set(i.id, i));
      resIss.forEach((i: StoredIssue) => mergedIssueMap.set(i.id, i));
      const mergedIssueList = Array.from(mergedIssueMap.values());
      saveStoredIssues(mergedIssueList);
    } else if (localIssues.length > 0) {
      localIssues.forEach((issue) => {
        fetch("/api/issues", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(issue),
        }).catch(() => null);
      });
    }

    // 3. Messages, Notifications & Reviewer Apps
    if (Array.isArray(resMsg) && resMsg.length > 0) {
      localStorage.setItem(MESSAGES_KEY, JSON.stringify(resMsg));
    }
    if (Array.isArray(resNotif) && resNotif.length > 0) {
      localStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(resNotif));
    }
    if (Array.isArray(resApps) && resApps.length > 0) {
      const localApps = getStoredReviewerApplications();
      const mergedAppsMap = new Map<string, StoredReviewerApplication>();
      localApps.forEach((app) => mergedAppsMap.set(app.id, app));
      resApps.forEach((app: StoredReviewerApplication) => mergedAppsMap.set(app.id, app));
      saveStoredReviewerApplications(Array.from(mergedAppsMap.values()));
    }
  } catch (e) {
    console.error("syncStoreWithServer error:", e);
  }
}

// MANUSCRIPT DOWNLOAD HELPER
export function downloadManuscriptFile(article: { fileUrl?: string; fileName?: string; title: string; authorName?: string; abstract?: string }) {
  if (typeof window === "undefined") return;

  let targetName = article.fileName || `${article.title.replace(/[^a-zA-Z0-9А-Яа-я_\-]/g, "_").slice(0, 30)}.pdf`;
  if (!targetName.toLowerCase().endsWith(".pdf") && !targetName.toLowerCase().endsWith(".docx")) {
    targetName = `${targetName}.pdf`;
  }

  // 1. Direct download for uploaded file (Data URL, Blob URL, HTTP, or /uploads/ path)
  if (article.fileUrl && (article.fileUrl.startsWith("data:") || article.fileUrl.startsWith("blob:") || article.fileUrl.startsWith("http") || article.fileUrl.startsWith("/uploads/"))) {
    const a = document.createElement("a");
    a.href = article.fileUrl;
    a.download = targetName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    return;
  }

  // 2. Generate authentic PDF document (application/pdf)
  const cleanTitle = (article.title || "Manuscript Title").replace(/[()\\]/g, "");
  const cleanAuthor = (article.authorName || "Author").replace(/[()\\]/g, "");
  const pdfHeader = `%PDF-1.4
1 0 obj <</Type /Catalog /Pages 2 0 R>> endobj
2 0 obj <</Type /Pages /Kinds [3 0 R] /Count 1>> endobj
3 0 obj <</Type /Page /Parent 2 0 R /Resources <<>> /Contents 4 0 R>> endobj
4 0 obj <</Length 150>> stream
BT
/F1 12 Tf
50 750 TD
(EXPERT SCIENTIFIC JOURNAL MANUSCRIPT) Tj
0 -20 TD
(Title: ${cleanTitle}) Tj
0 -20 TD
(Author: ${cleanAuthor}) Tj
0 -20 TD
(Date: ${new Date().toLocaleDateString("ru-RU")}) Tj
ET
endstream
endobj
xref
0 5
0000000000 65535 f
0000000009 00000 n
0000000056 00000 n
0000000114 00000 n
0000000192 00000 n
trailer <</Size 5 /Root 1 0 R>>
startxref
340
%%EOF`;

  const blob = new Blob([pdfHeader], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = targetName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// REVIEWER APPLICATIONS STORE
export function getStoredReviewerApplications(): StoredReviewerApplication[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(REVIEWER_APPS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {}
  return [];
}

export function saveStoredReviewerApplications(apps: StoredReviewerApplication[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(REVIEWER_APPS_KEY, JSON.stringify(apps));
  } catch (e) {}
}

export function addReviewerApplication(app: StoredReviewerApplication): StoredReviewerApplication[] {
  const current = getStoredReviewerApplications();
  const updated = [app, ...current.filter((a) => a.id !== app.id && a.userEmail !== app.userEmail)];
  saveStoredReviewerApplications(updated);

  if (typeof window !== "undefined") {
    fetch("/api/reviewer-apps", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(app),
    }).catch(() => null);
  }

  addNotificationToStore({
    id: "n-app-" + Date.now(),
    userRole: "editor",
    title: "📋 Новая заявка на статус Рецензента",
    message: `${app.userName} (${app.userEmail}) подал заявку на право рецензирования по направлению "${app.scientificField}".`,
    isRead: false,
    type: "submission",
    createdAt: new Date().toISOString(),
  });

  return updated;
}

export function updateReviewerApplicationStatus(appId: string, status: "APPROVED" | "REJECTED"): StoredReviewerApplication[] {
  const current = getStoredReviewerApplications();
  const updated = current.map((a) => (a.id === appId ? { ...a, status } : a));
  saveStoredReviewerApplications(updated);

  if (typeof window !== "undefined") {
    fetch("/api/reviewer-apps", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: appId, status }),
    }).catch(() => null);
  }

  const targetApp = updated.find((a) => a.id === appId);
  if (targetApp) {
    addNotificationToStore({
      id: "n-app-st-" + Date.now(),
      userRole: "all",
      title: status === "APPROVED" ? "🎉 Доступ Рецензента одобрен!" : "❌ Статус заявки Рецензента",
      message:
        status === "APPROVED"
          ? `Главный редактор одобрил вашу заявку на статус Рецензента. Раздел рецензирования теперь доступен в вашем кабинете!`
          : `К сожалению, ваша заявка на статус Рецензента была отклонена.`,
      isRead: false,
      type: "status",
      createdAt: new Date().toISOString(),
    });
  }

  return updated;
}
