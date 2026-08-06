import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  async sendVerificationCode(email: string, code: string): Promise<boolean> {
    this.logger.log(`[MAIL DISPATCH] Sending Verification OTP (${code}) to ${email}`);
    // In production, integrate SMTP / Resend / Postmark provider here
    return true;
  }

  async sendPasswordReset(email: string, code: string): Promise<boolean> {
    this.logger.log(`[MAIL DISPATCH] Sending Password Reset Code (${code}) to ${email}`);
    // In production, integrate SMTP / Resend / Postmark provider here
    return true;
  }

  async sendReviewerInvitation(email: string, articleTitle: string, token: string, deadlineDays: number = 7): Promise<boolean> {
    const acceptUrl = `http://localhost:3000/reviews/invite?token=${token}&action=accept`;
    const declineUrl = `http://localhost:3000/reviews/invite?token=${token}&action=decline`;
    this.logger.log(`[MAIL DISPATCH] Sending Reviewer Invitation to ${email} for article "${articleTitle}". Accept URL: ${acceptUrl}`);
    return true;
  }

  async sendReviewReminder(email: string, articleTitle: string, remainingDays: number, reminderType: string): Promise<boolean> {
    this.logger.log(`[MAIL DISPATCH] Sending Review Reminder (${reminderType}, ${remainingDays} days left) to ${email} for article "${articleTitle}"`);
    return true;
  }
}
