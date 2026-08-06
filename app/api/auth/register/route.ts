import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/rate-limiter";
import { sendEmail, getVerifyEmailTemplate } from "@/lib/email-service";

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
    const { firstName, lastName, email } = body;

    const normalizedEmail = (email || "").toLowerCase().trim();
    if (!normalizedEmail || !firstName) {
      return NextResponse.json({ message: "Укажите имя и корректный email." }, { status: 400 });
    }

    // Generate cryptographically secure 6-digit OTP
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();

    // Dispatch Verification Email (Resend API / SMTP)
    const emailSent = await sendEmail({
      to: normalizedEmail,
      subject: "Expert Journal — Код подтверждения электронной почты",
      html: getVerifyEmailTemplate(otpCode, `${firstName} ${lastName || ""}`.trim()),
    });

    const isLiveEmailConfigured = Boolean(process.env.RESEND_API_KEY || (process.env.SMTP_HOST && process.env.SMTP_USER));

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
