import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/rate-limiter";
import { sendEmail, getVerifyEmailTemplate } from "@/lib/email-service";
import { findUserByEmail, saveOrUpdateUser } from "@/lib/db-client";
import { hashPassword } from "@/lib/password-hasher";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const ip = request.headers.get("x-forwarded-for") || "127.0.0.1";
    const isAllowed = checkRateLimit(`register_${ip}`, 10, 15 * 60 * 1000);

    if (!isAllowed) {
      return NextResponse.json(
        { message: "Превышено количество попыток регистрации. Повторите через 15 минут." },
        { status: 429 }
      );
    }

    const body = await request.json();
    const { firstName, lastName, email, password } = body;

    const normalizedEmail = (email || "").toLowerCase().trim();
    if (!normalizedEmail || !firstName) {
      return NextResponse.json({ message: "Укажите имя и корректный email." }, { status: 400 });
    }

    // Duplicate account prevention
    const existingUser = await findUserByEmail(normalizedEmail);
    if (existingUser && existingUser.isVerified) {
      return NextResponse.json(
        { message: "Пользователь с таким email уже зарегистрирован. Вы можете войти в систему." },
        { status: 400 }
      );
    }

    // Password hashing (if password supplied)
    let salt = existingUser?.salt;
    let hash = existingUser?.hash;
    if (password && password.trim().length >= 6) {
      const hashResult = hashPassword(password);
      salt = hashResult.salt;
      hash = hashResult.hash;
    }

    // Generate 6-digit OTP code & expiration (15 min)
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

    // Persist pending user to PostgreSQL / DB client
    await saveOrUpdateUser({
      email: normalizedEmail,
      firstName: firstName.trim(),
      lastName: (lastName || "").trim(),
      role: "author",
      isVerified: false,
      salt,
      hash,
      otpCode,
      otpExpiresAt,
      authProvider: "LOCAL",
    });

    // Dispatch Verification Email
    await sendEmail({
      to: normalizedEmail,
      subject: "Expert Journal — Код подтверждения электронной почты",
      html: getVerifyEmailTemplate(otpCode, `${firstName} ${lastName || ""}`.trim()),
    });

    return NextResponse.json({
      requiresVerification: true,
      email: normalizedEmail,
      message: "6-значный код подтверждения отправлен на ваш email адрес.",
    });
  } catch (error: any) {
    console.error("Register route error:", error);
    return NextResponse.json({ message: error.message || "Ошибка при регистрации." }, { status: 500 });
  }
}
