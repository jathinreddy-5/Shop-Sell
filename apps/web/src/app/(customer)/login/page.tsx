'use client';

import React, { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ShieldCheck, Mail, ArrowRight, UserCheck, Store, Shield } from 'lucide-react';
import { useAuth } from '@/lib/auth/auth-context';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectUrl = searchParams.get('redirect') || '/';

  const [email, setEmail] = useState('');
  const [isOtpSent, setIsOtpSent] = useState(false);
  const [otp, setOtp] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const setAuthCookiesAndRedirect = (role: 'customer' | 'owner' | 'admin', target: string) => {
    const roles = role === 'owner' ? ['customer', 'owner'] : [role];
    const mockToken = `dev_jwt_token_${role}_${Date.now()}`;

    // Set cookies for middleware
    document.cookie = `shopsell_token=${mockToken}; path=/; max-age=86400`;
    document.cookie = `shopsell_roles=${JSON.stringify(roles)}; path=/; max-age=86400`;

    // Persist in localStorage
    localStorage.setItem('shopsell_token', mockToken);
    localStorage.setItem(
      'shopsell_user',
      JSON.stringify({
        sub: `user-${role}-001`,
        email: `${role}@shopsell.dev`,
        roles,
        user_metadata: { full_name: `${role.toUpperCase()} User` },
      })
    );

    router.push(target);
  };

  const handleSendOtp = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setIsSubmitting(true);
    setTimeout(() => {
      setIsOtpSent(true);
      setIsSubmitting(false);
    }, 400);
  };

  const handleVerifyOtp = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setTimeout(() => {
      setAuthCookiesAndRedirect('customer', redirectUrl);
    }, 400);
  };

  return (
    <div className="container mx-auto flex min-h-[calc(100vh-14rem)] max-w-md items-center justify-center px-4 py-12">
      <div className="w-full space-y-6 rounded-3xl border border-slate-200 bg-white p-8 shadow-xl dark:border-slate-800 dark:bg-slate-900">
        <div className="text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Welcome to Shop:Sell
          </h1>
          <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">
            Sign in to access your orders, store dashboard, or platform administration.
          </p>
        </div>

        {/* Regular OTP / Email Auth */}
        {!isOtpSent ? (
          <form onSubmit={handleSendOtp} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Email Address
              </label>
              <div className="relative mt-1">
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full rounded-xl border border-slate-200 py-2.5 pl-10 pr-4 text-sm outline-none transition focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 dark:border-slate-700 dark:bg-slate-800"
                />
                <Mail className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 py-2.5 text-sm font-semibold text-white shadow-md shadow-indigo-600/20 transition hover:bg-indigo-700 disabled:opacity-50"
            >
              <span>{isSubmitting ? 'Sending OTP...' : 'Send Magic OTP'}</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyOtp} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Enter 6-Digit OTP
              </label>
              <input
                type="text"
                required
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                placeholder="123456"
                className="mt-1 w-full rounded-xl border border-slate-200 py-2.5 text-center text-lg font-bold tracking-widest outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 dark:border-slate-700 dark:bg-slate-800"
              />
              <p className="mt-1 text-center text-xs text-slate-400">
                Code sent to {email}. (Enter any 6 digits in demo mode)
              </p>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-xl bg-indigo-600 py-2.5 text-sm font-semibold text-white shadow-md shadow-indigo-600/20 transition hover:bg-indigo-700 disabled:opacity-50"
            >
              {isSubmitting ? 'Verifying...' : 'Verify & Continue'}
            </button>
          </form>
        )}

        {/* Quick Role Switch / Development Profiles */}
        <div className="border-t border-slate-100 pt-6 dark:border-slate-800">
          <p className="mb-3 text-center text-xs font-bold uppercase tracking-wider text-slate-400">
            Quick Role Logins
          </p>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => setAuthCookiesAndRedirect('customer', redirectUrl)}
              className="flex flex-col items-center gap-1.5 rounded-xl border border-slate-200 p-2.5 text-center transition hover:border-indigo-600 hover:bg-indigo-50/50 dark:border-slate-800 dark:hover:bg-slate-800"
            >
              <UserCheck className="h-4 w-4 text-emerald-600" />
              <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                Customer
              </span>
            </button>

            <button
              type="button"
              onClick={() => setAuthCookiesAndRedirect('owner', '/seller')}
              className="flex flex-col items-center gap-1.5 rounded-xl border border-slate-200 p-2.5 text-center transition hover:border-indigo-600 hover:bg-indigo-50/50 dark:border-slate-800 dark:hover:bg-slate-800"
            >
              <Store className="h-4 w-4 text-amber-600" />
              <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                Seller
              </span>
            </button>

            <button
              type="button"
              onClick={() => setAuthCookiesAndRedirect('admin', '/admin')}
              className="flex flex-col items-center gap-1.5 rounded-xl border border-slate-200 p-2.5 text-center transition hover:border-indigo-600 hover:bg-indigo-50/50 dark:border-slate-800 dark:hover:bg-slate-800"
            >
              <Shield className="h-4 w-4 text-indigo-600" />
              <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                Admin
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[50vh] items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
