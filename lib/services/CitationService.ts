import { ArticleMetadataInput } from "./MetadataService";

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://expert-journal.up.railway.app";
const DEFAULT_JOURNAL_TITLE = "Expert Scientific Journal";

export class CitationService {
  /**
   * Generates dynamic BibTeX citation format.
   */
  static exportBibTeX(article: ArticleMetadataInput): string {
    const primaryAuthor = article.authors?.[0]?.fullName || "Author";
    const authorLastName = primaryAuthor.split(" ").slice(-1)[0] || "Author";
    const year = (article.publicationDate || article.lastUpdated || "2026").substring(0, 4);
    const citeKey = `${authorLastName.toLowerCase()}${year}${article.id.slice(-4)}`;
    const authorsFormatted = (article.authors || [{ fullName: primaryAuthor }])
      .map((a) => a.fullName)
      .join(" and ");

    return `@article{${citeKey},
  title = {${article.title}},
  author = {${authorsFormatted}},
  journal = {${article.journalTitle || DEFAULT_JOURNAL_TITLE}},
  volume = {${article.volume || 2026}},
  number = {${article.issueNumber || 10}},
  pages = {${article.pages || "1-12"}},
  year = {${year}},
  doi = {${article.doi || `10.47689/expert-${year}-iss10-${article.id}`}},
  url = {${BASE_URL}/article/${article.slug || article.id}},
  publisher = {${article.publisher || "Expert Publishing"}}
}`;
  }

  /**
   * Generates dynamic RIS (Research Information Systems) citation format.
   */
  static exportRIS(article: ArticleMetadataInput): string {
    const year = (article.publicationDate || article.lastUpdated || "2026").substring(0, 4);
    const lines: string[] = [
      "TY  - JOUR",
      `TI  - ${article.title}`,
      `JO  - ${article.journalTitle || DEFAULT_JOURNAL_TITLE}`,
      `VL  - ${article.volume || 2026}`,
      `IS  - ${article.issueNumber || 10}`,
      `PY  - ${year}`,
      `SP  - ${article.pages?.split("-")[0]?.trim() || 1}`,
      `EP  - ${article.pages?.split("-")[1]?.trim() || 12}`,
      `UR  - ${BASE_URL}/article/${article.slug || article.id}`,
    ];

    if (article.doi) {
      lines.push(`DO  - ${article.doi}`);
    }

    if (article.authors && article.authors.length > 0) {
      article.authors.forEach((a) => lines.push(`AU  - ${a.fullName}`));
    } else {
      lines.push("AU  - Author, Anonymous");
    }

    if (article.abstract) {
      lines.push(`AB  - ${article.abstract.replace(/\n/g, " ")}`);
    }

    lines.push("ER  - ");
    return lines.join("\n");
  }

  /**
   * Generates APA 7th Edition formatted citation string.
   */
  static formatAPA(article: ArticleMetadataInput): string {
    const authors = article.authors || [{ fullName: "Автор" }];
    const authorsString = authors.map((a) => a.fullName).join(", ");
    const year = (article.publicationDate || article.lastUpdated || "2026").substring(0, 4);
    const doiPart = article.doi ? ` https://doi.org/${article.doi}` : "";

    return `${authorsString}. (${year}). ${article.title}. ${article.journalTitle || DEFAULT_JOURNAL_TITLE}, ${article.volume || 2026}(${article.issueNumber || 10}), ${article.pages || "1-12"}.${doiPart}`;
  }

  /**
   * Generates MLA 9th Edition formatted citation string.
   */
  static formatMLA(article: ArticleMetadataInput): string {
    const authors = article.authors || [{ fullName: "Автор" }];
    const firstAuthor = authors[0]?.fullName || "Автор";
    const authorsString = authors.length > 1 ? `${firstAuthor}, et al` : firstAuthor;
    const year = (article.publicationDate || article.lastUpdated || "2026").substring(0, 4);
    const doiPart = article.doi ? ` https://doi.org/${article.doi}` : "";

    return `${authorsString}. "${article.title}." ${article.journalTitle || DEFAULT_JOURNAL_TITLE}, vol. ${article.volume || 2026}, no. ${article.issueNumber || 10}, ${year}, pp. ${article.pages || "1-12"}.${doiPart}`;
  }

  /**
   * Generates Chicago Manual of Style formatted citation string.
   */
  static formatChicago(article: ArticleMetadataInput): string {
    const authors = article.authors || [{ fullName: "Автор" }];
    const authorsString = authors.map((a) => a.fullName).join(", ");
    const year = (article.publicationDate || article.lastUpdated || "2026").substring(0, 4);
    const doiPart = article.doi ? ` https://doi.org/${article.doi}` : "";

    return `${authorsString}. "${article.title}." ${article.journalTitle || DEFAULT_JOURNAL_TITLE} ${article.volume || 2026}, no. ${article.issueNumber || 10} (${year}): ${article.pages || "1-12"}.${doiPart}`;
  }

  /**
   * Generates Harvard style formatted citation string.
   */
  static formatHarvard(article: ArticleMetadataInput): string {
    const authors = article.authors || [{ fullName: "Автор" }];
    const authorsString = authors.map((a) => a.fullName).join(", ");
    const year = (article.publicationDate || article.lastUpdated || "2026").substring(0, 4);

    return `${authorsString}, ${year}. ${article.title}. ${article.journalTitle || DEFAULT_JOURNAL_TITLE}, ${article.volume || 2026}(${article.issueNumber || 10}), pp.${article.pages || "1-12"}.`;
  }

  /**
   * Generates IEEE style formatted citation string.
   */
  static formatIEEE(article: ArticleMetadataInput): string {
    const authors = article.authors || [{ fullName: "Автор" }];
    const authorsString = authors.map((a) => a.fullName).join(", ");
    const year = (article.publicationDate || article.lastUpdated || "2026").substring(0, 4);
    const doiPart = article.doi ? `, doi: ${article.doi}` : "";

    return `${authorsString}, "${article.title}," ${article.journalTitle || DEFAULT_JOURNAL_TITLE}, vol. ${article.volume || 2026}, no. ${article.issueNumber || 10}, pp. ${article.pages || "1-12"}, ${year}${doiPart}.`;
  }
}
