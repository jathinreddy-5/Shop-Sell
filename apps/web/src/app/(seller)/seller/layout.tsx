'use client';

import React from 'react';
import Link from 'next/link';
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  CreditCard,
  Settings,
  ArrowLeft,
  Store,
  Lock,
} from 'lucide-react';
import { useAuth } from '@/lib/auth/auth-context';
import { LiquidNav, LiquidNavItem } from '@/components/liquid-nav';
import { LoadingThreeDotsJumping } from '@/components/loading';

const sellerNavItems: LiquidNavItem[] = [
  { id: 'dashboard', label: 'Dashboard', href: '/seller', icon: LayoutDashboard },
  { id: 'products', label: 'Products', href: '/seller/products', icon: Package },
  { id: 'orders', label: 'Orders', href: '/seller/orders', icon: ShoppingCart },
  { id: 'payouts', label: 'Payouts', href: '/seller/payouts', icon: CreditCard },
  { id: 'settings', label: 'Settings', href: '/seller/settings', icon: Settings },
];

export default function SellerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isSeller, isLoading, user } = useAuth();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-slate-950">
        <LoadingThreeDotsJumping label="Verifying merchant authorization" />
      </div>
    );
  }

  // Strict enforcement: Without admin approval, dashboard is locked and inactive
  if (!isSeller) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 dark:bg-slate-950 px-4 py-12">
        <div className="max-w-md w-full rounded-3xl border border-amber-200 bg-white p-8 text-center shadow-lg dark:border-amber-900/50 dark:bg-slate-900 space-y-5">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-100 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400">
            <Lock className="h-8 w-8" />
          </div>
          <div className="space-y-2">
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">
              Seller Dashboard Inactive
            </h1>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Your merchant account is not yet active. Under Shop:Sell compliance policy, the Seller Dashboard is only unlocked after your KYC documents (PAN, GSTIN, Bank details, ID proof) are reviewed and approved by the administration team.
            </p>
          </div>
          <div className="flex flex-col gap-2.5 pt-2">
            <Link
              href="/become-a-seller"
              className="w-full rounded-2xl bg-[#6D3DF5] py-3 text-xs font-bold text-white shadow-md shadow-[#6D3DF5]/20 hover:bg-[#5B2FE0] transition text-center"
            >
              Submit or View Seller Application
            </Link>
            <Link
              href="/"
              className="w-full rounded-2xl border border-slate-200 py-3 text-xs font-bold text-slate-700 hover:bg-slate-50 transition dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 text-center"
            >
              Return to Marketplace
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-slate-100 dark:bg-slate-950">
      {/* Desktop Sidebar with LiquidNav Side Variant */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden md:flex w-24 flex-col items-center border-r border-slate-800 bg-zinc-950 py-4">
        <Link href="/seller" className="mb-4 flex flex-col items-center gap-1" title="Seller Hub">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-md shadow-emerald-500/20">
            <Store className="h-5 w-5" />
          </div>
          <span className="text-[10px] font-bold text-white tracking-wider">SELLER</span>
        </Link>

        {/* Liquid Notch Side Rail */}
        <div className="flex-1 w-full flex items-center justify-center">
          <LiquidNav
            variant="side"
            ariaLabel="Seller Navigation Rail"
            items={sellerNavItems}
            className="h-[360px]"
          />
        </div>

        <div className="mt-auto flex flex-col items-center gap-3 pt-2">
          <Link
            href="/"
            className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 hover:bg-zinc-800 hover:text-white"
            title="Return to Marketplace"
            aria-label="Return to Marketplace"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </div>
      </aside>

      {/* Mobile Bottom Bar with LiquidNav Bottom Variant */}
      <div className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-transparent pointer-events-auto">
        <div className="max-w-md mx-auto px-3 pb-2 pt-1">
          <LiquidNav
            variant="bottom"
            ariaLabel="Seller Mobile Navigation"
            items={sellerNavItems}
          />
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 md:ml-24 flex flex-col pb-24 md:pb-8">
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-slate-200 bg-white/90 px-6 backdrop-blur dark:border-slate-800 dark:bg-slate-900/90">
          <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
            <span>Store: <strong className="text-slate-800 dark:text-slate-200">Apex Tech India</strong></span>
            {user?.email && (
              <span className="rounded-md bg-slate-100 px-2 py-0.5 font-mono text-[11px] text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                {user.email}
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              Admin Approved • Active
            </span>
          </div>
        </header>
        <main className="flex-1 p-6 md:p-8">{children}</main>
      </div>
    </div>
  );
}
