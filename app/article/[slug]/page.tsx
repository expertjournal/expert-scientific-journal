import { Metadata } from "next";
import { notFound } from "next/navigation";
import Header from "@/components/Header";
import StructuredData from "@/components/StructuredData";
import ArticleDetailClient from "./ArticleDetailClient";
import { getStoredArticles, getStoredIssues, StoredArticle } from "@/lib/articles-store";
import { MetadataService, ArticleMetadataInput } from "@/lib/services/MetadataService";
import { StructuredDataService } from "@/lib/services/StructuredDataService";

export const dynamic = "force-dynamic";

interface ArticlePageProps {
  params: Promise<{ slug: string }>;
}

/**
 * Server-side metadata generator returning Google Scholar meta tags, OpenGraph,
 * Twitter Cards, Canonical URLs, and Robots directives dynamically from DB.
 */
export async function generateMetadata({ params }: ArticlePageProps): Promise<Metadata> {
  const resolvedParams = await params;
  const slug = resolvedParams.slug;

  const articles = getStoredArticles();
  const issues = getStoredIssues();

  const article = articles.find((a) => {
    if (a.status !== "PUBLISHED") return false;
    const computedSlug = MetadataService.slugify(a.title, a.id);
    return a.id === slug || computedSlug === slug || a.doi?.includes(slug);
  });

  if (!article) {
    return {
      title: "Статья не найдена | Expert Scientific Journal",
      description: "Запрошенная научная публикация не найдена в реестре журнала.",
      robots: {
        index: false,
        follow: false,
      },
    };
  }

  const assignedIssue = issues.find((i) => i.id === article.issueId) || issues[0];
  const inputData: ArticleMetadataInput = {
    id: article.id,
    slug: MetadataService.slugify(article.title, article.id),
    title: article.title,
    abstract: article.abstract,
    scientificField: article.scientificField || "Право и правовые исследования",
    language: article.language || "Русский",
    doi: article.doi || `10.47689/expert-2026-iss10-${article.id}`,
    issn: "3093-1242",
    journalTitle: assignedIssue?.journalTitle || "Expert Scientific Journal",
    volume: assignedIssue?.year || 2026,
    issueNumber: assignedIssue?.number || 10,
    pages: article.pages || "1-12",
    pdfUrl: article.fileUrl,
    publicationDate: article.submissionDate || article.lastUpdated,
    lastUpdated: article.lastUpdated,
    keywords: article.keywords || ["право", "юридические науки"],
    authors: [
      {
        fullName: article.authorName || "Автор",
        email: article.authorEmail,
        institution: "Expert Scientific Journal",
      },
    ],
  };

  return MetadataService.generateArticleMetadata(inputData);
}

export default async function ArticleSlugPage({ params }: ArticlePageProps) {
  const resolvedParams = await params;
  const slug = resolvedParams.slug;

  const articles = getStoredArticles();
  const issues = getStoredIssues();

  const article = articles.find((a) => {
    if (a.status !== "PUBLISHED") return false;
    const computedSlug = MetadataService.slugify(a.title, a.id);
    return a.id === slug || computedSlug === slug || a.doi?.includes(slug);
  });

  if (!article) {
    notFound();
  }

  const assignedIssue = issues.find((i) => i.id === article.issueId) || issues[0];
  const computedSlug = MetadataService.slugify(article.title, article.id);

  const inputData: ArticleMetadataInput = {
    id: article.id,
    slug: computedSlug,
    title: article.title,
    abstract: article.abstract,
    scientificField: article.scientificField || "Право и правовые исследования",
    language: article.language || "Русский",
    doi: article.doi || `10.47689/expert-2026-iss10-${article.id}`,
    issn: "3093-1242",
    journalTitle: assignedIssue?.journalTitle || "Expert Scientific Journal",
    volume: assignedIssue?.year || 2026,
    issueNumber: assignedIssue?.number || 10,
    pages: article.pages || "1-12",
    pdfUrl: article.fileUrl,
    publicationDate: article.submissionDate || article.lastUpdated,
    lastUpdated: article.lastUpdated,
    keywords: article.keywords || ["право", "юридические науки"],
    authors: [
      {
        fullName: article.authorName || "Автор",
        email: article.authorEmail,
        institution: "Expert Scientific Journal",
      },
    ],
  };

  // Generate JSON-LD Schemas
  const scholarlyArticleSchema = StructuredDataService.generateScholarlyArticleSchema(inputData);
  const breadcrumbSchema = StructuredDataService.generateBreadcrumbSchema([
    { name: "Главная", url: "/home" },
    { name: "Архив", url: "/archive" },
    { name: article.title, url: `/article/${computedSlug}` },
  ]);
  const publisherSchema = StructuredDataService.generatePublisherSchema();

  return (
    <div style={{ minHeight: "100vh", background: "#f8fafc" }}>
      {/* Inject Production JSON-LD Schemas */}
      <StructuredData data={[scholarlyArticleSchema, breadcrumbSchema, publisherSchema]} />

      <Header activePage="/article" />

      <main style={{ maxWidth: "1140px", margin: "0 auto", padding: "32px 20px" }}>
        <ArticleDetailClient article={article} issue={assignedIssue} articleMetadata={inputData} />
      </main>

      <footer style={{ background: "#0f172a", color: "#94a3b8", padding: "24px", textAlign: "center", fontSize: "13px", marginTop: "40px" }}>
        © 2026 Expert Scientific Journal. All rights reserved. ISSN 3093-1242 (Online).
      </footer>
    </div>
  );
}
