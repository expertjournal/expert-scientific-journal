import { NextRequest, NextResponse } from "next/server";
import { getArticlesFromDB, ArticleRecord } from "@/lib/db-client";

export const dynamic = "force-dynamic";

export interface SearchResponse {
  data: ArticleRecord[];
  total: number;
  page: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);

    const q = (searchParams.get("q") || "").trim().toLowerCase();
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(20, Math.max(1, parseInt(searchParams.get("limit") || "10", 10)));
    const sort = searchParams.get("sort") || "relevance";
    const issueId = searchParams.get("issue") || searchParams.get("issueId") || "";
    const status = searchParams.get("status") || "";
    const category = searchParams.get("category") || searchParams.get("field") || "";
    const language = searchParams.get("language") || "";
    const author = searchParams.get("author") || "";

    const rawArticles = await getArticlesFromDB();
    let items = rawArticles;

    // Filter by Query
    if (q) {
      items = items.filter((a) => {
        const inTitle = (a.title || "").toLowerCase().includes(q);
        const inAbstract = (a.abstract || "").toLowerCase().includes(q);
        const inAuthor = (a.authorName || "").toLowerCase().includes(q);
        const inDoi = (a.doi || "").toLowerCase().includes(q);
        const inField = (a.scientificField || "").toLowerCase().includes(q);
        const inKeywords = (a.keywords || []).some((k: string) => k.toLowerCase().includes(q));
        return inTitle || inAbstract || inAuthor || inDoi || inField || inKeywords;
      });
    }

    // Filter by Status
    if (status && status !== "ALL" && status !== "Все статусы") {
      items = items.filter((a) => a.status === status);
    }

    // Filter by Issue
    if (issueId) {
      items = items.filter((a) => a.issueId === issueId);
    }

    // Filter by Category / Scientific Field
    if (category) {
      items = items.filter((a) => a.scientificField?.toLowerCase() === category.toLowerCase());
    }

    // Filter by Language
    if (language) {
      items = items.filter((a) => a.language?.toLowerCase() === language.toLowerCase());
    }

    // Filter by Author
    if (author) {
      items = items.filter((a) => a.authorName?.toLowerCase().includes(author.toLowerCase()));
    }

    // Sorting Logic
    if (sort === "newest") {
      items.sort((a, b) => new Date(b.submissionDate || 0).getTime() - new Date(a.submissionDate || 0).getTime());
    } else if (sort === "oldest") {
      items.sort((a, b) => new Date(a.submissionDate || 0).getTime() - new Date(b.submissionDate || 0).getTime());
    } else if (sort === "alphabetical") {
      items.sort((a, b) => a.title.localeCompare(b.title));
    } else if (sort === "relevance" && q) {
      items.sort((a, b) => {
        const scoreA = (a.title.toLowerCase().includes(q) ? 10 : 0) + (a.doi?.toLowerCase().includes(q) ? 8 : 0);
        const scoreB = (b.title.toLowerCase().includes(q) ? 10 : 0) + (b.doi?.toLowerCase().includes(q) ? 8 : 0);
        return scoreB - scoreA;
      });
    }

    const total = items.length;
    const totalPages = Math.ceil(total / limit) || 1;
    const offset = (page - 1) * limit;
    const paginated = items.slice(offset, offset + limit);

    const response: SearchResponse = {
      data: paginated,
      total,
      page,
      totalPages,
      hasNext: page < totalPages,
      hasPrevious: page > 1,
    };

    return NextResponse.json(response);
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Search failed" }, { status: 500 });
  }
}
