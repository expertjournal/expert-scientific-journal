import { NextRequest, NextResponse } from "next/server";
import { findUserByEmailInDB, saveOrUpdateUserInDB, readServerDB } from "@/lib/server-db";
import { hashPassword } from "@/lib/password-hasher";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const { token, email, password } = await req.json();

    if (!password || password.length < 6) {
      return NextResponse.json({ message: "Пароль должен содержать минимум 6 символов" }, { status: 400 });
    }

    const normalizedEmail = (email || "").toLowerCase().trim();
    const db = readServerDB();
    const targetUser = db.users.find(
      (u) =>
        (normalizedEmail && u.email.toLowerCase().trim() === normalizedEmail) ||
        (token && u.resetToken === token)
    );

    if (!targetUser) {
      return NextResponse.json({ message: "Недействительный или просроченный токен сброса пароля." }, { status: 400 });
    }

    if (targetUser.resetTokenExpiresAt && new Date(targetUser.resetTokenExpiresAt).getTime() < Date.now()) {
      return NextResponse.json({ message: "Срок действия токена истек. Запросите сброс пароля заново." }, { status: 400 });
    }

    const { salt, hash } = hashPassword(password);

    saveOrUpdateUserInDB({
      ...targetUser,
      salt,
      hash,
      resetToken: undefined,
      resetTokenExpiresAt: undefined,
    });

    return NextResponse.json({
      success: true,
      message: "Пароль успешно изменен. Теперь вы можете войти с новым паролем.",
    });
  } catch (e: any) {
    return NextResponse.json({ message: e.message || "Ошибка при сбросе пароля" }, { status: 500 });
  }
}
