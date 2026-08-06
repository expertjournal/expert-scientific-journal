import { NextRequest, NextResponse } from "next/server";
import { getReviewAssignmentsFromDB, saveOrUpdateReviewAssignment, ReviewAssignmentRecord } from "@/lib/db-client";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const assignments = await getReviewAssignmentsFromDB();
    return NextResponse.json(assignments);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const assignment: ReviewAssignmentRecord = await req.json();
    if (!assignment.id) assignment.id = "assign_" + Date.now();

    const saved = await saveOrUpdateReviewAssignment(assignment);
    return NextResponse.json({ success: true, assignment: saved }, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { id, ...updates } = await req.json();
    if (!id) return NextResponse.json({ message: "Missing assignment id" }, { status: 400 });

    const assignments = await getReviewAssignmentsFromDB();
    const existing = assignments.find((a) => a.id === id);
    if (existing) {
      await saveOrUpdateReviewAssignment({
        ...existing,
        ...updates,
      });
    }

    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
