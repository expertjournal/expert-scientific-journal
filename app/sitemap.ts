import { MetadataRoute } from "next";
import { getStoredArticles, getStoredIssues } from "@/lib/articles-store";
import { SitemapService } from "@/lib/services/SitemapService";
import { MetadataService } from "@/lib/services/MetadataService";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  try {
    const articles = getStoredArticles().filter((a) => a.status === "PUBLISHED");
    const issues = getStoredIssues().filter((i) => i.status === "PUBLISHED");

    const formattedArticles = articles.map((a) => ({
      id: a.id,
      slug: MetadataService.slugify(a.title, a.id),
      title: a.title,
      abstract: a.abstract,
      lastUpdated: a.lastUpdated,
      publicationDate: a.submissionDate,
    }));

    const entries = SitemapService.generateSitemapEntries(formattedArticles, issues);

    return entries.map((item) => ({
      url: item.url,
      lastModified: item.lastModified ? new Date(item.lastModified) : new Date(),
      changeFrequency: item.changeFrequency,
      priority: item.priority,
    }));
  } catch (error) {
    console.error("Sitemap generation error:", error);
    const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://expert-journal.up.railway.app";
    return [
      { url: BASE_URL, lastModified: new Date(), changeFrequency: "daily", priority: 1.0 },
      { url: `${BASE_URL}/home`, lastModified: new Date(), changeFrequency: "daily", priority: 0.9 },
      { url: `${BASE_URL}/journal`, lastModified: new Date(), changeFrequency: "daily", priority: 0.9 },
    ];
  }
}
