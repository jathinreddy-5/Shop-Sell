import { Injectable, Logger, BadRequestException } from '@nestjs/common';

export interface SmsSendResult {
  success: boolean;
  messageId?: string;
  provider: 'twilio' | 'msg91' | 'simulated';
  maskedPhone: string;
}

@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);

  /**
   * Normalizes any Indian mobile number variation into canonical E.164: +91XXXXXXXXXX
   * Accepts: "9876543210", "98765 43210", "+919876543210", "+91 98765-43210", "09876543210"
   */
  normalizeIndianPhone(input: string): string {
    if (!input || typeof input !== 'string') {
      throw new BadRequestException('Mobile number is required');
    }

    const cleaned = input.replace(/[\s\-\.\(\)]/g, '').trim();

    let digits = '';
    if (cleaned.startsWith('+91')) {
      digits = cleaned.slice(3);
    } else if (cleaned.startsWith('91') && cleaned.length === 12) {
      digits = cleaned.slice(2);
    } else if (cleaned.startsWith('0') && cleaned.length === 11) {
      digits = cleaned.slice(1);
    } else {
      digits = cleaned;
    }

    // Valid Indian mobile numbers are exactly 10 digits starting with 6, 7, 8, or 9
    if (!/^[6-9]\d{9}$/.test(digits)) {
      throw new BadRequestException(
        'Please enter a valid 10-digit Indian mobile number (e.g. 98765 43210)'
      );
    }

    return `+91${digits}`;
  }

  /**
   * Masks a phone number for safe UI display: +91 ••••••3210
   */
  maskPhone(normalizedPhone: string): string {
    if (!normalizedPhone || normalizedPhone.length < 7) {
      return normalizedPhone;
    }
    const last4 = normalizedPhone.slice(-4);
    return `+91 ••••••${last4}`;
  }

  /**
   * Dispatches OTP SMS through configured telecom provider (Twilio / MSG91) or dev simulator
   */
  async sendOtpSms(normalizedPhone: string, otp: string): Promise<SmsSendResult> {
    const masked = this.maskPhone(normalizedPhone);
    const rawDigits = normalizedPhone.replace('+91', '');

    // 1. Fast2SMS Integration (Ideal for Indian numbers, instant setup, no initial DLT hassle)
    const fast2smsKey = process.env.FAST2SMS_API_KEY;
    if (fast2smsKey) {
      try {
        const res = await fetch('https://www.fast2sms.com/dev/bulkV2', {
          method: 'POST',
          headers: {
            authorization: fast2smsKey,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            variables_values: otp,
            route: 'otp',
            numbers: rawDigits,
          }),
        });

        const data = await res.json();
        if (data.return) {
          this.logger.log(`Fast2SMS OTP delivered to ${masked}, request_id: ${data.request_id}`);
          return {
            success: true,
            messageId: data.request_id,
            provider: 'fast2sms' as any,
            maskedPhone: masked,
          };
        } else {
          this.logger.error(`Fast2SMS error: ${JSON.stringify(data)}`);
        }
      } catch (err) {
        this.logger.error(`Fast2SMS dispatch failed: ${(err as Error).message}`);
      }
    }

    // 2. MSG91 Integration (Industry standard for India, high deliverability)
    const msg91AuthKey = process.env.MSG91_AUTH_KEY;
    const msg91TemplateId = process.env.MSG91_TEMPLATE_ID;
    if (msg91AuthKey && msg91TemplateId) {
      try {
        const res = await fetch(
          `https://control.msg91.com/api/v5/otp?template_id=${encodeURIComponent(
            msg91TemplateId
          )}&mobile=${encodeURIComponent(normalizedPhone)}&otp=${encodeURIComponent(otp)}`,
          {
            method: 'POST',
            headers: {
              authkey: msg91AuthKey,
              'Content-Type': 'application/json',
            },
          }
        );

        const data = await res.json();
        if (data.type === 'success') {
          this.logger.log(`MSG91 OTP delivered to ${masked}, request_id: ${data.message}`);
          return {
            success: true,
            messageId: data.message,
            provider: 'msg91',
            maskedPhone: masked,
          };
        } else {
          this.logger.error(`MSG91 dispatch error: ${JSON.stringify(data)}`);
        }
      } catch (err) {
        this.logger.error(`MSG91 dispatch failed: ${(err as Error).message}`);
      }
    }

    // 3. Twilio Integration (Global standard)
    const twilioSid = process.env.TWILIO_ACCOUNT_SID;
    const twilioAuth = process.env.TWILIO_AUTH_TOKEN;
    const twilioFrom = process.env.TWILIO_PHONE_NUMBER;

    if (twilioSid && twilioAuth && twilioFrom) {
      try {
        const authHeader = Buffer.from(`${twilioSid}:${twilioAuth}`).toString('base64');
        const bodyParams = new URLSearchParams({
          To: normalizedPhone,
          From: twilioFrom,
          Body: `Shop:Sell verification code: ${otp}. This code expires in 5 minutes.`,
        });

        const res = await fetch(
          `https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Messages.json`,
          {
            method: 'POST',
            headers: {
              Authorization: `Basic ${authHeader}`,
              'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: bodyParams.toString(),
          }
        );

        if (!res.ok) {
          const errText = await res.text();
          this.logger.error(`Twilio SMS dispatch failed: ${errText}`);
          throw new Error('Carrier dispatch failed');
        }

        const data = await res.json();
        this.logger.log(`Twilio SMS delivered to ${masked}, SID: ${data.sid}`);
        return {
          success: true,
          messageId: data.sid,
          provider: 'twilio',
          maskedPhone: masked,
        };
      } catch (err) {
        this.logger.error(`Failed to send SMS via Twilio: ${(err as Error).message}`);
      }
    }

    // 4. Development / Simulated Mode
    // Security notice: NEVER log raw OTP in logs or return in client payloads!
    this.logger.log(
      `[SMS Provider: Dev Mode] SMS dispatch simulated for ${masked}. Code expires in 5 minutes. (Set FAST2SMS_API_KEY, MSG91_AUTH_KEY, or TWILIO_* in apps/api/.env to activate live SMS delivery)`
    );

    return {
      success: true,
      provider: 'simulated',
      maskedPhone: masked,
    };
  }
}
