'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  ShoppingCart,
  Clock,
  CheckCircle2,
  XCircle,
  Copy,
  Check,
  AlertTriangle,
  Package,
  MapPin,
  RefreshCw,
  Search,
  Filter,
} from 'lucide-react';
import { useAuth } from '@/lib/auth/auth-context';
import { LoadingThreeDotsJumping } from '@/components/loading';

interface OrderRow {
  item_id: string;
  qty: number;
  unit_price: number;
  fulfilment_status: string;
  order_id: string;
  order_status: string;
  payment_status: string;
  created_at: string;
  order_total?: number;
  shipping_address?: any;
  payment_method?: string;
  upi_id?: string;
  utr_number?: string;
  utr_status?: string;
  verified_at?: string;
  product_name: string;
  product_slug: string;
  image: string;
  store_name?: string;
}

interface GroupedOrder {
  orderId: string;
  orderStatus: string;
  paymentStatus: string;
  utrStatus: string;
  utrNumber?: string;
  upiId?: string;
  paymentMethod?: string;
  total: number;
  createdAt: string;
  shippingAddress?: any;
  verifiedAt?: string;
  items: Array<{
    itemId: string;
    productName: string;
    productSlug: string;
    qty: number;
    unitPrice: number;
    image: string;
  }>;
}

