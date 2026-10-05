'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Trash2, Plus, Minus, ArrowRight, ShoppingBag, ShieldCheck, Lock } from 'lucide-react';
import { useAuth } from '@/lib/auth/auth-context';
import { useCart } from '@/lib/cart/cart-context';

export default function CartPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { items, updateQty, removeItem, subtotal, openLoginPrompt } = useCart();
  const delivery = subtotal > 999 || items.length === 0 ? 0 : 99;
  const tax = Math.round(subtotal * 0.18 * 100) / 100; // 18% GST standard in India
  const grandTotal = subtotal + delivery;

  if (items.length === 0) {
    return (
      <div className="container mx-auto max-w-lg px-4 py-20 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-50 text-[#059669] dark:bg-slate-800">
          <ShoppingBag className="h-8 w-8" />
        </div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">
          Your shopping cart is empty
        </h2>
        <p className="mt-1 text-xs text-slate-500">
          Discover handpicked products across our verified stores and start shopping.
        </p>
        <Link
          href="/"
          className="mt-6 inline-flex items-center gap-1.5 rounded-xl bg-[#059669] px-6 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-[#047857]"
        >
          Explore Marketplace <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
        Shopping Cart ({items.reduce((acc, i) => acc + i.qty, 0)} items)
      </h1>

      <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* Cart Item List */}
        <div className="space-y-4 lg:col-span-2">
          {items.map((item) => (
            <div
              key={item.id}
              className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900"
            >
              <img
                src={item.image}
                alt={item.name}
                className="h-20 w-20 rounded-xl object-cover"
              />
              <div className="flex-1">
                <span className="text-[10px] font-semibold text-slate-400">
                  {item.store}
                </span>
                <Link
                  href={`/product/${item.slug}`}
                  className="block text-sm font-bold text-slate-900 hover:text-[#059669] dark:text-white"
                >
                  {item.name}
                </Link>
                <div className="mt-1 font-bold text-[#059669] dark:text-emerald-400">
                  ₹{item.price.toLocaleString('en-IN')}
                </div>
              </div>

              {/* Quantity controls */}
              <div className="flex items-center gap-2">
                <div className="flex items-center rounded-lg border border-slate-200 dark:border-slate-700">
                  <button
                    onClick={() => updateQty(item.id, -1)}
                    className="p-1.5 hover:bg-slate-50 dark:hover:bg-slate-800"
                  >
                    <Minus className="h-3 w-3" />
                  </button>
                  <span className="w-8 text-center text-xs font-semibold">
                    {item.qty}
                  </span>
                  <button
                    onClick={() => updateQty(item.id, 1)}
                    className="p-1.5 hover:bg-slate-50 dark:hover:bg-slate-800"
                  >
                    <Plus className="h-3 w-3" />
                  </button>
                </div>
                <button
                  onClick={() => removeItem(item.id)}
                  className="rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Order Summary */}
        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Order Summary
            </h3>

            <div className="mt-4 space-y-2.5 text-xs">
              <div className="flex justify-between text-slate-600 dark:text-slate-300">
                <span>Items Subtotal</span>
                <span className="font-semibold text-slate-900 dark:text-white">
                  ₹{subtotal.toLocaleString('en-IN')}
                </span>
              </div>
              <div className="flex justify-between text-slate-600 dark:text-slate-300">
                <span>Estimated GST (18% included)</span>
                <span className="font-semibold text-slate-900 dark:text-white">
                  ₹{tax.toLocaleString('en-IN')}
                </span>
              </div>
              <div className="flex justify-between text-slate-600 dark:text-slate-300">
                <span>Shipping & Handling</span>
                <span className="font-semibold text-emerald-600">
                  {delivery === 0 ? 'FREE' : `₹${delivery}`}
                </span>
              </div>

              <div className="border-t border-slate-100 pt-3 text-sm dark:border-slate-800">
                <div className="flex justify-between font-bold text-slate-900 dark:text-white">
                  <span>Grand Total</span>
                  <span className="text-base text-[#059669] dark:text-emerald-400">
                    ₹{grandTotal.toLocaleString('en-IN')}
                  </span>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                if (!user) {
                  openLoginPrompt();
                  return;
                }
                router.push('/checkout');
              }}
              className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-[#059669] py-3 text-xs font-bold text-white shadow-md shadow-emerald-950/20 transition hover:bg-[#047857]"
            >
              Proceed to Razorpay Checkout <ArrowRight className="h-4 w-4" />
            </button>

            <div className="mt-4 flex items-center justify-center gap-2 text-[11px] text-slate-500">
              <ShieldCheck className="h-4 w-4 text-emerald-600" />
              <span>100% Secure Checkout with Razorpay</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
