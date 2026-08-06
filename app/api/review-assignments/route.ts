import { NextRequest, NextResponse } from "next/server";
import { readServerDB, writeServerDB } from "@/lib/server-db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const db = readServerDB();
    return NextResponse.json(db.reviewAssignments || []);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const assignment = await req.json();
    const db = readServerDB();

    db.reviewAssignments = [
      assignment,
      ...(db.reviewAssignments || []).filter((a: any) => a.id !== assignment.id),
    ];
    writeServerDB(db);

    return NextResponse.json({ success: true, assignment }, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { id, ...updates } = await req.json();
    const db = readServerDB();

    db.reviewAssignments = (db.reviewAssignments || []).map((a: any) =>
      a.id === id ? { ...a, ...updates } : a
    );
    writeServerDB(db);

    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
