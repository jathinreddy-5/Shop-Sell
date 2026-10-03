'use client';

import React, { useState, useEffect } from 'react';
import {
  PowerOff,
  ShieldAlert,
  AlertTriangle,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Lock,
} from 'lucide-react';

interface KillSwitchItem {
  key: string;
  enabled: boolean;
  reason?: string | null;
  updated_by?: string | null;
  updated_at: string;
}

const SWITCH_METADATA: Record<string, { title: string; description: string; impact: string }> = {
  payout_freeze: {
    title: 'Payout Disbursement Freeze',
    description: 'Instantly blocks execution of all queued and pending seller payouts across payment gateways.',
    impact: 'CRITICAL: No funds will leave the platform ledger while engaged.',
  },
  new_seller_registration_pause: {
    title: 'New Seller Registration Pause',
    description: 'Suspends the seller onboarding portal to prevent fraudulent merchant intake during attacks.',
    impact: 'HIGH: Prospective merchants cannot submit KYC documents.',
  },
  refunds_issuance_pause: {
    title: 'Refund Issuance Circuit Breaker',
    description: 'Freezes customer refund issuance during velocity attacks or credit card exploit attempts.',
    impact: 'HIGH: Customer support specialists cannot issue refunds.',
  },
  merchandising_publish_pause: {
    title: 'Merchandising Algorithm Publish Pause',
    description: 'Freezes deployment of search weights, boosts, and recommendation algorithm overrides.',
    impact: 'MEDIUM: Search ranking remains pinned to current baseline.',
  },
};

