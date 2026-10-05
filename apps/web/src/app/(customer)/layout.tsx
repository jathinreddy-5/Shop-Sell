import React from 'react';
import Link from 'next/link';
import { Navbar } from '@/components/navigation/navbar';
import { CustomerMobileNav } from '@/components/navigation/customer-mobile-nav';
import { OnboardingProvider } from '@/components/onboarding/onboarding-provider';

export default function CustomerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <OnboardingProvider>
      <div className="flex min-h-screen flex-col bg-[#FBFBFA] dark:bg-stone-950">
        <Navbar />
        <main className="flex-1 pb-24 md:pb-0">{children}</main>
        <CustomerMobileNav />
        <footer className="border-t border-[#E5E7EB] bg-white py-8 text-center text-xs text-stone-500 dark:border-stone-800 dark:bg-stone-900 pb-28 md:pb-8">
          <div className="container mx-auto px-4">
            <p className="font-medium text-stone-700 dark:text-stone-300">
              Shop:Sell — Production Multi-Vendor Marketplace Platform
            </p>
            <div className="mt-3 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs font-semibold text-stone-600 dark:text-stone-400">
              <Link
                href="/terms"
                className="text-[#059669] hover:text-[#047857] hover:underline transition dark:text-emerald-400"
              >
                Terms and Conditions
              </Link>
              <span className="text-slate-300 dark:text-slate-700">•</span>
              <Link href="/terms#privacy" className="hover:text-[#059669] transition">
                Privacy Policy
              </Link>
              <span className="text-slate-300 dark:text-slate-700">•</span>
              <Link href="/terms#refunds" className="hover:text-[#059669] transition">
                Return & Refund Policy
              </Link>
              <span className="text-slate-300 dark:text-slate-700">•</span>
              <Link href="/terms#shipping" className="hover:text-[#059669] transition">
                Shipping Policy
              </Link>
              <span className="text-slate-300 dark:text-slate-700">•</span>
              <Link href="/terms#grievance" className="hover:text-[#059669] transition">
                Grievance Officer
              </Link>
            </div>
            <p className="mt-4 text-[11px] text-slate-400">
              © {new Date().getFullYear()} Shop:Sell Marketplace Inc. All rights reserved.
            </p>
          </div>
        </footer>
      </div>
    </OnboardingProvider>
  );
}
