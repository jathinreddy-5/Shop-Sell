'use client';

import React from 'react';
import { ShoppingCart, Clock, CheckCircle2 } from 'lucide-react';

export default function SellerOrdersPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
          Orders & Fulfilment
        </h1>
        <p className="text-xs text-slate-500">
          Manage incoming marketplace customer orders and shipments.
        </p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900 shadow-sm">
        <div className="flex items-center justify-between p-4 rounded-xl border border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600">
              <ShoppingCart className="h-5 w-5" />
            </div>
            <div>
              <span className="block text-sm font-bold text-slate-800 dark:text-slate-200">
                Order #ORD-77123-IN
              </span>
              <span className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                <Clock className="h-3 w-3" /> Ready for dispatch
              </span>
            </div>
          </div>
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400">
            <CheckCircle2 className="h-3 w-3" /> Paid
          </span>
        </div>
      </div>
    </div>
  );
}
