import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Create public/uploads directory if not exists
    const uploadsDir = path.join(process.cwd(), "public", "uploads");
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    // Sanitize filename and create unique timestamped file
    const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
    const uniqueFileName = `${Date.now()}_${safeName}`;
    const filePath = path.join(uploadsDir, uniqueFileName);

    // Write file to disk
    fs.writeFileSync(filePath, buffer);

    const publicUrl = `/uploads/${uniqueFileName}`;

    return NextResponse.json({
      success: true,
      fileName: file.name,
      storedFileName: uniqueFileName,
      fileUrl: publicUrl,
      size: file.size,
    });
  } catch (e: any) {
    console.error("File upload error:", e);
    return NextResponse.json({ error: e.message || "File upload failed" }, { status: 500 });
  }
}
