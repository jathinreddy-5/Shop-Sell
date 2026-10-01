import React from 'react';
import { Navbar } from '@/components/navigation/navbar';
import { CustomerMobileNav } from '@/components/navigation/customer-mobile-nav';

export default function CustomerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-slate-50 dark:bg-slate-950">
      <Navbar />
      <main className="flex-1 pb-24 md:pb-0">{children}</main>
      <CustomerMobileNav />
      <footer className="border-t border-slate-200 bg-white py-8 text-center text-xs text-slate-500 dark:border-slate-800 dark:bg-slate-900 pb-28 md:pb-8">
        <div className="container mx-auto px-4">
          <p className="font-medium text-slate-700 dark:text-slate-300">
            Shop:Sell — Production Multi-Vendor Marketplace Platform
          </p>
          <p className="mt-1">
            Built with Next.js App Router, NestJS, Supabase (pgvector, RLS), Typesense & Redis
          </p>
        </div>
      </footer>
    </div>
  );
}
