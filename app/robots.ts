import { MetadataRoute } from "next";
import { RobotsService } from "@/lib/services/RobotsService";

export const dynamic = "force-dynamic";

export default function robots(): MetadataRoute.Robots {
  const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://expert-journal.up.railway.app";

  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/article/", "/journal/", "/archive/", "/about/", "/search/", "/doi/"],
        disallow: ["/admin/", "/editor/", "/author/", "/reviewer/", "/login", "/register", "/forgot-password", "/reset-password", "/unauthorized", "/api/auth/"],
      },
      {
        userAgent: "Googlebot",
        allow: "/",
      },
      {
        userAgent: "Google-Scholar",
        allow: "/",
      },
      {
        userAgent: "Crossref",
        allow: "/",
      },
      {
        userAgent: "OpenAlex",
        allow: "/",
      },
    ],
    sitemap: `${BASE_URL}/sitemap.xml`,
  };
}
