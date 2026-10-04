'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { motion, useReducedMotion } from 'motion/react';
import { ShieldCheck, ArrowLeft, Mail } from 'lucide-react';
import { useAuth } from '@/lib/auth/auth-context';
import { OtpInput } from '@/components/auth/otp-input';
import { LoadingThreeDotsJumping } from '@/components/loading';
import { Turnstile } from '@marsidev/react-turnstile';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectUrl = searchParams.get('redirect') || searchParams.get('returnUrl') || '/';

  const { sendOtp, verifyOtp, loginAsDevRole } = useAuth();
  const shouldReduceMotion = useReducedMotion();

  // Screen step: 'input' (enter email) | 'verify' (enter 6-digit code)
  const [step, setStep] = useState<'input' | 'verify'>('input');

  // Input states
  const [email, setEmail] = useState('');
  const [activeIdentifier, setActiveIdentifier] = useState('');
  const [maskedTarget, setMaskedTarget] = useState('');
  const [otp, setOtp] = useState('');
  const [turnstileToken, setTurnstileToken] = useState('');

  // Status & feedback
  const [countdown, setCountdown] = useState(30);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

  // Resend countdown timer for OTP
  useEffect(() => {
    if (step !== 'verify' || countdown <= 0) return;
    const interval = setInterval(() => {
      setCountdown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [step, countdown]);

  // Helper to validate email format
  const validateEmail = (val: string): { email?: string; error?: string } => {
    const clean = val.trim().toLowerCase();
    if (!clean) {
      return { error: 'Please enter your email address' };
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean)) {
      return { error: 'Please enter a valid email address (e.g. name@example.com)' };
    }
    return { email: clean };
  };

  // Handle Send OTP to Email
  const handleSendEmailOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setInfoMessage(null);
    setErrorMessage(null);

    const check = validateEmail(email);
    if (check.error) {
      setErrorMessage(check.error);
      return;
    }

    const emailToSend = check.email!;

    setIsSubmitting(true);
    const res = await sendOtp(emailToSend, turnstileToken);
    setIsSubmitting(false);

    if (res.success) {
      const masked = res.phone || emailToSend.replace(/(.{1,2})(.*)(@.*)/, '$1***$3');
      setActiveIdentifier(emailToSend);
      setMaskedTarget(masked);
      setCountdown(res.cooldownSeconds || 30);
      setOtp('');
      setStep('verify');
    } else {
      setErrorMessage(res.error || 'Failed to send verification code. Please try again.');
    }
  };

  // Handle Verify OTP
  const handleVerifyOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMessage(null);
    setInfoMessage(null);

    if (otp.length !== 6) {
      setErrorMessage('Please enter the complete 6-digit verification code');
      return;
    }

    setIsSubmitting(true);
    const res = await verifyOtp(activeIdentifier, otp, false);
    setIsSubmitting(false);

    if (res.success) {
      const target = redirectUrl.startsWith('/') && !redirectUrl.startsWith('//') ? redirectUrl : '/';
      router.push(target);
    } else {
      setErrorMessage(res.error || 'Invalid or expired verification code');
    }
  };

  // Handle Resend OTP to Email
  const handleResendOtp = async () => {
    if (countdown > 0 || isResending) return;
    setErrorMessage(null);
    setInfoMessage(null);
    setIsResending(true);

    const res = await sendOtp(activeIdentifier);
    setIsResending(false);

    if (res.success) {
      setCountdown(res.cooldownSeconds || 30);
      setInfoMessage('A fresh verification code has been delivered to your email inbox.');
      setOtp('');
    } else {
      setErrorMessage(res.error || 'Failed to resend code. Please try again.');
    }
  };

  // Handle Optional Google OAuth
  const handleGoogleLogin = () => {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (supabaseUrl && !supabaseUrl.includes('[YOUR-PROJECT-REF]')) {
      const returnTarget = window.location.origin + redirectUrl;
      window.location.href = `${supabaseUrl}/auth/v1/authorize?provider=google&redirect_to=${encodeURIComponent(returnTarget)}`;
    } else {
      setErrorMessage('Google OAuth is in configuration. Please sign in with your email address.');
    }
  };

  return (
    <motion.div
      initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
      className="w-full rounded-3xl border border-[#E2E8F0] bg-white p-6 sm:p-10 shadow-xl shadow-slate-200/50 dark:border-slate-800 dark:bg-slate-900 dark:shadow-none"
    >
      {/* Brand Header */}
      <div className="mb-6 text-center">
        <Link href="/" className="inline-flex items-center gap-2 mb-3 group focus:outline-none">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-tr from-[#6D3DF5] to-[#8B5CF6] text-xl font-bold text-white shadow-md shadow-[#6D3DF5]/30">
            S
          </div>
          <span className="text-2xl font-black tracking-tight text-[#111827] dark:text-white">
            Shop<span className="text-[#6D3DF5]">:</span>Sell
          </span>
        </Link>

        {step === 'input' ? (
          <>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#111827] dark:text-white">
              Welcome back
            </h1>
            <p className="mt-1.5 text-xs sm:text-sm text-[#64748B] dark:text-slate-400">
              Sign in to Shop:Sell using your email address.
            </p>
          </>
        ) : (
          <>
            <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-[#6D3DF5]/10 text-[#6D3DF5] dark:bg-purple-950/50 dark:text-purple-400">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#111827] dark:text-white">
              Check your inbox
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-[#64748B] dark:text-slate-400">
              We sent a 6-digit verification code to your email:
            </p>
            <div className="mt-1 flex items-center justify-center gap-2">
              <span className="font-semibold text-sm text-[#111827] dark:text-white">
                {maskedTarget}
              </span>
              <button
                type="button"
                onClick={() => {
                  setStep('input');
                  setErrorMessage(null);
                  setInfoMessage(null);
                }}
                className="text-xs font-semibold text-[#6D3DF5] hover:underline focus:outline-none"
              >
                Change
              </button>
            </div>
          </>
        )}
      </div>

      {/* Global Error Banner */}
      {errorMessage && (
        <div
          role="alert"
          data-testid="auth-error-alert"
          className="mb-5 flex items-start gap-2.5 rounded-2xl border border-red-200 bg-red-50 p-3.5 text-xs sm:text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300"
        >
          <span className="mt-0.5 inline-block h-2 w-2 rounded-full bg-red-500 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Global Info Banner */}
      {infoMessage && (
        <div
          role="status"
          className="mb-5 flex items-start gap-2.5 rounded-2xl border border-emerald-200 bg-emerald-50 p-3.5 text-xs sm:text-sm text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-300"
        >
          <span className="mt-0.5 inline-block h-2 w-2 rounded-full bg-emerald-500 shrink-0" />
          <span>{infoMessage}</span>
        </div>
      )}

      {/* STEP 1: EMAIL-ONLY AUTHENTICATION */}
      {step === 'input' && (
        <div className="space-y-4">
          <form onSubmit={handleSendEmailOtp} className="space-y-4" noValidate>
            <div>
              <label
                htmlFor="email-input"
                className="block text-xs sm:text-sm font-semibold text-[#111827] dark:text-slate-200 mb-1.5"
              >
                Email address
              </label>
              <div
                className={`relative flex items-center rounded-2xl border bg-white dark:bg-slate-800 transition-all duration-200 ${
                  errorMessage
                    ? 'border-red-300 ring-2 ring-red-100 dark:border-red-800 dark:ring-red-950'
                    : 'border-[#E2E8F0] focus-within:border-[#6D3DF5] focus-within:ring-2 focus-within:ring-[#6D3DF5]/20 dark:border-slate-700'
                }`}
              >
                <div className="pl-3.5 pr-2 text-[#64748B] dark:text-slate-400">
                  <Mail className="h-5 w-5" />
                </div>
                <input
                  id="email-input"
                  type="email"
                  autoComplete="email"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => {
                    setErrorMessage(null);
                    setEmail(e.target.value);
                  }}
                  aria-label="Email address"
                  className="w-full bg-transparent px-2.5 py-3 text-base font-medium text-[#111827] placeholder-[#94A3B8] focus:outline-none dark:text-white dark:placeholder-slate-500"
                />
              </div>
              <p className="mt-1.5 text-xs text-[#64748B] dark:text-slate-400">
                We&apos;ll send a 6-digit one-time verification code directly to this email.
              </p>
            </div>

            {/* Cloudflare Turnstile */}
            <div className="flex justify-center my-3">
              <Turnstile
                siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || '1x00000000000000000000AA'}
                onSuccess={(token) => setTurnstileToken(token)}
                onError={() => setTurnstileToken('')}
                onExpire={() => setTurnstileToken('')}
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              data-testid="send-otp-btn"
              disabled={isSubmitting}
              className="relative flex w-full items-center justify-center rounded-2xl bg-[#6D3DF5] py-3.5 text-sm font-bold text-white shadow-lg shadow-[#6D3DF5]/25 transition duration-200 hover:bg-[#5B2FE0] focus:outline-none focus:ring-2 focus:ring-[#6D3DF5] focus:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <LoadingThreeDotsJumping color="#FFFFFF" size={24} />
              ) : (
                <span>Continue with Email</span>
              )}
            </button>
          </form>

          {/* Terms Agreement */}
          <p className="pt-1 text-center text-xs leading-relaxed text-[#64748B] dark:text-slate-400">
            By continuing, you agree to Shop:Sell&apos;s{' '}
            <Link href="/terms" className="font-medium text-[#6D3DF5] hover:underline">
              Terms of Service
            </Link>{' '}
            and{' '}
            <Link href="/privacy" className="font-medium text-[#6D3DF5] hover:underline">
              Privacy Policy
            </Link>
            .
          </p>

          {/* Google Divider */}
          <div className="relative my-6 text-center">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-[#E2E8F0] dark:border-slate-800" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-3 font-semibold text-[#64748B] dark:bg-slate-900 dark:text-slate-400">
                Or
              </span>
            </div>
          </div>

          {/* Continue with Google */}
          <button
            type="button"
            onClick={handleGoogleLogin}
            className="flex w-full items-center justify-center gap-3 rounded-2xl border border-[#E2E8F0] bg-white py-3 text-sm font-semibold text-[#111827] transition hover:bg-slate-50 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:hover:bg-slate-750"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                fill="#4285F4"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                fill="#EA4335"
              />
            </svg>
            <span>Continue with Google</span>
          </button>

          {/* Quick Demo Sign-In strictly gated for development/testing */}
          {process.env.NEXT_PUBLIC_ENABLE_DEMO_ACCOUNTS === 'true' && (
            <div className="mt-5 rounded-2xl border border-dashed border-[#6D3DF5]/30 bg-[#6D3DF5]/5 p-3.5 text-center dark:border-purple-800 dark:bg-purple-950/20">
              <p className="text-xs font-semibold text-[#6D3DF5] dark:text-purple-300 mb-2">
                ⚡ Quick Demo Sign-In (Dev Only)
              </p>
              <div className="flex flex-wrap items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={async () => {
                    await loginAsDevRole('owner', 'demo-seller@shopsell.test');
                    router.push('/seller');
                  }}
                  className="rounded-xl bg-emerald-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-emerald-700 transition"
                >
                  🏬 Demo Seller
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    await loginAsDevRole('customer');
                    const target = redirectUrl.startsWith('/') && !redirectUrl.startsWith('//') ? redirectUrl : '/';
                    router.push(target);
                  }}
                  className="rounded-xl bg-white px-3.5 py-1.5 text-xs font-bold text-[#111827] shadow-sm border border-slate-200 hover:bg-slate-50 transition dark:bg-slate-800 dark:text-white dark:border-slate-700"
                >
                  👤 Customer
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    await loginAsDevRole('admin', 'demo-admin@shopsell.test');
                    router.push('/admin');
                  }}
                  className="rounded-xl bg-purple-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-purple-700 transition"
                >
                  🛡️ Demo Admin
                </button>
              </div>
            </div>
          )}

          {/* Don't have an account? Sign up */}
          <div className="pt-2 text-center text-xs text-[#64748B] dark:text-slate-400">
            Don&apos;t have an account?{' '}
            <Link
              href={`/signup${redirectUrl && redirectUrl !== '/' ? `?redirect=${encodeURIComponent(redirectUrl)}` : ''}`}
              className="font-bold text-[#6D3DF5] hover:text-[#5B2FE0] hover:underline"
            >
              Sign up
            </Link>
          </div>
        </div>
      )}

      {/* STEP 2: 6-DIGIT EMAIL OTP VERIFICATION */}
      {step === 'verify' && (
        <form onSubmit={handleVerifyOtp} className="space-y-6" noValidate>
          <div className="py-2">
            <OtpInput
              value={otp}
              onChange={setOtp}
              hasError={Boolean(errorMessage)}
              disabled={isSubmitting}
            />
          </div>

          <button
            type="button"
            data-testid="verify-otp-btn"
            onClick={() => handleVerifyOtp()}
            disabled={isSubmitting || otp.length !== 6}
            className="relative flex w-full items-center justify-center rounded-2xl bg-[#6D3DF5] py-3.5 text-sm font-bold text-white shadow-lg shadow-[#6D3DF5]/25 transition duration-200 hover:bg-[#5B2FE0] focus:outline-none focus:ring-2 focus:ring-[#6D3DF5] focus:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <LoadingThreeDotsJumping color="#FFFFFF" size={24} />
            ) : (
              <span>Verify and Sign In</span>
            )}
          </button>

          {/* Resend Cooldown Section */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-1.5 text-xs sm:text-sm text-[#64748B] dark:text-slate-400">
            <span>Didn&apos;t receive the code?</span>
            {countdown > 0 ? (
              <span className="font-semibold text-[#111827] dark:text-slate-200">
                Resend in {countdown}s
              </span>
            ) : (
              <button
                type="button"
                onClick={handleResendOtp}
                disabled={isResending}
                className="font-bold text-[#6D3DF5] hover:text-[#5B2FE0] hover:underline focus:outline-none disabled:opacity-50"
              >
                {isResending ? 'Resending...' : 'Resend Code'}
              </button>
            )}
          </div>

          <p className="text-center text-xs text-slate-400 dark:text-slate-500">
            Tip: If you don&apos;t see the email in a few seconds, check your Spam or Junk folder.
          </p>

          {/* Back to Email Input */}
          <div className="pt-2 text-center">
            <button
              type="button"
              onClick={() => {
                setStep('input');
                setErrorMessage(null);
                setInfoMessage(null);
              }}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#64748B] hover:text-[#111827] dark:text-slate-400 dark:hover:text-white"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Use a different email address</span>
            </button>
          </div>
        </form>
      )}
    </motion.div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-64 w-full items-center justify-center">
          <LoadingThreeDotsJumping color="#6D3DF5" size={28} />
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
