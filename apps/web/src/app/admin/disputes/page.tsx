'use client';

import React from 'react';
import { ShieldAlert } from 'lucide-react';

export default function AdminDisputesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
          Disputes & Refunds
        </h1>
        <p className="text-xs text-slate-500">
          Mediate customer-seller escalations and process razorpay refunds.
        </p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900 shadow-sm">
        <div className="flex items-center gap-3">
          <ShieldAlert className="h-6 w-6 text-purple-600" />
          <div>
            <span className="block text-sm font-bold text-slate-800 dark:text-slate-200">
              Dispute Resolution Queue
            </span>
            <span className="text-xs text-slate-400">0 open customer disputes pending.</span>
          </div>
        </div>
      </div>
    </div>
  );
}
