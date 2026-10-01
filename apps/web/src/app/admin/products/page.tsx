'use client';

import React from 'react';
import { PackageCheck, CheckCircle2 } from 'lucide-react';

export default function AdminProductsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
          Product Moderation
        </h1>
        <p className="text-xs text-slate-500">
          Review and approve newly submitted seller catalog listings.
        </p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900 shadow-sm">
        <div className="flex items-center gap-3">
          <PackageCheck className="h-6 w-6 text-purple-600" />
          <div>
            <span className="block text-sm font-bold text-slate-800 dark:text-slate-200">
              Listing Queue
            </span>
            <span className="text-xs text-slate-400">All current products approved.</span>
          </div>
        </div>
      </div>
    </div>
  );
}
