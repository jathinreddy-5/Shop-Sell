'use client';

import React, { useState } from 'react';
import {
  Check,
  X,
  Building,
  CreditCard,
  Clock,
  Shield,
  Layers,
  ShoppingBag,
  TrendingUp,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  DollarSign,
  Plus,
  Eye,
} from 'lucide-react';
import {
  ExpandingCardGrid,
  ExpandingCardItem,
} from '../../components/expanding-cards';

interface MockApp {
  id: string;
  applicant: string;
  businessName: string;
  businessType: string;
  taxId: string;
  submittedAt: string;
  bankName: string;
  ifsc: string;
  status: 'pending' | 'approved' | 'rejected';
}

const initialApplications: MockApp[] = [
  {
    id: 'app-001',
    applicant: 'Vikram Mehta (vikram@apextech.in)',
    businessName: 'Apex Tech Solutions',
    businessType: 'Pvt Ltd',
    taxId: '27AABCA1234F1Z5',
    submittedAt: '10 mins ago',
    bankName: 'HDFC Bank',
    ifsc: 'HDFC0001234',
    status: 'pending',
  },
  {
    id: 'app-002',
    applicant: 'Meera Nambiar (meera@keralahandicrafts.org)',
    businessName: 'Kerala Heritage Clayworks',
    businessType: 'Sole Proprietorship',
    taxId: '32ABCDE5678G1Z1',
    submittedAt: '2 hours ago',
    bankName: 'State Bank of India',
    ifsc: 'SBIN0000456',
    status: 'pending',
  },
];

const mockProductsForModeration = [
  {
    id: 'p-mod-1',
    name: 'Herbal Immune Booster Tonic 500ml',
    store: 'Himalayan Organics',
    category: 'Health & Wellness',
    price: 899,
    status: 'active',
    reports: 0,
  },
  {
    id: 'p-mod-2',
    name: 'Replica Designer Leather Wallet',
    store: 'Heritage Leathers Co',
    category: 'Handmade Crafts',
    price: 499,
    status: 'active',
    reports: 3,
  },
  {
    id: 'p-mod-3',
    name: 'Wireless Bluetooth Bone-Conduction Earphone',
    store: 'Apex Tech Solutions',
    category: 'Electronics',
    price: 2999,
    status: 'active',
    reports: 0,
  },
];

const mockOrders = [
  {
    id: 'ord-8101',
    customer: 'Rahul Sharma',
    total: 3499,
    paymentStatus: 'captured',
    orderStatus: 'delivered',
    disputed: true,
    disputeReason: 'Wrong item size received, seller unresponsive',
    createdAt: 'Yesterday, 4:15 PM',
  },
  {
    id: 'ord-8102',
    customer: 'Priya Iyer',
    total: 1299,
    paymentStatus: 'captured',
    orderStatus: 'shipped',
    disputed: false,
    createdAt: 'Today, 11:30 AM',
  },
];

