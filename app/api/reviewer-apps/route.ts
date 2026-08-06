import { NextRequest, NextResponse } from "next/server";
import { readServerDB, writeServerDB } from "@/lib/server-db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const db = readServerDB();
    return NextResponse.json(db.reviewerApps || []);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const app = await req.json();
    const db = readServerDB();
    
    // Filter existing app from same user
    db.reviewerApps = [
      app,
      ...(db.reviewerApps || []).filter((a: any) => a.id !== app.id && a.userEmail !== app.userEmail),
    ];
    writeServerDB(db);

    return NextResponse.json({ success: true, app }, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { id, status } = await req.json();
    const db = readServerDB();

    db.reviewerApps = (db.reviewerApps || []).map((a: any) =>
      a.id === id ? { ...a, status } : a
    );
    writeServerDB(db);

    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
