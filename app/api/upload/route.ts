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

    const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
    const uniqueFileName = `${Date.now()}_${safeName}`;

    // 1. Try Supabase Storage if configured
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (supabaseUrl && supabaseKey) {
      try {
        const uploadRes = await fetch(`${supabaseUrl}/storage/v1/object/manuscripts/${uniqueFileName}`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${supabaseKey}`,
            apikey: supabaseKey,
            "Content-Type": file.type || "application/octet-stream",
          },
          body: buffer,
        });

        if (uploadRes.ok) {
          const publicUrl = `${supabaseUrl}/storage/v1/object/public/manuscripts/${uniqueFileName}`;
          return NextResponse.json({
            success: true,
            fileName: file.name,
            storedFileName: uniqueFileName,
            fileUrl: publicUrl,
            size: file.size,
          });
        }
      } catch (err) {
        console.warn("Supabase storage upload fallback:", err);
      }
    }

    // 2. Write to local disk fallback
    try {
      const uploadsDir = path.join(process.cwd(), "public", "uploads");
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }
      const filePath = path.join(uploadsDir, uniqueFileName);
      fs.writeFileSync(filePath, buffer);
    } catch (fsErr) {
      console.warn("Disk write warning:", fsErr);
    }

    // Return Data URL for persistent file viewing across server redeploys
    const mimeType = file.type || "application/pdf";
    const dataUrl = `data:${mimeType};base64,${buffer.toString("base64")}`;
    const publicUrl = `/uploads/${uniqueFileName}`;

    return NextResponse.json({
      success: true,
      fileName: file.name,
      storedFileName: uniqueFileName,
      fileUrl: buffer.length < 4 * 1024 * 1024 ? dataUrl : publicUrl,
      size: file.size,
    });
  } catch (e: any) {
    console.error("File upload error:", e);
    return NextResponse.json({ error: e.message || "File upload failed" }, { status: 500 });
  }
}
