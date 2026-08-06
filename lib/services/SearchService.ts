import { ArticleMetadataInput } from "./MetadataService";

export interface SearchOptions {
  query?: string;
  field?: string;
  language?: string;
  articleType?: string;
  year?: number | string;
  status?: string;
  limit?: number;
  offset?: number;
}

export class SearchService {
  /**
   * Enterprise multi-field database search engine across articles and issues.
   */
  static searchArticles(articles: ArticleMetadataInput[], options: SearchOptions) {
    const { query = "", field, language, articleType, year, status = "PUBLISHED", limit = 20, offset = 0 } = options;
    const cleanQuery = query.toLowerCase().trim();

    let results = articles.filter((a) => {
      // Filter by status if specified
      if (status && status !== "ALL" && a.status && a.status !== status) {
        return false;
      }
      // Filter by scientific field
      if (field && field !== "ALL" && a.scientificField && !a.scientificField.toLowerCase().includes(field.toLowerCase())) {
        return false;
      }
      // Filter by language
      if (language && language !== "ALL" && a.language && a.language.toLowerCase() !== language.toLowerCase()) {
        return false;
      }
      // Filter by article type
      if (articleType && articleType !== "ALL" && a.articleType && !a.articleType.toLowerCase().includes(articleType.toLowerCase())) {
        return false;
      }
      // Filter by publication year
      if (year && a.publicationDate) {
        const pubYear = new Date(a.publicationDate).getFullYear();
        if (String(pubYear) !== String(year)) return false;
      }

      if (!cleanQuery) return true;

      // Multi-field text matching
      const inTitle = (a.title || "").toLowerCase().includes(cleanQuery);
      const inAbstract = (a.abstract || "").toLowerCase().includes(cleanQuery);
      const inDoi = (a.doi || "").toLowerCase().includes(cleanQuery);
      const inKeywords = (a.keywords || []).some((kw) => kw.toLowerCase().includes(cleanQuery));
      const inAuthors = (a.authors || []).some(
        (au) => au.fullName.toLowerCase().includes(cleanQuery) || (au.orcid && au.orcid.toLowerCase().includes(cleanQuery))
      );

      return inTitle || inAbstract || inDoi || inKeywords || inAuthors;
    });

    const total = results.length;
    const paginated = results.slice(offset, offset + limit);

    return {
      total,
      limit,
      offset,
      articles: paginated,
    };
  }
}
