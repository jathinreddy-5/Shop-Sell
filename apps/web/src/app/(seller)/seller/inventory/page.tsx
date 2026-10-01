'use client';

import React, { useState } from 'react';
import { AlertTriangle, Plus, RefreshCw, CheckCircle2 } from 'lucide-react';

interface LowStockItem {
  id: string;
  name: string;
  sku: string;
  currentStock: number;
  threshold: number;
  reorderSuggestion: number;
}

const mockAlerts: LowStockItem[] = [
  {
    id: 'prod-003',
    name: 'Hi-Fi Over-Ear Studio Monitors',
    sku: 'AUDIO-MONITOR-003',
    currentStock: 4,
    threshold: 5,
    reorderSuggestion: 25,
  },
  {
    id: 'prod-008',
    name: 'Noise Isolating Ear Tips (Set of 3)',
    sku: 'AUDIO-TIPS-008',
    currentStock: 2,
    threshold: 10,
    reorderSuggestion: 50,
  },
  {
    id: 'prod-012',
    name: 'Braided Optical Audio Cable 2m',
    sku: 'AUDIO-CBL-012',
    currentStock: 0,
    threshold: 5,
    reorderSuggestion: 30,
  },
];

export default function SellerInventoryPage() {
  const [alerts, setAlerts] = useState<LowStockItem[]>(mockAlerts);
  const [restockedIds, setRestockedIds] = useState<string[]>([]);

  const handleRestock = (id: string, qty: number) => {
    setAlerts(
      alerts.map((a) =>
        a.id === id ? { ...a, currentStock: a.currentStock + qty } : a
      )
    );
    setRestockedIds([...restockedIds, id]);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Inventory & Stock Alerts
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Real-time low stock warnings to prevent stockouts during peak shopping periods.
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-4 dark:border-amber-900/60 dark:bg-amber-950/20">
        <div className="flex items-start gap-3">
          <AlertTriangle className="mt-0.5 h-5 w-5 text-amber-600 dark:text-amber-400" />
          <div className="text-xs">
            <h4 className="font-bold text-amber-900 dark:text-amber-300">
              {alerts.filter((a) => a.currentStock <= a.threshold).length} items require attention
            </h4>
            <p className="mt-0.5 text-amber-700 dark:text-amber-400">
              When a product reaches 0 stock, it is automatically hidden from recommendation feeds and checkout forms.
            </p>
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <table className="w-full text-left text-xs">
          <thead className="border-b border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-800 dark:bg-slate-800/50 dark:text-slate-400">
            <tr>
              <th className="p-4 font-semibold">Product & SKU</th>
              <th className="p-4 font-semibold">Current Stock</th>
              <th className="p-4 font-semibold">Alert Threshold</th>
              <th className="p-4 font-semibold">Suggested Re-order</th>
              <th className="p-4 text-right font-semibold">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {alerts.map((item) => {
              const isRestocked = restockedIds.includes(item.id);
              return (
                <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                  <td className="p-4">
                    <div className="font-bold text-slate-900 dark:text-white">
                      {item.name}
                    </div>
                    <div className="font-mono text-[11px] text-slate-400">
                      {item.sku}
                    </div>
                  </td>
                  <td className="p-4">
                    <span
                      className={`font-bold ${
                        item.currentStock === 0
                          ? 'text-rose-600'
                          : item.currentStock <= item.threshold
                          ? 'text-amber-600'
                          : 'text-emerald-600'
                      }`}
                    >
                      {item.currentStock} units
                    </span>
                  </td>
                  <td className="p-4 text-slate-600 dark:text-slate-300">
                    &le; {item.threshold} units
                  </td>
                  <td className="p-4 font-semibold text-slate-700 dark:text-slate-300">
                    +{item.reorderSuggestion} units
                  </td>
                  <td className="p-4 text-right">
                    {isRestocked ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600">
                        <CheckCircle2 className="h-3.5 w-3.5" /> Restocked
                      </span>
                    ) : (
                      <button
                        onClick={() =>
                          handleRestock(item.id, item.reorderSuggestion)
                        }
                        className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-emerald-500"
                      >
                        <Plus className="h-3.5 w-3.5" /> Restock +{item.reorderSuggestion}
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
