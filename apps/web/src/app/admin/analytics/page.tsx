'use client';

import React from 'react';
import { FileSpreadsheet } from 'lucide-react';

export default function AdminAnalyticsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
          Audit Logs & Platform Analytics
        </h1>
        <p className="text-xs text-slate-500">
          Immutable audit logs of administrative actions, payouts, and system metrics.
        </p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900 shadow-sm">
        <div className="flex items-center gap-3">
          <FileSpreadsheet className="h-6 w-6 text-purple-600" />
          <div>
            <span className="block text-sm font-bold text-slate-800 dark:text-slate-200">
              Activity Stream
            </span>
            <span className="text-xs text-slate-400">All services operating normally.</span>
          </div>
        </div>
      </div>
    </div>
  );
}
