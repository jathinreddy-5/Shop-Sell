'use client';

import React, { useEffect } from 'react';
import * as Sentry from '@sentry/nextjs';
import Link from 'next/link';
import { AlertCircle, RotateCcw, Home } from 'lucide-react';

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Automatically capture and send error to Sentry
    Sentry.captureException(error);
  }, [error]);

  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center p-6 text-center">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400 border border-red-200 dark:border-red-900/60 shadow-lg shadow-red-500/10 mb-6">
        <AlertCircle className="h-8 w-8" />
      </div>

      <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
        Something went wrong
      </h1>
      <p className="mt-2 text-sm text-slate-500 dark:text-slate-400 max-w-md leading-relaxed">
        An unexpected error occurred while loading this page. Our technical team has been notified via automated telemetry.
      </p>

      {error?.digest && (
        <span className="mt-2 rounded-lg bg-slate-100 px-2.5 py-1 text-[11px] font-mono text-slate-500 dark:bg-slate-800 dark:text-slate-400">
          Error ID: {error.digest}
        </span>
      )}

      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          onClick={() => reset()}
          className="inline-flex items-center gap-2 rounded-2xl bg-[#059669] px-6 py-3 text-xs font-bold text-white shadow-md shadow-emerald-950/20 hover:bg-[#047857] transition"
        >
          <RotateCcw className="h-4 w-4" />
          <span>Try again</span>
        </button>

        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-6 py-3 text-xs font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 transition"
        >
          <Home className="h-4 w-4" />
          <span>Back to Home</span>
        </Link>
      </div>
    </div>
  );
}
