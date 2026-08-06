import { supabase } from "./supabase-client";

export interface UserRecord {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: "author" | "editor" | "reviewer" | "admin" | "reader";
  institution?: string;
  authProvider?: "LOCAL" | "GOOGLE";
  salt?: string;
  hash?: string;
  isVerified: boolean;
  otpCode?: string;
  otpExpiresAt?: string;
  resetToken?: string;
  resetTokenExpiresAt?: string;
  createdAt: string;
  lastLoginAt?: string;
}

export interface ArticleRecord {
  id: string;
  title: string;
  abstract?: string;
  scientificField?: string;
  language?: string;
  keywords?: string[];
  status: "DRAFT" | "SUBMITTED" | "UNDER_REVIEW" | "REVISION_REQUIRED" | "ACCEPTED" | "REJECTED" | "PUBLISHED" | "WITHDRAWN";
  submissionDate?: string;
  lastUpdated?: string;
  authorId?: string;
  userId?: string;
  authorEmail: string;
  authorName?: string;
  fileName?: string;
  fileUrl?: string;
  doi?: string;
  issueId?: string;
  reviewNote?: string;
  pages?: string;
  views?: number;
  downloads?: number;
  citations?: number;
}

export interface IssueRecord {
  id: string;
  number: number;
  year: number;
  journalTitle?: string;
  description?: string;
  status: "DRAFT" | "SCHEDULED" | "PUBLISHED" | "ARCHIVED";
  coverUrl?: string;
  scheduledPublishDate?: string;
  publicationDate?: string;
  doi?: string;
}

export interface ReviewerAppRecord {
  id: string;
  userEmail: string;
  userName: string;
  scientificField: string;
  academicDegree?: string;
  institution?: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  submittedAt: string;
}

export interface ReviewAssignmentRecord {
  id: string;
  articleId: string;
  articleTitle?: string;
  reviewerEmail: string;
  reviewerName?: string;
  assignedAt: string;
  dueDate?: string;
  status: "INVITED" | "ACCEPTED" | "DECLINED" | "COMPLETED";
  note?: string;
  recommendation?: "ACCEPT" | "MINOR_REVISION" | "MAJOR_REVISION" | "REJECT";
  commentsToAuthor?: string;
  commentsToEditor?: string;
  qualityScore?: number;
  noveltyScore?: number;
}

export interface MessageRecord {
  id: string;
  senderEmail: string;
  senderName: string;
  recipientEmail: string;
  subject?: string;
  body: string;
  articleTitle?: string;
  createdAt: string;
}

export interface NotificationRecord {
  id: string;
  userRole: string;
  userEmail?: string;
  title: string;
  message: string;
  isRead: boolean;
  type: string;
  createdAt: string;
}

// IN-MEMORY HIGH-SPEED PROD MEMORY CACHE (NO FILESYSTEM JSON)
const memoryStore = {
  users: new Map<string, UserRecord>(),
  articles: new Map<string, ArticleRecord>(),
  issues: new Map<string, IssueRecord>(),
  reviewerApps: new Map<string, ReviewerAppRecord>(),
  reviewAssignments: new Map<string, ReviewAssignmentRecord>(),
  messages: new Map<string, MessageRecord>(),
  notifications: new Map<string, NotificationRecord>(),
};

// USER DB OPERATIONS
export async function findUserByEmail(email: string): Promise<UserRecord | null> {
  const normalized = (email || "").toLowerCase().trim();
  if (!normalized) return null;

  try {
    const { data } = await supabase.from("users").select("*");
    if (data && Array.isArray(data) && data.length > 0) {
      const match = data.find((u: any) => (u.email || "").toLowerCase().trim() === normalized);
      if (match) return match;
    }
  } catch (e) {}

  return memoryStore.users.get(normalized) || null;
}

