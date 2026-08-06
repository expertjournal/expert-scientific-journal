import { NextRequest, NextResponse } from "next/server";
import { signJWT } from "@/lib/jwt";
import { checkRateLimit } from "@/lib/rate-limiter";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const ip = request.headers.get("x-forwarded-for") || "127.0.0.1";
    const isAllowed = checkRateLimit(`verify_${ip}`, 5, 15 * 60 * 1000);

    if (!isAllowed) {
      return NextResponse.json(
        { message: "Превышено количество попыток подтверждения. Повторите через 15 минут." },
        { status: 429 }
      );
    }

    const body = await request.json();
    const { email, code, firstName, lastName } = body;

    const normalizedEmail = (email || "").toLowerCase().trim();

    if (!normalizedEmail || !code || code.trim().length < 6) {
      return NextResponse.json({ message: "Укажите корректный 6-значный код" }, { status: 400 });
    }

    const user = {
      id: "usr_" + Date.now(),
      email: normalizedEmail,
      firstName: firstName || normalizedEmail.split("@")[0] || "Автор",
      lastName: lastName || "",
      role: "author" as const,
      institution: "Expert Scientific Journal",
    };

    const signedToken = signJWT({
      sub: user.id,
      email: user.email,
      role: user.role,
      firstName: user.firstName,
    });

    const response = NextResponse.json({ user });

    response.cookies.set("expert_token", signedToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 8 * 60 * 60,
    });

    return response;
  } catch (error: any) {
    console.error("Verify email route error:", error);
    return NextResponse.json({ message: error.message || "Ошибка при подтверждении email" }, { status: 500 });
  }
}
