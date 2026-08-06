import { NextRequest, NextResponse } from "next/server";
import { verifyJWT } from "@/lib/jwt";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get("expert_token")?.value;

    if (!token) {
      return NextResponse.json({ user: null }, { status: 401 });
    }

    const decoded = verifyJWT(token);
    if (!decoded) {
      const response = NextResponse.json({ user: null }, { status: 401 });
      response.cookies.delete("expert_token");
      return response;
    }

    const user = {
      id: decoded.sub,
      email: decoded.email,
      firstName: decoded.firstName || decoded.email.split("@")[0],
      lastName: decoded.lastName || "",
      role: decoded.role as any,
      institution: decoded.institution || "Expert Journal",
    };

    return NextResponse.json({ user });
  } catch (error) {
    console.error("Auth me route error:", error);
    return NextResponse.json({ user: null }, { status: 500 });
  }
}
