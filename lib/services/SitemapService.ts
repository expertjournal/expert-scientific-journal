import { ArticleMetadataInput } from "./MetadataService";

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://expert-journal.up.railway.app";

export interface SitemapItem {
  url: string;
  lastModified?: string | Date;
  changeFrequency?: "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never";
  priority?: number;
}

export class SitemapService {
  /**
   * Generates dynamic array of sitemap items for Next.js app/sitemap.ts
   */
  static generateSitemapEntries(articles: ArticleMetadataInput[] = [], issues: any[] = []): SitemapItem[] {
    const now = new Date().toISOString();

    const staticRoutes: SitemapItem[] = [
      { url: BASE_URL, lastModified: now, changeFrequency: "daily", priority: 1.0 },
      { url: `${BASE_URL}/home`, lastModified: now, changeFrequency: "daily", priority: 0.9 },
      { url: `${BASE_URL}/journal`, lastModified: now, changeFrequency: "daily", priority: 0.9 },
      { url: `${BASE_URL}/archive`, lastModified: now, changeFrequency: "weekly", priority: 0.8 },
      { url: `${BASE_URL}/about`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
      { url: `${BASE_URL}/search`, lastModified: now, changeFrequency: "weekly", priority: 0.6 },
    ];

    const articleRoutes: SitemapItem[] = articles.map((art) => ({
      url: `${BASE_URL}/article/${encodeURIComponent(art.slug || art.id)}`,
      lastModified: art.lastUpdated || art.publicationDate || now,
      changeFrequency: "monthly",
      priority: 0.8,
    }));

    const issueRoutes: SitemapItem[] = issues.map((iss) => ({
      url: `${BASE_URL}/journal?issueId=${encodeURIComponent(iss.id)}`,
      lastModified: iss.publicationDate || now,
      changeFrequency: "monthly",
      priority: 0.7,
    }));

    return [...staticRoutes, ...articleRoutes, ...issueRoutes];
  }

  /**
   * Generates raw XML sitemap string for /sitemap.xml
   */
  static generateXmlSitemap(items: SitemapItem[]): string {
    const urlsXml = items
      .map((item) => {
        const dateStr = item.lastModified
          ? new Date(item.lastModified).toISOString().split("T")[0]
          : new Date().toISOString().split("T")[0];
        return `  <url>
    <loc>${item.url}</loc>
    <lastmod>${dateStr}</lastmod>
    <changefreq>${item.changeFrequency || "monthly"}</changefreq>
    <priority>${item.priority || 0.5}</priority>
  </url>`;
      })
      .join("\n");

    return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urlsXml}
</urlset>`;
  }
}
