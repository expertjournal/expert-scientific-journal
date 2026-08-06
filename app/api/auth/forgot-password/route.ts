import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/rate-limiter";
import { sendEmail, getPasswordResetTemplate } from "@/lib/email-service";
import { findUserByEmail, saveOrUpdateUser } from "@/lib/db-client";
import crypto from "crypto";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const ip = request.headers.get("x-forwarded-for") || "127.0.0.1";
    const isAllowed = checkRateLimit(`forgot_${ip}`, 5, 15 * 60 * 1000);

    if (!isAllowed) {
      return NextResponse.json(
        { message: "Превышено количество попыток сброса пароля. Повторите через 15 минут." },
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
      // Do not leak user non-existence
      return NextResponse.json({
        message: "Инструкции по сбросу пароля отправлены на указанный email, если аккаунт существует.",
      });
    }

    // Generate secure random reset token (15 min expiry)
    const resetToken = crypto.randomBytes(32).toString("hex");
    const resetTokenExpiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

    await saveOrUpdateUser({
      ...existingUser,
      resetToken,
      resetTokenExpiresAt,
    });

    const origin = request.headers.get("origin") || "https://expert-journal.up.railway.app";
    const resetUrl = `${origin}/reset-password?token=${resetToken}&email=${encodeURIComponent(normalizedEmail)}`;

    await sendEmail({
      to: normalizedEmail,
      subject: "Expert Journal — Инструкция по сбросу пароля",
      html: getPasswordResetTemplate(resetUrl, `${existingUser.firstName} ${existingUser.lastName}`.trim()),
    });

    return NextResponse.json({
      message: "Инструкции по сбросу пароля отправлены на указанный email.",
    });
  } catch (error: any) {
    console.error("Forgot password route error:", error);
    return NextResponse.json({ message: "Ошибка при запросе сброса пароля" }, { status: 500 });
  }
}
