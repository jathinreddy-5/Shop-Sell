'use client';

import React from 'react';
import { MapPin, Plus } from 'lucide-react';

export default function AccountAddressesPage() {
  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">
            Saved Delivery Addresses
          </h2>
          <button className="flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-700">
            <Plus className="h-4 w-4" /> Add Address
          </button>
        </div>
        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 flex items-start gap-3">
          <MapPin className="h-5 w-5 text-indigo-600 mt-0.5" />
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-slate-900 dark:text-white">Home</span>
              <span className="rounded bg-indigo-50 dark:bg-indigo-950 px-2 py-0.5 text-[10px] font-semibold text-indigo-600">
                Default
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Flat 402, Sunshine Heights, 100 Feet Road, Indiranagar, Bangalore, Karnataka - 560038
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
