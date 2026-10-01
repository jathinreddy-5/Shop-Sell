'use client';

import React from 'react';
import Link from 'next/link';
import { ShoppingBag, Heart, Search, Store, Shield, User, LogOut } from 'lucide-react';
import { useAuth } from '@/lib/auth/auth-context';
import { SearchAutocomplete } from './search-autocomplete';
import { LiquidNav } from '@/components/liquid-nav';

export function Navbar() {
  const { user, isCustomer, isSeller, isAdmin, loginAsDevRole, logout } = useAuth();

  return (
    <header className="sticky top-0 z-50 w-full border-b border-slate-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60 dark:border-slate-800 dark:bg-slate-900/90">
      {/* Dev Role Quick Switcher Banner */}
      <div className="bg-slate-900 px-4 py-1.5 text-xs text-white">
        <div className="container mx-auto flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-emerald-400">Current Role:</span>
            <span className="rounded bg-slate-800 px-2 py-0.5 font-mono uppercase tracking-wider text-slate-200">
              {user ? user.roles.join(' + ') : 'Guest / Customer'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-slate-400">Switch Identity:</span>
            <button
              onClick={() => loginAsDevRole('customer')}
              className="rounded bg-slate-800 px-2 py-0.5 transition hover:bg-slate-700 hover:text-white"
            >
              Customer
            </button>
            <button
              onClick={() => loginAsDevRole('owner')}
              className="rounded bg-emerald-700 px-2 py-0.5 font-medium text-white transition hover:bg-emerald-600"
            >
              Seller / Owner
            </button>
            <button
              onClick={() => loginAsDevRole('admin')}
              className="rounded bg-purple-700 px-2 py-0.5 font-medium text-white transition hover:bg-purple-600"
            >
              Admin
            </button>
            {user && (
              <button
                onClick={logout}
                className="ml-2 flex items-center gap-1 text-slate-400 hover:text-rose-400"
                title="Logout"
              >
                <LogOut className="h-3 w-3" />
                Reset
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Nav */}
      <div className="container mx-auto flex h-16 items-center justify-between gap-4 px-4">
        {/* Brand */}
        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-600 text-xl font-bold text-white shadow-md shadow-indigo-500/20">
            S
          </div>
          <span className="text-xl font-black tracking-tight text-slate-900 dark:text-white">
            Shop<span className="text-indigo-600">:</span>Sell
          </span>
        </Link>

        {/* Search Bar Input with Autocomplete */}
        <SearchAutocomplete />

        {/* Right Action Icons: LiquidNav Top Variant */}
        <div className="hidden md:flex items-center">
          <LiquidNav
            variant="top"
            ariaLabel="Header Actions"
            className="w-auto min-w-[280px]"
            items={[
              ...(!isSeller
                ? [
                    {
                      id: 'become-a-seller',
                      label: 'Seller',
                      href: '/become-a-seller',
                      icon: Store,
                    },
                  ]
                : []),
              {
                id: 'wishlist',
                label: 'Wishlist',
                href: '/account/wishlist',
                icon: Heart,
              },
              {
                id: 'cart',
                label: 'Cart',
                href: '/cart',
                icon: ShoppingBag,
                badge: 0,
              },
              {
                id: 'account',
                label: user ? 'Account' : 'Login',
                href: user ? '/account' : '/login',
                icon: User,
                avatarUrl: user
                  ? 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&q=80'
                  : null,
              },
            ]}
          />
        </div>

        {/* Mobile Header Quick Actions */}
        <div className="flex items-center gap-2 md:hidden">
          <Link
            href="/cart"
            className="relative rounded-full p-2 text-slate-700 dark:text-slate-200"
            aria-label="Cart"
          >
            <ShoppingBag className="h-5 w-5" />
          </Link>
          <Link
            href={user ? '/account' : '/login'}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-200 text-slate-800 dark:bg-slate-800 dark:text-slate-100"
            aria-label="Account"
          >
            <User className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </header>
  );
}
