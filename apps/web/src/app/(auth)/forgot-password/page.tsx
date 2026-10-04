'use client';

import React, { useState, Suspense } from 'react';
import Link from 'next/link';
import { motion, useReducedMotion } from 'motion/react';
import { Mail, ArrowLeft, KeyRound, CheckCircle2 } from 'lucide-react';
import { useAuth } from '@/lib/auth/auth-context';
import { LoadingThreeDotsJumping } from '@/components/loading';

function ForgotPasswordContent() {
  const { forgotPassword } = useAuth();
  const shouldReduceMotion = useReducedMotion();

  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setErrorMessage('Please enter a valid email address');
      return;
    }

    setIsSubmitting(true);
    const res = await forgotPassword(email);
    setIsSubmitting(false);

    if (res.success) {
      setIsSubmitted(true);
    } else {
      setErrorMessage(res.error || 'Failed to submit password reset request');
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
          Forgot your password?
        </h1>
        <p className="mt-1 text-sm text-[#64748B] dark:text-slate-400">
          Enter your registered email address and we&apos;ll send recovery instructions.
        </p>
      </div>

      {isSubmitted ? (
        <div className="space-y-6 text-center">
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-6 text-left dark:border-emerald-900/40 dark:bg-emerald-950/30">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <h2 className="text-sm font-bold text-emerald-900 dark:text-emerald-200">
                  Instructions Dispatched
                </h2>
                <p className="mt-1 text-xs text-emerald-800 dark:text-emerald-300 leading-relaxed">
                  If an account exists for <span className="font-semibold">{email}</span>, we&apos;ll send instructions to continue. Check your inbox and spam folder.
                </p>
              </div>
            </div>
          </div>

          <Link
            href="/login"
            className="flex h-12 w-full items-center justify-center rounded-2xl bg-[#6D3DF5] px-4 font-semibold text-white shadow-lg shadow-[#6D3DF5]/25 transition hover:bg-[#5B2FE0] active:scale-[0.99]"
          >
            <span>Return to Sign In</span>
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

          <div>
            <label
              htmlFor="forgot-email"
              className="block text-xs font-semibold text-[#111827] dark:text-slate-200"
            >
              Email address
            </label>
            <div className="relative mt-1.5">
              <input
                id="forgot-email"
                type="email"
                required
                autoComplete="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isSubmitting}
                className="w-full rounded-2xl border border-[#E2E8F0] bg-white py-2.5 pl-10 pr-4 text-sm text-[#111827] outline-none transition placeholder:text-slate-400 focus:border-[#6D3DF5] focus:ring-2 focus:ring-[#6D3DF5]/20 dark:border-slate-800 dark:bg-slate-800/80 dark:text-white"
              />
              <Mail className="absolute left-3.5 top-3 h-4 w-4 text-[#64748B]" />
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="mt-2 flex h-12 w-full items-center justify-center rounded-2xl bg-[#6D3DF5] px-4 font-semibold text-white shadow-lg shadow-[#6D3DF5]/25 transition hover:bg-[#5B2FE0] active:scale-[0.99] disabled:opacity-70"
          >
            {isSubmitting ? (
              <LoadingThreeDotsJumping
                color="#FFFFFF"
                size={7}
                jumpHeight={8}
                gap={4}
                label="Sending reset instructions"
              />
            ) : (
              <span>Send Reset Link</span>
            )}
          </button>

          <div className="mt-6 border-t border-[#E2E8F0] pt-4 text-center dark:border-slate-800">
            <Link
              href="/login"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#64748B] hover:text-[#111827] dark:hover:text-white transition"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Back to Sign In</span>
            </Link>
          </div>
        </form>
      )}
    </motion.div>
  );
}

export default function ForgotPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[300px] items-center justify-center">
          <LoadingThreeDotsJumping
            color="#6D3DF5"
            label="Loading password recovery form"
          />
        </div>
      }
    >
      <ForgotPasswordContent />
    </Suspense>
  );
}
