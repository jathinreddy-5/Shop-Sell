'use client';

import React from 'react';
import { User, Package, MapPin, Heart } from 'lucide-react';
import { useAuth } from '@/lib/auth/auth-context';
import { LiquidNav, LiquidNavItem } from '@/components/liquid-nav';

const accountNavItems: LiquidNavItem[] = [
  { id: 'profile', label: 'Profile', href: '/account', icon: User },
  { id: 'orders', label: 'Orders', href: '/account/orders', icon: Package },
  { id: 'addresses', label: 'Addresses', href: '/account/addresses', icon: MapPin },
  { id: 'wishlist', label: 'Wishlist', href: '/account/wishlist', icon: Heart },
];

export default function AccountLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user } = useAuth();

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl space-y-8">
      {/* Account Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-6 dark:border-slate-800">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
            My Account
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Manage your personal profile, order history, addresses, and wishlist.
          </p>
        </div>
        <div className="flex items-center gap-3 bg-slate-100 dark:bg-slate-900 px-3.5 py-2 rounded-xl">
          <div className="h-8 w-8 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-xs uppercase">
            {user?.email?.charAt(0) || 'G'}
          </div>
          <div className="text-xs">
            <span className="font-semibold block text-slate-900 dark:text-white">
              {user?.email || 'Guest User'}
            </span>
            <span className="text-slate-500 uppercase tracking-wider text-[10px]">
              {user?.roles?.join(', ') || 'Customer'}
            </span>
          </div>
        </div>
      </div>

      {/* Account Tab Strip: LiquidNav Top Variant */}
      <div className="flex justify-center sm:justify-start">
        <LiquidNav
          variant="top"
          ariaLabel="Account Sections"
          items={accountNavItems}
          className="max-w-md w-full"
        />
      </div>

      {/* Active Tab Page Content */}
      <div className="pt-2">{children}</div>
    </div>
  );
}
