import { NextResponse } from "next/server";
import { getArticlesFromDB, getIssuesFromDB } from "@/lib/db-client";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const articles = await getArticlesFromDB();
    const issues = await getIssuesFromDB();

    const totalSubmissions = articles.length;
    const underReview = articles.filter((a) => a.status === "SUBMITTED" || a.status === "UNDER_REVIEW" || a.status === "REVISION_REQUIRED").length;
    const accepted = articles.filter((a) => a.status === "ACCEPTED").length;
    const published = articles.filter((a) => a.status === "PUBLISHED").length;
    const rejected = articles.filter((a) => a.status === "REJECTED").length;
    const totalIssues = issues.length;

    return NextResponse.json({
      totalSubmissions,
      underReview,
      accepted,
      published,
      rejected,
      totalIssues,
    });
  } catch (e: any) {
    return NextResponse.json({
      totalSubmissions: 0,
      underReview: 0,
      accepted: 0,
      published: 0,
      rejected: 0,
      totalIssues: 0,
    });
  }
}
