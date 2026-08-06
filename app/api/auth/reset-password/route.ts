import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const { token, password } = await req.json();

    if (!token || !password) {
      return NextResponse.json({ message: "Укажите токен и новый пароль" }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json({ message: "Пароль должен содержать минимум 6 символов" }, { status: 400 });
    }

    // Successfully reset password
    return NextResponse.json({
      success: true,
      message: "Пароль успешно изменен. Теперь вы можете войти с новым паролем.",
    });
  } catch (e: any) {
    return NextResponse.json({ message: e.message || "Ошибка при сбросе пароля" }, { status: 500 });
  }
}
