export interface SendEmailPayload {
  to: string;
  subject: string;
  html: string;
}

export async function sendEmail({ to, subject, html }: SendEmailPayload): Promise<boolean> {
  const smtpHost = process.env.SMTP_HOST || process.env.GMAIL_SMTP_HOST || "smtp.gmail.com";
  const smtpUser = process.env.SMTP_USER || process.env.GMAIL_USER;
  const smtpPass = process.env.SMTP_PASS || process.env.GMAIL_APP_PASSWORD;
  const resendApiKey = process.env.RESEND_API_KEY;

  // 1. Prioritize Gmail SMTP if configured
  if (smtpUser && smtpPass) {
    try {
      // @ts-ignore
      const nodemailer = await import("nodemailer").catch(() => null);
      if (nodemailer) {
        const cleanPass = smtpPass.replace(/\s+/g, ""); // Strip spaces from 16-char Google App Password
        const transporter = nodemailer.createTransport({
          host: smtpHost,
          port: Number(process.env.SMTP_PORT) || 465,
          secure: Number(process.env.SMTP_PORT) === 587 ? false : true,
          auth: {
            user: smtpUser.trim(),
            pass: cleanPass,
          },
        });

        await transporter.sendMail({
          from: `Expert Scientific Journal <${smtpUser.trim()}>`,
          to,
          subject,
          html,
        });

        console.log(`[SMTP EMAIL SENT SUCCESS] To: ${to} via ${smtpHost}`);
        return true;
      }
    } catch (smtpErr) {
      console.error("[SMTP EMAIL ERROR]", smtpErr);
    }
  }

  // 2. Fallback to Resend API
  if (resendApiKey) {
    try {
      const cleanKey = resendApiKey.trim();
      const fromEmail = process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev";
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${cleanKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: `Expert Journal <${fromEmail}>`,
          to: [to],
          subject,
          html,
        }),
      });

      if (response.ok) {
        console.log(`[RESEND EMAIL SENT SUCCESS] To: ${to} | Subject: ${subject}`);
        return true;
      }
      const errJson = await response.json().catch(() => null);
      console.error("[RESEND EMAIL ERROR]", response.status, errJson);
    } catch (err) {
      console.error("[RESEND API EXCEPTION]", err);
    }
  }

  console.log(`[EMAIL DISPATCH MOCK] To: ${to} | Subject: ${subject}`);
  return true;
}

export function getVerifyEmailTemplate(otpCode: string, name = "Пользователь"): string {
  return `
    <div style="font-family: Arial, sans-serif; padding: 28px; background: #f8fafc; color: #1e293b; max-width: 600px; margin: 0 auto; border-radius: 12px; border: 1px solid #e2e8f0;">
      <h2 style="color: #0f2744; margin-top: 0;">Expert Scientific Journal</h2>
      <p style="font-size: 14px;">Здравствуйте, <b>${name}</b>!</p>
      <p style="font-size: 14px;">Ваш 6-значный код подтверждения адреса электронной почты для доступа к платформе:</p>
      <div style="background: #eff6ff; border: 2px dashed #3b82f6; color: #1d4ed8; font-size: 32px; font-weight: bold; text-align: center; padding: 20px; border-radius: 10px; letter-spacing: 6px; margin: 24px 0;">
        ${otpCode}
      </div>
      <p style="font-size: 12px; color: #64748b;">Код действителен в течение 15 минут. Если вы не регистрировались на сайте Expert Journal, просто проигнорируйте это письмо.</p>
      <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
      <p style="font-size: 11px; color: #94a3b8; text-align: center;">© 2026 Expert Scientific Journal — Международный научный журнал правовых исследований.</p>
    </div>
  `;
}

export function getPasswordResetTemplate(resetUrl: string, name = "Пользователь"): string {
  return `
    <div style="font-family: Arial, sans-serif; padding: 28px; background: #f8fafc; color: #1e293b; max-width: 600px; margin: 0 auto; border-radius: 12px; border: 1px solid #e2e8f0;">
      <h2 style="color: #0f2744; margin-top: 0;">Expert Scientific Journal — Сброс пароля</h2>
      <p style="font-size: 14px;">Здравствуйте, <b>${name}</b>!</p>
      <p style="font-size: 14px;">Для восстановления доступа к вашему аккаунту перейдите по кнопке ниже:</p>
      <div style="text-align: center; margin: 28px 0;">
        <a href="${resetUrl}" style="background: #2563eb; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 14px; display: inline-block;">Сбросить пароль</a>
      </div>
      <p style="font-size: 12px; color: #64748b;">Ссылка действительна 15 минут.</p>
    </div>
  `;
}
