import { NextRequest, NextResponse } from "next/server";
import { findUserByEmail, saveOrUpdateUser } from "@/lib/db-client";
import { hashPassword } from "@/lib/password-hasher";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, token, newPassword } = body;

    const normalizedEmail = (email || "").toLowerCase().trim();

    if (!normalizedEmail || !token || !newPassword || newPassword.trim().length < 6) {
      return NextResponse.json({ message: "Укажите новый пароль (минимум 6 символов)" }, { status: 400 });
    }

    const existingUser = await findUserByEmail(normalizedEmail);
    if (!existingUser || !existingUser.resetToken) {
      return NextResponse.json({ message: "Недействительный или просроченный токен сброса пароля." }, { status: 400 });
    }

    if (existingUser.resetToken !== token.trim()) {
      return NextResponse.json({ message: "Неверный токен сброса пароля." }, { status: 400 });
    }

    if (existingUser.resetTokenExpiresAt && new Date(existingUser.resetTokenExpiresAt).getTime() < Date.now()) {
      return NextResponse.json({ message: "Срок действия токена истек. Запросите сброс пароля повторно." }, { status: 400 });
    }

    // Hash new password using PBKDF2
    const { salt, hash } = hashPassword(newPassword.trim());

    await saveOrUpdateUser({
      ...existingUser,
      salt,
      hash,
      resetToken: undefined,
      resetTokenExpiresAt: undefined,
    });

    return NextResponse.json({
      success: true,
      message: "Пароль успешно изменен. Теперь вы можете войти с новым паролем.",
    });
  } catch (error: any) {
    console.error("Reset password route error:", error);
    return NextResponse.json({ message: "Ошибка при изменении пароля." }, { status: 500 });
  }
}
