'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  CreditCard,
  ShieldCheck,
  CheckCircle2,
  ArrowRight,
  Package,
  MapPin,
} from 'lucide-react';
import { useAuth } from '@/lib/auth/auth-context';
import { LoadingThreeDotsJumping } from '@/components/loading';

export default function CheckoutPage() {
  const { user } = useAuth();
  const [shippingAddress, setShippingAddress] = useState({
    full_name: 'Priya Sharma',
    phone: '9876543210',
    street: 'Flat 402, Green Glen Layout, Bellandur',
    city: 'Bengaluru',
    state: 'Karnataka',
    postal_code: '560103',
    country: 'India',
  });

  const [isProcessing, setIsProcessing] = useState(false);
  const [completedOrder, setCompletedOrder] = useState<{
    orderId: string;
    total: number;
  } | null>(null);

  const handleRazorpayPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);

    const idempotencyKey = `idemp_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    // Simulate backend call to /api/orders & Razorpay signature verification
    setTimeout(() => {
      setIsProcessing(false);
      setCompletedOrder({
        orderId: `ord_${Math.random().toString(36).substring(2, 10).toUpperCase()}`,
        total: 4897,
      });
    }, 1200);
  };

  if (completedOrder) {
    return (
      <div className="container mx-auto max-w-lg px-4 py-16 text-center">
        <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-xl dark:border-slate-800 dark:bg-slate-900">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400">
            <CheckCircle2 className="h-10 w-10" />
          </div>
          <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">
            Payment Verified & Order Confirmed
          </span>
          <h1 className="mt-3 text-2xl font-black tracking-tight text-slate-900 dark:text-white">
            Thank you for your order!
          </h1>
          <p className="mt-2 text-xs text-slate-500">
            Order Reference: <strong className="font-mono text-slate-800 dark:text-slate-200">{completedOrder.orderId}</strong>
          </p>

          <div className="mt-6 rounded-2xl bg-slate-50 p-4 text-left text-xs space-y-2 dark:bg-slate-800">
            <div className="flex justify-between">
              <span className="text-slate-500">Total Paid:</span>
              <span className="font-bold text-slate-900 dark:text-white">
                ₹{completedOrder.total.toLocaleString('en-IN')}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Payment Gateway:</span>
              <span className="font-semibold text-indigo-600">Razorpay (INR)</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Estimated Delivery:</span>
              <span className="font-semibold text-slate-700 dark:text-slate-300">
                Within 2-4 business days
              </span>
            </div>
          </div>

          <div className="mt-6 flex flex-col gap-2">
            <Link
              href="/orders"
              className="flex items-center justify-center gap-1.5 rounded-xl bg-indigo-600 py-3 text-xs font-bold text-white shadow-md shadow-indigo-600/20 hover:bg-indigo-500"
            >
              Track Order Status <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/"
              className="rounded-xl border border-slate-200 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300"
            >
              Back to Marketplace
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-4xl px-4 py-8">
      <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
        Checkout & Payment
      </h1>

      <form onSubmit={handleRazorpayPayment} className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* Shipping Form */}
        <div className="space-y-6 lg:col-span-2">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="mb-4 flex items-center gap-2 text-base font-bold text-slate-900 dark:text-white">
              <MapPin className="h-5 w-5 text-indigo-600" />
              <span>1. Delivery Address</span>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={shippingAddress.full_name}
                  onChange={(e) =>
                    setShippingAddress({ ...shippingAddress, full_name: e.target.value })
                  }
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-xs outline-none focus:border-indigo-600 dark:border-slate-700 dark:bg-slate-800"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300">
                  Phone Number *
                </label>
                <input
                  type="tel"
                  required
                  value={shippingAddress.phone}
                  onChange={(e) =>
                    setShippingAddress({ ...shippingAddress, phone: e.target.value })
                  }
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-xs outline-none focus:border-indigo-600 dark:border-slate-700 dark:bg-slate-800"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block font-semibold text-slate-700 dark:text-slate-300">
                  Street Address & Flat / House *
                </label>
                <input
                  type="text"
                  required
                  value={shippingAddress.street}
                  onChange={(e) =>
                    setShippingAddress({ ...shippingAddress, street: e.target.value })
                  }
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-xs outline-none focus:border-indigo-600 dark:border-slate-700 dark:bg-slate-800"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300">
                  City *
                </label>
                <input
                  type="text"
                  required
                  value={shippingAddress.city}
                  onChange={(e) =>
                    setShippingAddress({ ...shippingAddress, city: e.target.value })
                  }
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-xs outline-none focus:border-indigo-600 dark:border-slate-700 dark:bg-slate-800"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300">
                  State *
                </label>
                <input
                  type="text"
                  required
                  value={shippingAddress.state}
                  onChange={(e) =>
                    setShippingAddress({ ...shippingAddress, state: e.target.value })
                  }
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-xs outline-none focus:border-indigo-600 dark:border-slate-700 dark:bg-slate-800"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300">
                  PIN Code *
                </label>
                <input
                  type="text"
                  required
                  value={shippingAddress.postal_code}
                  onChange={(e) =>
                    setShippingAddress({
                      ...shippingAddress,
                      postal_code: e.target.value,
                    })
                  }
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-xs outline-none focus:border-indigo-600 dark:border-slate-700 dark:bg-slate-800"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300">
                  Country
                </label>
                <input
                  type="text"
                  disabled
                  value="India"
                  className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-500 dark:border-slate-800 dark:bg-slate-800"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Payment Summary */}
        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="mb-4 flex items-center gap-2 text-base font-bold text-slate-900 dark:text-white">
              <CreditCard className="h-5 w-5 text-indigo-600" />
              <span>2. Payment</span>
            </div>

            <div className="rounded-xl border border-indigo-100 bg-indigo-50/50 p-3 text-xs dark:border-indigo-950 dark:bg-slate-800">
              <div className="font-bold text-slate-900 dark:text-white">
                Razorpay Payment Gateway
              </div>
              <p className="mt-1 text-[11px] text-slate-500">
                Supports UPI, Credit/Debit Cards (Visa, Mastercard, RuPay), NetBanking, and Wallets.
              </p>
            </div>

            <div className="mt-6 space-y-2 border-t border-slate-100 pt-4 text-xs dark:border-slate-800">
              <div className="flex justify-between text-slate-600 dark:text-slate-300">
                <span>Items Subtotal</span>
                <span className="font-semibold text-slate-900 dark:text-white">₹4,897</span>
              </div>
              <div className="flex justify-between text-slate-600 dark:text-slate-300">
                <span>Delivery</span>
                <span className="font-semibold text-emerald-600">FREE</span>
              </div>
              <div className="border-t border-slate-100 pt-2 text-sm font-bold text-slate-900 dark:border-slate-800 dark:text-white">
                <div className="flex justify-between">
                  <span>Payable Now</span>
                  <span className="text-indigo-600 dark:text-indigo-400">₹4,897</span>
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={isProcessing}
              className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 py-3.5 text-xs font-bold text-white shadow-md shadow-indigo-600/20 transition hover:bg-indigo-500 disabled:opacity-50"
            >
              {isProcessing ? (
                <LoadingThreeDotsJumping size={6} jumpHeight={8} gap={4} color="#FFFFFF" label="Processing Transaction" />
              ) : (
                'Pay ₹4,897 via Razorpay'
              )}
            </button>

            <div className="mt-4 flex items-center justify-center gap-1.5 text-[10px] text-slate-400">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
              <span>256-Bit SSL Encrypted Payment</span>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