export default function SellerOrdersPage() {
  const { user, token } = useAuth();
  const [orders, setOrders] = useState<GroupedOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'all' | 'pending' | 'confirmed' | 'rejected'>('all');
  const [copiedUtr, setCopiedUtr] = useState<string | null>(null);
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const fetchOrders = useCallback(async () => {
    setIsLoading(true);
    setActionError(null);
    try {
      const res = await fetch('/api/orders/seller/manage', {
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      if (!res.ok) {
        throw new Error('Failed to fetch seller orders');
      }

      const data = await res.json();
      const rows: OrderRow[] = data.items || [];

      // Group rows by order_id
      const map: Record<string, GroupedOrder> = {};
      for (const row of rows) {
        if (!map[row.order_id]) {
          map[row.order_id] = {
            orderId: row.order_id,
            orderStatus: row.order_status,
            paymentStatus: row.payment_status,
            utrStatus: row.utr_status || 'pending_verification',
            utrNumber: row.utr_number,
            upiId: row.upi_id,
            paymentMethod: row.payment_method || 'upi',
            total: Number(row.order_total || row.unit_price * row.qty),
            createdAt: row.created_at,
            shippingAddress: row.shipping_address,
            verifiedAt: row.verified_at,
            items: [],
          };
        }
        map[row.order_id].items.push({
          itemId: row.item_id,
          productName: row.product_name,
          productSlug: row.product_slug,
          qty: row.qty,
          unitPrice: Number(row.unit_price),
          image: row.image,
        });
      }

      setOrders(Object.values(map));
    } catch (err: any) {
      console.warn('Could not load seller orders:', err.message);
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const handleVerifyUtr = async (orderId: string, decision: 'accept' | 'reject') => {
    setActionInProgress(orderId);
    setActionError(null);
    try {
      const res = await fetch(`/api/orders/${orderId}/verify-utr`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ decision }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Verification update failed');
      }

      // Optimistically update local order state
      setOrders((prev) =>
        prev.map((o) =>
          o.orderId === orderId
            ? {
                ...o,
                utrStatus: decision === 'accept' ? 'accepted' : 'rejected',
                orderStatus: decision === 'accept' ? 'confirmed' : 'cancelled',
                paymentStatus: decision === 'accept' ? 'captured' : 'failed',
                verifiedAt: new Date().toISOString(),
              }
            : o
        )
      );
    } catch (err: any) {
      setActionError(err.message || 'Action could not be completed. Please try again.');
    } finally {
      setActionInProgress(null);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedUtr(text);
    setTimeout(() => setCopiedUtr(null), 2000);
  };

  const filteredOrders = orders.filter((order) => {
    if (activeTab === 'pending') {
      return order.utrStatus === 'pending_verification' || order.paymentStatus === 'pending';
    }
    if (activeTab === 'confirmed') {
      return order.utrStatus === 'accepted' || order.orderStatus === 'confirmed';
    }
    if (activeTab === 'rejected') {
      return order.utrStatus === 'rejected' || order.orderStatus === 'cancelled';
    }
    return true;
  });

  const pendingCount = orders.filter(
    (o) => o.utrStatus === 'pending_verification' || o.paymentStatus === 'pending'
  ).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            Orders & UPI UTR Verification
          </h1>
          <p className="text-xs text-slate-500">
            Review customer UPI payments, verify 12-digit UTR transaction reference IDs, and accept incoming orders.
          </p>
        </div>
        <button
          onClick={fetchOrders}
          className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
        >
          <RefreshCw className="h-3.5 w-3.5" /> Refresh
        </button>
      </div>

      {actionError && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs font-semibold text-rose-800 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-300">
          {actionError}
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-3 text-xs overflow-x-auto">
        <button
          onClick={() => setActiveTab('all')}
          className={`rounded-lg px-3 py-1.5 font-semibold transition ${
            activeTab === 'all'
              ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
              : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'
          }`}
        >
          All Orders ({orders.length})
        </button>
        <button
          onClick={() => setActiveTab('pending')}
          className={`relative rounded-lg px-3 py-1.5 font-semibold transition flex items-center gap-1.5 ${
            activeTab === 'pending'
              ? 'bg-amber-600 text-white'
              : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'
          }`}
        >
          <span>Pending UTR Verification</span>
          {pendingCount > 0 && (
            <span className="rounded-full bg-amber-400 text-amber-950 px-1.5 py-0.2 text-[10px] font-black">
              {pendingCount}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('confirmed')}
          className={`rounded-lg px-3 py-1.5 font-semibold transition ${
            activeTab === 'confirmed'
              ? 'bg-emerald-600 text-white'
              : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'
          }`}
        >
          Verified & Confirmed
        </button>
        <button
          onClick={() => setActiveTab('rejected')}
          className={`rounded-lg px-3 py-1.5 font-semibold transition ${
            activeTab === 'rejected'
              ? 'bg-rose-600 text-white'
              : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'
          }`}
        >
          Rejected
        </button>
      </div>

      {/* Loading State */}
      {isLoading ? (
        <div className="flex min-h-[300px] items-center justify-center rounded-2xl border border-slate-200 bg-white p-8 dark:border-slate-800 dark:bg-slate-900">
          <LoadingThreeDotsJumping label="Loading orders" />
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-12 text-center dark:border-slate-800 dark:bg-slate-900">
          <ShoppingCart className="mx-auto h-12 w-12 text-slate-300 dark:text-slate-700" />
          <h3 className="mt-3 text-sm font-bold text-slate-800 dark:text-slate-200">
            No orders found
          </h3>
          <p className="mt-1 text-xs text-slate-500">
            {activeTab === 'pending'
              ? 'There are no pending UPI transfers waiting for your verification.'
              : 'Orders placed by marketplace customers will appear here.'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredOrders.map((order) => {
            const isPendingVerification =
              order.utrStatus === 'pending_verification' || order.orderStatus === 'pending';
            const isAccepted =
              order.utrStatus === 'accepted' || order.orderStatus === 'confirmed';
            const isRejected =
              order.utrStatus === 'rejected' || order.orderStatus === 'cancelled';

            return (
              <div
                key={order.orderId}
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-4"
              >
                {/* Header row */}
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
                  <div className="flex items-center gap-3">
                    <div
                      className={`p-2 rounded-xl ${
                        isPendingVerification
                          ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400'
                          : isAccepted
                          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400'
                          : 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400'
                      }`}
                    >
                      <ShoppingCart className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm font-bold text-slate-900 dark:text-white">
                          #{order.orderId.substring(0, 13)}
                        </span>
                        <span className="text-[11px] text-slate-400">
                          {new Date(order.createdAt).toLocaleString('en-IN', {
                            dateStyle: 'medium',
                            timeStyle: 'short',
                          })}
                        </span>
                      </div>
                      {order.shippingAddress && (
                        <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                          <MapPin className="h-3 w-3 shrink-0 text-slate-400" />
                          <span>
                            {order.shippingAddress.full_name} • {order.shippingAddress.city},{' '}
                            {order.shippingAddress.postal_code}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Status Badge */}
                  <div>
                    {isPendingVerification && (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 border border-amber-200 dark:border-amber-900/40">
                        <Clock className="h-3.5 w-3.5 animate-pulse" />
                        Awaiting UTR Verification
                      </span>
                    )}
                    {isAccepted && (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/40">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Payment Verified & Confirmed
                      </span>
                    )}
                    {isRejected && (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-50 px-3 py-1 text-xs font-bold text-rose-700 dark:bg-rose-950/40 dark:text-rose-400 border border-rose-200 dark:border-rose-900/40">
                        <XCircle className="h-3.5 w-3.5" />
                        UTR Rejected (Order Cancelled)
                      </span>
                    )}
                  </div>
                </div>

                {/* Items & Payment Info Grid */}
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-12 text-xs">
                  {/* Items list */}
                  <div className="space-y-2 lg:col-span-7">
                    <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                      Ordered Products
                    </span>
                    <div className="divide-y divide-slate-100 dark:divide-slate-800">
                      {order.items.map((it) => (
                        <div key={it.itemId} className="py-2 flex items-center justify-between">
                          <div className="flex items-center gap-2.5">
                            <img
                              src={it.image}
                              alt={it.productName}
                              className="h-9 w-9 rounded-lg object-cover"
                            />
                            <div>
                              <span className="font-semibold text-slate-800 dark:text-slate-200 block line-clamp-1">
                                {it.productName}
                              </span>
                              <span className="text-[11px] text-slate-400">
                                Qty: {it.qty} × ₹{it.unitPrice.toLocaleString('en-IN')}
                              </span>
                            </div>
                          </div>
                          <span className="font-bold text-slate-900 dark:text-white">
                            ₹{(it.unitPrice * it.qty).toLocaleString('en-IN')}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Payment & UTR Card */}
                  <div className="rounded-xl bg-slate-50 p-4 dark:bg-slate-800/80 border border-slate-100 dark:border-slate-800 space-y-2.5 lg:col-span-5">
                    <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                      UPI Payment Evidence
                    </span>

                    <div className="flex justify-between items-center">
                      <span className="text-slate-500">Payable Total:</span>
                      <span className="text-sm font-black text-slate-900 dark:text-white">
                        ₹{order.total.toLocaleString('en-IN')}
                      </span>
                    </div>

                    {order.upiId && (
                      <div className="flex justify-between items-center">
                        <span className="text-slate-500">Customer UPI:</span>
                        <span className="font-mono font-medium text-slate-700 dark:text-slate-300">
                          {order.upiId}
                        </span>
                      </div>
                    )}

                    {/* Prominent UTR Number Display */}
                    <div className="rounded-lg bg-amber-50/80 dark:bg-amber-950/40 p-2.5 border border-amber-200 dark:border-amber-900/50">
                      <div className="text-[10px] font-bold text-amber-800 dark:text-amber-300 uppercase">
                        Customer Submitted UTR / Ref No
                      </div>
                      <div className="mt-1 flex items-center justify-between">
                        <span className="font-mono text-sm font-black tracking-wider text-amber-900 dark:text-amber-200">
                          {order.utrNumber || 'No UTR provided'}
                        </span>
                        {order.utrNumber && (
                          <button
                            type="button"
                            onClick={() => copyToClipboard(order.utrNumber!)}
                            className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-800 hover:text-amber-950 dark:text-amber-300"
                          >
                            {copiedUtr === order.utrNumber ? (
                              <>
                                <Check className="h-3 w-3 text-emerald-600" /> Copied
                              </>
                            ) : (
                              <>
                                <Copy className="h-3 w-3" /> Copy
                              </>
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Seller Actions (only for pending verification orders) */}
                {isPendingVerification && (
                  <div className="border-t border-slate-100 dark:border-slate-800 pt-3 flex flex-wrap items-center justify-between gap-3">
                    <span className="text-xs text-slate-500 flex items-center gap-1">
                      <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                      Check your bank account/UPI app for ₹{order.total.toLocaleString('en-IN')} with UTR{' '}
                      <strong className="font-mono text-slate-700 dark:text-slate-300">
                        {order.utrNumber}
                      </strong>
                    </span>

                    <div className="flex items-center gap-2 ml-auto">
                      <button
                        type="button"
                        disabled={actionInProgress === order.orderId}
                        onClick={() => handleVerifyUtr(order.orderId, 'reject')}
                        className="rounded-xl border border-rose-300 bg-rose-50 px-4 py-2 text-xs font-bold text-rose-700 hover:bg-rose-100 dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-300 disabled:opacity-50 transition"
                      >
                        Reject (Invalid UTR)
                      </button>

                      <button
                        type="button"
                        disabled={actionInProgress === order.orderId}
                        onClick={() => handleVerifyUtr(order.orderId, 'accept')}
                        className="rounded-xl bg-[#059669] px-5 py-2 text-xs font-bold text-white shadow-sm hover:bg-[#047857] disabled:opacity-50 transition flex items-center gap-1.5"
                      >
                        {actionInProgress === order.orderId ? (
                          <LoadingThreeDotsJumping size={4} jumpHeight={6} gap={3} color="#FFFFFF" label="Verifying" />
                        ) : (
                          <>
                            <CheckCircle2 className="h-4 w-4" />
                            Verify & Accept Payment
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
