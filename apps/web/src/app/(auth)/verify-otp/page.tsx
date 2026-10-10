'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { motion, useReducedMotion } from 'motion/react';
import { ShieldCheck, ArrowLeft, RefreshCw } from 'lucide-react';
import { useAuth } from '@/lib/auth/auth-context';
import { OtpInput } from '@/components/auth/otp-input';
import { LoadingThreeDotsJumping } from '@/components/loading';
import { confirmFirebasePhoneOtp, sendFirebasePhoneOtp } from '@/lib/firebase/phone-auth';

function VerifyOtpContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawParam = searchParams.get('phone') || searchParams.get('identifier') || '';
  const initialIdentifier = rawParam;
  const redirectUrl = searchParams.get('redirect') || searchParams.get('returnUrl') || '/';

  const { verifyOtp, sendOtp, loginWithFirebase, loginAsDevRole } = useAuth();
  const shouldReduceMotion = useReducedMotion();

  const [identifier, setIdentifier] = useState(initialIdentifier);
  const [otp, setOtp] = useState('');
  const [countdown, setCountdown] = useState(30);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successInfo, setSuccessInfo] = useState<string | null>(null);

  // Countdown timer for resend
  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setInterval(() => {
      setCountdown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [countdown]);

  // Handle Verify OTP
  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessInfo(null);

    if (otp.length !== 6) {
      setErrorMessage('Please enter the complete 6-digit verification code');
      return;
    }

    setIsSubmitting(true);

    try {
      const fbRes = await confirmFirebasePhoneOtp(otp);
      if (fbRes.success && fbRes.idToken) {
        const authRes = await loginWithFirebase(fbRes.idToken);
        setIsSubmitting(false);
        if (authRes.success) {
          const target = redirectUrl.startsWith('/') && !redirectUrl.startsWith('//') ? redirectUrl : '/';
          router.push(target);
          return;
        }
        setErrorMessage(authRes.error || 'Authentication failed. Please try again.');
        return;
      }

      const res = await verifyOtp(identifier, otp, fbRes.success);
      setIsSubmitting(false);

      if (res.success) {
        const target = redirectUrl.startsWith('/') && !redirectUrl.startsWith('//') ? redirectUrl : '/';
        router.push(target);
      } else {
        setErrorMessage(res.error || fbRes.error || 'Invalid or expired verification code');
      }
    } catch (err: any) {
      setIsSubmitting(false);
      setErrorMessage(err?.message || 'Verification failed. Please try again.');
    }
  };

  // Handle Resend OTP
  const handleResend = async () => {
    if (countdown > 0 || isResending) return;
    setErrorMessage(null);
    setSuccessInfo(null);
    setIsResending(true);

    const res = await sendFirebasePhoneOtp(identifier, 'recaptcha-container');
    setIsResending(false);

    if (res.success) {
      setCountdown(30);
      setSuccessInfo(res.warning || 'A new verification code has been dispatched via SMS.');
      setOtp('');
    } else {
      setErrorMessage(res.error || 'Failed to resend verification code');
    }
  };

  const maskedPhone = identifier.startsWith('+91')
    ? `+91 ••••••${identifier.slice(-4)}`
    : identifier.length >= 10
    ? `+91 ••••••${identifier.slice(-4)}`
    : identifier;

  return (
    <motion.div
      initial={false}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
      className="w-full rounded-3xl border border-[#E2E8F0] bg-white p-6 sm:p-10 shadow-xl shadow-slate-200/50 dark:border-slate-800 dark:bg-slate-900 dark:shadow-none"
    >
      <div className="mb-6 text-center">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-[#059669] dark:bg-emerald-950/50 dark:text-emerald-400">
          <ShieldCheck className="h-6 w-6" />
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#111827] dark:text-white">
          Verify your number
        </h1>
        <p className="mt-1.5 text-xs sm:text-sm text-[#64748B] dark:text-slate-400">
          We sent a 6-digit verification code to:
        </p>
        <p className="mt-0.5 font-bold text-[#111827] dark:text-slate-200 text-sm">
          {maskedPhone || '+91 ••••••3210'}
        </p>
      </div>

      {errorMessage && (
        <div
          role="alert"
          data-testid="auth-error-alert"
          aria-live="polite"
          className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-medium text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-400"
        >
          {errorMessage}
        </div>
      )}

      {successInfo && (
        <div
          role="status"
          aria-live="polite"
          className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs font-medium text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-400"
        >
          {successInfo}
        </div>
      )}

      <form onSubmit={handleVerify} className="space-y-6">
        <div id="recaptcha-container" />
        <div>
          <label className="block text-xs font-semibold text-[#111827] dark:text-slate-200 mb-3 text-center">
            Enter 6-Digit Code
          </label>
          <OtpInput
            value={otp}
            onChange={setOtp}
            disabled={isSubmitting}
            hasError={Boolean(errorMessage)}
            autoFocus
          />
        </div>

        <button
          type="submit"
          disabled={isSubmitting || otp.length !== 6}
          className="flex h-12 w-full items-center justify-center rounded-2xl bg-[#059669] px-4 font-semibold text-white shadow-lg shadow-emerald-950/20 transition hover:bg-[#047857] active:scale-[0.99] disabled:opacity-50"
        >
          {isSubmitting ? (
            <LoadingThreeDotsJumping
              color="#FFFFFF"
              size={7}
              jumpHeight={8}
              gap={4}
              label="Verifying code"
            />
          ) : (
            <span>Verify OTP</span>
          )}
        </button>
      </form>

      {/* Resend Cooldown Section */}
      <div className="mt-6 flex flex-col items-center justify-center gap-2 text-center text-xs text-[#64748B] dark:text-slate-400">
        <span>Didn&apos;t receive the code?</span>
        {countdown > 0 ? (
          <span className="font-semibold text-slate-500">
            Resend in <span className="font-mono text-[#059669] font-bold">{countdown}s</span>
          </span>
        ) : (
          <button
            type="button"
            onClick={handleResend}
            disabled={isResending}
            className="inline-flex items-center gap-1.5 font-bold text-[#059669] hover:text-[#047857] hover:underline transition"
          >
            <RefreshCw className={`h-3 w-3 ${isResending ? 'animate-spin' : ''}`} />
            <span>Resend OTP</span>
          </button>
        )}
      </div>

      {/* Back to Login link */}
      <div className="mt-6 border-t border-[#E2E8F0] pt-4 text-center dark:border-slate-800">
        <Link
          href={`/login${redirectUrl && redirectUrl !== '/' ? `?redirect=${encodeURIComponent(redirectUrl)}` : ''}`}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#64748B] hover:text-[#111827] dark:hover:text-white transition"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Back to Sign In</span>
        </Link>
      </div>
    </motion.div>
  );
}

export default function VerifyOtpPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[300px] items-center justify-center">
          <LoadingThreeDotsJumping
            color="#059669"
            label="Loading verification screen"
          />
        </div>
      }
    >
      <VerifyOtpContent />
    </Suspense>
  );
}
