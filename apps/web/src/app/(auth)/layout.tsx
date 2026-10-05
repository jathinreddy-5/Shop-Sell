import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Sparkles, ShieldCheck } from 'lucide-react';
import { BrandIcon } from '@/components/brand/brand-icon';

export const metadata = {
  title: 'Authentication | Shop:Sell Marketplace',
  description: 'Sign in, create an account, or verify your identity on Shop:Sell.',
};

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="grid min-h-screen w-full lg:grid-cols-2 bg-[#F8FAFC] text-[#111827] antialiased">
      {/* LEFT SIDE: Shop:Sell Marketplace Brand & Lifestyle Visual (Desktop only) */}
      <aside
        aria-label="Shop:Sell Marketplace Story"
        className="relative hidden lg:flex min-h-screen flex-col justify-between overflow-hidden bg-[#111827] p-8 lg:p-12 select-none"
      >
        {/* Background Visual with next/image priority */}
        <div className="absolute inset-0 z-0">
          <Image
            src="/images/auth/marketplace-hero.jpg"
            alt="Shopper browsing boutique goods at Shop:Sell multi-vendor marketplace"
            fill
            priority
            sizes="50vw"
            className="object-cover object-center filter brightness-[0.88] transition-transform duration-1000 ease-out hover:scale-105"
          />
          {/* Subtle emerald gradient & dark navy overlay with warm yellow glow */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#111827] via-[#111827]/60 to-[#047857]/25 mix-blend-multiply" />
          <div className="absolute inset-0 bg-radial-gradient from-transparent via-[#111827]/40 to-[#111827]/85" />
          <div className="absolute top-1/4 -left-12 h-64 w-64 rounded-full bg-[#FFE500]/10 blur-3xl pointer-events-none" />
          <div className="absolute bottom-1/3 -right-12 h-80 w-80 rounded-full bg-[#10B981]/15 blur-3xl pointer-events-none" />
        </div>

        {/* Top Header: Brand Tag */}
        <div className="relative z-10">
          <Link
            href="/"
            className="inline-flex items-center gap-2.5 rounded-2xl bg-white/10 px-4 py-2 backdrop-blur-md transition hover:bg-white/15"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-tr from-[#047857] to-[#10B981] shadow-md shadow-emerald-900/20">
              <BrandIcon className="h-5 w-5" />
            </div>
            <span className="text-lg font-black tracking-tight text-white">
              Shop<span className="text-[#FFE500]">:</span>Sell
            </span>
            <span className="ml-1 rounded-full bg-[#FFE500]/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#FFE500]">
              Marketplace
            </span>
          </Link>
        </div>

        {/* Bottom Banner: Editorial Headline & Marketplace Statement */}
        <div className="relative z-10 max-w-lg space-y-4">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold text-slate-200 backdrop-blur-md">
            <Sparkles className="h-3.5 w-3.5 text-[#FFE500]" />
            <span>Curated Artisans & Enterprise Stores</span>
          </div>

          <h2 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl leading-tight">
            Discover. Shop. <span className="text-[#FFE500]">Sell.</span>
          </h2>

          <p className="text-sm font-normal text-slate-300 leading-relaxed">
            One unified marketplace connecting discerning shoppers with verified independent
            sellers, direct artisans, and flagship brands across the country.
          </p>

          <div className="flex items-center gap-6 pt-2 text-xs text-slate-400">
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="h-4 w-4 text-emerald-400" />
              <span>Verified Sellers</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-[#FFE500]" />
              <span>Instant Payouts</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              <span>Zero-Egress Security</span>
            </div>
          </div>
        </div>
      </aside>

      {/* RIGHT SIDE: Dedicated Clean Auth Surface (No Role Switchers, No Application Header) */}
      <main className="relative z-10 flex min-h-screen w-full flex-col items-center justify-center p-4 sm:p-8 lg:p-12 overflow-y-auto">
        <div className="w-full max-w-[480px]">
          {/* Mobile Top Brand (visible on small screens where left sidebar is hidden) */}
          <div className="mb-6 flex justify-center lg:hidden">
            <Link href="/" className="inline-flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-[#047857] to-[#10B981] shadow-md shadow-emerald-900/20">
                <BrandIcon className="h-5.5 w-5.5" />
              </div>
              <span className="text-xl font-black tracking-tight text-[#111827] dark:text-white">
                Shop<span className="text-[#059669]">:</span>Sell
              </span>
            </Link>
          </div>

          {/* Child Auth Page Form (Login, Signup, OTP, Forgot Password, Reset Password) */}
          {children}
        </div>
      </main>
    </div>
  );
}
