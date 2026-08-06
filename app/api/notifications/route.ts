import { NextRequest, NextResponse } from "next/server";
import { readServerDB, writeServerDB } from "@/lib/server-db";
import { supabase } from "@/lib/supabase-client";

export const dynamic = "force-dynamic";

export interface DBNotification {
  id: string;
  userId?: string;
  userRole?: "author" | "editor" | "all";
  title: string;
  message: string;
  isRead: boolean;
  type?: "submission" | "status" | "chat" | "publication";
  createdAt: string;
}

export async function GET() {
  try {
    const { data, error } = await supabase
      .from("notifications")
      .select("*")
      .order("created_at", { ascending: false });

    if (!error && data && data.length > 0) {
      const mapped: DBNotification[] = data.map((n: any) => ({
        id: n.id,
        userId: n.user_id,
        userRole: n.user_role || "all",
        title: n.title,
        message: n.message,
        isRead: Boolean(n.is_read),
        type: n.type || "status",
        createdAt: n.created_at || new Date().toISOString(),
      }));
      return NextResponse.json(mapped);
    }
  } catch (e) {
    console.warn("Supabase GET notifications fallback to local DB:", e);
  }

  const db = readServerDB() as any;
  return NextResponse.json(db.notifications || []);
}

export async function POST(req: NextRequest) {
  try {
    const notif: DBNotification = await req.json();

    // 1. Sync local disk DB
    const db = readServerDB() as any;
    const notifications = db.notifications || [];
    db.notifications = [notif, ...notifications.filter((n: DBNotification) => n.id !== notif.id)];
    writeServerDB(db);

    // 2. Sync Supabase PostgreSQL
    try {
      await supabase.from("notifications").upsert({
        id: notif.id,
        user_id: notif.userId,
        title: notif.title,
        message: notif.message,
        is_read: notif.isRead,
        created_at: notif.createdAt || new Date().toISOString(),
      });
    } catch (e) {
      console.warn("Supabase upsert notification error:", e);
    }

    return NextResponse.json({ success: true, notification: notif }, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { id, markAllAsRead } = await req.json();

    // 1. Sync local disk DB
    const db = readServerDB() as any;
    const notifications: DBNotification[] = db.notifications || [];
    if (markAllAsRead) {
      db.notifications = notifications.map((n) => ({ ...n, isRead: true }));
    } else if (id) {
      db.notifications = notifications.map((n) => (n.id === id ? { ...n, isRead: true } : n));
    }
    writeServerDB(db);

    // 2. Sync Supabase PostgreSQL
    try {
      if (id) {
        await supabase.from("notifications").update({ is_read: true }).eq("id", id);
      }
    } catch (e) {
      console.warn("Supabase update notification error:", e);
    }

    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
