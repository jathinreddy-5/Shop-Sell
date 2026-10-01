'use client';

import React, { useState } from 'react';
import {
  Package,
  TrendingUp,
  AlertTriangle,
  IndianRupee,
  Truck,
  CheckCircle,
  Save,
  Clock,
  User,
  MapPin,
  Sparkles,
} from 'lucide-react';
import {
  ExpandingCardGrid,
  ExpandingCardItem,
} from '../../../components/expanding-cards';

interface SellerOrderMeta {
  orderId: string;
  customerName: string;
  city: string;
  itemsCount: number;
  totalPaise: number;
  placedTime: string;
  sku: string;
  productTitle: string;
}

interface SellerProductMeta {
  sku: string;
  stock: number;
  price: number;
  category: string;
}

export default function SellerDashboardPage() {
  const [trackingUrls, setTrackingUrls] = useState<Record<string, string>>({});
  const [dispatchedOrders, setDispatchedOrders] = useState<Record<string, boolean>>({});
  const [stockLevels, setStockLevels] = useState<Record<string, number>>({
    'prod-01': 4,
    'prod-02': 2,
    'prod-03': 18,
    'prod-04': 7,
  });
  const [savedProducts, setSavedProducts] = useState<Record<string, boolean>>({});

  const pendingOrderCards: ExpandingCardItem[] = [
    {
      id: 'order-101',
      image: 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=800&q=80',
      category: 'Fulfillment Required',
      title: 'Order #ORD-84920',
      subtitle: 'Vikramaditya Sharma • Bengaluru, Karnataka • 1x AcousticPro Buds (₹3,499)',
      badge: 'Priority Express',
      metadata: {
        orderId: 'ORD-84920',
        customerName: 'Vikramaditya Sharma',
        city: 'Bengaluru, Karnataka',
        itemsCount: 1,
        totalPaise: 349900,
        placedTime: '24 mins ago',
        sku: 'AUD-EAR-001',
        productTitle: 'AcousticPro True Wireless Earbuds',
      } as SellerOrderMeta,
    },
    {
      id: 'order-102',
      image: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=800&q=80',
      category: 'Fulfillment Required',
      title: 'Order #ORD-84921',
      subtitle: 'Ananya Deshmukh • Mumbai, Maharashtra • 2x Ceramic Dripper Sets (₹3,798)',
      badge: 'Fragile Packaging',
      metadata: {
        orderId: 'ORD-84921',
        customerName: 'Ananya Deshmukh',
        city: 'Mumbai, Maharashtra',
        itemsCount: 2,
        totalPaise: 379800,
        placedTime: '1 hour ago',
        sku: 'POT-DRP-004',
        productTitle: 'Handcrafted Ceramic Dripper Set',
      } as SellerOrderMeta,
    },
  ];

  const quickStockCards: ExpandingCardItem[] = [
    {
      id: 'prod-01',
      image: 'https://images.unsplash.com/photo-1587049352847-4a222e784d38?w=800&q=80',
      category: 'Low Stock Alert',
      title: 'Himalayan Forest Honey 500g',
      subtitle: `Current Stock: ${stockLevels['prod-01']} units • ₹649 • SKU: HON-WLD-500`,
      badge: 'Restock Urgently',
      metadata: {
        sku: 'HON-WLD-500',
        stock: stockLevels['prod-01'],
        price: 649,
        category: 'Organic Gourmet',
      } as SellerProductMeta,
    },
    {
      id: 'prod-02',
      image: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=800&q=80',
      category: 'Low Stock Alert',
      title: 'Full-Grain Leather Duffel',
      subtitle: `Current Stock: ${stockLevels['prod-02']} units • ₹6,899 • SKU: LTH-DUF-001`,
      badge: 'Critical (2 units left)',
      metadata: {
        sku: 'LTH-DUF-001',
        stock: stockLevels['prod-02'],
        price: 6899,
        category: 'Leather Goods',
      } as SellerProductMeta,
    },
  ];

  const handleDispatch = (orderId: string) => {
    setDispatchedOrders((prev) => ({ ...prev, [orderId]: true }));
  };

  const handleUpdateStock = (prodId: string) => {
    setSavedProducts((prev) => ({ ...prev, [prodId]: true }));
    setTimeout(() => {
      setSavedProducts((prev) => ({ ...prev, [prodId]: false }));
    }, 2000);
  };

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
          Seller Dashboard
        </h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Real-time inventory levels, fulfillment pipelines, and interactive order processing panels.
        </p>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Gross Sales</span>
            <div className="rounded-xl bg-emerald-50 p-2 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400">
              <IndianRupee className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-3 text-2xl font-bold text-slate-900 dark:text-white">
            ₹1,42,850
          </p>
          <span className="mt-1 flex items-center text-xs font-medium text-emerald-600">
            +18.4% from last week
          </span>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Active Listings</span>
            <div className="rounded-xl bg-indigo-50 p-2 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400">
              <Package className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-3 text-2xl font-bold text-slate-900 dark:text-white">42</p>
          <span className="mt-1 text-xs text-slate-400">Synced to Typesense</span>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Pending Orders</span>
            <div className="rounded-xl bg-blue-50 p-2 text-blue-600 dark:bg-blue-950 dark:text-blue-400">
              <TrendingUp className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-3 text-2xl font-bold text-slate-900 dark:text-white">7</p>
          <span className="mt-1 text-xs text-blue-600 font-medium">Ready for dispatch</span>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Low Stock Alerts</span>
            <div className="rounded-xl bg-amber-50 p-2 text-amber-600 dark:bg-amber-950 dark:text-amber-400">
              <AlertTriangle className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-3 text-2xl font-bold text-amber-600">2</p>
          <span className="mt-1 text-xs text-slate-400">Needs immediate replenishment</span>
        </div>
      </div>

      {/* 1. FULFILLMENT QUEUE (Expanding Cards) */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Truck className="h-5 w-5 text-indigo-600" />
            <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
              Orders Requiring Dispatch
            </h2>
          </div>
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Click order card to expand fulfillment form
          </span>
        </div>

        <ExpandingCardGrid
          items={pendingOrderCards}
          layoutGroupId="seller-orders-group"
          className="grid-cols-1 md:grid-cols-2 gap-6"
          cardAspect="aspect-[16/10]"
          renderDetail={(item, onClose) => {
            const meta = item.metadata as SellerOrderMeta;
            const isDispatched = !!dispatchedOrders[item.id];

            return (
              <div className="space-y-6">
                <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-4 dark:border-slate-800">
                  <div>
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                      Fulfillment: {meta.orderId}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      Placed {meta.placedTime} • Razorpay Payment Verified
                    </p>
                  </div>
                  <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-bold text-blue-800 dark:bg-blue-950 dark:text-blue-300">
                    {isDispatched ? 'Status: Shipped' : 'Status: Ready to Pack'}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-800/40">
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                      <User className="h-3.5 w-3.5" /> Customer Details
                    </p>
                    <p className="text-sm font-bold text-slate-900 dark:text-white">{meta.customerName}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-1">
                      <MapPin className="h-3 w-3" /> {meta.city}
                    </p>
                  </div>

                  <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-800/40">
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                      <Package className="h-3.5 w-3.5" /> Line Item &amp; SKU
                    </p>
                    <p className="text-sm font-bold text-slate-900 dark:text-white">{meta.productTitle}</p>
                    <p className="text-xs text-indigo-600 dark:text-indigo-400 font-mono mt-1">
                      SKU: {meta.sku} ({meta.itemsCount} unit)
                    </p>
                  </div>
                </div>

                {/* Tracking URL Form */}
                <div className="space-y-3 rounded-2xl border border-indigo-100 bg-indigo-50/50 p-5 dark:border-indigo-950/60 dark:bg-indigo-950/20">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    Enter Carrier Dispatch Tracking URL
                  </label>
                  <input
                    type="url"
                    placeholder="e.g. https://shiprocket.co/tracking/SR19284012"
                    value={trackingUrls[item.id] || ''}
                    onChange={(e) =>
                      setTrackingUrls((prev) => ({ ...prev, [item.id]: e.target.value }))
                    }
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Customer will receive an automated SMS and WhatsApp update with this tracking link.
                  </p>
                </div>

                <div className="flex items-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => handleDispatch(item.id)}
                    disabled={isDispatched}
                    className={`flex-1 inline-flex items-center justify-center gap-2 rounded-2xl px-6 py-3.5 text-base font-bold text-white shadow-lg transition ${
                      isDispatched
                        ? 'bg-emerald-600 cursor-default'
                        : 'bg-indigo-600 hover:bg-indigo-500 shadow-indigo-600/30'
                    }`}
                  >
                    {isDispatched ? (
                      <>
                        <CheckCircle className="h-5 w-5" />
                        <span>Order Dispatched &amp; Customer Notified</span>
                      </>
                    ) : (
                      <>
                        <Truck className="h-5 w-5" />
                        <span>Confirm Dispatch &amp; Generate Waybill</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={onClose}
                    className="rounded-2xl border border-slate-200 bg-white px-5 py-3.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                  >
                    Close
                  </button>
                </div>
              </div>
            );
          }}
        />
      </section>

      {/* 2. LOW STOCK EDITOR (Expanding Cards) */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
              Inventory Watchlist &amp; Quick Stock Editor
            </h2>
          </div>
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Click product to adjust stock instantly
          </span>
        </div>

        <ExpandingCardGrid
          items={quickStockCards}
          layoutGroupId="seller-inventory-group"
          className="grid-cols-1 md:grid-cols-2 gap-6"
          cardAspect="aspect-[16/10]"
          renderDetail={(item, onClose) => {
            const meta = item.metadata as SellerProductMeta;
            const currentStock = stockLevels[item.id] ?? meta.stock;
            const isSaved = !!savedProducts[item.id];

            return (
              <div className="space-y-6">
                <div className="flex items-center justify-between border-b border-slate-100 pb-4 dark:border-slate-800">
                  <div>
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                      Edit Inventory: {item.title}
                    </h3>
                    <p className="text-xs font-mono text-indigo-500 mt-0.5">
                      SKU: {meta.sku} • Department: {meta.category}
                    </p>
                  </div>
                  <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                    Live Catalog Sync Active
                  </span>
                </div>

                <div className="rounded-2xl border border-slate-100 bg-slate-50 p-5 dark:border-slate-800 dark:bg-slate-800/40 space-y-4">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-bold text-slate-900 dark:text-white">
                      Replenish Available Stock Units
                    </label>
                    <span className="text-xs text-slate-400">
                      Typesense will re-index immediately
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() =>
                        setStockLevels((prev) => ({
                          ...prev,
                          [item.id]: Math.max(0, (prev[item.id] ?? meta.stock) - 1),
                        }))
                      }
                      className="flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 bg-white text-lg font-bold hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800"
                    >
                      -
                    </button>

                    <input
                      type="number"
                      value={currentStock}
                      onChange={(e) =>
                        setStockLevels((prev) => ({
                          ...prev,
                          [item.id]: parseInt(e.target.value) || 0,
                        }))
                      }
                      className="w-28 rounded-xl border border-slate-200 bg-white py-2.5 text-center text-lg font-bold text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    />

                    <button
                      type="button"
                      onClick={() =>
                        setStockLevels((prev) => ({
                          ...prev,
                          [item.id]: (prev[item.id] ?? meta.stock) + 5,
                        }))
                      }
                      className="flex h-11 px-4 items-center justify-center rounded-xl border border-slate-200 bg-white text-sm font-bold hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800"
                    >
                      +5 Fast Restock
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => handleUpdateStock(item.id)}
                    className="flex-1 inline-flex items-center justify-center gap-2 rounded-2xl bg-indigo-600 px-6 py-3.5 text-base font-bold text-white shadow-lg shadow-indigo-600/30 transition hover:bg-indigo-500"
                  >
                    {isSaved ? <CheckCircle className="h-5 w-5" /> : <Save className="h-5 w-5" />}
                    <span>{isSaved ? 'Stock Updated in Database & Search Index!' : 'Save & Publish Inventory Level'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={onClose}
                    className="rounded-2xl border border-slate-200 bg-white px-5 py-3.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                  >
                    Done
                  </button>
                </div>
              </div>
            );
          }}
        />
      </section>
    </div>
  );
}
