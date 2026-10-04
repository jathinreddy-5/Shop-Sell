import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

export interface EmailSendResult {
  success: boolean;
  messageId?: string;
  provider: 'smtp' | 'simulated';
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: nodemailer.Transporter | null = null;

  constructor() {
    this.initTransporter();
  }

  private initTransporter() {
    const host = process.env.SMTP_HOST;
    const port = Number(process.env.SMTP_PORT || 587);
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;

    if (host && user && pass) {
      this.transporter = nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        auth: {
          user,
          pass,
        },
      });
      this.logger.log(`SMTP Email Transporter initialized for ${host}:${port} (${user})`);
    } else {
      this.logger.log('SMTP not fully configured yet; running in development simulator mode');
    }
  }

  async sendOtpEmail(to: string, otp: string): Promise<EmailSendResult> {
    // Re-check transporter in case env vars were updated at runtime
    if (!this.transporter) {
      this.initTransporter();
    }

    const userEmail = process.env.SMTP_USER || 'jathinreddy105@gmail.com';
    let from = process.env.SMTP_FROM || `"Shop:Sell" <${userEmail}>`;
    if (from.includes(':') && !from.startsWith('"')) {
      const angle = from.indexOf('<');
      if (angle > 0) {
        const name = from.substring(0, angle).trim();
        const addr = from.substring(angle);
        from = `"${name}" ${addr}`;
      }
    }

    if (this.transporter) {
      try {
        const info = await this.transporter.sendMail({
          from,
          to,
          replyTo: userEmail,
          subject: `${otp} is your Shop:Sell verification code`,
          text: `Your Shop:Sell verification code is: ${otp}. This code expires in 5 minutes.\n\nIf you did not request this, you can safely ignore this email.`,
          html: `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 32px 24px; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0;">
              <div style="margin-bottom: 24px;">
                <span style="font-size: 24px; font-weight: 900; color: #111827; letter-spacing: -0.5px;">Shop<span style="color: #6D3DF5;">:</span>Sell</span>
              </div>
              <h2 style="font-size: 20px; font-weight: 700; color: #111827; margin: 0 0 12px;">Verify your email address</h2>
              <p style="font-size: 14px; color: #475569; line-height: 22px; margin: 0 0 24px;">
                Use the verification code below to sign in to your Shop:Sell account. This code is valid for <strong>5 minutes</strong>.
              </p>
              <div style="background: #F8FAFC; border: 2px dashed #6D3DF5; border-radius: 12px; padding: 20px; text-align: center; margin: 0 0 24px;">
                <span style="font-size: 36px; font-weight: 800; letter-spacing: 8px; color: #6D3DF5; font-family: monospace;">${otp}</span>
              </div>
              <p style="font-size: 12px; color: #94a3b8; line-height: 18px; margin: 0;">
                If you did not request this code, you can safely ignore this email. Someone may have mistyped their address.
              </p>
            </div>
          `,
          headers: {
            'X-Entity-Ref-ID': `${Date.now()}-${otp}`,
          },
        });

        this.logger.log(`SMTP OTP delivered to ${to}, messageId: ${info.messageId}`);
        return { success: true, messageId: info.messageId, provider: 'smtp' };
      } catch (err: any) {
        this.logger.error(`Failed to send email via SMTP: ${err.message}`);
      }
    }

    // Fallback simulation
    this.logger.log(`[Email Provider: Dev Mode] Email OTP simulated for ${to}. Code expires in 5 minutes.`);
    return { success: true, provider: 'simulated' };
  }
}
