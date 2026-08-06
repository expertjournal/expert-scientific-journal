const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://expert-journal.up.railway.app";

export class RobotsService {
  static generateRobotsTxt(): string {
    return `# Expert Scientific Journal — Production Robots.txt
User-agent: *
Allow: /
Allow: /article/
Allow: /journal/
Allow: /archive/
Allow: /about/
Allow: /search/
Allow: /api/articles/

Disallow: /admin/
Disallow: /editor/
Disallow: /author/
Disallow: /api/auth/
Disallow: /_next/

# Academic Indexers Explicit Permissions
User-agent: Googlebot
Allow: /

User-agent: Googlebot-News
Allow: /

User-agent: Google-Scholar
Allow: /

User-agent: Crossref
Allow: /

User-agent: OpenAlex
Allow: /

Sitemap: ${BASE_URL}/sitemap.xml
`;
  }
}
