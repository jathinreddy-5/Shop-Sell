import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

export interface EmailSendResult {
  success: boolean;
  messageId?: string;
  provider: 'gmail_smtp' | 'resend' | 'simulated';
  warning?: string;
  error?: string;
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);

  /**
   * Masks an email address for safe display in UI: j***y@gmail.com
   */
  maskEmail(email: string): string {
    if (!email || !email.includes('@')) return email;
    const [local, domain] = email.split('@');
    if (local.length <= 2) {
      return `${local[0]}*@${domain}`;
    }
    return `${local[0]}***${local.slice(-1)}@${domain}`;
  }

  private getEmailHtml(otp: string): string {
    return `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 32px 24px; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0;">
        <div style="margin-bottom: 24px;">
          <span style="font-size: 24px; font-weight: 900; color: #111827; letter-spacing: -0.5px;">Shop<span style="color: #059669;">:</span>Sell</span>
        </div>
        <h2 style="font-size: 20px; font-weight: 700; color: #111827; margin: 0 0 12px;">Verify your email address</h2>
        <p style="font-size: 14px; color: #475569; line-height: 22px; margin: 0 0 24px;">
          Use the verification code below to sign in to your Shop:Sell account. This code is valid for <strong>10 minutes</strong>.
        </p>
        <div style="background: #F0FDF4; border: 2px dashed #059669; border-radius: 12px; padding: 20px; text-align: center; margin: 0 0 24px;">
          <span style="font-size: 36px; font-weight: 800; letter-spacing: 8px; color: #059669; font-family: monospace;">${otp}</span>
        </div>
        <p style="font-size: 12px; color: #94a3b8; line-height: 18px; margin: 0;">
          If you did not request this code, you can safely ignore this email.
        </p>
      </div>
    `;
  }

  /**
   * Dispatches a 6-digit OTP verification email via Gmail SMTP or Resend API
   */
  async sendOtpEmail(to: string, otp: string): Promise<EmailSendResult> {
    const gmailUser = process.env.GMAIL_USER?.trim();
    const gmailPass = process.env.GMAIL_APP_PASSWORD?.trim().replace(/\s+/g, '');

    // 1. Preferred: Free Gmail SMTP (Instant inbox delivery to ANY email)
    if (gmailUser && gmailPass) {
      try {
        const transporter = nodemailer.createTransport({
          service: 'gmail',
          auth: {
            user: gmailUser,
            pass: gmailPass,
          },
          connectionTimeout: 2500,
          greetingTimeout: 2500,
          socketTimeout: 3000,
        });

        const info = await transporter.sendMail({
          from: `"Shop:Sell" <${gmailUser}>`,
          to,
          subject: `${otp} is your Shop:Sell verification code`,
          text: `Your Shop:Sell verification code is: ${otp}. This code is valid for 10 minutes.\n\nIf you did not request this code, you can safely ignore this email.`,
          html: this.getEmailHtml(otp),
        });

        this.logger.log(`Gmail SMTP OTP successfully dispatched to ${to}, id: ${info.messageId}`);
        return { success: true, messageId: info.messageId, provider: 'gmail_smtp' };
      } catch (err: any) {
        this.logger.warn(`Gmail SMTP connection unavailable or blocked by host firewall: ${err?.message || err}. Failing over to Resend HTTP API...`);
      }
    }

    // 2. Fallback: Resend API (HTTP REST over port 443 — works behind any cloud firewall)
    const apiKey = process.env.RESEND_API_KEY;
    const rawFrom = process.env.EMAIL_FROM || 'Shop:Sell <onboarding@resend.dev>';
    const cleanFrom = rawFrom.replace(/^["']|["']$/g, '').trim();
    const match = cleanFrom.match(/^"?([^<"]*?)"?\s*<([^>]+)>$/);
    const from = match ? `"${match[1].trim()}" <${match[2].trim()}>` : cleanFrom;

    if (!apiKey) {
      this.logger.warn(`[Email Service]: Neither Gmail SMTP nor RESEND_API_KEY configured.`);
      return {
        success: false,
        provider: 'simulated',
        error: 'Email service is not configured. Please configure Gmail SMTP or Resend API.',
      };
    }

    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey.trim()}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from,
          to,
          subject: `${otp} is your Shop:Sell verification code`,
          text: `Your Shop:Sell verification code is: ${otp}. This code is valid for 10 minutes.\n\nIf you did not request this code, you can safely ignore this email.`,
          html: this.getEmailHtml(otp),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        // Handle Resend sandbox domain restriction
        if (
          data?.name === 'validation_error' ||
          data?.statusCode === 403 ||
          data?.statusCode === 422 ||
          data?.message?.includes('testing emails')
        ) {
          this.logger.error(`[Resend Sandbox Notice]: ${data?.message || 'Domain restriction'}`);
          return {
            success: false,
            provider: 'resend',
            error:
              'Email delivery restricted by Resend sandbox domain. To send verification emails to any customer, please set GMAIL_USER and GMAIL_APP_PASSWORD in Render or verify a custom domain in Resend.',
          };
        }
        this.logger.error(`Resend API error: ${data?.message || JSON.stringify(data)}`);
        return {
          success: false,
          provider: 'resend',
          error: data?.message || 'Failed to dispatch verification email',
        };
      }

      this.logger.log(`Resend OTP successfully dispatched to ${to}, id: ${data.id}`);
      return { success: true, messageId: data.id, provider: 'resend' };
    } catch (err: any) {
      this.logger.warn(`Failed to send email via Resend: ${err?.message || err}.`);
      return {
        success: false,
        provider: 'resend',
        error: 'Email delivery failed. Please try again.',
      };
    }
  }
}
