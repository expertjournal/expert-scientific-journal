import { NextRequest, NextResponse } from "next/server";
import { getMessagesFromDB, saveMessageToDB, MessageRecord } from "@/lib/db-client";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const messages = await getMessagesFromDB();
    return NextResponse.json(messages);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const msg: MessageRecord = await req.json();
    if (!msg.id) msg.id = "msg_" + Date.now();
    if (!msg.createdAt) msg.createdAt = new Date().toISOString();

    const saved = await saveMessageToDB(msg);
    return NextResponse.json({ success: true, message: saved }, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
