'use client';

import React, { useEffect } from 'react';
import * as Sentry from '@sentry/nextjs';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="en">
      <body className="flex min-h-screen flex-col items-center justify-center bg-slate-50 p-6 text-center text-slate-900 font-sans">
        <div className="max-w-md rounded-3xl bg-white p-8 shadow-xl border border-slate-200">
          <h2 className="text-2xl font-bold text-slate-900">Application Error</h2>
          <p className="mt-2 text-sm text-slate-600">
            A critical system error occurred. Sentry telemetry has captured the error trace.
          </p>
          <div className="mt-6 flex justify-center gap-3">
            <button
              type="button"
              onClick={() => reset()}
              className="rounded-2xl bg-[#059669] px-6 py-2.5 text-xs font-bold text-white shadow-md hover:bg-[#047857] transition"
            >
              Reload Application
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
