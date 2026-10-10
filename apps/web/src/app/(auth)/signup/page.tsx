'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { motion, useReducedMotion } from 'motion/react';
import { User, Mail, Sparkles, ArrowLeft, RefreshCw, CheckCircle2 } from 'lucide-react';
import { useAuth } from '@/lib/auth/auth-context';
import { OtpInput } from '@/components/auth/otp-input';
import { LoadingThreeDotsJumping } from '@/components/loading';

function SignupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectUrl = searchParams.get('redirect') || searchParams.get('returnUrl') || '/';

  const { sendOtp, verifyOtp } = useAuth();
  const shouldReduceMotion = useReducedMotion();

  // Step: 'details' (Name + Email) | 'verify' (6-digit OTP)
  const [step, setStep] = useState<'details' | 'verify'>('details');

  // Form fields
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');

  // Status & Feedback
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(0);

  // Timer countdown for resending code
  useEffect(() => {
    if (countdown <= 0) return;
    const interval = setInterval(() => {
      setCountdown((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [countdown]);

  // Step 1: Request OTP for new account
  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setInfoMessage(null);

    const trimmedName = fullName.trim();
    if (!trimmedName || trimmedName.length < 2) {
      setErrorMessage('Please enter your full name (minimum 2 characters)');
      return;
    }

    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setErrorMessage('Please enter a valid email address');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await sendOtp(trimmedEmail);
      if (res.success) {
        setStep('verify');
        setOtp('');
        setCountdown(res.cooldownSeconds || 30);
        setInfoMessage('Verification code sent! Please check your inbox and Spam/Junk folder.');
      } else {
        setErrorMessage(res.error || 'Failed to send verification code. Please try again.');
      }
    } catch {
      setErrorMessage('Network error while requesting verification code. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Step 2: Verify 6-digit OTP & create account
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
      const trimmedEmail = email.trim().toLowerCase();
      const trimmedName = fullName.trim();
      const authRes = await verifyOtp(trimmedEmail, cleanOtp, false, trimmedName);

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

  // Resend OTP Code
  const handleResendCode = async () => {
    if (countdown > 0 || isResending) return;

    setErrorMessage(null);
    setInfoMessage(null);
    setIsResending(true);

    try {
      const trimmedEmail = email.trim().toLowerCase();
      const res = await sendOtp(trimmedEmail);
      if (res.success) {
        setCountdown(30);
        setOtp('');
        setInfoMessage('A new verification code has been dispatched. Please check your inbox.');
      } else {
        setErrorMessage(res.error || 'Failed to resend verification code. Please try again.');
      }
    } catch {
      setErrorMessage('Network error while resending verification code.');
    } finally {
      setIsResending(false);
    }
  };

  // Google OAuth flow
  const handleGoogleSignup = () => {
    setErrorMessage(null);
    window.location.href = '/api/auth/google';
  };

  return (
    <motion.div
      initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
      className="w-full rounded-3xl border border-[#E2E8F0] bg-white p-6 sm:p-10 shadow-xl shadow-slate-200/50 dark:border-slate-800 dark:bg-slate-900 dark:shadow-none"
    >
      {/* Brand & Page Header */}
      <div className="mb-6 text-center sm:text-left">
        <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-[#059669] dark:bg-emerald-950/50 dark:text-emerald-400">
          <Sparkles className="h-3.5 w-3.5 text-[#059669]" />
          <span>Join Shop:Sell</span>
        </div>
        <h1 className="mt-3 text-2xl sm:text-3xl font-extrabold tracking-tight text-[#111827] dark:text-white">
          {step === 'details' ? 'Create your Shop:Sell account' : 'Verify your email'}
        </h1>
        <p className="mt-1 text-xs sm:text-sm text-[#64748B] dark:text-slate-400">
          {step === 'details'
            ? 'Sign up with zero passwords. We will send a one-time verification code to your email.'
            : `We sent a 6-digit verification code to ${email}. Enter it below to activate your account.`}
        </p>
      </div>

      {/* Status Messages */}
      {errorMessage && (
        <div
          role="alert"
          aria-live="polite"
          className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-medium text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-400"
        >
          {errorMessage}
        </div>
      )}

      {infoMessage && (
        <div className="mb-4 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs font-medium text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-300">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-[#059669]" />
          <span>{infoMessage}</span>
        </div>
      )}

      {/* STEP 1: NAME + EMAIL DETAILS */}
      {step === 'details' && (
        <form onSubmit={handleRequestOtp} className="space-y-4" noValidate>
          {/* Full Name */}
          <div>
            <label
              htmlFor="signup-name"
              className="block text-xs font-semibold text-[#111827] dark:text-slate-200"
            >
              Full name
            </label>
            <div className="relative mt-1.5">
              <input
                id="signup-name"
                type="text"
                required
                autoComplete="name"
                placeholder="Alex Johnson"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                disabled={isSubmitting}
                className="w-full rounded-2xl border border-[#E2E8F0] bg-white py-2.5 pl-10 pr-4 text-sm text-[#111827] outline-none transition placeholder:text-slate-400 focus:border-[#059669] focus:ring-2 focus:ring-[#059669]/20 dark:border-slate-800 dark:bg-slate-800/80 dark:text-white"
              />
              <User className="absolute left-3.5 top-3 h-4 w-4 text-[#64748B]" />
            </div>
          </div>

          {/* Email */}
          <div>
            <label
              htmlFor="signup-email"
              className="block text-xs font-semibold text-[#111827] dark:text-slate-200"
            >
              Email address
            </label>
            <div className="relative mt-1.5">
              <input
                id="signup-email"
                type="email"
                required
                autoComplete="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isSubmitting}
                className="w-full rounded-2xl border border-[#E2E8F0] bg-white py-2.5 pl-10 pr-4 text-sm text-[#111827] outline-none transition placeholder:text-slate-400 focus:border-[#059669] focus:ring-2 focus:ring-[#059669]/20 dark:border-slate-800 dark:bg-slate-800/80 dark:text-white"
              />
              <Mail className="absolute left-3.5 top-3 h-4 w-4 text-[#64748B]" />
            </div>
          </div>

          {/* Primary CTA */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="mt-2 flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[#059669] px-4 font-semibold text-white shadow-lg shadow-emerald-950/20 transition hover:bg-[#047857] active:scale-[0.99] disabled:opacity-70"
          >
            {isSubmitting ? (
              <LoadingThreeDotsJumping
                color="#FFFFFF"
                size={7}
                jumpHeight={8}
                gap={4}
                label="Sending verification code"
              />
            ) : (
              <span>Get Verification Code</span>
            )}
          </button>

          {/* Divider */}
          <div className="relative my-6 text-center">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-[#E2E8F0] dark:border-slate-800" />
            </div>
            <div className="relative flex justify-center">
              <span className="bg-white px-3 text-xs font-medium text-[#64748B] dark:bg-slate-900 dark:text-slate-400">
                Or continue with
              </span>
            </div>
          </div>

          {/* Google OAuth Button */}
          <button
            type="button"
            onClick={handleGoogleSignup}
            className="flex h-11 w-full items-center justify-center gap-3 rounded-2xl border border-[#E2E8F0] bg-white text-xs font-bold text-[#111827] shadow-sm transition hover:bg-slate-50 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:hover:bg-slate-750"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
              <path
                fill="#4285F4"
                d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"
              />
              <path
                fill="#34A853"
                d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
              />
              <path
                fill="#FBBC05"
                d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
              />
              <path
                fill="#EA4335"
                d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
              />
            </svg>
            <span>Continue with Google</span>
          </button>
        </form>
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
            <label className="block text-xs font-semibold text-[#64748B] dark:text-slate-400 mb-3 text-center">
              Enter 6-digit verification code sent to your email:
            </label>
            <OtpInput
              value={otp}
              onChange={(val) => {
                setOtp(val);
                if (val.length === 6) {
                  handleVerifyOtp(undefined, val);
                }
              }}
              hasError={Boolean(errorMessage)}
              disabled={isSubmitting}
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting || otp.length !== 6}
            className="flex h-12 w-full items-center justify-center rounded-2xl bg-[#059669] py-3.5 text-sm font-bold text-white shadow-lg shadow-emerald-950/20 transition hover:bg-[#047857] focus:outline-none focus:ring-2 focus:ring-[#059669] focus:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <LoadingThreeDotsJumping
                color="#FFFFFF"
                size={7}
                jumpHeight={8}
                gap={4}
                label="Verifying and creating account"
              />
            ) : (
              <span>Verify &amp; Create Account</span>
            )}
          </button>

          {/* Resend and Edit Actions */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 text-xs text-[#64748B] dark:text-slate-400 border-t border-[#E2E8F0] dark:border-slate-800">
            <button
              type="button"
              onClick={() => {
                setStep('details');
                setErrorMessage(null);
                setInfoMessage(null);
              }}
              className="inline-flex items-center gap-1.5 font-medium hover:text-[#111827] dark:hover:text-white transition"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Change email or name</span>
            </button>

            <div>
              {countdown > 0 ? (
                <span>Resend code in <strong className="text-slate-800 dark:text-slate-200">{countdown}s</strong></span>
              ) : (
                <button
                  type="button"
                  onClick={handleResendCode}
                  disabled={isResending}
                  className="inline-flex items-center gap-1.5 font-bold text-[#059669] hover:underline"
                >
                  <RefreshCw className={`h-3 w-3 ${isResending ? 'animate-spin' : ''}`} />
                  <span>Resend code</span>
                </button>
              )}
            </div>
          </div>
        </form>
      )}

      {/* Footer Navigation */}
      <div className="mt-6 text-center text-xs text-[#64748B] dark:text-slate-400">
        Already have an account?{' '}
        <Link
          href={`/login${redirectUrl && redirectUrl !== '/' ? `?redirect=${encodeURIComponent(redirectUrl)}` : ''}`}
          className="font-bold text-[#059669] transition hover:text-[#047857] hover:underline"
        >
          Sign in
        </Link>
      </div>
    </motion.div>
  );
}

export default function SignupPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[300px] items-center justify-center">
          <LoadingThreeDotsJumping
            color="#059669"
            label="Loading sign up form"
          />
        </div>
      }
    >
      <SignupForm />
    </Suspense>
  );
}
