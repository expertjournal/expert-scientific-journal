import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/rate-limiter";
import { sendEmail, getVerifyEmailTemplate } from "@/lib/email-service";
import { findUserByEmail, saveOrUpdateUser } from "@/lib/db-client";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const ip = request.headers.get("x-forwarded-for") || "127.0.0.1";
    const isAllowed = checkRateLimit(`resend_${ip}`, 5, 15 * 60 * 1000);

    if (!isAllowed) {
      return NextResponse.json(
        { message: "Превышено количество попыток повторной отправки. Повторите через 15 минут." },
        { status: 429 }
      );
    }

    const body = await request.json();
    const { email } = body;
    const normalizedEmail = (email || "").toLowerCase().trim();

    if (!normalizedEmail) {
      return NextResponse.json({ message: "Укажите Email" }, { status: 400 });
    }

    const existingUser = await findUserByEmail(normalizedEmail);
    if (!existingUser) {
      return NextResponse.json({ message: "Пользователь с таким email не найден." }, { status: 404 });
    }

    if (existingUser.isVerified) {
      return NextResponse.json({ message: "Этот email уже подтвержден. Пожалуйста, войдите в систему." }, { status: 400 });
    }

    // Generate fresh 6-digit OTP code & 15 min expiry
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

    await saveOrUpdateUser({
      ...existingUser,
      otpCode,
      otpExpiresAt,
    });

    // Dispatch Real Verification Email to Gmail / SMTP
    await sendEmail({
      to: normalizedEmail,
      subject: "Expert Journal — Новый код подтверждения электронной почты",
      html: getVerifyEmailTemplate(otpCode, `${existingUser.firstName} ${existingUser.lastName}`.trim()),
    });

    return NextResponse.json({
      success: true,
      message: "Новый 6-значный код подтверждения отправлен на ваш email адрес.",
    });
  } catch (error: any) {
    console.error("Resend verification error:", error);
    return NextResponse.json(
      { message: error.message || "Ошибка сервера при отправке кода." },
      { status: 500 }
    );
  }
}
