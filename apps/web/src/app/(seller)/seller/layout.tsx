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
} from 'lucide-react';
import { useAuth } from '@/lib/auth/auth-context';
import { LiquidNav, LiquidNavItem } from '@/components/liquid-nav';

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
  const { isSeller, loginAsDevRole } = useAuth();

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
          {!isSeller && (
            <button
              onClick={() => loginAsDevRole('owner')}
              className="rounded bg-amber-500/20 p-2 text-[10px] font-bold text-amber-400 hover:bg-amber-500/30"
              title="Switch to Seller Role"
            >
              Dev Role
            </button>
          )}
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
          <div className="text-xs font-medium text-slate-500">
            Store: <strong className="text-slate-800 dark:text-slate-200">Apex Tech India</strong>
          </div>
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
              Status: Active
            </span>
          </div>
        </header>
        <main className="flex-1 p-6 md:p-8">{children}</main>
      </div>
    </div>
  );
}
