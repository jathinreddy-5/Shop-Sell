'use client';

import React from 'react';
import { Home, Search, ShoppingBag, Package, User } from 'lucide-react';
import { useAuth } from '@/lib/auth/auth-context';
import { LiquidNav } from '@/components/liquid-nav';

export function CustomerMobileNav() {
  const { user } = useAuth();

  const mobileNavItems = [
    {
      id: 'home',
      label: 'Home',
      href: '/',
      icon: Home,
    },
    {
      id: 'search',
      label: 'Search',
      href: '/search',
      icon: Search,
    },
    {
      id: 'cart',
      label: 'Cart',
      href: '/cart',
      icon: ShoppingBag,
      badge: 0,
    },
    {
      id: 'orders',
      label: 'Orders',
      href: '/orders',
      icon: Package,
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
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-transparent pointer-events-auto">
      <div className="max-w-md mx-auto px-3 pb-2 pt-1">
        <LiquidNav
          variant="bottom"
          ariaLabel="Mobile Navigation"
          items={mobileNavItems}
        />
      </div>
    </div>
  );
}
