import { NextRequest, NextResponse } from "next/server";
import { readServerDB } from "@/lib/server-db";
import { supabase } from "@/lib/supabase-client";

export const dynamic = "force-dynamic";

export interface SearchResponse {
  data: any[];
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
    const sort = searchParams.get("sort") || "relevance"; // relevance, newest, oldest, alphabetical
    const issueId = searchParams.get("issue") || searchParams.get("issueId") || "";
    const status = searchParams.get("status") || "";
    const category = searchParams.get("category") || searchParams.get("field") || "";
    const language = searchParams.get("language") || "";
    const author = searchParams.get("author") || "";

    // 1. Try Supabase PostgreSQL Query
    try {
      const { data: rawArticles, error } = await supabase
        .from("articles")
        .select("*")
        .order("created_at", { ascending: false });

      if (!error && rawArticles && Array.isArray(rawArticles)) {
        let items = rawArticles.map((a: any) => ({
          id: a.id,
          title: a.title,
          abstract: a.abstract,
          scientificField: a.scientific_field || a.category || "Экономика",
          language: a.language || "Русский",
          keywords: Array.isArray(a.keywords) ? a.keywords : [],
          status: a.status,
          submissionDate: a.submission_date || a.created_at?.split("T")[0],
          lastUpdated: a.last_updated || a.updated_at?.split("T")[0],
          authorName: a.author_name || "Автор",
          authorEmail: a.author_email || "author@journal.ru",
          fileName: a.file_name,
          fileUrl: a.file_url,
          doi: a.doi,
          issueId: a.issue_id,
          reviewNote: a.review_note,
          pages: a.pages,
        }));

        // Filter by Query
        if (q) {
          items = items.filter((a) => {
            const inTitle = a.title.toLowerCase().includes(q);
            const inAbstract = a.abstract.toLowerCase().includes(q);
            const inAuthor = a.authorName.toLowerCase().includes(q);
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

        // Sorting Logic (Relevance / Date / Alphabetical)
        if (sort === "newest") {
          items.sort((a, b) => new Date(b.submissionDate).getTime() - new Date(a.submissionDate).getTime());
        } else if (sort === "oldest") {
          items.sort((a, b) => new Date(a.submissionDate).getTime() - new Date(b.submissionDate).getTime());
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
      }
    } catch (e) {
      console.warn("Supabase FTS search fallback:", e);
    }

    // 2. Local DB Backup Calculation
    const db = readServerDB();
    let items = db.articles || [];

    if (q) {
      items = items.filter((a: any) =>
        a.title?.toLowerCase().includes(q) ||
        a.abstract?.toLowerCase().includes(q) ||
        a.authorName?.toLowerCase().includes(q) ||
        a.doi?.toLowerCase().includes(q)
      );
    }

    if (status && status !== "ALL") {
      items = items.filter((a: any) => a.status === status);
    }

    if (issueId) {
      items = items.filter((a: any) => a.issueId === issueId);
    }

    const total = items.length;
    const totalPages = Math.ceil(total / limit) || 1;
    const offset = (page - 1) * limit;
    const paginated = items.slice(offset, offset + limit);

    return NextResponse.json({
      data: paginated,
      total,
      page,
      totalPages,
      hasNext: page < totalPages,
      hasPrevious: page > 1,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Search failed" }, { status: 500 });
  }
}