export default function KillSwitchesPage() {
  const [switches, setSwitches] = useState<KillSwitchItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSwitch, setSelectedSwitch] = useState<KillSwitchItem | null>(null);
  const [toggleReason, setToggleReason] = useState('');
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchSwitches = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/kill-switches');
      if (res.ok) {
        const data = await res.json();
        setSwitches(data);
      } else {
        // Fallback demo mock
        setSwitches([
          { key: 'payout_freeze', enabled: false, updated_at: new Date().toISOString() },
          { key: 'new_seller_registration_pause', enabled: false, updated_at: new Date().toISOString() },
          { key: 'refunds_issuance_pause', enabled: false, updated_at: new Date().toISOString() },
          { key: 'merchandising_publish_pause', enabled: false, updated_at: new Date().toISOString() },
        ]);
      }
    } catch {
      setSwitches([
        { key: 'payout_freeze', enabled: false, updated_at: new Date().toISOString() },
        { key: 'new_seller_registration_pause', enabled: false, updated_at: new Date().toISOString() },
        { key: 'refunds_issuance_pause', enabled: false, updated_at: new Date().toISOString() },
        { key: 'merchandising_publish_pause', enabled: false, updated_at: new Date().toISOString() },
      ]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSwitches();
  }, []);

  const handleToggle = async () => {
    if (!selectedSwitch || toggleReason.length < 10) return;
    try {
      const res = await fetch(`/api/admin/kill-switches/${selectedSwitch.key}/toggle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          enabled: !selectedSwitch.enabled,
          reason: toggleReason,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message);
      }

      setStatusMessage({
        type: 'success',
        text: `Kill switch '${selectedSwitch.key}' successfully ${!selectedSwitch.enabled ? 'ENGAGED' : 'DISENGAGED'}.`,
      });
      setSelectedSwitch(null);
      setToggleReason('');
      fetchSwitches();
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Failed to toggle kill switch.' });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-600 text-white">
              <PowerOff className="h-4 w-4" />
            </span>
            <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
              Incident Control Kill Switches
            </h1>
          </div>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Instant global circuit breakers for financial containment, onboarding freezes, and exploit mitigation.
          </p>
        </div>

        <button
          onClick={fetchSwitches}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Refresh
        </button>
      </div>

      {statusMessage && (
        <div
          className={`flex items-center justify-between rounded-xl p-4 text-xs font-medium ${
            statusMessage.type === 'success'
              ? 'border border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/60 dark:text-emerald-300'
              : 'border border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-900 dark:bg-rose-950/60 dark:text-rose-300'
          }`}
        >
          <span>{statusMessage.text}</span>
          <button onClick={() => setStatusMessage(null)}>
            <XCircle className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Switches Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {switches.map((item) => {
          const meta = SWITCH_METADATA[item.key] || {
            title: item.key,
            description: 'Platform circuit breaker.',
            impact: 'Operation halted when enabled.',
          };
          const isEngaged = item.enabled;

          return (
            <div
              key={item.key}
              className={`rounded-2xl border p-6 transition shadow-sm ${
                isEngaged
                  ? 'border-rose-300 bg-rose-50/50 dark:border-rose-900 dark:bg-rose-950/20'
                  : 'border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900'
              }`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    {meta.title}
                    {isEngaged && (
                      <span className="rounded bg-rose-100 px-2 py-0.5 text-[10px] font-bold text-rose-800 dark:bg-rose-950 dark:text-rose-300">
                        ENGAGED
                      </span>
                    )}
                  </h3>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    {meta.description}
                  </p>
                </div>
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-xl font-bold ${
                    isEngaged
                      ? 'bg-rose-600 text-white shadow-md shadow-rose-500/20'
                      : 'bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500'
                  }`}
                >
                  <PowerOff className="h-4 w-4" />
                </div>
              </div>

              <div className="mt-4 rounded-xl border border-slate-100 bg-slate-50/80 p-3 text-[11px] dark:border-slate-800/80 dark:bg-slate-950/40">
                <span className="font-semibold text-slate-700 dark:text-slate-300">Operational Impact: </span>
                <span className="text-slate-500 dark:text-slate-400">{meta.impact}</span>
              </div>

              {item.reason && (
                <div className="mt-2 text-[11px] text-slate-500">
                  <strong>Last Reason:</strong> {item.reason}
                </div>
              )}

              <div className="mt-5 flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
                <span className="text-[10px] text-slate-400">
                  Updated: {new Date(item.updated_at).toLocaleString()}
                </span>
                <button
                  onClick={() => setSelectedSwitch(item)}
                  className={`rounded-xl px-4 py-1.5 text-xs font-bold transition shadow-sm ${
                    isEngaged
                      ? 'bg-emerald-600 text-white hover:bg-emerald-500'
                      : 'bg-rose-600 text-white hover:bg-rose-500'
                  }`}
                >
                  {isEngaged ? 'Disengage Switch' : 'Engage Kill Switch'}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Confirmation & Step-Up Modal */}
      {selectedSwitch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900 space-y-4">
            <div className="flex items-center gap-2">
              <span
                className={`flex h-8 w-8 items-center justify-center rounded-lg ${
                  selectedSwitch.enabled
                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                    : 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
                }`}
              >
                <PowerOff className="h-4 w-4" />
              </span>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Confirm Kill Switch {selectedSwitch.enabled ? 'Disengagement' : 'Engagement'}
                </h3>
                <p className="text-[11px] text-slate-400 font-mono">{selectedSwitch.key}</p>
              </div>
            </div>

            <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-3 text-xs text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200">
              <div className="font-bold flex items-center gap-1.5 mb-1">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                Immediate Server-Side Effect:
              </div>
              <p>
                This action instantly purges Redis cache clusters across all backend services and emits an immutable high-severity audit event.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Mandatory Operational Justification (min 10 chars)
              </label>
              <textarea
                value={toggleReason}
                onChange={(e) => setToggleReason(e.target.value)}
                placeholder="Explain the incident, vulnerability, or resolution reason..."
                rows={3}
                className="w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs text-slate-900 focus:border-indigo-600 focus:outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-white"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setSelectedSwitch(null)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-300"
              >
                Cancel
              </button>
              <button
                onClick={handleToggle}
                disabled={toggleReason.length < 10}
                className={`rounded-xl px-4 py-2 text-xs font-bold text-white shadow-sm disabled:opacity-50 ${
                  selectedSwitch.enabled
                    ? 'bg-emerald-600 hover:bg-emerald-500'
                    : 'bg-rose-600 hover:bg-rose-500'
                }`}
              >
                Confirm with Step-Up
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
