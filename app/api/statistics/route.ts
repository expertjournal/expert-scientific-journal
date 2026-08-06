import { NextResponse } from "next/server";
import { readServerDB } from "@/lib/server-db";
import { supabase } from "@/lib/supabase-client";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { data: articles, error: artError } = await supabase.from("articles").select("status");
    const { data: issues, error: issError } = await supabase.from("issues").select("status");

    if (!artError && articles && Array.isArray(articles) && !issError && issues && Array.isArray(issues)) {
      const totalSubmissions = articles.length;
      const underReview = articles.filter((a: any) => a.status === "SUBMITTED" || a.status === "UNDER_REVIEW" || a.status === "REVISION_REQUIRED").length;
      const accepted = articles.filter((a: any) => a.status === "ACCEPTED").length;
      const published = articles.filter((a: any) => a.status === "PUBLISHED").length;
      const rejected = articles.filter((a: any) => a.status === "REJECTED").length;
      const totalIssues = issues.length;

      return NextResponse.json({
        totalSubmissions,
        underReview,
        accepted,
        published,
        rejected,
        totalIssues,
      });
    }
  } catch (e) {
    console.warn("Supabase GET statistics fallback to local DB:", e);
  }

  const db = readServerDB();
  const articles = db.articles || [];
  const issues = db.issues || [];

  return NextResponse.json({
    totalSubmissions: articles.length,
    underReview: articles.filter((a: any) => a.status === "SUBMITTED" || a.status === "UNDER_REVIEW" || a.status === "REVISION_REQUIRED").length,
    accepted: articles.filter((a: any) => a.status === "ACCEPTED").length,
    published: articles.filter((a: any) => a.status === "PUBLISHED").length,
    rejected: articles.filter((a: any) => a.status === "REJECTED").length,
    totalIssues: issues.length,
  });
}
