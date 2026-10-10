'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { motion, useReducedMotion } from 'motion/react';
import { Mail, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { useAuth } from '@/lib/auth/auth-context';
import { OtpInput } from '@/components/auth/otp-input';
import { LoadingThreeDotsJumping } from '@/components/loading';
import { BrandIcon } from '@/components/brand/brand-icon';

function validateEmail(email: string): { valid: boolean; error?: string } {
  const trimmed = email.trim();
  if (!trimmed) {
    return { valid: false, error: 'Please enter your email address' };
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(trimmed)) {
    return { valid: false, error: 'Please enter a valid email address' };
  }
  return { valid: true };
}

function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (!domain) return email;
  if (local.length <= 2) return `${local[0]}*@${domain}`;
  return `${local[0]}***${local.slice(-1)}@${domain}`;
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectUrl =
    searchParams.get('redirect') ||
    searchParams.get('returnUrl') ||
    '/';

  const { sendOtp, verifyOtp, loginWithFirebase, loginAsDevRole } = useAuth();
  const shouldReduceMotion = useReducedMotion();

  // Screen step: 'input' (enter email) | 'verify' (enter 6-digit code)
  const [step, setStep] = useState<'input' | 'verify'>('input');

  // Input states
  const [email, setEmail] = useState('');
  const [maskedTarget, setMaskedTarget] = useState('');
  const [otp, setOtp] = useState('');

  // Status & feedback
  const [countdown, setCountdown] = useState(30);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

  // Resend countdown timer for OTP
  useEffect(() => {
    if (step !== 'verify' || countdown <= 0) {
      return;
    }

    const interval = setInterval(() => {
      setCountdown((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [step, countdown]);

  // Handle Send Verification Code via Resend
  const handleSendCode = async (e?: React.FormEvent | React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    setInfoMessage(null);
    setErrorMessage(null);

    const validation = validateEmail(email);
    if (!validation.valid) {
      setErrorMessage(validation.error || 'Please enter a valid email address');
      return;
    }

    const cleanEmail = email.trim().toLowerCase();
    setIsSubmitting(true);

    try {
      const res = await sendOtp(cleanEmail);

      if (res.isAdminBypass || cleanEmail === 'admin@shopsell.com') {
        window.location.href = res.redirectUrl || '/admin';
        return;
      }

      if (res.success) {
        setMaskedTarget(res.email || maskEmail(cleanEmail));
        setCountdown(res.cooldownSeconds || 30);
        setOtp('');
        if (res.warning) {
          setInfoMessage(res.warning);
        }
        setStep('verify');
      } else {
        setErrorMessage(res.error || 'Failed to send verification code. Please try again.');
      }
    } catch {
      setErrorMessage('Network error while requesting verification code. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Verify 6-digit OTP
  const handleVerifyOtp = async (e?: React.FormEvent | React.MouseEvent, codeToVerify = otp) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    setErrorMessage(null);
    setInfoMessage(null);

    const cleanOtp = codeToVerify.trim();
    if (cleanOtp.length !== 6) {
      setErrorMessage('Please enter the complete 6-digit verification code');
      return;
    }

    setIsSubmitting(true);

    try {
      const cleanEmail = email.trim().toLowerCase();
      const authRes = await verifyOtp(cleanEmail, cleanOtp);

      if (authRes.success) {
        const target =
          redirectUrl.startsWith('/') && !redirectUrl.startsWith('//')
            ? redirectUrl
            : '/';
        window.location.href = target;
      } else {
        setErrorMessage(authRes.error || 'The verification code is incorrect or has expired.');
      }
    } catch {
      setErrorMessage('Authentication error. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Resend Code
  const handleResendCode = async () => {
    if (countdown > 0 || isResending) {
      return;
    }

    setErrorMessage(null);
    setInfoMessage(null);
    setIsResending(true);

    try {
      const cleanEmail = email.trim().toLowerCase();
      const res = await sendOtp(cleanEmail);
      if (res.success) {
        setCountdown(30);
        setInfoMessage(res.warning || 'A new verification code has been dispatched to your email.');
        setOtp('');
      } else {
        setErrorMessage(res.error || 'Failed to resend verification code. Please try again.');
      }
    } catch {
      setErrorMessage('Network error while resending verification code.');
    } finally {
      setIsResending(false);
    }
  };

  // Check for error in URL from OAuth callbacks
  useEffect(() => {
    const err = searchParams.get('error');
    if (err) {
      setErrorMessage(decodeURIComponent(err));
    }
  }, [searchParams]);

  // Handle Direct Google OAuth (No Firebase needed)
  const handleGoogleLogin = () => {
    setErrorMessage(null);
    setInfoMessage(null);
    window.location.href = '/api/auth/google';
  };

  return (
    <>
      <motion.div
      initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
      className="w-full rounded-3xl border border-[#E2E8F0] bg-white p-6 sm:p-10 shadow-xl shadow-slate-200/50 dark:border-slate-800 dark:bg-slate-900 dark:shadow-none"
    >
      {/* Brand Header */}
      <div className="mb-6 text-center">
        <Link
          href="/"
          className="inline-flex items-center gap-2 mb-3 group focus:outline-none"
        >
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-tr from-[#047857] to-[#10B981] shadow-md shadow-emerald-900/20">
            <BrandIcon className="h-6.5 w-6.5" />
          </div>
          <span className="text-2xl font-black tracking-tight text-[#111827] dark:text-white">
            Shop
            <span className="text-[#059669] dark:text-emerald-400">:</span>
            Sell
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
            <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-[#059669]/10 text-[#059669] dark:bg-emerald-950/50 dark:text-emerald-400">
              <Mail className="h-5 w-5" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#111827] dark:text-white">
              Check your inbox
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-[#64748B] dark:text-slate-400">
              We sent a 6-digit verification code to:
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
                className="text-xs font-semibold text-[#059669] hover:underline focus:outline-none"
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



      {/* STEP 1: EMAIL INPUT */}
      {step === 'input' && (
        <div className="space-y-4">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendCode(e);
            }}
            className="space-y-4"
            noValidate
          >
            <div>
              <label
                htmlFor="email-input"
                className="block text-sm font-semibold text-[#111827] dark:text-slate-200 mb-2"
              >
                Email address
              </label>

              <div
                className={`relative flex items-center rounded-2xl border bg-white dark:bg-slate-800 transition-all duration-200 ${
                  errorMessage
                    ? 'border-red-300 ring-2 ring-red-100 dark:border-red-800 dark:ring-red-950'
                    : 'border-[#E2E8F0] focus-within:border-[#059669] focus-within:ring-2 focus-within:ring-[#059669]/20 dark:border-slate-700'
                }`}
              >
                <div className="pl-4 pr-2 text-slate-400">
                  <Mail className="h-5 w-5 text-[#94A3B8]" />
                </div>

                <input
                  id="email-input"
                  type="email"
                  autoComplete="email"
                  placeholder="Enter your email address"
                  value={email}
                  onChange={(e) => {
                    setErrorMessage(null);
                    setEmail(e.target.value);
                  }}
                  aria-label="Email address"
                  className="w-full bg-transparent px-2 py-3.5 text-sm sm:text-base font-medium text-[#111827] placeholder-[#94A3B8] focus:outline-none dark:text-white dark:placeholder-slate-500"
                />
              </div>

              <p className="mt-2 text-xs text-[#64748B] dark:text-slate-400">
                We'll send a 6-digit one-time verification code via email.
              </p>
            </div>

            {/* Submit Button */}
            <button
              type="button"
              data-testid="send-otp-btn"
              onClick={handleSendCode}
              disabled={isSubmitting}
              className="relative flex w-full items-center justify-center rounded-2xl bg-[#059669] py-3.5 text-sm sm:text-base font-bold text-white shadow-lg shadow-emerald-950/20 transition duration-200 hover:bg-[#047857] focus:outline-none focus:ring-2 focus:ring-[#059669] focus:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <LoadingThreeDotsJumping color="#FFFFFF" size={24} />
              ) : (
                <span>Send OTP</span>
              )}
            </button>
          </form>

          {/* Terms Agreement */}
          <p className="text-center text-xs text-[#64748B] dark:text-slate-400 px-2 leading-relaxed pt-1">
            By continuing, you agree to Shop:Sell's{' '}
            <Link href="/terms" className="text-[#059669] hover:underline font-medium">
              Terms of Service
            </Link>{' '}
            and{' '}
            <Link href="/privacy" className="text-[#059669] hover:underline font-medium">
              Privacy Policy
            </Link>
            .
          </p>

          {/* Divider */}
          <div className="relative my-4 flex items-center justify-center">
            <div className="w-full border-t border-[#E2E8F0] dark:border-slate-800" />
            <span className="absolute bg-white px-3 text-xs font-semibold text-[#94A3B8] uppercase tracking-wider dark:bg-slate-900">
              OR
            </span>
          </div>

          {/* Optional Google OAuth */}
          <button
            type="button"
            onClick={handleGoogleLogin}
            className="flex w-full items-center justify-center gap-3 rounded-2xl border border-[#E2E8F0] bg-white py-3.5 text-sm font-semibold text-[#111827] shadow-sm transition hover:bg-slate-50 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:hover:bg-slate-700/60"
          >
            <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            <span>Continue with Google</span>
          </button>

          {/* Don't have an account? Sign up */}
          <div className="pt-3 text-center text-xs text-[#64748B] dark:text-slate-400">
            Don't have an account?{' '}
            <Link
              href={`/signup${
                redirectUrl && redirectUrl !== '/'
                  ? `?redirect=${encodeURIComponent(redirectUrl)}`
                  : ''
              }`}
              className="font-bold text-[#059669] hover:text-[#047857] hover:underline"
            >
              Sign up
            </Link>
          </div>
        </div>
      )}

      {/* STEP 2: 6-DIGIT EMAIL OTP VERIFICATION */}
      {step === 'verify' && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleVerifyOtp(e);
          }}
          className="space-y-6"
          noValidate
        >
          <div className="py-2">
            <label className="block text-xs font-semibold text-[#64748B] dark:text-slate-400 mb-2 text-center">
              Enter 6-digit verification code:
            </label>
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
            onClick={(e) => handleVerifyOtp(e)}
            disabled={isSubmitting || otp.length !== 6}
            className="relative flex w-full items-center justify-center rounded-2xl bg-[#059669] py-3.5 text-sm font-bold text-white shadow-lg shadow-emerald-950/20 transition duration-200 hover:bg-[#047857] focus:outline-none focus:ring-2 focus:ring-[#059669] focus:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <LoadingThreeDotsJumping color="#FFFFFF" size={24} />
            ) : (
              <span>Verify & Sign In</span>
            )}
          </button>

          {/* Resend Cooldown Section */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-1.5 text-xs sm:text-sm text-[#64748B] dark:text-slate-400">
            <span>Didn't receive the email?</span>
            {countdown > 0 ? (
              <span className="font-semibold text-[#111827] dark:text-slate-200">
                Resend in {countdown}s
              </span>
            ) : (
              <button
                type="button"
                onClick={handleResendCode}
                disabled={isResending}
                className="font-bold text-[#059669] hover:text-[#047857] hover:underline focus:outline-none disabled:opacity-50"
              >
                {isResending ? 'Resending...' : 'Resend Code'}
              </button>
            )}
          </div>

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

    {/* Optional Dev Fast Sign-In Toolbar (Outside main card, subtle in local dev) */}
    {process.env.NODE_ENV !== 'production' && (
      <div className="mt-4 flex items-center justify-center gap-2">
        <span className="text-[11px] font-medium text-slate-400">Dev bypass:</span>
        <button
          type="button"
          onClick={async () => {
            await loginAsDevRole('customer');
            const target = redirectUrl.startsWith('/') && !redirectUrl.startsWith('//') ? redirectUrl : '/';
            router.push(target);
          }}
          className="text-[11px] text-slate-500 hover:text-[#059669] hover:underline"
        >
          Customer
        </button>
        <span className="text-slate-300">•</span>
        <button
          type="button"
          onClick={async () => {
            await loginAsDevRole('admin', 'demo-admin@shopsell.test');
            router.push('/admin');
          }}
          className="text-[11px] text-slate-500 hover:text-[#059669] hover:underline"
        >
          Admin
        </button>
        <span className="text-slate-300">•</span>
        <button
          type="button"
          onClick={async () => {
            const res = await loginWithFirebase('mock-firebase-token-google:jathinreddy105@gmail.com:Jathin Reddy');
            if (res.success) {
              const target = redirectUrl.startsWith('/') && !redirectUrl.startsWith('//') ? redirectUrl : '/';
              router.push(target);
            }
          }}
          className="text-[11px] text-slate-500 hover:text-[#059669] hover:underline"
        >
          Google (Dev Test)
        </button>
      </div>
    )}
    </>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-64 w-full items-center justify-center">
          <LoadingThreeDotsJumping color="#059669" size={28} />
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}