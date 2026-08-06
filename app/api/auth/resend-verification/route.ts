import { NextResponse } from "next/server";
import { API_BASE_URL } from "@/lib/api-server";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email } = body;

    let res: Response;
    try {
      res = await fetch(`${API_BASE_URL}/auth/resend-verification`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
    } catch (networkError) {
      console.warn("Backend API unreachable during resend verification:", networkError);
      return NextResponse.json({
        success: true,
        message: "Новый код подтверждения отправлен (демо-режим)",
        sampleCode: "123456",
      });
    }

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({ message: "Resend failed" }));
      let message = errorData.error?.message || errorData.message || "Не удалось отправить код";
      if (Array.isArray(message)) message = message.join(", ");

      return NextResponse.json(
        { message },
        { status: res.status }
      );
    }

    const data = await res.json();
    const payload = data.data || data;

    return NextResponse.json({
      success: true,
      message: payload.message || "Новый код отправлен",
      sampleCode: payload.otpCode || payload.sampleCode,
    });
  } catch (error) {
    console.error("Resend verification route error:", error);
    return NextResponse.json(
      { message: "Ошибка сервера при отправке кода" },
      { status: 500 }
    );
  }
}
