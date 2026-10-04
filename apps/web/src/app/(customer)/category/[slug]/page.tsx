'use client';

import React from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Star, ChevronRight, ShoppingBag } from 'lucide-react';
import { getProductImage } from '@/lib/products/product-images';

const mockCategoryMap: Record<
  string,
  { name: string; description: string; count: number }
> = {
  'audio-headphones': {
    name: 'Audio & Headphones',
    description: 'Immersive sound gear, studio monitors, noise-cancelling earbuds, and audiophile accessories.',
    count: 24,
  },
  'handmade-crafts-pottery': {
    name: 'Handmade Crafts & Pottery',
    description: 'Authentic clayware, studio ceramics, terracotta planters, and artisanal home vessels.',
    count: 18,
  },
  'mens-fashion': {
    name: "Men's Fashion",
    description: 'Sustainable cotton apparel, casual shirts, raw denim, and timeless wardrobe essentials.',
    count: 32,
  },
  'home-decor-lighting': {
    name: 'Home Decor & Lighting',
    description: 'Minimalist lamps, brass decor, artisan wall art, and ambient living pieces.',
    count: 20,
  },
  'organic-foods-gourmet': {
    name: 'Organic Foods & Gourmet',
    description: 'Single-origin spices, forest raw honey, A2 ghee, and Himalayan dry fruits.',
    count: 15,
  },
};

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const category = mockCategoryMap[slug] || {
    name: slug.split('-').map((s) => s.charAt(0).toUpperCase() + s.slice(1)).join(' '),
    description: `Explore our handpicked collection in ${slug}.`,
    count: 12,
  };

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Breadcrumbs */}
      <nav className="mb-4 flex items-center gap-1.5 text-xs text-slate-500">
        <Link href="/" className="hover:text-slate-800 dark:hover:text-slate-200">
          Home
        </Link>
        <ChevronRight className="h-3 w-3" />
        <Link href="/search" className="hover:text-slate-800 dark:hover:text-slate-200">
          Categories
        </Link>
        <ChevronRight className="h-3 w-3" />
        <span className="font-semibold text-slate-900 dark:text-white">
          {category.name}
        </span>
      </nav>

      {/* Category Banner */}
      <div className="mb-8 rounded-2xl border border-slate-200 bg-gradient-to-r from-slate-900 to-indigo-950 p-8 text-white shadow-sm">
        <span className="rounded-full bg-white/20 px-3 py-1 text-xs font-semibold backdrop-blur">
          {category.count}+ Verified Listings
        </span>
        <h1 className="mt-3 text-2xl font-black tracking-tight sm:text-3xl">
          {category.name}
        </h1>
        <p className="mt-2 max-w-xl text-xs text-slate-300 sm:text-sm">
          {category.description}
        </p>
      </div>

      {/* Catalog items */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        {[1, 2, 3, 4, 5, 6, 7, 8].map((idx) => (
          <div
            key={idx}
            className="group flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white transition hover:-translate-y-1 hover:shadow-lg dark:border-slate-800 dark:bg-slate-900"
          >
            <div className="aspect-square bg-slate-100 dark:bg-slate-800">
              <img
                src={getProductImage({
                  name: `${category.name} Edition #${idx}`,
                  category_name: category.name,
                  slug: `${categorySlug}-${idx}`,
                }, idx)}
                alt={`${category.name} Item ${idx}`}
                className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
              />
            </div>
            <div className="flex flex-1 flex-col p-4">
              <h3 className="line-clamp-2 text-xs font-bold text-slate-900 dark:text-white">
                {category.name} Premium Edition #{idx}
              </h3>
              <div className="mt-1 flex items-center gap-1 text-[11px] text-amber-500">
                <Star className="h-3 w-3 fill-current" />
                <span className="font-semibold">4.8</span>
                <span className="text-slate-400">({20 + idx * 8})</span>
              </div>
              <div className="mt-auto flex items-center justify-between pt-3">
                <span className="text-sm font-bold text-slate-900 dark:text-white">
                  ₹{(999 + idx * 350).toLocaleString('en-IN')}
                </span>
                <button className="flex items-center gap-1 rounded-lg bg-indigo-600 px-2.5 py-1 text-xs font-semibold text-white transition hover:bg-indigo-500">
                  <ShoppingBag className="h-3 w-3" /> Add
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
