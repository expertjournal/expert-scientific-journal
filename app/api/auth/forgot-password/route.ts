import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/rate-limiter";
import { sendEmail, getPasswordResetTemplate } from "@/lib/email-service";

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
    if (!email) {
      return NextResponse.json({ message: "Укажите Email" }, { status: 400 });
    }

    const resetToken = "rst_" + Math.random().toString(36).substring(2) + Date.now();
    const resetUrl = `${req.nextUrl.origin}/reset-password?token=${resetToken}`;

    await sendEmail({
      to: email,
      subject: "Expert Journal — Сброс пароля",
      html: getPasswordResetTemplate(resetUrl, email.split("@")[0]),
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