export async function saveOrUpdateUser(user: Partial<UserRecord> & { email: string }): Promise<UserRecord> {
  const normalized = user.email.toLowerCase().trim();
  const existing = await findUserByEmail(normalized);
  const now = new Date().toISOString();

  const record: UserRecord = {
    id: existing?.id || user.id || "usr_" + Date.now(),
    email: normalized,
    firstName: user.firstName || existing?.firstName || normalized.split("@")[0],
    lastName: user.lastName !== undefined ? user.lastName : existing?.lastName || "",
    role: user.role || existing?.role || "author",
    institution: user.institution || existing?.institution || "Expert Journal",
    authProvider: user.authProvider || existing?.authProvider || "LOCAL",
    isVerified: user.isVerified !== undefined ? user.isVerified : existing?.isVerified ?? true,
    salt: user.salt !== undefined ? user.salt : existing?.salt,
    hash: user.hash !== undefined ? user.hash : existing?.hash,
    otpCode: user.otpCode !== undefined ? user.otpCode : existing?.otpCode,
    otpExpiresAt: user.otpExpiresAt !== undefined ? user.otpExpiresAt : existing?.otpExpiresAt,
    resetToken: user.resetToken !== undefined ? user.resetToken : existing?.resetToken,
    resetTokenExpiresAt: user.resetTokenExpiresAt !== undefined ? user.resetTokenExpiresAt : existing?.resetTokenExpiresAt,
    createdAt: existing?.createdAt || now,
    lastLoginAt: now,
  };

  memoryStore.users.set(normalized, record);

  try {
    await supabase.from("users").upsert({
      id: record.id,
      email: record.email,
      first_name: record.firstName,
      last_name: record.lastName,
      role: record.role,
      institution: record.institution,
      is_verified: record.isVerified,
      salt: record.salt,
      hash: record.hash,
      otp_code: record.otpCode,
      otp_expires_at: record.otpExpiresAt,
      reset_token: record.resetToken,
      reset_token_expires_at: record.resetTokenExpiresAt,
      updated_at: now,
    });
  } catch (e) {}

  return record;
}

// ARTICLE DB OPERATIONS
export async function getArticlesFromDB(): Promise<ArticleRecord[]> {
  try {
    const { data } = await supabase.from("articles").select("*");
    if (data && Array.isArray(data) && data.length > 0) {
      const dbList: ArticleRecord[] = data.map((a: any) => ({
        id: a.id,
        title: a.title,
        abstract: a.abstract,
        scientificField: a.scientific_field || a.scientificField || "Law & Legal Studies",
        language: a.language || "ru",
        keywords: Array.isArray(a.keywords) ? a.keywords : [],
        status: a.status,
        submissionDate: a.submission_date || a.submissionDate || a.created_at?.split("T")[0],
        lastUpdated: a.last_updated || a.lastUpdated || a.updated_at?.split("T")[0],
        authorName: a.author_name || a.authorName || "Автор",
        authorEmail: (a.author_email || a.authorEmail || "").toLowerCase().trim(),
        authorId: a.author_id || a.authorId || a.user_id || a.userId,
        userId: a.user_id || a.userId || a.author_id || a.authorId,
        fileName: a.file_name || a.fileName,
        fileUrl: a.file_url || a.fileUrl,
        doi: a.doi,
        issueId: a.issue_id || a.issueId,
        reviewNote: a.review_note || a.reviewNote,
        pages: a.pages,
        views: a.views_count || a.views || 0,
        downloads: a.downloads_count || a.downloads || 0,
        citations: a.citations_count || a.citations || 0,
      }));
      return dbList;
    }
  } catch (e) {}

  return Array.from(memoryStore.articles.values());
}

export async function saveOrUpdateArticle(article: Partial<ArticleRecord> & { id: string; authorEmail: string }): Promise<ArticleRecord> {
  const existingList = await getArticlesFromDB();
  const existing = existingList.find((a) => a.id === article.id);
  const now = new Date().toISOString().split("T")[0];

  const record: ArticleRecord = {
    id: article.id,
    title: article.title || existing?.title || "Рукопись",
    abstract: article.abstract || existing?.abstract || "",
    scientificField: article.scientificField || existing?.scientificField || "Law & Legal Studies",
    language: article.language || existing?.language || "ru",
    keywords: article.keywords || existing?.keywords || [],
    status: article.status || existing?.status || "SUBMITTED",
    submissionDate: article.submissionDate || existing?.submissionDate || now,
    lastUpdated: now,
    authorId: article.authorId || existing?.authorId,
    userId: article.userId || existing?.userId,
    authorEmail: (article.authorEmail || existing?.authorEmail || "").toLowerCase().trim(),
    authorName: article.authorName || existing?.authorName || "Автор",
    fileName: article.fileName || existing?.fileName,
    fileUrl: article.fileUrl || existing?.fileUrl,
    doi: article.doi || existing?.doi,
    issueId: article.issueId !== undefined ? article.issueId : existing?.issueId,
    reviewNote: article.reviewNote !== undefined ? article.reviewNote : existing?.reviewNote,
    pages: article.pages || existing?.pages || "1-12",
  };

  memoryStore.articles.set(record.id, record);

  try {
    await supabase.from("articles").upsert({
      id: record.id,
      title: record.title,
      abstract: record.abstract,
      scientific_field: record.scientificField,
      language: record.language,
      keywords: record.keywords,
      status: record.status,
      submission_date: record.submissionDate,
      last_updated: record.lastUpdated,
      author_name: record.authorName,
      author_email: record.authorEmail,
      author_id: record.authorId,
      user_id: record.userId,
      file_name: record.fileName,
      file_url: record.fileUrl,
      doi: record.doi,
      issue_id: record.issueId,
      review_note: record.reviewNote,
      pages: record.pages,
    });
  } catch (e) {}

  return record;
}

