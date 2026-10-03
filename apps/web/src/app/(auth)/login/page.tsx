'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { motion, useReducedMotion } from 'motion/react';
import { ShieldCheck, ArrowLeft, Mail, Phone, CheckCircle2 } from 'lucide-react';
import { useAuth } from '@/lib/auth/auth-context';
import { OtpInput } from '@/components/auth/otp-input';
import { LoadingThreeDotsJumping } from '@/components/loading';
import { sendFirebasePhoneOtp, confirmFirebasePhoneOtp } from '@/lib/firebase/phone-auth';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectUrl = searchParams.get('redirect') || searchParams.get('returnUrl') || '/';

  const { sendOtp, verifyOtp, loginAsDevRole } = useAuth();
  const shouldReduceMotion = useReducedMotion();

  // Mode: 'email' | 'phone'
  const modeParam = searchParams.get('mode');
  const [authMode, setAuthMode] = useState<'email' | 'phone'>(
    modeParam === 'phone' ? 'phone' : 'email'
  );

  // Screen step: 'input' | 'verify'
  const [step, setStep] = useState<'input' | 'verify'>('input');

  // Input states
  const [email, setEmail] = useState('');
  const [phoneRaw, setPhoneRaw] = useState('');
  const [activeIdentifier, setActiveIdentifier] = useState('');
  const [maskedTarget, setMaskedTarget] = useState('');
  const [otp, setOtp] = useState('');

  // Status & feedback
  const [countdown, setCountdown] = useState(30);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

  // Resend countdown timer
  useEffect(() => {
    if (step !== 'verify' || countdown <= 0) return;
    const interval = setInterval(() => {
      setCountdown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [step, countdown]);

  // Format phone display with Indian format (e.g. "98765 43210")
  const formatPhone = (val: string) => {
    let digits = val.replace(/\D/g, '');
    if (digits.startsWith('91') && digits.length > 10) {
      digits = digits.slice(2);
    } else if (digits.startsWith('0') && digits.length > 10) {
      digits = digits.slice(1);
    }
    digits = digits.slice(0, 10);
    if (digits.length <= 5) return digits;
    return `${digits.slice(0, 5)} ${digits.slice(5)}`;
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrorMessage(null);
    setPhoneRaw(formatPhone(e.target.value));
  };

  // Helper to validate email
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

  // Helper to validate and normalize Indian mobile number
  const validatePhone = (raw: string): { phone?: string; error?: string } => {
    const digits = raw.replace(/\D/g, '');
    if (!digits) {
      return { error: 'Please enter your mobile number' };
    }
    if (!/^[6-9]\d{9}$/.test(digits)) {
      return {
        error: 'Please enter a valid 10-digit Indian mobile number (e.g. 98765 43210)',
      };
    }
    return { phone: `+91${digits}` };
  };

  // Handle Send OTP
  const handleSendOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setInfoMessage(null);
    setErrorMessage(null);

    let identifierToSend = '';

    if (authMode === 'email') {
      const check = validateEmail(email);
      if (check.error) {
        setErrorMessage(check.error);
        return;
      }
      identifierToSend = check.email!;
    } else {
      const check = validatePhone(phoneRaw);
      if (check.error) {
        setErrorMessage(check.error);
        return;
      }
      identifierToSend = check.phone!;
      // Optional Firebase phone delivery
      sendFirebasePhoneOtp(check.phone!).catch(() => {});
    }

    setIsSubmitting(true);
    const res = await sendOtp(identifierToSend);
    setIsSubmitting(false);

    if (res.success) {
      const masked = res.phone || (authMode === 'email'
        ? identifierToSend.replace(/(.{1,2})(.*)(@.*)/, '$1***$3')
        : `+91 ••••••${identifierToSend.slice(-4)}`);

      setActiveIdentifier(identifierToSend);
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

    let isFirebaseVerified = false;
    if (authMode === 'phone') {
      try {
        const fbRes = await confirmFirebasePhoneOtp(otp);
        if (fbRes.success) {
          isFirebaseVerified = true;
        }
      } catch (fbErr) {
        console.info('Firebase verification check note:', fbErr);
      }
    }

    const res = await verifyOtp(activeIdentifier, otp, isFirebaseVerified);
    setIsSubmitting(false);

    if (res.success) {
      const target = redirectUrl.startsWith('/') && !redirectUrl.startsWith('//') ? redirectUrl : '/';
      router.push(target);
    } else {
      setErrorMessage(res.error || 'Invalid or expired verification code');
    }
  };

  // Handle Resend OTP
  const handleResendOtp = async () => {
    if (countdown > 0 || isResending) return;
    setErrorMessage(null);
    setInfoMessage(null);
    setIsResending(true);

    if (authMode === 'phone') {
      sendFirebasePhoneOtp(activeIdentifier).catch(() => {});
    }
    const res = await sendOtp(activeIdentifier);
    setIsResending(false);

    if (res.success) {
      setCountdown(res.cooldownSeconds || 30);
      setInfoMessage(authMode === 'email'
        ? 'A fresh verification code has been delivered to your email inbox.'
        : 'A new verification code has been dispatched via SMS.');
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
      setErrorMessage('Google OAuth is in configuration. Please sign in with your email or mobile number.');
    }
  };

  return (
    <motion.div
      initial={false}
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
              {authMode === 'email'
                ? 'Sign in to Shop:Sell using your email address.'
                : 'Sign in to Shop:Sell using your mobile number.'}
            </p>
          </>
        ) : (
          <>
            <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-[#6D3DF5]/10 text-[#6D3DF5] dark:bg-purple-950/50 dark:text-purple-400">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#111827] dark:text-white">
              {authMode === 'email' ? 'Check your inbox' : 'Verify your number'}
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-[#64748B] dark:text-slate-400">
              {authMode === 'email'
                ? 'We sent a 6-digit verification code to your email:'
                : 'We sent a 6-digit verification code to:'}
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

      {/* Invisible reCAPTCHA container for Firebase Phone Auth - remains mounted across step transitions */}
      <div id="recaptcha-container" />

      {/* STEP 1: IDENTIFIER INPUT (EMAIL OR PHONE) */}
      {step === 'input' && (
        <form onSubmit={handleSendOtp} className="space-y-4" noValidate>
          {/* Auth Method Switcher Tabs */}
          <div className="flex rounded-2xl bg-slate-100 p-1 dark:bg-slate-800">
            <button
              type="button"
              onClick={() => {
                setAuthMode('email');
                setErrorMessage(null);
              }}
              className={`flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 text-xs sm:text-sm font-semibold transition ${
                authMode === 'email'
                  ? 'bg-white text-[#111827] shadow-sm dark:bg-slate-700 dark:text-white'
                  : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white'
              }`}
            >
              <Mail className="h-4 w-4" />
              <span>Email</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setAuthMode('phone');
                setErrorMessage(null);
              }}
              className={`flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 text-xs sm:text-sm font-semibold transition ${
                authMode === 'phone'
                  ? 'bg-white text-[#111827] shadow-sm dark:bg-slate-700 dark:text-white'
                  : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white'
              }`}
            >
              <Phone className="h-4 w-4" />
              <span>Mobile SMS</span>
            </button>
          </div>

          {authMode === 'email' ? (
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
                  placeholder="jathinreddy105@gmail.com"
                  value={email}
                  onChange={(e) => {
                    setErrorMessage(null);
                    setEmail(e.target.value);
                  }}
                  aria-label="Email address"
                  className="w-full bg-transparent px-2.5 py-3 text-base font-medium text-[#111827] placeholder-[#64748B] focus:outline-none dark:text-white dark:placeholder-slate-500"
                />
              </div>
            </div>
          ) : (
            <div>
              <label
                htmlFor="phone-input"
                className="block text-xs sm:text-sm font-semibold text-[#111827] dark:text-slate-200 mb-1.5"
              >
                Mobile number
              </label>
              <div
                className={`relative flex items-center rounded-2xl border bg-white dark:bg-slate-800 transition-all duration-200 ${
                  errorMessage
                    ? 'border-red-300 ring-2 ring-red-100 dark:border-red-800 dark:ring-red-950'
                    : 'border-[#E2E8F0] focus-within:border-[#6D3DF5] focus-within:ring-2 focus-within:ring-[#6D3DF5]/20 dark:border-slate-700'
                }`}
              >
                {/* Country Code Selector Pill */}
                <div className="flex items-center gap-1.5 border-r border-[#E2E8F0] px-3.5 py-3 text-sm font-semibold text-[#111827] dark:border-slate-700 dark:text-white select-none">
                  <span className="text-base" role="img" aria-label="India flag">
                    🇮🇳
                  </span>
                  <span>+91</span>
                </div>

                {/* Number Input */}
                <input
                  id="phone-input"
                  type="tel"
                  inputMode="numeric"
                  autoComplete="tel"
                  placeholder="98765 43210"
                  value={phoneRaw}
                  onChange={handlePhoneChange}
                  maxLength={11}
                  aria-label="Mobile number"
                  className="w-full bg-transparent px-3.5 py-3 text-base font-medium tracking-wide text-[#111827] placeholder-[#64748B] focus:outline-none dark:text-white dark:placeholder-slate-500"
                />
              </div>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="button"
            data-testid="send-otp-btn"
            onClick={() => handleSendOtp()}
            disabled={isSubmitting}
            className="relative flex w-full items-center justify-center rounded-2xl bg-[#6D3DF5] py-3.5 text-sm font-bold text-white shadow-lg shadow-[#6D3DF5]/25 transition duration-200 hover:bg-[#5B2FE0] focus:outline-none focus:ring-2 focus:ring-[#6D3DF5] focus:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <LoadingThreeDotsJumping color="#FFFFFF" size={24} />
            ) : (
              <span>{authMode === 'email' ? 'Send Verification Code' : 'Send OTP'}</span>
            )}
          </button>

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

          {/* Optional Google Divider */}
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

          {/* Continue with Google (Secondary Option) */}
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

          {/* Quick Demo Sign-In for testing & local development */}
          <div className="mt-5 rounded-2xl border border-dashed border-[#6D3DF5]/30 bg-[#6D3DF5]/5 p-3.5 text-center dark:border-purple-800 dark:bg-purple-950/20">
            <p className="text-xs font-semibold text-[#6D3DF5] dark:text-purple-300 mb-2">
              ⚡ Quick Demo Sign-In (1-Click)
            </p>
            <div className="flex items-center justify-center gap-2">
              <button
                type="button"
                onClick={async () => {
                  await loginAsDevRole('customer');
                  const target = redirectUrl.startsWith('/') && !redirectUrl.startsWith('//') ? redirectUrl : '/';
                  router.push(target);
                }}
                className="rounded-xl bg-white px-3 py-1.5 text-xs font-bold text-[#111827] shadow-sm border border-slate-200 hover:bg-slate-50 transition dark:bg-slate-800 dark:text-white dark:border-slate-700"
              >
                Customer
              </button>
              <button
                type="button"
                onClick={async () => {
                  await loginAsDevRole('owner');
                  const target = redirectUrl.startsWith('/') && !redirectUrl.startsWith('//') ? redirectUrl : '/seller';
                  router.push(target);
                }}
                className="rounded-xl bg-white px-3 py-1.5 text-xs font-bold text-amber-700 shadow-sm border border-amber-200 hover:bg-amber-50 transition dark:bg-slate-800 dark:text-amber-300 dark:border-amber-800"
              >
                Seller
              </button>
              <button
                type="button"
                onClick={async () => {
                  await loginAsDevRole('admin');
                  const target = redirectUrl.startsWith('/') && !redirectUrl.startsWith('//') ? redirectUrl : '/admin';
                  router.push(target);
                }}
                className="rounded-xl bg-white px-3 py-1.5 text-xs font-bold text-purple-700 shadow-sm border border-purple-200 hover:bg-purple-50 transition dark:bg-slate-800 dark:text-purple-300 dark:border-purple-800"
              >
                Admin
              </button>
            </div>
          </div>
        </form>
      )}

      {/* STEP 2: 6-DIGIT OTP VERIFICATION */}
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
                {isResending ? 'Resending...' : authMode === 'email' ? 'Resend Code' : 'Resend OTP'}
              </button>
            )}
          </div>

          {authMode === 'email' && (
            <p className="text-center text-xs text-slate-400 dark:text-slate-500">
              Tip: If you don&apos;t see the email in a few seconds, check your Spam or Junk folder.
            </p>
          )}

          {/* Back to Input */}
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
              <span>
                {authMode === 'email' ? 'Use a different email address' : 'Use a different mobile number'}
              </span>
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
