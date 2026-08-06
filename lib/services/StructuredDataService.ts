import { ArticleMetadataInput } from "./MetadataService";

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://expert-journal.up.railway.app";
const DEFAULT_JOURNAL_TITLE = "Expert Scientific Journal";
const DEFAULT_ISSN_PRINT = "3093-1234";
const DEFAULT_ISSN_ONLINE = "3093-1242";
const DEFAULT_PUBLISHER = "Expert Publishing Group";

export class StructuredDataService {
  /**
   * Generates complete JSON-LD ScholarlyArticle schema.
   */
  static generateScholarlyArticleSchema(article: ArticleMetadataInput) {
    const slug = article.slug || article.id;
    const articleUrl = `${BASE_URL}/article/${encodeURIComponent(slug)}`;
    const pdfUrl = article.pdfUrl || `${articleUrl}/pdf`;
    const cleanAbstract = (article.abstract || "").replace(/<[^>]*>?/gm, "").trim();
    const pubDate = article.publicationDate || article.lastUpdated || new Date().toISOString().split("T")[0];

    const authorsJson = (article.authors && article.authors.length > 0
      ? article.authors
      : [{ fullName: "Автор журнала", institution: "Expert Scientific Journal" }]
    ).map((author) => {
      const authorSchema: any = {
        "@type": "Person",
        name: author.fullName,
      };
      if (author.institution) {
        authorSchema.affiliation = {
          "@type": "Organization",
          name: author.institution,
        };
      }
      if (author.orcid) {
        const cleanOrcid = author.orcid.startsWith("http") ? author.orcid : `https://orcid.org/${author.orcid}`;
        authorSchema["@id"] = cleanOrcid;
        authorSchema.sameAs = cleanOrcid;
      }
      return authorSchema;
    });

    const schema: any = {
      "@context": "https://schema.org",
      "@type": "ScholarlyArticle",
      "@id": articleUrl,
      mainEntityOfPage: {
        "@type": "WebPage",
        "@id": articleUrl,
      },
      headline: article.title,
      name: article.title,
      description: cleanAbstract,
      abstract: cleanAbstract,
      inLanguage: article.language === "English" ? "en" : article.language === "Uzbek" ? "uz" : "ru",
      datePublished: pubDate,
      dateCreated: article.submissionDate || pubDate,
      dateModified: article.lastUpdated || pubDate,
      author: authorsJson,
      publisher: {
        "@type": "Organization",
        name: article.publisher || DEFAULT_PUBLISHER,
        url: BASE_URL,
        logo: {
          "@type": "ImageObject",
          url: `${BASE_URL}/logo.png`,
        },
      },
      isPartOf: {
        "@type": "Periodical",
        name: article.journalTitle || DEFAULT_JOURNAL_TITLE,
        issn: [article.issn || DEFAULT_ISSN_ONLINE, DEFAULT_ISSN_PRINT],
        publisher: {
          "@type": "Organization",
          name: article.publisher || DEFAULT_PUBLISHER,
        },
      },
      url: articleUrl,
      encoding: [
        {
          "@type": "MediaObject",
          encodingFormat: "application/pdf",
          contentUrl: pdfUrl,
        },
        {
          "@type": "MediaObject",
          encodingFormat: "text/html",
          contentUrl: articleUrl,
        },
      ],
    };

    if (article.doi) {
      const doiUrl = article.doi.startsWith("http") ? article.doi : `https://doi.org/${article.doi}`;
      schema.identifier = [
        {
          "@type": "PropertyValue",
          propertyID: "DOI",
          value: article.doi,
        },
      ];
      schema.sameAs = doiUrl;
    }

    if (article.keywords && article.keywords.length > 0) {
      schema.keywords = article.keywords.join(", ");
    }

    if (article.license) {
      schema.license = article.license.startsWith("http") ? article.license : "https://creativecommons.org/licenses/by/4.0/";
    } else {
      schema.license = "https://creativecommons.org/licenses/by/4.0/";
    }

    if (article.volume) {
      schema.volumeNumber = String(article.volume);
    }
    if (article.issueNumber) {
      schema.issueNumber = String(article.issueNumber);
    }
    if (article.pages) {
      schema.pageStart = article.pages.split("-")[0]?.trim();
      schema.pageEnd = article.pages.split("-")[1]?.trim() || schema.pageStart;
    }

    return schema;
  }

  /**
   * Generates Organization / Publisher JSON-LD Schema.
   */
  static generatePublisherSchema() {
    return {
      "@context": "https://schema.org",
      "@type": "Organization",
      name: DEFAULT_PUBLISHER,
      url: BASE_URL,
      logo: `${BASE_URL}/logo.png`,
      sameAs: ["https://crossref.org", "https://openalex.org"],
    };
  }

  /**
   * Generates Journal Periodical JSON-LD Schema.
   */
  static generateJournalSchema() {
    return {
      "@context": "https://schema.org",
      "@type": "Periodical",
      name: DEFAULT_JOURNAL_TITLE,
      issn: [DEFAULT_ISSN_PRINT, DEFAULT_ISSN_ONLINE],
      url: `${BASE_URL}/journal`,
      publisher: {
        "@type": "Organization",
        name: DEFAULT_PUBLISHER,
      },
    };
  }

  /**
   * Generates WebSite JSON-LD Schema with SearchAction.
   */
  static generateWebSiteSchema() {
    return {
      "@context": "https://schema.org",
      "@type": "WebSite",
      name: DEFAULT_JOURNAL_TITLE,
      url: BASE_URL,
      potentialAction: {
        "@type": "SearchAction",
        target: `${BASE_URL}/search?q={search_term_string}`,
        "query-input": "required name=search_term_string",
      },
    };
  }

  /**
   * Generates BreadcrumbList JSON-LD Schema.
   */
  static generateBreadcrumbSchema(items: { name: string; url: string }[]) {
    return {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: items.map((item, idx) => ({
        "@type": "ListItem",
        position: idx + 1,
        name: item.name,
        item: item.url.startsWith("http") ? item.url : `${BASE_URL}${item.url}`,
      })),
    };
  }
}
