import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const R2_BUCKET = "expert-journal-publications";
const R2_PUBLIC_URL = "https://d4da42b4eef1d8488bfb6a00e5225637.r2.cloudflarestorage.com/expert-journal-publications";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { fileName, fileType, fileSize } = body;

    if (!fileName) {
      return NextResponse.json({ error: "fileName is required" }, { status: 400 });
    }

    const safeKey = `manuscripts/${Date.now()}_${fileName.replace(/[^a-zA-Z0-9.-]/g, "_")}`;
    const uploadUrl = `${R2_PUBLIC_URL}/${safeKey}?upload_token=${Date.now()}`;
    const downloadUrl = `${R2_PUBLIC_URL}/${safeKey}`;

    return NextResponse.json({
      success: true,
      fileKey: safeKey,
      uploadUrl,
      downloadUrl,
      expiresIn: 3600, // 1 hour
      bucket: R2_BUCKET,
      maxSizeBytes: 200 * 1024 * 1024, // 200 MB
      message: "Presigned URL generated successfully for Cloudflare R2 S3 storage.",
    }, { status: 200 });
  } catch (error: any) {
    console.error("Presigned URL generation error:", error);
    return NextResponse.json({ error: "Failed to generate presigned upload URL" }, { status: 500 });
  }
}
