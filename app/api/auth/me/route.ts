import { NextRequest, NextResponse } from "next/server";
import { verifyJWT } from "@/lib/jwt";
import { findUserByEmail } from "@/lib/db-client";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const token = req.cookies.get("expert_token")?.value;
    if (!token) {
      return NextResponse.json({ user: null }, { status: 401 });
    }

    const payload = verifyJWT(token);
    if (!payload || !payload.email) {
      return NextResponse.json({ user: null }, { status: 401 });
    }

    const dbUser = await findUserByEmail(payload.email);
    if (!dbUser || dbUser.isVerified === false) {
      return NextResponse.json({ user: null }, { status: 401 });
    }

    const user = {
      id: dbUser.id,
      email: dbUser.email,
      firstName: dbUser.firstName,
      lastName: dbUser.lastName,
      role: dbUser.role,
      institution: dbUser.institution || "Expert Scientific Journal Board",
    };

    return NextResponse.json({ user });
  } catch (error) {
    return NextResponse.json({ user: null }, { status: 401 });
  }
}
