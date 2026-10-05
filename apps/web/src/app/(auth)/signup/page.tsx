'use client';

import React, { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { motion, useReducedMotion } from 'motion/react';
import { User, Mail, Lock, Eye, EyeOff, Sparkles, Check, X } from 'lucide-react';
import { useAuth } from '@/lib/auth/auth-context';
import { LoadingThreeDotsJumping } from '@/components/loading';

function SignupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectUrl = searchParams.get('redirect') || searchParams.get('returnUrl') || '/';

  const { signup } = useAuth();
  const shouldReduceMotion = useReducedMotion();

  // Form fields
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Status
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Password rules validation
  const hasMinLength = password.length >= 8;
  const hasUppercase = /[A-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const passwordsMatch = password.length > 0 && password === confirmPassword;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!fullName || fullName.trim().length < 2) {
      setErrorMessage('Please enter your full name (minimum 2 characters)');
      return;
    }

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setErrorMessage('Please enter a valid email address');
      return;
    }

    if (!hasMinLength || !hasUppercase || !hasNumber) {
      setErrorMessage('Please meet all password security requirements');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match');
      return;
    }

    setIsSubmitting(true);
    const res = await signup(fullName, email, password);
    setIsSubmitting(false);

    if (res.success) {
      const target = redirectUrl.startsWith('/') && !redirectUrl.startsWith('//') ? redirectUrl : '/';
      router.push(target);
    } else {
      setErrorMessage(res.error || 'Failed to create account. Please try again.');
    }
  };

  const handleGoogleSignup = () => {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (supabaseUrl && !supabaseUrl.includes('[YOUR-PROJECT-REF]')) {
      const returnTarget = window.location.origin + redirectUrl;
      window.location.href = `${supabaseUrl}/auth/v1/authorize?provider=google&redirect_to=${encodeURIComponent(returnTarget)}`;
    } else {
      setErrorMessage('Google OAuth is currently in configuration. Please sign up with email and password.');
    }
  };

  return (
    <motion.div
      initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
      className="w-full rounded-3xl border border-[#E2E8F0] bg-white p-6 sm:p-10 shadow-xl shadow-slate-200/50 dark:border-slate-800 dark:bg-slate-900 dark:shadow-none"
    >
      <div className="mb-6 text-center sm:text-left">
        <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-[#059669] dark:bg-emerald-950/50 dark:text-emerald-400">
          <Sparkles className="h-3.5 w-3.5 text-[#059669]" />
          <span>Join Shop:Sell</span>
        </div>
        <h1 className="mt-3 text-2xl sm:text-3xl font-extrabold tracking-tight text-[#111827] dark:text-white">
          Create your Shop:Sell account
        </h1>
        <p className="mt-1 text-sm text-[#64748B] dark:text-slate-400">
          Discover products and purchase securely from verified independent sellers.
        </p>
      </div>

      {errorMessage && (
        <div
          role="alert"
          aria-live="polite"
          className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-medium text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-400"
        >
          {errorMessage}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
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

        {/* Password */}
        <div>
          <label
            htmlFor="signup-password"
            className="block text-xs font-semibold text-[#111827] dark:text-slate-200"
          >
            Password
          </label>
          <div className="relative mt-1.5">
            <input
              id="signup-password"
              type={showPassword ? 'text' : 'password'}
              required
              autoComplete="new-password"
              placeholder="Create a strong password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isSubmitting}
              className="w-full rounded-2xl border border-[#E2E8F0] bg-white py-2.5 pl-10 pr-11 text-sm text-[#111827] outline-none transition placeholder:text-slate-400 focus:border-[#059669] focus:ring-2 focus:ring-[#059669]/20 dark:border-slate-800 dark:bg-slate-800/80 dark:text-white"
            />
            <Lock className="absolute left-3.5 top-3 h-4 w-4 text-[#64748B]" />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              className="absolute right-3.5 top-2.5 text-[#64748B] hover:text-[#111827] transition"
            >
              {showPassword ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>

        {/* Confirm Password */}
        <div>
          <label
            htmlFor="signup-confirm-password"
            className="block text-xs font-semibold text-[#111827] dark:text-slate-200"
          >
            Confirm password
          </label>
          <div className="relative mt-1.5">
            <input
              id="signup-confirm-password"
              type={showConfirmPassword ? 'text' : 'password'}
              required
              autoComplete="new-password"
              placeholder="Repeat your password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              disabled={isSubmitting}
              className="w-full rounded-2xl border border-[#E2E8F0] bg-white py-2.5 pl-10 pr-11 text-sm text-[#111827] outline-none transition placeholder:text-slate-400 focus:border-[#059669] focus:ring-2 focus:ring-[#059669]/20 dark:border-slate-800 dark:bg-slate-800/80 dark:text-white"
            />
            <Lock className="absolute left-3.5 top-3 h-4 w-4 text-[#64748B]" />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
              className="absolute right-3.5 top-2.5 text-[#64748B] hover:text-[#111827] transition"
            >
              {showConfirmPassword ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>

        {/* Visible Password Requirements Checklist */}
        <div className="rounded-2xl bg-slate-50 p-3.5 text-xs text-[#64748B] dark:bg-slate-800/50 dark:text-slate-400 space-y-1.5">
          <p className="font-semibold text-slate-700 dark:text-slate-300">
            Password requirements:
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-0.5">
            <div className="flex items-center gap-1.5">
              {hasMinLength ? (
                <Check className="h-3.5 w-3.5 text-emerald-600" />
              ) : (
                <X className="h-3.5 w-3.5 text-slate-400" />
              )}
              <span className={hasMinLength ? 'text-emerald-700 font-medium' : ''}>
                At least 8 characters
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              {hasUppercase ? (
                <Check className="h-3.5 w-3.5 text-emerald-600" />
              ) : (
                <X className="h-3.5 w-3.5 text-slate-400" />
              )}
              <span className={hasUppercase ? 'text-emerald-700 font-medium' : ''}>
                One uppercase letter
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              {hasNumber ? (
                <Check className="h-3.5 w-3.5 text-emerald-600" />
              ) : (
                <X className="h-3.5 w-3.5 text-slate-400" />
              )}
              <span className={hasNumber ? 'text-emerald-700 font-medium' : ''}>
                One number
              </span>
            </div>

            {confirmPassword.length > 0 && (
              <div className="flex items-center gap-1.5">
                {passwordsMatch ? (
                  <Check className="h-3.5 w-3.5 text-emerald-600" />
                ) : (
                  <X className="h-3.5 w-3.5 text-rose-500" />
                )}
                <span className={passwordsMatch ? 'text-emerald-700 font-medium' : 'text-rose-600 font-medium'}>
                  Passwords match
                </span>
              </div>
            )}
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
              label="Creating account"
            />
          ) : (
            <span>Create Account</span>
          )}
        </button>
      </form>

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
