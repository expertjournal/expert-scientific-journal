import { NextRequest, NextResponse } from "next/server";
import { getReviewerAppsFromDB, saveOrUpdateReviewerApp, ReviewerAppRecord } from "@/lib/db-client";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const apps = await getReviewerAppsFromDB();
    return NextResponse.json(apps);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const app: ReviewerAppRecord = await req.json();
    if (!app.id) app.id = "app_" + Date.now();
    const saved = await saveOrUpdateReviewerApp(app);
    return NextResponse.json({ success: true, application: saved }, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { id, status } = await req.json();
    if (!id || !status) return NextResponse.json({ message: "Missing params" }, { status: 400 });

    const apps = await getReviewerAppsFromDB();
    const existing = apps.find((a) => a.id === id);
    if (existing) {
      await saveOrUpdateReviewerApp({
        ...existing,
        status,
      });
    }

    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
