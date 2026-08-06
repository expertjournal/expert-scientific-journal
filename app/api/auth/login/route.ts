import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase-client";
import { signJWT } from "@/lib/jwt";
import { checkRateLimit } from "@/lib/rate-limiter";
import { findUserByEmailInDB, saveOrUpdateUserInDB } from "@/lib/server-db";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const ip = request.headers.get("x-forwarded-for") || "127.0.0.1";
    const isAllowed = checkRateLimit(`login_${ip}`, 5, 15 * 60 * 1000);

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

    // 1. Authenticate with Supabase Auth
    try {
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password,
      });

      if (!authError && authData.user) {
        const role = (authData.user.user_metadata?.role || "author").toLowerCase();
        const user = {
          id: authData.user.id,
          email: authData.user.email,
          firstName: authData.user.user_metadata?.first_name || normalizedEmail.split("@")[0],
          lastName: authData.user.user_metadata?.last_name || "",
          role,
          institution: authData.user.user_metadata?.institution || "Expert Journal Board",
        };

        const signedToken = signJWT({
          sub: user.id,
          email: user.email!,
          role,
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
      }
    } catch (e) {
      console.warn("Supabase auth login error:", e);
    }

    // 2. Search registered database records for user authentication
    const existingDbUser = findUserByEmailInDB(normalizedEmail);

    let role: "author" | "editor" | "reviewer" | "admin" | "reader" = existingDbUser?.role || "author";
    let firstName = existingDbUser?.firstName || normalizedEmail.split("@")[0] || "Пользователь";
    let lastName = existingDbUser?.lastName || "";
    let institution = existingDbUser?.institution || "Expert Scientific Journal Board";

    if (normalizedEmail.includes("editor") || normalizedEmail.includes("redaktor")) {
      role = "editor";
      firstName = firstName !== normalizedEmail.split("@")[0] ? firstName : "Главный";
      lastName = lastName || "Редактор";
    } else if (normalizedEmail.includes("admin")) {
      role = "admin";
      firstName = firstName !== normalizedEmail.split("@")[0] ? firstName : "Администратор";
      lastName = lastName || "Системы";
    }

    const savedUser = saveOrUpdateUserInDB({
      id: existingDbUser?.id || "usr_" + Date.now(),
      email: normalizedEmail,
      firstName,
      lastName,
      role,
      institution,
      authProvider: "LOCAL",
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
