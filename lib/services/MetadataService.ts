import { Metadata } from "next";

export interface ArticleMetadataInput {
  id: string;
  slug?: string;
  title: string;
  abstract: string;
  scientificField?: string;
  language?: string;
  articleType?: string;
  status?: string;
  doi?: string;
  issn?: string;
  journalTitle?: string;
  volume?: number | string;
  issueNumber?: number | string;
  pages?: string;
  pdfUrl?: string;
  htmlUrl?: string;
  publisher?: string;
  license?: string;
  submissionDate?: string;
  acceptedAt?: string;
  publicationDate?: string;
  lastUpdated?: string;
  keywords?: string[];
  authors?: {
    fullName: string;
    institution?: string;
    orcid?: string;
    email?: string;
  }[];
}

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://expert-journal.up.railway.app";
const DEFAULT_JOURNAL_TITLE = "Expert Scientific Journal";
const DEFAULT_ISSN_PRINT = "3093-1234";
const DEFAULT_ISSN_ONLINE = "3093-1242";
const DEFAULT_PUBLISHER = "Expert Publishing Group";

export class MetadataService {
  /**
   * Generates production Next.js Metadata object with full Google Scholar citation tags,
   * OpenGraph, Twitter Cards, Canonical, and Robots directives.
   */
  static generateArticleMetadata(article: ArticleMetadataInput): Metadata {
    const slug = article.slug || article.id;
    const articleUrl = `${BASE_URL}/article/${encodeURIComponent(slug)}`;
    const pdfUrl = article.pdfUrl || `${articleUrl}/pdf`;
    const cleanAbstract = (article.abstract || "").replace(/<[^>]*>?/gm, "").trim();
    const truncatedDesc = cleanAbstract.length > 160 ? cleanAbstract.substring(0, 157) + "..." : cleanAbstract;

    // Parse page ranges (e.g. "1 - 12" -> "1", "12")
    const pageRange = (article.pages || "1-12").split("-").map((p) => p.trim());
    const firstPage = pageRange[0] || "1";
    const lastPage = pageRange[1] || firstPage;

    const pubDate = article.publicationDate || article.lastUpdated || new Date().toISOString().split("T")[0];
    const onlineDate = article.acceptedAt || article.submissionDate || pubDate;
    const keywordsList = article.keywords || ["право", "юридические науки", "законодательство"];
    const primaryAuthor = article.authors?.[0]?.fullName || "Автор журнала";

    // Build Google Scholar Meta Tags
    const scholarMeta: Record<string, string | string[]> = {
      citation_title: article.title,
      citation_journal_title: article.journalTitle || DEFAULT_JOURNAL_TITLE,
      citation_issn: article.issn || DEFAULT_ISSN_ONLINE,
      citation_publication_date: pubDate.replace(/-/g, "/"),
      citation_online_date: onlineDate.replace(/-/g, "/"),
      citation_pdf_url: pdfUrl,
      citation_abstract_html_url: articleUrl,
      citation_language: (article.language || "ru").toLowerCase(),
      citation_fulltext_world_readable: "",
    };

    if (article.doi) {
      scholarMeta.citation_doi = article.doi;
    }
    if (article.volume) {
      scholarMeta.citation_volume = String(article.volume);
    }
    if (article.issueNumber) {
      scholarMeta.citation_issue = String(article.issueNumber);
    }
    if (firstPage) {
      scholarMeta.citation_firstpage = firstPage;
    }
    if (lastPage) {
      scholarMeta.citation_lastpage = lastPage;
    }

    // Handle multiple authors & institutions
    if (article.authors && article.authors.length > 0) {
      scholarMeta.citation_author = article.authors.map((a) => a.fullName);
      const insts = article.authors
        .map((a) => a.institution)
        .filter((inst): inst is string => Boolean(inst));
      if (insts.length > 0) {
        scholarMeta.citation_author_institution = insts;
      }
    } else {
      scholarMeta.citation_author = primaryAuthor;
    }

    if (keywordsList.length > 0) {
      scholarMeta.citation_keywords = keywordsList.join("; ");
    }

    return {
      title: `${article.title} | ${article.journalTitle || DEFAULT_JOURNAL_TITLE}`,
      description: truncatedDesc,
      keywords: keywordsList,
      authors: (article.authors || [{ fullName: primaryAuthor }]).map((a) => ({ name: a.fullName })),
      publisher: article.publisher || DEFAULT_PUBLISHER,
      metadataBase: new URL(BASE_URL),
      alternates: {
        canonical: articleUrl,
      },
      robots: {
        index: true,
        follow: true,
        googleBot: {
          index: true,
          follow: true,
          "max-video-preview": -1,
          "max-image-preview": "large",
          "max-snippet": -1,
        },
      },
      openGraph: {
        title: article.title,
        description: truncatedDesc,
        url: articleUrl,
        siteName: article.journalTitle || DEFAULT_JOURNAL_TITLE,
        locale: article.language === "English" ? "en_US" : article.language === "Uzbek" ? "uz_UZ" : "ru_RU",
        type: "article",
        publishedTime: pubDate,
        modifiedTime: article.lastUpdated || pubDate,
        authors: (article.authors || [{ fullName: primaryAuthor }]).map((a) => a.fullName),
        tags: keywordsList,
      },
      twitter: {
        card: "summary_large_image",
        title: article.title,
        description: truncatedDesc,
      },
      other: scholarMeta,
    };
  }

  /**
   * Helper to create SEO slugs from article titles.
   */
  static slugify(title: string, id: string): string {
    const slugText = title
      .toLowerCase()
      .replace(/[^a-z0-9а-яўқғҳ\s-]/gi, "")
      .trim()
      .replace(/\s+/g, "-")
      .substring(0, 80);
    return slugText ? `${slugText}-${id.slice(-6)}` : id;
  }
}
