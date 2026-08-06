/**
 * 3NF Data Normalizer Adapter for Expert Platform
 * Bridges flat client models (StoredArticle, StoredIssue) to 3NF relational DTO objects.
 */

import { StoredArticle, StoredIssue } from "../articles-store";

export interface NormalizedArticle3NF {
  id: string;
  issueId?: string;
  categoryId?: string;
  title: string;
  abstract: string;
  scientificField: string;
  language: string;
  status: StoredArticle["status"];
  doi?: string;
  submissionDate: string;
  lastUpdated: string;
  reviewNote?: string;
  authors: {
    id: string;
    fullName: string;
    email: string;
    orcid?: string;
    institution: string;
    isCorresponding: boolean;
    order: number;
  }[];
  keywords: { id: string; name: string }[];
  file: {
    id: string;
    fileName: string;
    fileUrl: string;
    sizeBytes: number;
    mimeType: string;
    version: number;
  };
}

export interface NormalizedIssue3NF {
  id: string;
  journalId: string;
  volumeId: string;
  issueNumber: number;
  year: number;
  status: StoredIssue["status"];
  description: string;
  publicationDate?: string;
}

export function normalizeArticleTo3NF(article: StoredArticle): NormalizedArticle3NF {
  const cleanId = article.id || "art-" + Date.now();
  const kwList = (article.keywords || []).map((name, i) => ({
    id: `kw-${cleanId}-${i}`,
    name,
  }));

  return {
    id: cleanId,
    issueId: article.issueId,
    title: article.title,
    abstract: article.abstract,
    scientificField: article.scientificField || "Экономические науки",
    language: article.language || "Русский",
    status: article.status,
    doi: article.doi,
    submissionDate: article.submissionDate,
    lastUpdated: article.lastUpdated,
    reviewNote: article.reviewNote,
    authors: [
      {
        id: `au-${cleanId}-1`,
        fullName: article.authorName || "Автор",
        email: article.authorEmail || "author@journal.ru",
        institution: "Expert Scientific Journal",
        isCorresponding: true,
        order: 1,
      },
    ],
    keywords: kwList,
    file: {
      id: `file-${cleanId}`,
      fileName: article.fileName || "manuscript.pdf",
      fileUrl: article.fileUrl || `https://d4da42b4eef1d8488bfb6a00e5225637.r2.cloudflarestorage.com/expert-journal-publications/${article.fileName || "manuscript.pdf"}`,
      sizeBytes: 1048576,
      mimeType: "application/pdf",
      version: 1,
    },
  };
}

export function denormalize3NFToArticle(normalized: NormalizedArticle3NF): StoredArticle {
  const primaryAuthor = normalized.authors[0] || { fullName: "Автор", email: "author@journal.ru" };

  return {
    id: normalized.id,
    title: normalized.title,
    abstract: normalized.abstract,
    scientificField: normalized.scientificField,
    language: normalized.language,
    keywords: normalized.keywords.map((k) => k.name),
    status: normalized.status,
    submissionDate: normalized.submissionDate,
    lastUpdated: normalized.lastUpdated,
    authorName: primaryAuthor.fullName,
    authorEmail: primaryAuthor.email,
    fileUrl: normalized.file.fileUrl,
    fileName: normalized.file.fileName,
    doi: normalized.doi,
    issueId: normalized.issueId,
    reviewNote: normalized.reviewNote,
  };
}

export function normalizeIssueTo3NF(issue: StoredIssue): NormalizedIssue3NF {
  return {
    id: issue.id,
    journalId: "j-expert-01",
    volumeId: `vol-${issue.year}`,
    issueNumber: issue.number,
    year: issue.year,
    status: issue.status,
    description: issue.description,
    publicationDate: issue.publicationDate,
  };
}
