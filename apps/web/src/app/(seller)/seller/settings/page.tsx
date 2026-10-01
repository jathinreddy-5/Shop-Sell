'use client';

import React from 'react';
import { Settings, Store } from 'lucide-react';

export default function SellerSettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
          Store Settings
        </h1>
        <p className="text-xs text-slate-500">
          Configure business details, GSTIN, and notification preferences.
        </p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900 shadow-sm space-y-4">
        <div className="flex items-center gap-3">
          <Store className="h-5 w-5 text-emerald-600" />
          <div>
            <span className="block text-sm font-bold text-slate-800 dark:text-slate-200">
              Apex Tech India
            </span>
            <span className="text-xs text-slate-400">GSTIN: 29AAAAA0000A1Z5</span>
          </div>
        </div>
      </div>
    </div>
  );
}
