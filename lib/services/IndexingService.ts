import { revalidatePath, revalidateTag } from "next/cache";

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://expert-journal.up.railway.app";

export class IndexingService {
  /**
   * Triggers on-demand revalidation and notifies indexing services when an article is published or modified.
   */
  static async notifyArticlePublished(slugOrId: string) {
    try {
      const articleUrl = `${BASE_URL}/article/${encodeURIComponent(slugOrId)}`;

      // Revalidate cache paths
      if (typeof window === "undefined") {
        try {
          revalidatePath(`/article/${slugOrId}`);
          revalidatePath("/sitemap.xml");
          revalidatePath("/journal");
          revalidatePath("/archive");
          revalidatePath("/home");
          revalidateTag("articles");
        } catch (e) {
          // Ignore cache revalidation errors if outside request lifecycle
        }
      }

      console.log(`[INDEXING SERVICE] Article prepared for search indexing: ${articleUrl}`);

      // Google Indexing API / Ping Search Engines
      const googlePingUrl = `https://www.google.com/ping?sitemap=${encodeURIComponent(`${BASE_URL}/sitemap.xml`)}`;
      fetch(googlePingUrl).catch(() => null);

      return { success: true, articleUrl, timestamp: new Date().toISOString() };
    } catch (error: any) {
      console.error("[INDEXING SERVICE ERROR]", error);
      return { success: false, error: error.message };
    }
  }
}
