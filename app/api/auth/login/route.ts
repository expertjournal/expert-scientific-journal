import { NextResponse } from "next/server";
import { signJWT } from "@/lib/jwt";
import { checkRateLimit } from "@/lib/rate-limiter";
import { findUserByEmail, saveOrUpdateUser } from "@/lib/db-client";
import { verifyPassword } from "@/lib/password-hasher";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const ip = request.headers.get("x-forwarded-for") || "127.0.0.1";
    const isAllowed = checkRateLimit(`login_${ip}`, 10, 15 * 60 * 1000);

    if (!isAllowed) {
      return NextResponse.json(
        { message: "Превышено количество попыток входа. Пожалуйста, повторите через 15 минут." },
        { status: 429 }
      );
    }

    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json({ message: "Укажите Email и пароль." }, { status: 400 });
    }

    const normalizedEmail = (email || "").toLowerCase().trim();

    // 1. Search registered database records for user authentication
    const existingDbUser = await findUserByEmail(normalizedEmail);

    // 2. Reject unregistered emails
    if (!existingDbUser) {
      return NextResponse.json({ message: "Неверный Email или пароль." }, { status: 401 });
    }

    // 3. Reject unverified accounts
    if (existingDbUser.isVerified === false) {
      return NextResponse.json(
        { message: "Электронная почта не подтверждена. Пожалуйста, введите код подтверждения из письма." },
        { status: 403 }
      );
    }

    // 4. Verify password hash if present
    if (existingDbUser.salt && existingDbUser.hash) {
      const isValid = verifyPassword(password, existingDbUser.salt, existingDbUser.hash);
      if (!isValid) {
        return NextResponse.json({ message: "Неверный Email или пароль." }, { status: 401 });
      }
    }

    // Update last login timestamp
    const savedUser = await saveOrUpdateUser({
      ...existingDbUser,
      email: normalizedEmail,
      lastLoginAt: new Date().toISOString(),
    });

    const user = {
      id: savedUser.id,
      email: savedUser.email,
      firstName: savedUser.firstName,
      lastName: savedUser.lastName,
      role: savedUser.role,
      institution: savedUser.institution || "Expert Scientific Journal Board",
    };

    const signedToken = signJWT({
      sub: user.id,
      id: user.id,
      email: user.email,
      role: user.role,
      firstName: user.firstName,
      lastName: user.lastName,
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
    console.error("Login route error:", error);
    return NextResponse.json({ message: error.message || "Неверные данные авторизации" }, { status: 401 });
  }
}
