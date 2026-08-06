import { NextRequest, NextResponse } from "next/server";
import { readServerDB, writeServerDB } from "@/lib/server-db";
import { supabase } from "@/lib/supabase-client";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { data, error } = await supabase
      .from("articles")
      .select("*")
      .order("created_at", { ascending: false });

    if (!error && data && data.length > 0) {
      const mapped = data.map((a: any) => ({
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
      return NextResponse.json(mapped);
    }
  } catch (e) {
    console.warn("Supabase GET articles fallback to local DB:", e);
  }

  const db = readServerDB();
  return NextResponse.json(db.articles);
}

export async function POST(req: NextRequest) {
  try {
    const article = await req.json();

    // 1. Sync local disk DB
    const db = readServerDB();
    const existingIdx = db.articles.findIndex((a) => a.id === article.id);
    if (existingIdx >= 0) {
      db.articles[existingIdx] = { ...db.articles[existingIdx], ...article };
    } else {
      db.articles.unshift(article);
    }
    writeServerDB(db);

    // 2. Sync Supabase PostgreSQL
    try {
      await supabase.from("articles").upsert({
        id: article.id,
        title: article.title,
        abstract: article.abstract,
        scientific_field: article.scientificField,
        language: article.language,
        keywords: article.keywords || [],
        status: article.status,
        submission_date: article.submissionDate || new Date().toISOString().split("T")[0],
        last_updated: article.lastUpdated || new Date().toISOString().split("T")[0],
        author_name: article.authorName,
        author_email: article.authorEmail,
        file_name: article.fileName,
        file_url: article.fileUrl,
        doi: article.doi,
        issue_id: article.issueId,
        review_note: article.reviewNote,
        pages: article.pages,
      });
    } catch (e) {
      console.warn("Supabase upsert error:", e);
    }

    return NextResponse.json({ success: true, article }, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { id, status, reviewNote, issueId } = await req.json();

    // 1. Sync local disk DB
    const db = readServerDB();
    db.articles = db.articles.map((a) =>
      a.id === id
        ? {
            ...a,
            status: status || a.status,
            reviewNote: reviewNote || a.reviewNote,
            issueId: issueId !== undefined ? issueId : a.issueId,
            lastUpdated: new Date().toISOString().split("T")[0],
          }
        : a
    );
    writeServerDB(db);

    // 2. Sync Supabase PostgreSQL
    try {
      const updateData: any = {
        last_updated: new Date().toISOString().split("T")[0],
      };
      if (status) updateData.status = status;
      if (reviewNote) updateData.review_note = reviewNote;
      if (issueId !== undefined) updateData.issue_id = issueId;

      await supabase.from("articles").update(updateData).eq("id", id);
    } catch (e) {
      console.warn("Supabase update error:", e);
    }

    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
