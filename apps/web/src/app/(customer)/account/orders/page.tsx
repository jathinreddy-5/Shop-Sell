'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Package, Clock, CheckCircle2, XCircle, ArrowRight } from 'lucide-react';
import { useAuth } from '@/lib/auth/auth-context';
import { LoadingThreeDotsJumping } from '@/components/loading';

interface OrderRecord {
  id: string;
  status: string;
  total: number | string;
  payment_status: string;
  utr_number?: string;
  utr_status?: string;
  created_at: string;
  items?: any[];
}

export default function AccountOrdersPage() {
  const { user, isLoading: authLoading } = useAuth();
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadOrders() {
      setIsLoading(true);
      try {
        const res = await fetch('/api/orders', {
          headers: {
            'Content-Type': 'application/json',
          },
        });
        if (res.ok) {
          const data = await res.json();
          setOrders(data.orders || []);
        }
      } catch (err) {
        console.warn('Failed to load account orders:', err);
      } finally {
        setIsLoading(false);
      }
    }

    if (!authLoading && user) {
      loadOrders();
    } else if (!authLoading && !user) {
      setIsLoading(false);
    }
  }, [user, authLoading]);

  if (authLoading || isLoading) {
    return (
      <div className="flex min-h-[240px] items-center justify-center rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900 shadow-sm">
        <LoadingThreeDotsJumping label="Loading orders" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">
            Recent Orders
          </h2>
          <Link
            href="/orders"
            className="text-xs font-semibold text-[#059669] hover:underline flex items-center gap-1"
          >
            Full Tracking History <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {orders.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-500">
            You haven&apos;t placed any orders yet.{' '}
            <Link href="/" className="font-semibold text-[#059669] hover:underline">
              Explore marketplace
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {orders.slice(0, 5).map((order) => {
              const isPending =
                order.utr_status === 'pending_verification' || order.status === 'pending';
              const isConfirmed =
                order.utr_status === 'accepted' || order.status === 'confirmed';
              const isRejected =
                order.utr_status === 'rejected' || order.status === 'cancelled';

              return (
                <div
                  key={order.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl border border-slate-100 dark:border-slate-800 gap-4"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`p-2.5 rounded-xl ${
                        isPending
                          ? 'bg-amber-50 text-amber-600 dark:bg-amber-950/40'
                          : isConfirmed
                          ? 'bg-emerald-50 text-[#059669] dark:bg-emerald-950/40'
                          : 'bg-rose-50 text-rose-600 dark:bg-rose-950/40'
                      }`}
                    >
                      <Package className="h-6 w-6" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="block text-sm font-bold text-slate-800 dark:text-slate-200 font-mono">
                          #{order.id.substring(0, 13)}
                        </span>
                        {order.utr_number && (
                          <span className="text-[10px] font-mono bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-slate-600 dark:text-slate-300">
                            UTR: {order.utr_number}
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                        <Clock className="h-3 w-3" />
                        {new Date(order.created_at).toLocaleDateString('en-IN', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-4">
                    <span className="text-sm font-black text-slate-900 dark:text-white">
                      ₹{Number(order.total).toLocaleString('en-IN')}
                    </span>

                    {isPending && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700 dark:bg-amber-950/50 dark:text-amber-400 border border-amber-200 dark:border-amber-900/40">
                        <Clock className="h-3 w-3 animate-pulse" /> Awaiting UTR Verification
                      </span>
                    )}
                    {isConfirmed && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/40">
                        <CheckCircle2 className="h-3 w-3" /> Confirmed
                      </span>
                    )}
                    {isRejected && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-700 dark:bg-rose-950/50 dark:text-rose-400 border border-rose-200 dark:border-rose-900/40">
                        <XCircle className="h-3 w-3" /> Rejected
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