// ISSUES DB OPERATIONS
export async function getIssuesFromDB(): Promise<IssueRecord[]> {
  try {
    const { data } = await supabase.from("issues").select("*");
    if (data && Array.isArray(data) && data.length > 0) {
      return data;
    }
  } catch (e) {}

  return Array.from(memoryStore.issues.values());
}

export async function saveOrUpdateIssue(issue: Partial<IssueRecord> & { id: string }): Promise<IssueRecord> {
  const existingList = await getIssuesFromDB();
  const existing = existingList.find((i) => i.id === issue.id);

  const record: IssueRecord = {
    id: issue.id,
    number: issue.number || existing?.number || 1,
    year: issue.year || existing?.year || 2026,
    journalTitle: issue.journalTitle || existing?.journalTitle || "",
    description: issue.description || existing?.description || "",
    status: issue.status || existing?.status || "DRAFT",
    coverUrl: issue.coverUrl || existing?.coverUrl,
    scheduledPublishDate: issue.scheduledPublishDate || existing?.scheduledPublishDate,
    publicationDate: issue.publicationDate || existing?.publicationDate,
    doi: issue.doi || existing?.doi,
  };

  memoryStore.issues.set(record.id, record);

  try {
    await supabase.from("issues").upsert(record);
  } catch (e) {}

  return record;
}

// REVIEWER APPS DB OPERATIONS
export async function getReviewerAppsFromDB(): Promise<ReviewerAppRecord[]> {
  try {
    const { data } = await supabase.from("reviewer_applications").select("*");
    if (data && Array.isArray(data) && data.length > 0) return data;
  } catch (e) {}

  return Array.from(memoryStore.reviewerApps.values());
}

export async function saveOrUpdateReviewerApp(app: ReviewerAppRecord): Promise<ReviewerAppRecord> {
  memoryStore.reviewerApps.set(app.id, app);
  try {
    await supabase.from("reviewer_applications").upsert(app);
  } catch (e) {}
  return app;
}

// REVIEW ASSIGNMENTS DB OPERATIONS
export async function getReviewAssignmentsFromDB(): Promise<ReviewAssignmentRecord[]> {
  try {
    const { data } = await supabase.from("review_assignments").select("*");
    if (data && Array.isArray(data) && data.length > 0) return data;
  } catch (e) {}

  return Array.from(memoryStore.reviewAssignments.values());
}

export async function saveOrUpdateReviewAssignment(as: ReviewAssignmentRecord): Promise<ReviewAssignmentRecord> {
  memoryStore.reviewAssignments.set(as.id, as);
  try {
    await supabase.from("review_assignments").upsert(as);
  } catch (e) {}
  return as;
}

// MESSAGES DB OPERATIONS
export async function getMessagesFromDB(): Promise<MessageRecord[]> {
  try {
    const { data } = await supabase.from("messages").select("*");
    if (data && Array.isArray(data) && data.length > 0) return data;
  } catch (e) {}

  return Array.from(memoryStore.messages.values());
}

export async function saveMessageToDB(msg: MessageRecord): Promise<MessageRecord> {
  memoryStore.messages.set(msg.id, msg);
  try {
    await supabase.from("messages").upsert(msg);
  } catch (e) {}
  return msg;
}

// NOTIFICATIONS DB OPERATIONS
export async function getNotificationsFromDB(): Promise<NotificationRecord[]> {
  try {
    const { data } = await supabase.from("notifications").select("*");
    if (data && Array.isArray(data) && data.length > 0) return data;
  } catch (e) {}

  return Array.from(memoryStore.notifications.values());
}

export async function saveNotificationToDB(notif: NotificationRecord): Promise<NotificationRecord> {
  memoryStore.notifications.set(notif.id, notif);
  try {
    await supabase.from("notifications").upsert(notif);
  } catch (e) {}
  return notif;
}
