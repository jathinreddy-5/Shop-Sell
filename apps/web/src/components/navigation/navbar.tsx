'use client';

import React from 'react';
import Link from 'next/link';
import { ShoppingBag, Heart, Search, Store, User } from 'lucide-react';
import { useAuth } from '@/lib/auth/auth-context';
import { useCart } from '@/lib/cart/cart-context';
import { SearchAutocomplete } from './search-autocomplete';
import { LiquidNav } from '@/components/liquid-nav';
import { BrandIcon } from '@/components/brand/brand-icon';

export function Navbar() {
  const { user, isSeller } = useAuth();
  const { cartCount } = useCart();

  return (
    <header className="sticky top-0 z-50 w-full border-b border-slate-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60 dark:border-slate-800 dark:bg-slate-900/90">

      {/* Main Nav */}
      <div className="container mx-auto flex h-16 items-center justify-between gap-4 px-4">
        {/* Brand */}
        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-[#047857] to-[#10B981] shadow-md shadow-emerald-900/20">
            <BrandIcon className="h-6 w-6" />
          </div>
          <span className="text-xl font-black tracking-tight text-slate-900 dark:text-white">
            Shop<span className="text-[#059669] dark:text-emerald-400">:</span>Sell
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
                badge: cartCount,
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
            {cartCount > 0 && (
              <span className="absolute 0 top-0.5 right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#059669] px-1 text-[10px] font-bold text-white shadow-sm">
                {cartCount}
              </span>
            )}
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
