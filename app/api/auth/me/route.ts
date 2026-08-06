import { NextRequest, NextResponse } from "next/server";
import { verifyJWT } from "@/lib/jwt";
import { findUserByEmailInDB } from "@/lib/server-db";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get("expert_token")?.value;

    if (!token) {
      return NextResponse.json({ user: null }, { status: 401 });
    }

    const decoded = verifyJWT(token);
    if (!decoded || !decoded.email) {
      const response = NextResponse.json({ user: null }, { status: 401 });
      response.cookies.delete("expert_token");
      return response;
    }

    const dbUser = findUserByEmailInDB(decoded.email);

    const user = {
      id: dbUser?.id || decoded.sub,
      email: dbUser?.email || decoded.email,
      firstName: dbUser?.firstName || decoded.firstName || decoded.email.split("@")[0],
      lastName: dbUser?.lastName || decoded.lastName || "",
      role: (dbUser?.role || decoded.role) as any,
      institution: dbUser?.institution || decoded.institution || "Expert Journal Board",
    };

    return NextResponse.json({ user });
  } catch (error) {
    console.error("Auth me route error:", error);
    return NextResponse.json({ user: null }, { status: 500 });
  }
}
