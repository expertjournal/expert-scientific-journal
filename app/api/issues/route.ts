import { NextRequest, NextResponse } from "next/server";
import { getIssuesFromDB, saveOrUpdateIssue, IssueRecord } from "@/lib/db-client";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const issues = await getIssuesFromDB();
    return NextResponse.json(issues);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const issue = await req.json();
    if (!issue.id) issue.id = "iss_" + Date.now();
    const saved = await saveOrUpdateIssue(issue);
    return NextResponse.json({ success: true, issue: saved }, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { id, ...updates } = await req.json();
    if (!id) return NextResponse.json({ message: "Missing issue id" }, { status: 400 });

    const issues = await getIssuesFromDB();
    const existing = issues.find((i) => i.id === id);
    if (existing) {
      await saveOrUpdateIssue({
        ...existing,
        ...updates,
      });
    }

    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
