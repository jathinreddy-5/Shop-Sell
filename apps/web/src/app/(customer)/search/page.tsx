'use client';

import React, { useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Star, Filter, ArrowUpDown, ShoppingBag, Check, ExternalLink, ShieldCheck, Truck } from 'lucide-react';
import {
  ExpandingCardGrid,
  ExpandingCardItem,
} from '../../../components/expanding-cards';

interface ProductItem {
  id: string;
  name: string;
  slug: string;
  price: number;
  compare_at_price?: number;
  rating: number;
  rating_count: number;
  category: string;
  store: string;
  inStock: boolean;
  image: string;
}

const mockCatalog: ProductItem[] = [
  {
    id: 'p1',
    name: 'AcousticPro True Wireless Earbuds',
    slug: 'acousticpro-true-wireless-earbuds',
    price: 3499,
    compare_at_price: 4999,
    rating: 4.8,
    rating_count: 142,
    category: 'Audio & Headphones',
    store: 'SoundWave Audio Lab',
    inStock: true,
    image: 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=600&q=80',
  },
  {
    id: 'p2',
    name: 'Noise Isolating ANC Studio Buds',
    slug: 'noise-isolating-anc-studio-buds',
    price: 4299,
    compare_at_price: 5999,
    rating: 4.9,
    rating_count: 89,
    category: 'Audio & Headphones',
    store: 'SoundWave Audio Lab',
    inStock: true,
    image: 'https://images.unsplash.com/photo-1606220588913-b3aacb4d2f46?w=600&q=80',
  },
  {
    id: 'p3',
    name: 'Handthrown Ceramic Coffee Mug 350ml',
    slug: 'handthrown-ceramic-coffee-mug-350ml',
    price: 699,
    compare_at_price: 899,
    rating: 4.95,
    rating_count: 73,
    category: 'Handmade Crafts & Pottery',
    store: 'Aura Artisanal Living',
    inStock: true,
    image: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=600&q=80',
  },
  {
    id: 'p4',
    name: 'Organic Indigo Dyed Cotton Shirt',
    slug: 'organic-indigo-dyed-cotton-shirt',
    price: 1899,
    compare_at_price: 2499,
    rating: 4.7,
    rating_count: 64,
    category: "Men's Fashion",
    store: 'Urban Stitch Fashion',
    inStock: true,
    image: 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=600&q=80',
  },
  {
    id: 'p5',
    name: 'Solid Brass Mechanical Desk Lamp',
    slug: 'solid-brass-mechanical-desk-lamp',
    price: 3899,
    compare_at_price: 4999,
    rating: 4.85,
    rating_count: 41,
    category: 'Home Decor & Lighting',
    store: 'Aura Artisanal Living',
    inStock: true,
    image: 'https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=600&q=80',
  },
  {
    id: 'p6',
    name: 'Himalayan Cold-Pressed Organic Honey 500g',
    slug: 'himalayan-cold-pressed-organic-honey-500g',
    price: 549,
    compare_at_price: 699,
    rating: 4.9,
    rating_count: 118,
    category: 'Organic Foods & Gourmet',
    store: 'Green Roots Organics',
    inStock: true,
    image: 'https://images.unsplash.com/photo-1587049352846-4a222e784d38?w=600&q=80',
  },
];

