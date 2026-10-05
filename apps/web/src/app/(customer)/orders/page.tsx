'use client';

import React from 'react';
import Link from 'next/link';
import { Package, Clock, CheckCircle2, ChevronRight, Truck } from 'lucide-react';

interface MockOrder {
  id: string;
  date: string;
  total: number;
  status: 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered';
  paymentStatus: 'captured';
  items: Array<{
    name: string;
    qty: number;
    price: number;
    image: string;
  }>;
}

const mockOrders: MockOrder[] = [
  {
    id: 'ORD-98214-IN',
    date: 'Today, 2:15 PM',
    total: 4897,
    status: 'confirmed',
    paymentStatus: 'captured',
    items: [
      {
        name: 'AcousticPro True Wireless Earbuds',
        qty: 1,
        price: 3499,
        image: 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=200&q=80',
      },
      {
        name: 'Handthrown Ceramic Coffee Mug 350ml',
        qty: 2,
        price: 699,
        image: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=200&q=80',
      },
    ],
  },
  {
    id: 'ORD-87112-IN',
    date: '2 days ago',
    total: 1899,
    status: 'delivered',
    paymentStatus: 'captured',
    items: [
      {
        name: 'Organic Indigo Dyed Cotton Shirt',
        qty: 1,
        price: 1899,
        image: 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=200&q=80',
      },
    ],
  },
];

export default function OrdersHistoryPage() {
  return (
    <div className="container mx-auto max-w-4xl px-4 py-8">
      <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
        My Orders & Tracking
      </h1>
      <p className="mt-1 text-xs text-slate-500">
        Review your previous orders, check delivery status, and submit product reviews.
      </p>

      <div className="mt-8 space-y-6">
        {mockOrders.map((order) => (
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
                    {order.id}
                  </div>
                </div>
                <div>
                  <span className="text-slate-400">Date:</span>
                  <div className="font-medium text-slate-700 dark:text-slate-300">
                    {order.date}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider ${
                    order.status === 'delivered'
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                      : 'bg-emerald-100 text-[#047857] dark:bg-emerald-950 dark:text-emerald-300'
                  }`}
                >
                  {order.status === 'delivered' ? (
                    <CheckCircle2 className="h-3 w-3" />
                  ) : (
                    <Clock className="h-3 w-3" />
                  )}
                  {order.status}
                </span>

                <span className="text-sm font-bold text-slate-900 dark:text-white">
                  ₹{order.total.toLocaleString('en-IN')}
                </span>
              </div>
            </div>

            {/* Order Items */}
            <div className="divide-y divide-slate-100 p-4 dark:divide-slate-800">
              {order.items.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between py-3">
                  <div className="flex items-center gap-3">
                    <img
                      src={item.image}
                      alt={item.name}
                      className="h-12 w-12 rounded-lg object-cover"
                    />
                    <div>
                      <div className="text-xs font-bold text-slate-900 dark:text-white">
                        {item.name}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        Qty: {item.qty} × ₹{item.price.toLocaleString('en-IN')}
                      </div>
                    </div>
                  </div>

                  <Link
                    href={`/product/acousticpro-true-wireless-earbuds`}
                    className="text-xs font-semibold text-[#059669] hover:text-[#047857]"
                  >
                    Write a Review &rarr;
                  </Link>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
