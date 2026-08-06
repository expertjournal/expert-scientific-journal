import { NextRequest, NextResponse } from "next/server";
import { readServerDB, writeServerDB } from "@/lib/server-db";
import { supabase } from "@/lib/supabase-client";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { data, error } = await supabase
      .from("issues")
      .select("*")
      .order("created_at", { ascending: false });

    if (!error && data && data.length > 0) {
      const mapped = data.map((i: any) => ({
        id: i.id,
        number: i.issue_number || i.number,
        year: i.year,
        status: i.status,
        description: i.description,
        publicationDate: i.publication_date || i.publicationDate,
        coverUrl: i.cover_url || i.coverUrl,
        doi: i.doi,
        journalTitle: i.journal_title || i.journalTitle,
      }));
      return NextResponse.json(mapped);
    }
  } catch (e) {
    console.warn("Supabase GET issues fallback to local DB:", e);
  }

  const db = readServerDB();
  return NextResponse.json(db.issues);
}

export async function POST(req: NextRequest) {
  try {
    const issue = await req.json();

    // 1. Sync local disk DB
    const db = readServerDB();
    const existingIdx = db.issues.findIndex((i) => i.id === issue.id);
    if (existingIdx >= 0) {
      db.issues[existingIdx] = { ...db.issues[existingIdx], ...issue };
    } else {
      db.issues.unshift(issue);
    }
    writeServerDB(db);

    // 2. Sync Supabase PostgreSQL
    try {
      await supabase.from("issues").upsert({
        id: issue.id,
        issue_number: issue.number,
        year: issue.year,
        status: issue.status,
        description: issue.description,
        publication_date: issue.publicationDate,
        cover_url: issue.coverUrl,
        doi: issue.doi,
        journal_title: issue.journalTitle,
      });
    } catch (e) {
      console.warn("Supabase upsert issue error:", e);
    }

    return NextResponse.json({ success: true, issue }, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { id, status, coverUrl } = await req.json();

    // 1. Sync local disk DB
    const db = readServerDB();
    db.issues = db.issues.map((i) =>
      i.id === id
        ? {
            ...i,
            status: status || i.status,
            coverUrl: coverUrl || i.coverUrl,
            publicationDate: status === "PUBLISHED" ? new Date().toISOString().split("T")[0] : i.publicationDate,
          }
        : i
    );
    writeServerDB(db);

    // 2. Sync Supabase PostgreSQL
    try {
      const updateData: any = {};
      if (status) updateData.status = status;
      if (coverUrl) updateData.cover_url = coverUrl;
      if (status === "PUBLISHED") updateData.publication_date = new Date().toISOString().split("T")[0];

      await supabase.from("issues").update(updateData).eq("id", id);
    } catch (e) {
      console.warn("Supabase update issue error:", e);
    }

    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
