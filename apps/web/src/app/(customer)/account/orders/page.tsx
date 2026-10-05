'use client';

import React from 'react';
import { Package, Clock, CheckCircle2 } from 'lucide-react';
import { useAuth } from '@/lib/auth/auth-context';
import { LoadingThreeDotsJumping } from '@/components/loading';

export default function AccountOrdersPage() {
  const { isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex min-h-[240px] items-center justify-center rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900 shadow-sm">
        <LoadingThreeDotsJumping label="Loading orders" />
      </div>
    );
  }
  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900 shadow-sm">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4">
          Recent Orders
        </h2>
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl border border-slate-100 dark:border-slate-800 gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-[#059669]">
                <Package className="h-6 w-6" />
              </div>
              <div>
                <span className="block text-sm font-bold text-slate-800 dark:text-slate-200">
                  Order #ORD-98214-IN
                </span>
                <span className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                  <Clock className="h-3 w-3" /> Placed today at 2:15 PM
                </span>
              </div>
            </div>
            <div className="flex items-center justify-between sm:justify-end gap-4">
              <span className="text-sm font-black text-slate-900 dark:text-white">
                ₹4,897
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400">
                <CheckCircle2 className="h-3 w-3" /> Confirmed
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
