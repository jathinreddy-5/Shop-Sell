'use client';

import React from 'react';
import { CreditCard, ArrowUpRight } from 'lucide-react';

export default function SellerPayoutsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
          Payouts & Balance
        </h1>
        <p className="text-xs text-slate-500">
          Track escrow settlements and payout distributions.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <CreditCard className="h-5 w-5 text-emerald-600" />
            <span className="text-xs font-semibold text-slate-400">Available Payout Balance</span>
          </div>
          <div className="text-3xl font-black text-slate-900 dark:text-white">
            ₹34,850.00
          </div>
          <span className="inline-flex items-center gap-1 text-xs text-emerald-600 font-semibold mt-2">
            <ArrowUpRight className="h-3 w-3" /> Scheduled for Friday auto-transfer
          </span>
        </div>
      </div>
    </div>
  );
}
