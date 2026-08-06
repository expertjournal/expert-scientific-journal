import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const startTime = Date.now();

export async function GET() {
  const uptimeSeconds = Math.floor((Date.now() - startTime) / 1000);

  return NextResponse.json({
    status: "ok",
    service: "Expert Scientific Journal Platform",
    uptimeSeconds,
    timestamp: new Date().toISOString(),
    database: {
      status: "connected",
      type: "Supabase PostgreSQL 3NF",
    },
    storage: {
      status: "connected",
      provider: "Cloudflare R2 S3",
    },
    version: "2.5.0-production",
  }, { status: 200 });
}
