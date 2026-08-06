import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/rate-limiter";
import { sendEmail, getPasswordResetTemplate } from "@/lib/email-service";
import { findUserByEmailInDB, saveOrUpdateUserInDB } from "@/lib/server-db";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get("x-forwarded-for") || "127.0.0.1";
    const isAllowed = checkRateLimit(`forgot_${ip}`, 3, 60 * 60 * 1000);

    if (!isAllowed) {
      return NextResponse.json(
        { message: "Превышен лимит запросов на сброс пароля. Попробуйте через 1 час." },
        { status: 429 }
      );
    }

    const { email } = await req.json();
    const normalizedEmail = (email || "").toLowerCase().trim();
    if (!normalizedEmail) {
      return NextResponse.json({ message: "Укажите Email" }, { status: 400 });
    }

    const dbUser = findUserByEmailInDB(normalizedEmail);
    if (!dbUser) {
      // Return success message for security to prevent user enumeration
      return NextResponse.json({
        success: true,
        message: "Инструкции по восстановлению пароля отправлены на ваш email, если аккаунт существует.",
      });
    }

    const resetToken = Math.floor(100000 + Math.random() * 900000).toString();
    const resetTokenExpiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();

    saveOrUpdateUserInDB({
      ...dbUser,
      resetToken,
      resetTokenExpiresAt,
    });

    const resetUrl = `${req.nextUrl.origin}/reset-password?token=${resetToken}&email=${encodeURIComponent(normalizedEmail)}`;

    await sendEmail({
      to: normalizedEmail,
      subject: "Expert Journal — Сброс пароля",
      html: getPasswordResetTemplate(resetUrl, `${dbUser.firstName} ${dbUser.lastName}`.trim()),
    });

    return NextResponse.json({
      success: true,
      message: "Инструкции по восстановлению пароля отправлены на ваш email.",
      resetUrl: process.env.NODE_ENV === "development" ? resetUrl : undefined,
    });
  } catch (e: any) {
    return NextResponse.json({ message: e.message || "Ошибка сервера" }, { status: 500 });
  }
}
