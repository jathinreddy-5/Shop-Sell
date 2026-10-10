'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Package,
  Clock,
  CheckCircle2,
  XCircle,
  ChevronRight,
  ShieldCheck,
  RefreshCw,
  ShoppingBag,
} from 'lucide-react';
import { useAuth } from '@/lib/auth/auth-context';
import { LoadingThreeDotsJumping } from '@/components/loading';

interface OrderItem {
  id: string;
  product_name: string;
  product_slug: string;
  qty: number;
  unit_price: number;
  image: string;
  store_name?: string;
}

interface OrderRecord {
  id: string;
  status: string;
  total: number | string;
  payment_status: string;
  payment_method?: string;
  upi_id?: string;
  utr_number?: string;
  utr_status?: string;
  created_at: string;
  shipping_address?: any;
  items?: OrderItem[];
}

export default function OrdersHistoryPage() {
  const { user, token } = useAuth();
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchOrders = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/orders', {
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      if (res.ok) {
        const data = await res.json();
        setOrders(data.orders || []);
      }
    } catch (err) {
      console.warn('Could not fetch user orders:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [token]);

  return (
    <div className="container mx-auto max-w-4xl px-4 py-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            My Orders & Tracking
          </h1>
          <p className="mt-1 text-xs text-slate-500">
            Review your previous orders, UPI payment verification status, and delivery tracking.
          </p>
        </div>
        <button
          onClick={fetchOrders}
          className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
        >
          <RefreshCw className="h-3.5 w-3.5" /> Refresh
        </button>
      </div>

      <div className="mt-8 space-y-6">
        {isLoading ? (
          <div className="flex min-h-[240px] items-center justify-center rounded-2xl border border-slate-200 bg-white p-8 dark:border-slate-800 dark:bg-slate-900 shadow-sm">
            <LoadingThreeDotsJumping label="Loading your orders" />
          </div>
        ) : orders.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-12 text-center dark:border-slate-800 dark:bg-slate-900">
            <ShoppingBag className="mx-auto h-12 w-12 text-slate-300 dark:text-slate-700" />
            <h3 className="mt-3 text-sm font-bold text-slate-800 dark:text-slate-200">
              No orders placed yet
            </h3>
            <p className="mt-1 text-xs text-slate-500">
              Your placed orders and payment statuses will be tracked here.
            </p>
            <Link
              href="/"
              className="mt-5 inline-flex items-center gap-1.5 rounded-xl bg-[#059669] px-5 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-[#047857]"
            >
              Start Shopping
            </Link>
          </div>
        ) : (
          orders.map((order) => {
            const isPendingVerification =
              order.utr_status === 'pending_verification' || order.status === 'pending';
            const isAccepted =
              order.utr_status === 'accepted' || order.status === 'confirmed';
            const isRejected =
              order.utr_status === 'rejected' || order.status === 'cancelled';

            return (
              <div
                key={order.id}
                className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900"
              >
                {/* Order Header */}
                <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 bg-slate-50/50 p-4 text-xs dark:border-slate-800 dark:bg-slate-800/30">
                  <div className="flex items-center gap-4">
                    <div>
                      <span className="text-slate-400">Order ID:</span>
                      <div className="font-mono font-bold text-slate-900 dark:text-white">
                        #{order.id.substring(0, 13)}
                      </div>
                    </div>
                    <div>
                      <span className="text-slate-400">Date:</span>
                      <div className="font-medium text-slate-700 dark:text-slate-300">
                        {new Date(order.created_at).toLocaleString('en-IN', {
                          dateStyle: 'medium',
                          timeStyle: 'short',
                        })}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {/* Dynamic Status Badge */}
                    {isPendingVerification && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-bold text-amber-800 dark:bg-amber-950/50 dark:text-amber-300 border border-amber-200 dark:border-amber-900/40">
                        <Clock className="h-3.5 w-3.5 animate-pulse" />
                        Awaiting Seller Verification
                      </span>
                    )}
                    {isAccepted && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/40">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Payment Verified & Confirmed
                      </span>
                    )}
                    {isRejected && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2.5 py-1 text-[11px] font-bold text-rose-700 dark:bg-rose-950/50 dark:text-rose-400 border border-rose-200 dark:border-rose-900/40">
                        <XCircle className="h-3.5 w-3.5" />
                        UTR Rejected
                      </span>
                    )}

                    <span className="text-sm font-black text-slate-900 dark:text-white">
                      ₹{Number(order.total).toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>

                {/* UTR Banner */}
                {order.utr_number && (
                  <div
                    className={`px-4 py-2.5 text-xs flex items-center justify-between border-b ${
                      isPendingVerification
                        ? 'bg-amber-50/60 text-amber-900 border-amber-100 dark:bg-amber-950/20 dark:text-amber-300 dark:border-amber-950'
                        : isAccepted
                        ? 'bg-emerald-50/60 text-emerald-900 border-emerald-100 dark:bg-emerald-950/20 dark:text-emerald-300 dark:border-emerald-950'
                        : 'bg-rose-50/60 text-rose-900 border-rose-100 dark:bg-rose-950/20 dark:text-rose-300 dark:border-rose-950'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-600 dark:text-slate-400">
                        UTR / UPI Ref:
                      </span>
                      <strong className="font-mono tracking-wider font-bold">
                        {order.utr_number}
                      </strong>
                    </div>

                    <span className="text-[11px]">
                      {isPendingVerification && 'Seller is validating the payment transfer'}
                      {isAccepted && 'Payment approved by seller • Ready for dispatch'}
                      {isRejected && 'Invalid transaction reference • Please contact support'}
                    </span>
                  </div>
                )}

                {/* Order Items */}
                <div className="divide-y divide-slate-100 p-4 dark:divide-slate-800">
                  {order.items && order.items.length > 0 ? (
                    order.items.map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between py-3">
                        <div className="flex items-center gap-3">
                          <img
                            src={item.image || 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=200&q=80'}
                            alt={item.product_name}
                            className="h-12 w-12 rounded-lg object-cover"
                          />
                          <div>
                            <div className="text-xs font-bold text-slate-900 dark:text-white">
                              {item.product_name}
                            </div>
                            <div className="text-[11px] text-slate-500">
                              Qty: {item.qty} × ₹{Number(item.unit_price).toLocaleString('en-IN')}
                              {item.store_name && ` • Sold by ${item.store_name}`}
                            </div>
                          </div>
                        </div>

                        {item.product_slug && (
                          <Link
                            href={`/product/${item.product_slug}`}
                            className="text-xs font-semibold text-[#059669] hover:text-[#047857]"
                          >
                            View Product &rarr;
                          </Link>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="py-2 text-xs text-slate-500">
                      Standard marketplace shipment
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
