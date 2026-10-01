'use client';

import React from 'react';
import { Heart, ShoppingBag } from 'lucide-react';
import Link from 'next/link';

export default function AccountWishlistPage() {
  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900 shadow-sm">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4">
          Saved in Wishlist
        </h2>
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-rose-50 dark:bg-rose-950/40 text-rose-500 mb-3">
            <Heart className="h-6 w-6" />
          </div>
          <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">
            Your Wishlist is Empty
          </h3>
          <p className="text-xs text-slate-500 max-w-xs mt-1 mb-4">
            Explore the latest artisanal and curated marketplace products and tap the heart icon to save items.
          </p>
          <Link
            href="/"
            className="flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white hover:bg-slate-800 dark:bg-white dark:text-slate-900"
          >
            <ShoppingBag className="h-4 w-4" /> Start Shopping
          </Link>
        </div>
      </div>
    </div>
  );
}