function SearchContent() {
  const searchParams = useSearchParams();
  const query = searchParams.get('q') || '';
  const [sortBy, setSortBy] = useState('popular');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [inStockOnly, setInStockOnly] = useState(false);
  const [addedItems, setAddedItems] = useState<string[]>([]);

  const handleAddToCart = (id: string) => {
    setAddedItems((prev) => [...prev, id]);
    setTimeout(() => {
      setAddedItems((prev) => prev.filter((item) => item !== id));
    }, 2000);
  };

  // Filter products
  const filtered = mockCatalog.filter((item) => {
    const matchesQuery =
      !query ||
      item.name.toLowerCase().includes(query.toLowerCase()) ||
      item.category.toLowerCase().includes(query.toLowerCase());
    const matchesCat =
      selectedCategory === 'all' || item.category === selectedCategory;
    const matchesStock = !inStockOnly || item.inStock;
    return matchesQuery && matchesCat && matchesStock;
  });

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl dark:text-white">
            {query ? `Search results for "${query}"` : 'All Products'}
          </h1>
          <p className="text-xs text-slate-500">
            Showing {filtered.length} products found
          </p>
        </div>

        {/* Sort selector */}
        <div className="flex items-center gap-2 text-xs">
          <ArrowUpDown className="h-4 w-4 text-slate-400" />
          <span className="font-semibold text-slate-600 dark:text-slate-300">
            Sort by:
          </span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs outline-none dark:border-slate-800 dark:bg-slate-900"
          >
            <option value="popular">Most Popular</option>
            <option value="rating">Highest Rated</option>
            <option value="price_asc">Price: Low to High</option>
            <option value="price_desc">Price: High to Low</option>
            <option value="newest">New Arrivals</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8 md:grid-cols-4">
        {/* Filters Sidebar */}
        <aside className="space-y-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3 text-sm font-bold text-slate-900 dark:border-slate-800 dark:text-white">
            <Filter className="h-4 w-4" /> Filters
          </div>

          {/* Category Filter */}
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Category
            </label>
            <div className="space-y-1 text-xs">
              <label className="flex cursor-pointer items-center gap-2">
                <input
                  type="radio"
                  name="category"
                  checked={selectedCategory === 'all'}
                  onChange={() => setSelectedCategory('all')}
                  className="text-indigo-600"
                />
                <span>All Categories</span>
              </label>
              {[
                'Audio & Headphones',
                'Handmade Crafts & Pottery',
                "Men's Fashion",
                'Home Decor & Lighting',
                'Organic Foods & Gourmet',
              ].map((cat) => (
                <label key={cat} className="flex cursor-pointer items-center gap-2">
                  <input
                    type="radio"
                    name="category"
                    checked={selectedCategory === cat}
                    onChange={() => setSelectedCategory(cat)}
                    className="text-indigo-600"
                  />
                  <span>{cat}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Stock Availability */}
          <div className="space-y-2 border-t border-slate-100 pt-4 dark:border-slate-800">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Availability
            </label>
            <label className="flex cursor-pointer items-center gap-2 text-xs">
              <input
                type="checkbox"
                checked={inStockOnly}
                onChange={(e) => setInStockOnly(e.target.checked)}
                className="rounded text-indigo-600"
              />
              <span>In Stock Only</span>
            </label>
          </div>
        </aside>

        {/* Product Grid */}
        <div className="md:col-span-3">
          {filtered.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 p-12 text-center text-slate-500">
              <p className="text-sm font-semibold">No products found</p>
              <p className="mt-1 text-xs">Try adjusting your filters or search terms.</p>
            </div>
          ) : (
            <ExpandingCardGrid
              items={filtered.map((item) => ({
                id: `search-item-${item.id}`,
                image: item.image,
                category: `${item.category} • ${item.store}`,
                title: item.name,
                subtitle: `₹${item.price.toLocaleString('en-IN')} • ★ ${item.rating} (${item.rating_count} reviews)`,
                badge: item.inStock ? 'In Stock' : 'Low Stock',
                metadata: item,
              }))}
              layoutGroupId="search-results-group"
              className="grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5"
              cardAspect="aspect-[4/5]"
              renderDetail={(item, onClose) => {
                const meta = item.metadata as ProductItem;
                const isAdded = addedItems.includes(meta.id);

                return (
                  <div className="space-y-6">
                    <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-5 dark:border-slate-800">
                      <div>
                        <span className="text-3xl font-black text-slate-900 dark:text-white">
                          ₹{meta.price.toLocaleString('en-IN')}
                        </span>
                        {meta.compare_at_price && (
                          <span className="ml-3 text-sm font-medium text-slate-400 line-through">
                            ₹{meta.compare_at_price.toLocaleString('en-IN')}
                          </span>
                        )}
                        <span className="ml-2 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300">
                          {meta.inStock ? 'In Stock' : 'Low Stock'}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 text-amber-500">
                        <Star className="h-4 w-4 fill-current" />
                        <span className="font-bold text-slate-900 dark:text-white">{meta.rating}</span>
                        <span className="text-xs text-slate-400">({meta.rating_count} reviews)</span>
                      </div>
                    </div>

                    <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-800/40">
                      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Store & Fulfillment</p>
                      <p className="text-base font-bold text-slate-900 dark:text-white">{meta.store}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                        Category: {meta.category} • Ships direct from vendor warehouse
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="flex items-center gap-2 rounded-xl border border-slate-100 bg-white p-3 dark:border-slate-800 dark:bg-slate-800/50">
                        <Truck className="h-4 w-4 text-indigo-500" />
                        <span className="text-xs font-medium">Pan-India Express</span>
                      </div>
                      <div className="flex items-center gap-2 rounded-xl border border-slate-100 bg-white p-3 dark:border-slate-800 dark:bg-slate-800/50">
                        <ShieldCheck className="h-4 w-4 text-emerald-500" />
                        <span className="text-xs font-medium">Verified Merchant</span>
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row items-center gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                      <button
                        type="button"
                        onClick={() => handleAddToCart(meta.id)}
                        className="flex-1 w-full inline-flex items-center justify-center gap-2 rounded-2xl bg-indigo-600 px-6 py-3.5 text-base font-bold text-white shadow-lg transition hover:bg-indigo-500"
                      >
                        {isAdded ? <Check className="h-5 w-5" /> : <ShoppingBag className="h-5 w-5" />}
                        <span>{isAdded ? 'Added to Cart' : `Add to Cart (₹${meta.price.toLocaleString('en-IN')})`}</span>
                      </button>

                      <Link
                        href={`/product/${meta.slug}`}
                        className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-3.5 text-base font-bold text-slate-800 shadow-sm transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:hover:bg-slate-700"
                      >
                        <span>View full page</span>
                        <ExternalLink className="h-4 w-4" />
                      </Link>
                    </div>
                  </div>
                );
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<div className="container mx-auto p-12 text-center text-xs text-slate-400">Loading catalog...</div>}>
      <SearchContent />
    </Suspense>
  );
}
