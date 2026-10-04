export interface SmsProvider {
  sendOtp(phone: string, otp: string): Promise<{ success: boolean; messageId?: string; error?: string }>;
}

export const SMS_PROVIDER_TOKEN = 'SMS_PROVIDER_TOKEN';

export class MockSmsProvider implements SmsProvider {
  async sendOtp(phone: string, otp: string): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const isDev = process.env.NODE_ENV !== 'production';
    if (isDev) {
      console.log(`[MockSmsProvider] 📲 OTP Dispatched to ${phone}: ${otp}`);
    }
    return {
      success: true,
      messageId: `mock_msg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    };
  }
}
