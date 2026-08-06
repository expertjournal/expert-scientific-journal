import { NextRequest, NextResponse } from "next/server";
import { getNotificationsFromDB, saveNotificationToDB, NotificationRecord } from "@/lib/db-client";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const notifs = await getNotificationsFromDB();
    return NextResponse.json(notifs);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const notif: NotificationRecord = await req.json();
    if (!notif.id) notif.id = "notif_" + Date.now();
    if (!notif.createdAt) notif.createdAt = new Date().toISOString();

    const saved = await saveNotificationToDB(notif);
    return NextResponse.json({ success: true, notification: saved }, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
