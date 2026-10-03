'use client';

import React, { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { motion, useReducedMotion } from 'motion/react';
import { Lock, Eye, EyeOff, KeyRound, Check, X, CheckCircle2 } from 'lucide-react';
import { useAuth } from '@/lib/auth/auth-context';
import { LoadingThreeDotsJumping } from '@/components/loading';

function ResetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token') || '';

  const { resetPassword } = useAuth();
  const shouldReduceMotion = useReducedMotion();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const hasMinLength = password.length >= 8;
  const hasUppercase = /[A-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const passwordsMatch = password.length > 0 && password === confirmPassword;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!token) {
      setErrorMessage('Missing password reset security token. Please request a new reset link.');
      return;
    }

    if (!hasMinLength || !hasUppercase || !hasNumber) {
      setErrorMessage('Please satisfy all password security criteria');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match');
      return;
    }

    setIsSubmitting(true);
    const res = await resetPassword(token, password);
    setIsSubmitting(false);

    if (res.success) {
      setIsSuccess(true);
    } else {
      setErrorMessage(res.error || 'Failed to update password. Link may have expired.');
    }
  };

  return (
    <motion.div
      initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
      className="w-full rounded-3xl border border-[#E2E8F0] bg-white p-6 sm:p-10 shadow-xl shadow-slate-200/50 dark:border-slate-800 dark:bg-slate-900 dark:shadow-none"
    >
      <div className="mb-6 text-center">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#6D3DF5]/10 text-[#6D3DF5] dark:bg-purple-950/50 dark:text-purple-400">
          <KeyRound className="h-6 w-6" />
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#111827] dark:text-white">
          Reset your password
        </h1>
        <p className="mt-1 text-sm text-[#64748B] dark:text-slate-400">
          Choose a new, strong password to secure your Shop:Sell account.
        </p>
      </div>

      {isSuccess ? (
        <div className="space-y-6 text-center">
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-6 text-left dark:border-emerald-900/40 dark:bg-emerald-950/30">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <h2 className="text-sm font-bold text-emerald-900 dark:text-emerald-200">
                  Password Updated Successfully
                </h2>
                <p className="mt-1 text-xs text-emerald-800 dark:text-emerald-300 leading-relaxed">
                  Your credentials have been securely updated. You can now sign in with your new password.
                </p>
              </div>
            </div>
          </div>

          <Link
            href="/login"
            className="flex h-12 w-full items-center justify-center rounded-2xl bg-[#6D3DF5] px-4 font-semibold text-white shadow-lg shadow-[#6D3DF5]/25 transition hover:bg-[#5B2FE0] active:scale-[0.99]"
          >
            <span>Continue to Sign In</span>
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          {errorMessage && (
            <div
              role="alert"
              aria-live="polite"
              className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-medium text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-400"
            >
              {errorMessage}
            </div>
          )}

          {/* New Password */}
          <div>
            <label
              htmlFor="reset-password"
              className="block text-xs font-semibold text-[#111827] dark:text-slate-200"
            >
              New password
            </label>
            <div className="relative mt-1.5">
              <input
                id="reset-password"
                type={showPassword ? 'text' : 'password'}
                required
                autoComplete="new-password"
                placeholder="Enter new password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isSubmitting}
                className="w-full rounded-2xl border border-[#E2E8F0] bg-white py-2.5 pl-10 pr-11 text-sm text-[#111827] outline-none transition placeholder:text-slate-400 focus:border-[#6D3DF5] focus:ring-2 focus:ring-[#6D3DF5]/20 dark:border-slate-800 dark:bg-slate-800/80 dark:text-white"
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
              htmlFor="reset-confirm-password"
              className="block text-xs font-semibold text-[#111827] dark:text-slate-200"
            >
              Confirm password
            </label>
            <div className="relative mt-1.5">
              <input
                id="reset-confirm-password"
                type={showConfirmPassword ? 'text' : 'password'}
                required
                autoComplete="new-password"
                placeholder="Confirm new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={isSubmitting}
                className="w-full rounded-2xl border border-[#E2E8F0] bg-white py-2.5 pl-10 pr-11 text-sm text-[#111827] outline-none transition placeholder:text-slate-400 focus:border-[#6D3DF5] focus:ring-2 focus:ring-[#6D3DF5]/20 dark:border-slate-800 dark:bg-slate-800/80 dark:text-white"
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

          {/* Checklist */}
          <div className="rounded-2xl bg-slate-50 p-3.5 text-xs text-[#64748B] dark:bg-slate-800/50 dark:text-slate-400 space-y-1.5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
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

          <button
            type="submit"
            disabled={isSubmitting}
            className="mt-2 flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[#6D3DF5] px-4 font-semibold text-white shadow-lg shadow-[#6D3DF5]/25 transition hover:bg-[#5B2FE0] active:scale-[0.99] disabled:opacity-70"
          >
            {isSubmitting ? (
              <LoadingThreeDotsJumping
                color="#FFFFFF"
                size={7}
                jumpHeight={8}
                gap={4}
                label="Updating password"
              />
            ) : (
              <span>Update Password</span>
            )}
          </button>
        </form>
      )}
    </motion.div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[300px] items-center justify-center">
          <LoadingThreeDotsJumping
            color="#6D3DF5"
            label="Loading password reset form"
          />
        </div>
      }
    >
      <ResetPasswordContent />
    </Suspense>
  );
}
