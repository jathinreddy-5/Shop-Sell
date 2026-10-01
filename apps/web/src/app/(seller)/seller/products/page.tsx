'use client';

import React, { useState } from 'react';
import {
  Plus,
  Search,
  Filter,
  Upload,
  Archive,
  Edit2,
  Check,
  X,
  Package,
} from 'lucide-react';
import { LoadingThreeDotsJumping } from '@/components/loading';

interface MockProduct {
  id: string;
  name: string;
  category: string;
  price: number;
  stock: number;
  salesCount: number;
  status: 'active' | 'draft' | 'archived';
  image: string;
}

const initialProducts: MockProduct[] = [
  {
    id: 'prod-001',
    name: 'AcousticPro True Wireless Earbuds',
    category: 'Audio & Headphones',
    price: 3499,
    stock: 28,
    salesCount: 142,
    status: 'active',
    image: 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=200&q=80',
  },
  {
    id: 'prod-002',
    name: 'Noise Isolating ANC Studio Buds',
    category: 'Audio & Headphones',
    price: 4299,
    stock: 14,
    salesCount: 89,
    status: 'active',
    image: 'https://images.unsplash.com/photo-1606220588913-b3aacb4d2f46?w=200&q=80',
  },
  {
    id: 'prod-003',
    name: 'Hi-Fi Over-Ear Studio Monitors',
    category: 'Audio & Headphones',
    price: 8999,
    stock: 4, // low stock alert!
    salesCount: 210,
    status: 'active',
    image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=200&q=80',
  },
  {
    id: 'prod-004',
    name: 'USB-C Fast Charging Audio DAC Cable',
    category: 'Electronics & Gadgets',
    price: 799,
    stock: 0,
    salesCount: 45,
    status: 'draft',
    image: 'https://images.unsplash.com/photo-1545454675-3531b543be5d?w=200&q=80',
  },
];