const mockRailAnalytics = [
  {
    rail: 'Pick up where you left off (Recent Searches)',
    impressions: 4820,
    clicks: 1832,
    ctr: '38.0%',
    addToCarts: 824,
    purchases: 362,
    conversion: '19.8%',
  },
  {
    rail: 'Recommended for You (Blended Scoring)',
    impressions: 4015,
    clicks: 1084,
    ctr: '27.0%',
    addToCarts: 432,
    purchases: 184,
    conversion: '17.0%',
  },
  {
    rail: 'Trending Near You',
    impressions: 2640,
    clicks: 580,
    ctr: '22.0%',
    addToCarts: 210,
    purchases: 92,
    conversion: '15.9%',
  },
];

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState<
    'sellers' | 'moderation' | 'disputes' | 'analytics' | 'categories' | 'payouts'
  >('sellers');
  const [apps, setApps] = useState<MockApp[]>(initialApplications);
  const [products, setProducts] = useState(mockProductsForModeration);
  const [orders, setOrders] = useState(mockOrders);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  // New Category Form
  const [newCatName, setNewCatName] = useState('');
  const [newCatSlug, setNewCatSlug] = useState('');
  const [categoriesList, setCategoriesList] = useState([
    { name: 'Electronics & Audio', slug: 'electronics-gadgets', attr: '{"brand": "string", "wireless": "boolean"}' },
    { name: 'Home & Ceramics', slug: 'home-kitchen', attr: '{"material": "string", "capacity": "string"}' },
    { name: 'Khadi & Apparel', slug: 'mens-fashion', attr: '{"fabric": "string", "fit": "string"}' },
  ]);

  const handleApproveSeller = (id: string, name: string) => {
    setApps((prev) =>
      prev.map((a) => (a.id === id ? { ...a, status: 'approved' } : a))
    );
    setActionMessage(`Approved seller "${name}". Dual role 'owner' granted and store provisioned.`);
  };

  const handleRejectSeller = (id: string, name: string) => {
    setApps((prev) =>
      prev.map((a) => (a.id === id ? { ...a, status: 'rejected' } : a))
    );
    setActionMessage(`Application for "${name}" rejected.`);
  };

  const handleArchiveProduct = (id: string, name: string) => {
    setProducts((prev) =>
      prev.map((p) => (p.id === id ? { ...p, status: 'archived' } : p))
    );
    setActionMessage(`Product "${name}" has been archived and removed from search index.`);
  };

  const handleRefundOrder = (id: string) => {
    setOrders((prev) =>
      prev.map((o) =>
        o.id === id ? { ...o, paymentStatus: 'refunded', orderStatus: 'refunded', disputed: false } : o
      )
    );
    setActionMessage(`Refund initiated for Order #${id} via Razorpay. Order updated to refunded.`);
  };

  const handleAddCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName || !newCatSlug) return;
    setCategoriesList((prev) => [
      ...prev,
      { name: newCatName, slug: newCatSlug, attr: '{"custom": "string"}' },
    ]);
    setNewCatName('');
    setNewCatSlug('');
    setActionMessage(`Category "${newCatName}" created successfully.`);
  };

  return (
    <div className="container mx-auto space-y-6 px-4 py-8">
      {/* Top Banner */}
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-white">
              <Shield className="h-4 w-4" />
            </span>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              Admin Control Center
            </h1>
          </div>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Platform governance, seller approvals, product moderation, dispute mediation & analytics.
          </p>
        </div>
      </div>

      {actionMessage && (
        <div className="flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-xs font-medium text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/60 dark:text-emerald-300">
          <span>{actionMessage}</span>
          <button onClick={() => setActionMessage(null)} className="text-emerald-600 hover:text-emerald-900">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-2 dark:border-slate-800">
        {[
          { id: 'sellers', label: 'Seller Onboarding', icon: Building },
          { id: 'moderation', label: 'Product Moderation', icon: Layers },
          { id: 'disputes', label: 'Orders & Disputes', icon: AlertTriangle },
          { id: 'analytics', label: 'Recommendation Analytics', icon: TrendingUp },
          { id: 'categories', label: 'Category Schema', icon: ShoppingBag },
          { id: 'payouts', label: 'Store Payouts', icon: DollarSign },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-semibold transition ${
                isActive
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-white text-slate-600 hover:bg-slate-100 dark:bg-slate-900 dark:text-slate-400 dark:hover:bg-slate-800'
              }`}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* TAB 1: Seller Onboarding */}
      {activeTab === 'sellers' && (
        <div className="space-y-8">
          {/* Expanding KYC Review Cards */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Interactive KYC Application Cards
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Click any applicant card to expand the full legal KYC review sheet and make an approval decision.
                </p>
              </div>
              <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                {apps.filter((a) => a.status === 'pending').length} pending review
              </span>
            </div>

            <ExpandingCardGrid
              items={apps.map((app) => ({
                id: `admin-app-${app.id}`,
                image:
                  app.businessType === 'Pvt Ltd'
                    ? 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=800&q=80'
                    : 'https://images.unsplash.com/photo-1513519245088-0e12902e5a38?w=800&q=80',
                category: `KYC • ${app.businessType}`,
                title: app.businessName,
                subtitle: `${app.applicant} • Tax ID: ${app.taxId} • Submitted ${app.submittedAt}`,
                badge: app.status.toUpperCase(),
                metadata: app,
              }))}
              layoutGroupId="admin-kyc-group"
              className="grid-cols-1 md:grid-cols-2 gap-6"
              cardAspect="aspect-[16/10]"
              renderDetail={(item, onClose) => {
                const app = item.metadata as MockApp;
                return (
                  <div className="space-y-6">
                    <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-4 dark:border-slate-800">
                      <div>
                        <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                          KYC Review: {app.businessName}
                        </h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                          Submitted {app.submittedAt} • Status: {app.status.toUpperCase()}
                        </p>
                      </div>
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-bold ${
                          app.status === 'pending'
                            ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                            : app.status === 'approved'
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                            : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                        }`}
                      >
                        {app.status.toUpperCase()}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-800/40">
                        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                          Applicant &amp; Entity
                        </p>
                        <p className="text-sm font-bold text-slate-900 dark:text-white">{app.applicant}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                          Entity Structure: {app.businessType}
                        </p>
                        <p className="text-xs font-mono text-indigo-600 dark:text-indigo-400 mt-1">
                          GSTIN/PAN: {app.taxId}
                        </p>
                      </div>

                      <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-800/40">
                        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                          Payout Bank Account
                        </p>
                        <p className="text-sm font-bold text-slate-900 dark:text-white">{app.bankName}</p>
                        <p className="text-xs font-mono text-slate-500 dark:text-slate-400 mt-1">
                          IFSC Code: {app.ifsc}
                        </p>
                        <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1 font-semibold">
                          Penny-drop verification: Success
                        </p>
                      </div>
                    </div>

                    <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-4 dark:border-slate-800 dark:bg-slate-800/20 text-xs text-slate-600 dark:text-slate-400 space-y-1">
                      <p className="font-semibold text-slate-800 dark:text-slate-200">Compliance Summary:</p>
                      <p>• GST portal active registration verified against Indian Department of Revenue.</p>
                      <p>• Zero dispute records across connected payment processors.</p>
                      <p>• Default seller store commission will be set to 10% (1,000 bps).</p>
                    </div>

                    <div className="flex items-center gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
                      {app.status === 'pending' ? (
                        <>
                          <button
                            type="button"
                            onClick={() => {
                              handleApproveSeller(app.id, app.businessName);
                              onClose();
                            }}
                            className="flex-1 inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-6 py-3.5 text-base font-bold text-white shadow-lg shadow-emerald-600/30 transition hover:bg-emerald-500"
                          >
                            <Check className="h-5 w-5" />
                            <span>Approve</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              handleRejectSeller(app.id, app.businessName);
                              onClose();
                            }}
                            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-rose-200 bg-white px-5 py-3.5 text-sm font-bold text-rose-600 hover:bg-rose-50 dark:border-rose-900 dark:bg-slate-800 dark:text-rose-400"
                          >
                            <X className="h-4 w-4" />
                            <span>Reject</span>
                          </button>
                        </>
                      ) : (
                        <div className="flex-1 text-center py-2 text-sm font-semibold text-slate-400">
                          Application has been {app.status}.
                        </div>
                      )}
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
          </div>

          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-800 dark:bg-slate-800/50 dark:text-slate-400">
                <tr>
                  <th className="p-4 font-semibold">Business & Applicant</th>
                  <th className="p-4 font-semibold">Type & Tax ID</th>
                  <th className="p-4 font-semibold">Bank / Payout</th>
                  <th className="p-4 font-semibold">Status</th>
                  <th className="p-4 text-right font-semibold">Decision</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {apps.map((app) => (
                  <tr key={app.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                    <td className="p-4">
                      <div className="font-bold text-slate-900 dark:text-white">{app.businessName}</div>
                      <div className="text-[11px] text-slate-500">{app.applicant}</div>
                      <div className="mt-1 flex items-center gap-1 text-[10px] text-slate-400">
                        <Clock className="h-3 w-3" /> {app.submittedAt}
                      </div>
                    </td>
                    <td className="p-4">
                      <span className="inline-flex rounded bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                        {app.businessType}
                      </span>
                      <div className="mt-1 font-mono text-[11px] text-slate-500">{app.taxId}</div>
                    </td>
                    <td className="p-4">
                      <div className="font-medium text-slate-800 dark:text-slate-200">{app.bankName}</div>
                      <div className="font-mono text-[11px] text-slate-500">IFSC: {app.ifsc}</div>
                    </td>
                    <td className="p-4">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                          app.status === 'pending'
                            ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                            : app.status === 'approved'
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                            : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                        }`}
                      >
                        {app.status.toUpperCase()}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      {app.status === 'pending' ? (
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleApproveSeller(app.id, app.businessName)}
                            className="flex items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-emerald-500"
                          >
                            <Check className="h-3.5 w-3.5" /> Approve
                          </button>
                          <button
                            onClick={() => handleRejectSeller(app.id, app.businessName)}
                            className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-rose-50 hover:text-rose-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                          >
                            <X className="h-3.5 w-3.5" /> Reject
                          </button>
                        </div>
                      ) : (
                        <span className="text-[11px] text-slate-400">Processed</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: Product Moderation */}
      {activeTab === 'moderation' && (
        <div className="space-y-4">
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-800 dark:bg-slate-800/50 dark:text-slate-400">
                <tr>
                  <th className="p-4 font-semibold">Product & Store</th>
                  <th className="p-4 font-semibold">Category</th>
                  <th className="p-4 font-semibold">Price</th>
                  <th className="p-4 font-semibold">Reports</th>
                  <th className="p-4 font-semibold">Status</th>
                  <th className="p-4 text-right font-semibold">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {products.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                    <td className="p-4">
                      <div className="font-bold text-slate-900 dark:text-white">{p.name}</div>
                      <div className="text-[11px] text-slate-500">{p.store}</div>
                    </td>
                    <td className="p-4 text-slate-600 dark:text-slate-400">{p.category}</td>
                    <td className="p-4 font-bold text-slate-900 dark:text-white">₹{p.price}</td>
                    <td className="p-4">
                      {p.reports > 0 ? (
                        <span className="inline-flex items-center gap-1 rounded bg-rose-100 px-2 py-0.5 text-[11px] font-semibold text-rose-800 dark:bg-rose-950 dark:text-rose-300">
                          <AlertTriangle className="h-3 w-3" /> {p.reports} reports
                        </span>
                      ) : (
                        <span className="text-slate-400">Clean</span>
                      )}
                    </td>
                    <td className="p-4">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                          p.status === 'active'
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                            : 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-400'
                        }`}
                      >
                        {p.status.toUpperCase()}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      {p.status === 'active' ? (
                        <button
                          onClick={() => handleArchiveProduct(p.id, p.name)}
                          className="rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-100 dark:border-rose-900 dark:bg-rose-950/60 dark:text-rose-300"
                        >
                          Archive & Hide
                        </button>
                      ) : (
                        <span className="text-[11px] text-slate-400">Archived</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: Orders & Disputes */}
      {activeTab === 'disputes' && (
        <div className="space-y-4">
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-800 dark:bg-slate-800/50 dark:text-slate-400">
                <tr>
                  <th className="p-4 font-semibold">Order ID & Date</th>
                  <th className="p-4 font-semibold">Customer</th>
                  <th className="p-4 font-semibold">Total & Status</th>
                  <th className="p-4 font-semibold">Dispute Details</th>
                  <th className="p-4 text-right font-semibold">Mediation Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {orders.map((o) => (
                  <tr key={o.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                    <td className="p-4">
                      <div className="font-mono font-bold text-slate-900 dark:text-white">{o.id}</div>
                      <div className="text-[11px] text-slate-500">{o.createdAt}</div>
                    </td>
                    <td className="p-4 font-medium text-slate-900 dark:text-white">{o.customer}</td>
                    <td className="p-4">
                      <div className="font-bold text-slate-900 dark:text-white">₹{o.total}</div>
                      <span className="text-[11px] text-slate-500">{o.paymentStatus}</span>
                    </td>
                    <td className="p-4">
                      {o.disputed ? (
                        <div className="rounded bg-amber-50 p-2 text-[11px] text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
                          {o.disputeReason}
                        </div>
                      ) : (
                        <span className="text-slate-400">No active dispute</span>
                      )}
                    </td>
                    <td className="p-4 text-right">
                      {o.disputed && o.paymentStatus !== 'refunded' ? (
                        <button
                          onClick={() => handleRefundOrder(o.id)}
                          className="inline-flex items-center gap-1 rounded-lg bg-rose-600 px-2.5 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-rose-500"
                        >
                          <RotateCcw className="h-3.5 w-3.5" /> Issue Refund
                        </button>
                      ) : (
                        <span className="text-[11px] text-slate-400">
                          {o.paymentStatus === 'refunded' ? 'Refunded' : 'Normal'}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: Recommendation Analytics */}
      {activeTab === 'analytics' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                Top Rail CTR
              </span>
              <div className="mt-2 text-2xl font-bold text-indigo-600">38.0%</div>
              <p className="mt-1 text-[11px] text-slate-500">
                &quot;Pick up where you left off&quot; delivers 1.7x higher CTR than generic feeds
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                Rec-Driven Add to Carts
              </span>
              <div className="mt-2 text-2xl font-bold text-emerald-600">1,466 items</div>
              <p className="mt-1 text-[11px] text-slate-500">
                Decayed search & view history directly drove 42% of all cart additions
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                Average Feed Generation Latency
              </span>
              <div className="mt-2 text-2xl font-bold text-amber-600">42ms</div>
              <p className="mt-1 text-[11px] text-slate-500">
                p95 &lt; 85ms with Redis feed caching & Typesense candidate generation
              </p>
            </div>
          </div>

          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="border-b border-slate-200 p-4 font-semibold text-slate-900 dark:border-slate-800 dark:text-white">
              Rail Performance & Conversion Attribution
            </div>
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-800 dark:bg-slate-800/50 dark:text-slate-400">
                <tr>
                  <th className="p-4 font-semibold">Rail Segment</th>
                  <th className="p-4 font-semibold">Impressions</th>
                  <th className="p-4 font-semibold">Clicks</th>
                  <th className="p-4 font-semibold">CTR</th>
                  <th className="p-4 font-semibold">Add to Carts</th>
                  <th className="p-4 font-semibold">Purchases</th>
                  <th className="p-4 text-right font-semibold">Conversion</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {mockRailAnalytics.map((r, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                    <td className="p-4 font-semibold text-slate-900 dark:text-white">{r.rail}</td>
                    <td className="p-4 text-slate-600 dark:text-slate-400">{r.impressions}</td>
                    <td className="p-4 text-slate-600 dark:text-slate-400">{r.clicks}</td>
                    <td className="p-4 font-bold text-indigo-600">{r.ctr}</td>
                    <td className="p-4 text-slate-600 dark:text-slate-400">{r.addToCarts}</td>
                    <td className="p-4 text-slate-600 dark:text-slate-400">{r.purchases}</td>
                    <td className="p-4 text-right font-bold text-emerald-600">{r.conversion}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 5: Category Management */}
      {activeTab === 'categories' && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="lg:col-span-1 rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Create New Department</h3>
            <p className="mt-1 text-xs text-slate-500">Define name, URL slug, and schema validation.</p>
            <form onSubmit={handleAddCategory} className="mt-4 space-y-3">
              <div>
                <label className="text-xs font-medium text-slate-700 dark:text-slate-300">Name</label>
                <input
                  type="text"
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  placeholder="e.g. Organic Herbal Teas"
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-xs focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-800"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-700 dark:text-slate-300">Slug</label>
                <input
                  type="text"
                  value={newCatSlug}
                  onChange={(e) => setNewCatSlug(e.target.value)}
                  placeholder="e.g. organic-herbal-teas"
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-xs focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-800"
                />
              </div>
              <button
                type="submit"
                className="flex w-full items-center justify-center gap-1 rounded-lg bg-indigo-600 py-2 text-xs font-semibold text-white hover:bg-indigo-500"
              >
                <Plus className="h-4 w-4" /> Add Category
              </button>
            </form>
          </div>

          <div className="lg:col-span-2 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-800 dark:bg-slate-800/50 dark:text-slate-400">
                <tr>
                  <th className="p-4 font-semibold">Category</th>
                  <th className="p-4 font-semibold">Slug</th>
                  <th className="p-4 font-semibold">Attribute Schema (JSONB)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {categoriesList.map((c, i) => (
                  <tr key={i} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                    <td className="p-4 font-bold text-slate-900 dark:text-white">{c.name}</td>
                    <td className="p-4 font-mono text-[11px] text-slate-500">{c.slug}</td>
                    <td className="p-4 font-mono text-[11px] text-indigo-600 dark:text-indigo-400">
                      {c.attr}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 6: Store Payouts */}
      {activeTab === 'payouts' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between rounded-xl border border-indigo-100 bg-indigo-50/60 p-5 dark:border-indigo-950 dark:bg-slate-900">
            <div>
              <h4 className="text-sm font-bold text-slate-900 dark:text-white">Batch Payout Generation</h4>
              <p className="text-xs text-slate-500">
                Trigger automated settlement for all stores with eligible fulfilled order balance &gt;= ₹1,000.
              </p>
            </div>
            <button
              onClick={() => setActionMessage('Payout batch triggered! 5 stores settled for a total of ₹1,48,200.')}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-indigo-500"
            >
              Generate Settlement Batch
            </button>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {[
              { store: 'SoundWave Audio Lab', balance: '₹42,500', status: 'Eligible', orders: 18 },
              { store: 'Apex Tech Solutions', balance: '₹68,200', status: 'Eligible', orders: 27 },
              { store: 'Clay & Kiln Studio', balance: '₹14,900', status: 'Eligible', orders: 12 },
            ].map((s, idx) => (
              <div
                key={idx}
                className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900"
              >
                <div className="flex items-center justify-between">
                  <h5 className="font-bold text-slate-900 dark:text-white">{s.store}</h5>
                  <span className="rounded bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                    {s.status}
                  </span>
                </div>
                <div className="mt-3 text-xl font-bold text-slate-900 dark:text-white">{s.balance}</div>
                <p className="mt-1 text-xs text-slate-500">{s.orders} fulfilled orders awaiting payout</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
