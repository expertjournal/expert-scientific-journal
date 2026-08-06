import { NextRequest, NextResponse } from "next/server";
import { readServerDB, writeServerDB } from "@/lib/server-db";
import { supabase } from "@/lib/supabase-client";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { data, error } = await supabase
      .from("messages")
      .select("*")
      .order("created_at", { ascending: true });

    if (!error && data && data.length > 0) {
      const mapped = data.map((m: any) => ({
        id: m.id,
        sender: m.sender,
        role: m.role,
        text: m.text,
        time: m.time || m.created_at?.split("T")[1]?.slice(0, 5),
        authorEmail: m.author_email,
      }));
      return NextResponse.json(mapped);
    }
  } catch (e) {
    console.warn("Supabase GET messages fallback to local DB:", e);
  }

  const db = readServerDB();
  return NextResponse.json(db.messages || []);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // 1. Sync local disk DB
    const db = readServerDB();
    const messages = db.messages || [];
    db.messages = [...messages.filter((m: any) => m.id !== body.id), body];
    writeServerDB(db);

    // 2. Sync Supabase PostgreSQL
    try {
      await supabase.from("messages").upsert({
        id: body.id,
        sender: body.sender,
        role: body.role,
        text: body.text,
        time: body.time,
        author_email: body.authorEmail,
      });
    } catch (e) {
      console.warn("Supabase upsert message error:", e);
    }

    return NextResponse.json({ success: true, messages: db.messages });
  } catch (e) {
    return NextResponse.json({ error: "Failed to save message" }, { status: 500 });
  }
}
