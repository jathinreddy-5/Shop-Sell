import { z } from 'zod';
import {
  Step1OnboardingSchema,
  Step2OnboardingSchema,
  AddressInputSchema,
  PincodeWaitlistSchema,
} from '@shop-sell/shared';

export {
  Step1OnboardingSchema,
  Step2OnboardingSchema,
  AddressInputSchema,
  PincodeWaitlistSchema,
};

export type Step1OnboardingDto = z.infer<typeof Step1OnboardingSchema>;
export type Step2OnboardingDto = z.infer<typeof Step2OnboardingSchema>;
export type AddressDto = z.infer<typeof AddressInputSchema>;
export type PincodeWaitlistDto = z.infer<typeof PincodeWaitlistSchema>;

export const SendPhoneOtpSchema = z.object({
  phone: z.string().regex(/^\+[1-9]\d{6,14}$/, 'Phone number must be valid E.164 format (e.g. +919876543210)'),
});
export type SendPhoneOtpDto = z.infer<typeof SendPhoneOtpSchema>;

export const VerifyPhoneOtpSchema = z.object({
  phone: z.string().regex(/^\+[1-9]\d{6,14}$/, 'Phone number must be valid E.164 format (e.g. +919876543210)'),
  otp: z.string().regex(/^\d{6}$/, 'OTP must be a 6-digit numeric string'),
});
export type VerifyPhoneOtpDto = z.infer<typeof VerifyPhoneOtpSchema>;

export const SendEmailVerificationSchema = z.object({
  email: z.string().email('Valid email address is required'),
});
export type SendEmailVerificationDto = z.infer<typeof SendEmailVerificationSchema>;
