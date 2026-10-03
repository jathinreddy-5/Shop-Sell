'use client';

import React from 'react';
import Link from 'next/link';
import {
  ShieldAlert,
  UserCheck,
  PackageCheck,
  FolderTree,
  ArrowLeft,
  Shield,
  CheckCircle2,
  History,
  KeyRound,
  PowerOff,
} from 'lucide-react';
import { useAuth } from '@/lib/auth/auth-context';
import { LiquidNav, LiquidNavItem } from '@/components/liquid-nav';

const adminNavItems: LiquidNavItem[] = [
  { id: 'overview', label: 'Overview', href: '/admin', icon: UserCheck },
  { id: 'approvals', label: 'Approvals', href: '/admin/approvals', icon: CheckCircle2 },
  { id: 'audit', label: 'Audit Trail', href: '/admin/audit', icon: History },
  { id: 'governance', label: 'Governance', href: '/admin/governance', icon: KeyRound },
  { id: 'kill-switches', label: 'Kill Switches', href: '/admin/kill-switches', icon: PowerOff },
  { id: 'products', label: 'Products', href: '/admin/products', icon: PackageCheck },
  { id: 'categories', label: 'Categories', href: '/admin/categories', icon: FolderTree },
  { id: 'disputes', label: 'Disputes', href: '/admin/disputes', icon: ShieldAlert },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isAdmin, loginAsDevRole } = useAuth();

  return (
    <div className="flex min-h-screen bg-slate-100 dark:bg-slate-950">
      {/* Desktop Sidebar with LiquidNav Side Variant */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden md:flex w-24 flex-col items-center border-r border-slate-800 bg-zinc-950 py-4">
        <Link href="/admin" className="mb-4 flex flex-col items-center gap-1" title="Admin Console">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-600 text-white shadow-md shadow-purple-500/20">
            <Shield className="h-5 w-5" />
          </div>
          <span className="text-[10px] font-bold text-white tracking-wider">ADMIN</span>
        </Link>

        {/* Liquid Notch Side Rail */}
        <div className="flex-1 w-full flex items-center justify-center">
          <LiquidNav
            variant="side"
            ariaLabel="Admin Navigation Rail"
            items={adminNavItems}
            className="h-[360px]"
          />
        </div>

        <div className="mt-auto flex flex-col items-center gap-3 pt-2">
          {!isAdmin && (
            <button
              onClick={() => loginAsDevRole('admin')}
              className="rounded bg-purple-500/20 p-2 text-[10px] font-bold text-purple-400 hover:bg-purple-500/30"
              title="Switch to Admin Role"
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
            ariaLabel="Admin Mobile Navigation"
            items={adminNavItems}
          />
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 md:ml-24 flex flex-col pb-24 md:pb-8">
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-slate-200 bg-white/90 px-6 backdrop-blur dark:border-slate-800 dark:bg-slate-900/90">
          <div className="text-xs font-medium text-slate-500">
            Platform Operations: <strong className="text-slate-800 dark:text-slate-200">Shop:Sell Superadmin</strong>
          </div>
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center rounded-full bg-purple-100 px-2.5 py-0.5 text-xs font-semibold text-purple-800 dark:bg-purple-950 dark:text-purple-300">
              Role: Admin
            </span>
          </div>
        </header>
        <main className="flex-1 p-6 md:p-8">{children}</main>
      </div>
    </div>
  );
}
