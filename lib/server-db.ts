import fs from "fs";
import path from "path";

const DATA_DIR = path.join(process.cwd(), "data");
const DB_FILE = path.join(DATA_DIR, "database.json");

export interface DBUser {
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

export interface DBArticle {
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
}

export interface DBData {
  articles: DBArticle[];
  issues: any[];
  messages: any[];
  users: DBUser[];
  reviewerApps: any[];
  reviewAssignments: any[];
}

const DEFAULT_DATA: DBData = {
  articles: [],
  issues: [],
  messages: [],
  users: [],
  reviewerApps: [],
  reviewAssignments: [],
};

export function readServerDB(): DBData {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (!fs.existsSync(DB_FILE)) {
      fs.writeFileSync(DB_FILE, JSON.stringify(DEFAULT_DATA, null, 2), "utf-8");
      return DEFAULT_DATA;
    }
    const content = fs.readFileSync(DB_FILE, "utf-8");
    const parsed = JSON.parse(content);
    return {
      articles: Array.isArray(parsed.articles) ? parsed.articles : [],
      issues: Array.isArray(parsed.issues) ? parsed.issues : [],
      messages: Array.isArray(parsed.messages) ? parsed.messages : [],
      users: Array.isArray(parsed.users) ? parsed.users : [],
      reviewerApps: Array.isArray(parsed.reviewerApps) ? parsed.reviewerApps : [],
      reviewAssignments: Array.isArray(parsed.reviewAssignments) ? parsed.reviewAssignments : [],
    };
  } catch (e) {
    console.error("Error reading server DB:", e);
    return DEFAULT_DATA;
  }
}

export function writeServerDB(data: DBData) {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), "utf-8");
  } catch (e) {
    console.error("Error writing server DB:", e);
  }
}

export function findUserByEmailInDB(email: string): DBUser | undefined {
  const db = readServerDB();
  const normalized = (email || "").toLowerCase().trim();
  return db.users.find((u) => (u.email || "").toLowerCase().trim() === normalized);
}

export function saveOrUpdateUserInDB(user: Partial<DBUser> & { email: string }): DBUser {
  const db = readServerDB();
  const normalizedEmail = user.email.toLowerCase().trim();
  const existingIdx = db.users.findIndex((u) => u.email.toLowerCase().trim() === normalizedEmail);

  let updatedUser: DBUser;
  const now = new Date().toISOString();

  if (existingIdx >= 0) {
    updatedUser = {
      ...db.users[existingIdx],
      ...user,
      email: normalizedEmail,
      lastLoginAt: now,
    };
    db.users[existingIdx] = updatedUser;
  } else {
    updatedUser = {
      id: user.id || "usr_" + Date.now(),
      email: normalizedEmail,
      firstName: user.firstName || normalizedEmail.split("@")[0],
      lastName: user.lastName || "",
      role: user.role || "author",
      institution: user.institution || "Expert Journal Board",
      authProvider: user.authProvider || "LOCAL",
      isVerified: user.isVerified !== undefined ? user.isVerified : true,
      salt: user.salt,
      hash: user.hash,
      otpCode: user.otpCode,
      otpExpiresAt: user.otpExpiresAt,
      createdAt: now,
      lastLoginAt: now,
    };
    db.users.unshift(updatedUser);
  }

  writeServerDB(db);
  return updatedUser;
}