export default function SellerProductsPage() {
  const [products, setProducts] = useState<MockProduct[]>(initialProducts);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showCsvModal, setShowCsvModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  // New product form state
  const [newProd, setNewProd] = useState({
    name: '',
    category: 'Audio & Headphones',
    price: '',
    stock: '',
    image: '',
    description: '',
  });

  // CSV text state
  const [csvText, setCsvText] = useState(
    'Name,Price,Stock,Category\nVintage Analog Headphones,5499,20,Audio & Headphones\nBraided 3.5mm Aux Cable,399,100,Audio & Headphones'
  );

  const handleCreateProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProd.name || !newProd.price || !newProd.stock) return;

    setIsSaving(true);
    setTimeout(() => {
      const created: MockProduct = {
        id: `prod-${Date.now()}`,
        name: newProd.name,
        category: newProd.category,
        price: parseFloat(newProd.price),
        stock: parseInt(newProd.stock, 10),
        salesCount: 0,
        status: 'active',
        image:
          newProd.image ||
          'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=200&q=80',
      };

      setProducts([created, ...products]);
      setIsSaving(false);
      setShowAddModal(false);
      setNewProd({
        name: '',
        category: 'Audio & Headphones',
        price: '',
        stock: '',
        image: '',
        description: '',
      });
    }, 400);
  };

  const handleCsvImport = () => {
    setIsImporting(true);
    setTimeout(() => {
      const lines = csvText.trim().split('\n').slice(1);
      const imported: MockProduct[] = lines.flatMap((line, idx) => {
        const parts = line.split(',');
        if (parts.length >= 3) {
          return [
            {
              id: `prod-csv-${Date.now()}-${idx}`,
              name: parts[0].trim(),
              price: parseFloat(parts[1].trim()) || 999,
              stock: parseInt(parts[2].trim(), 10) || 10,
              category: parts[3]?.trim() || 'General',
              salesCount: 0,
              status: 'active' as const,
              image:
                'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=200&q=80',
            },
          ];
        }
        return [];
      });

      setProducts([...imported, ...products]);
      setIsImporting(false);
      setShowCsvModal(false);
    }, 400);
  };

  const handleArchive = (id: string) => {
    setProducts(
      products.map((p) => (p.id === id ? { ...p, status: 'archived' } : p))
    );
  };

  const filtered = products.filter((p) => {
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || p.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Product Catalog
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Manage your store listings, sync inventory, and upload high-res images to Cloudflare R2.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowCsvModal(true)}
            className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
          >
            <Upload className="h-4 w-4" /> Bulk CSV Import
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-emerald-500"
          >
            <Plus className="h-4 w-4" /> Add Product
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative max-w-sm flex-1">
          <input
            type="text"
            placeholder="Search products by name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-4 text-xs outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 dark:border-slate-800 dark:bg-slate-900"
          />
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-slate-400" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-700 outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active Only</option>
            <option value="draft">Drafts</option>
            <option value="archived">Archived</option>
          </select>
        </div>
      </div>

      {/* Products Table */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <table className="w-full text-left text-xs">
          <thead className="border-b border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-800 dark:bg-slate-800/50 dark:text-slate-400">
            <tr>
              <th className="p-4 font-semibold">Product</th>
              <th className="p-4 font-semibold">Category</th>
              <th className="p-4 font-semibold">Price (INR)</th>
              <th className="p-4 font-semibold">Stock</th>
              <th className="p-4 font-semibold">Sales</th>
              <th className="p-4 font-semibold">Status</th>
              <th className="p-4 text-right font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {filtered.map((p) => (
              <tr key={p.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                <td className="p-4">
                  <div className="flex items-center gap-3">
                    <img
                      src={p.image}
                      alt={p.name}
                      className="h-10 w-10 rounded-lg object-cover"
                    />
                    <div>
                      <div className="font-bold text-slate-900 dark:text-white">
                        {p.name}
                      </div>
                      <div className="font-mono text-[10px] text-slate-400">{p.id}</div>
                    </div>
                  </div>
                </td>
                <td className="p-4 text-slate-600 dark:text-slate-300">{p.category}</td>
                <td className="p-4 font-bold text-slate-900 dark:text-white">
                  ₹{p.price.toLocaleString('en-IN')}
                </td>
                <td className="p-4">
                  <span
                    className={`font-semibold ${
                      p.stock === 0
                        ? 'text-rose-600'
                        : p.stock <= 5
                        ? 'text-amber-600'
                        : 'text-slate-800 dark:text-slate-200'
                    }`}
                  >
                    {p.stock} units
                  </span>
                  {p.stock <= 5 && p.stock > 0 && (
                    <span className="ml-1.5 rounded bg-amber-100 px-1 py-0.5 text-[9px] font-bold text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                      Low
                    </span>
                  )}
                </td>
                <td className="p-4 text-slate-600 dark:text-slate-300">{p.salesCount}</td>
                <td className="p-4">
                  <span
                    className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                      p.status === 'active'
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                        : p.status === 'draft'
                        ? 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                        : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                    }`}
                  >
                    {p.status}
                  </span>
                </td>
                <td className="p-4 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={() => handleArchive(p.id)}
                      className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-rose-600 dark:hover:bg-slate-800"
                      title="Archive Product"
                    >
                      <Archive className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add Product Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl dark:bg-slate-900">
            <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Add New Product Listing
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <form onSubmit={handleCreateProduct} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300">
                  Product Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Handmade Terracotta Teapot"
                  value={newProd.name}
                  onChange={(e) => setNewProd({ ...newProd, name: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-xs outline-none focus:border-emerald-600 dark:border-slate-700 dark:bg-slate-800"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300">
                    Price (INR ₹) *
                  </label>
                  <input
                    type="number"
                    required
                    placeholder="1299"
                    value={newProd.price}
                    onChange={(e) => setNewProd({ ...newProd, price: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-xs outline-none focus:border-emerald-600 dark:border-slate-700 dark:bg-slate-800"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300">
                    Inventory Stock *
                  </label>
                  <input
                    type="number"
                    required
                    placeholder="25"
                    value={newProd.stock}
                    onChange={(e) => setNewProd({ ...newProd, stock: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-xs outline-none focus:border-emerald-600 dark:border-slate-700 dark:bg-slate-800"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300">
                  Image URL (Cloudflare R2 / Public CDN)
                </label>
                <input
                  type="url"
                  placeholder="https://images.unsplash.com/..."
                  value={newProd.image}
                  onChange={(e) => setNewProd({ ...newProd, image: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-xs outline-none focus:border-emerald-600 dark:border-slate-700 dark:bg-slate-800"
                />
              </div>

              <div className="flex justify-end gap-2 border-t border-slate-100 pt-4 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="rounded-lg border border-slate-200 px-3 py-2 font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex items-center justify-center rounded-lg bg-emerald-600 px-4 py-2 font-semibold text-white shadow-sm hover:bg-emerald-500 disabled:opacity-50"
                >
                  {isSaving ? (
                    <LoadingThreeDotsJumping size={6} jumpHeight={8} gap={4} color="#FFFFFF" label="Saving product" />
                  ) : (
                    'Save & Publish'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CSV Import Modal */}
      {showCsvModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl dark:bg-slate-900">
            <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Bulk CSV Product Import
              </h3>
              <button
                onClick={() => setShowCsvModal(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="mb-2 text-xs text-slate-500">
              Paste CSV rows in the format: <code>Name,Price,Stock,Category</code>
            </p>
            <textarea
              rows={6}
              value={csvText}
              onChange={(e) => setCsvText(e.target.value)}
              className="w-full rounded-lg border border-slate-300 p-3 font-mono text-xs outline-none focus:border-emerald-600 dark:border-slate-700 dark:bg-slate-800"
            />
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowCsvModal(false)}
                className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isImporting}
                onClick={handleCsvImport}
                className="flex items-center justify-center rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-emerald-500 disabled:opacity-50"
              >
                {isImporting ? (
                  <LoadingThreeDotsJumping size={6} jumpHeight={8} gap={4} color="#FFFFFF" label="Importing listings" />
                ) : (
                  'Process & Import Listings'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
