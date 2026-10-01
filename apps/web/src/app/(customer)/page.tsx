'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Sparkles,
  TrendingUp,
  ArrowRight,
  X,
  Star,
  Clock,
  Compass,
  Tag,
  ShieldCheck,
  Truck,
  RotateCcw,
  ShoppingBag,
  ExternalLink,
  Layers,
} from 'lucide-react';
import { HomeRecommendationsResponse } from '@shop-sell/shared';
import {
  ExpandingCardGrid,
  ExpandingCardItem,
} from '../../components/expanding-cards';

const fallbackHomeData: HomeRecommendationsResponse = ({
  recentSearches: [
    'wireless earbuds',
    'ceramic coffee mug',
    'linen shirt',
    'mechanical keyboard',
  ],
  rails: [
    {
      title: 'Because you searched "wireless earbuds"',
      reason: 'Based on your recent interest in high-fidelity audio',
      products: [
        {
          id: 'p1',
          name: 'AcousticPro True Wireless Earbuds',
          price: 3499,
          compare_at_price: 4999,
          rating_avg: 4.8,
          rating_count: 142,
          store_name: 'SoundWave Audio Lab',
          images: [
            'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=600&q=80',
          ],
          slug: 'acousticpro-true-wireless-earbuds',
        },
        {
          id: 'p2',
          name: 'Noise Isolating ANC Studio Buds',
          price: 4299,
          compare_at_price: 5999,
          rating_avg: 4.9,
          rating_count: 89,
          store_name: 'SoundWave Audio Lab',
          images: [
            'https://images.unsplash.com/photo-1606220588913-b3aacb4d2f46?w=600&q=80',
          ],
          slug: 'noise-isolating-anc-studio-buds',
        },
        {
          id: 'p3',
          name: 'Minimalist Bluetooth Pocket Speaker',
          price: 1999,
          compare_at_price: 2499,
          rating_avg: 4.7,
          rating_count: 58,
          store_name: 'Apex Tech India',
          images: [
            'https://images.unsplash.com/photo-1545454675-3531b543be5d?w=600&q=80',
          ],
          slug: 'minimalist-bluetooth-pocket-speaker',
        },
        {
          id: 'p4',
          name: 'Hi-Fi Over-Ear Studio Monitors',
          price: 8999,
          compare_at_price: 11999,
          rating_avg: 4.95,
          rating_count: 210,
          store_name: 'Apex Tech India',
          images: [
            'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600&q=80',
          ],
          slug: 'hi-fi-over-ear-studio-monitors',
        },
      ],
    },
  ],
  recommended: [
    {
      id: 'p5',
      name: 'Organic Wildflower Forest Honey 500g',
      price: 649,
      compare_at_price: 799,
      rating_avg: 4.9,
      rating_count: 320,
      store_name: 'Himalayan Organics',
      images: [
        'https://images.unsplash.com/photo-1587049352847-4a222e784d38?w=600&q=80',
      ],
      slug: 'organic-wildflower-forest-honey',
    },
    {
      id: 'p6',
      name: 'Handcrafted Ceramic Dripper Set',
      price: 1899,
      compare_at_price: 2200,
      rating_avg: 4.85,
      rating_count: 76,
      store_name: 'Clay & Kiln Studio',
      images: [
        'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=600&q=80',
      ],
      slug: 'handcrafted-ceramic-dripper-set',
    },
    {
      id: 'p7',
      name: 'Pure Khadi Linen Casual Shirt',
      price: 2499,
      compare_at_price: 3299,
      rating_avg: 4.75,
      rating_count: 112,
      store_name: 'Vedic Loom Collective',
      images: [
        'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=600&q=80',
      ],
      slug: 'pure-khadi-linen-casual-shirt',
    },
    {
      id: 'p8',
      name: 'Cold-Pressed Virgin Coconut Oil',
      price: 499,
      compare_at_price: 599,
      rating_avg: 4.92,
      rating_count: 410,
      store_name: 'Himalayan Organics',
      images: [
        'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=600&q=80',
      ],
      slug: 'cold-pressed-virgin-coconut-oil',
    },
  ],
  trending: [
    {
      id: 'p9',
      name: 'Custom Walnut Mechanical Keyboard',
      price: 7499,
      compare_at_price: 9999,
      rating_avg: 4.96,
      rating_count: 65,
      store_name: 'Apex Tech India',
      images: [
        'https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=600&q=80',
      ],
      slug: 'custom-walnut-mechanical-keyboard',
    },
    {
      id: 'p10',
      name: 'Stoneware Matte Espresso Cups (Set of 4)',
      price: 1299,
      compare_at_price: 1599,
      rating_avg: 4.8,
      rating_count: 94,
      store_name: 'Clay & Kiln Studio',
      images: [
        'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=600&q=80',
      ],
      slug: 'stoneware-matte-espresso-cups',
    },
    {
      id: 'p11',
      name: 'Full Grain Leather Weekender Duffel',
      price: 6899,
      compare_at_price: 8999,
      rating_avg: 4.91,
      rating_count: 150,
      store_name: 'Heritage Leathers Co',
      images: [
        'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=600&q=80',
      ],
      slug: 'leather-weekender-duffel',
    },
    {
      id: 'p12',
      name: 'Organic Single-Estate Assam CTC Tea',
      price: 450,
      compare_at_price: 550,
      rating_avg: 4.88,
      rating_count: 230,
      store_name: 'Himalayan Organics',
      images: [
        'https://images.unsplash.com/photo-1576092768241-dec231879fc3?w=600&q=80',
      ],
      slug: 'organic-assam-tea',
    },
  ],
}) as unknown as HomeRecommendationsResponse;

const categoryShortcuts = [
  { name: 'Electronics & Audio', slug: 'electronics-gadgets', count: '45+ items', icon: '🎧' },
  { name: 'Home & Ceramics', slug: 'home-kitchen', count: '38+ items', icon: '🏺' },
  { name: 'Khadi & Apparel', slug: 'mens-fashion', count: '52+ items', icon: '👔' },
  { name: 'Organic Gourmet', slug: 'organic-foods-gourmet', count: '28+ items', icon: '🍯' },
  { name: 'Leather Goods', slug: 'handmade-crafts-pottery', count: '20+ items', icon: '💼' },
];

const categoryExpandingCards: ExpandingCardItem[] = [
  {
    id: 'home-cat-electronics',
    image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&q=80',
    category: 'Department Spotlight',
    title: 'Electronics & Audio',
    subtitle: 'Studio audio monitors, wireless earbuds & tactile mechanical hardware.',
    metadata: {
      slug: 'electronics-gadgets',
      subcategories: ['Wireless Earbuds', 'Hi-Fi Over-Ear Monitors', 'Bluetooth Speakers', 'Mechanical Keyboards'],
      topProducts: [
        { name: 'AcousticPro True Wireless Earbuds', price: '₹3,499', slug: 'acousticpro-true-wireless-earbuds' },
        { name: 'Noise Isolating ANC Studio Buds', price: '₹4,299', slug: 'noise-isolating-anc-studio-buds' },
        { name: 'Custom Walnut Mechanical Keyboard', price: '₹7,499', slug: 'custom-walnut-mechanical-keyboard' },
      ],
    },
  },
  {
    id: 'home-cat-ceramics',
    image: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=800&q=80',
    category: 'Department Spotlight',
    title: 'Home & Ceramics',
    subtitle: 'Wheel-thrown pottery, matte drip carafes, and handcrafted dining stoneware.',
    metadata: {
      slug: 'home-kitchen',
      subcategories: ['Ceramic Drippers', 'Espresso Cups', 'Terracotta Planters', 'Kiln Bowls'],
      topProducts: [
        { name: 'Handcrafted Ceramic Dripper Set', price: '₹1,899', slug: 'handcrafted-ceramic-dripper-set' },
        { name: 'Stoneware Matte Espresso Cups', price: '₹1,299', slug: 'stoneware-matte-espresso-cups' },
      ],
    },
  },
  {
    id: 'home-cat-organic',
    image: 'https://images.unsplash.com/photo-1587049352847-4a222e784d38?w=800&q=80',
    category: 'Department Spotlight',
    title: 'Organic Gourmet',
    subtitle: 'Raw Himalayan honey, cold-pressed virgin oils, and estate CTC teas.',
    metadata: {
      slug: 'organic-foods-gourmet',
      subcategories: ['Forest Honey', 'Virgin Oils', 'Single-Estate Teas', 'Organic Spices'],
      topProducts: [
        { name: 'Organic Wildflower Forest Honey 500g', price: '₹649', slug: 'organic-wildflower-forest-honey' },
        { name: 'Cold-Pressed Virgin Coconut Oil', price: '₹499', slug: 'cold-pressed-virgin-coconut-oil' },
      ],
    },
  },
  {
    id: 'home-cat-apparel',
    image: 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=800&q=80',
    category: 'Department Spotlight',
    title: 'Khadi & Apparel',
    subtitle: 'Indigenous cotton handlooms, natural indigo vat dyes, and heritage weaves.',
    metadata: {
      slug: 'mens-fashion',
      subcategories: ['Pure Khadi Casual Shirts', 'Handloom Overshirts', 'Linen Trousers', 'Natural Indigo Kurtas'],
      topProducts: [
        { name: 'Pure Khadi Linen Casual Shirt', price: '₹2,499', slug: 'pure-khadi-linen-casual-shirt' },
        { name: 'Full Grain Leather Weekender Duffel', price: '₹6,899', slug: 'leather-weekender-duffel' },
      ],
    },
  },
];

function mapProductToExpandingCard(p: any): ExpandingCardItem {
  const image =
    p.images?.[0] ||
    p.image ||
    'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800';
  const rating = p.rating_avg || p.rating || 4.8;
  const reviewCount = p.rating_count || p.reviews || 42;
  const store = p.store_name || p.store || 'Verified Store';
  const slug = p.slug || p.id;
  const priceFormatted = `₹${Number(p.price).toLocaleString('en-IN')}`;
  const comparePriceFormatted = p.compare_at_price
    ? `₹${Number(p.compare_at_price).toLocaleString('en-IN')}`
    : undefined;

  return {
    id: `rec-prod-${p.id}`,
    image,
    category: store,
    title: p.name,
    subtitle: `${priceFormatted} • ★ ${rating} (${reviewCount} reviews)`,
    metadata: {
      ...p,
      priceFormatted,
      comparePriceFormatted,
      store,
      rating,
      reviewCount,
      slug,
    },
  };
}

function renderProductDetail(
  item: ExpandingCardItem,
  onClose: () => void
) {
  const meta = item.metadata || {};
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-5 dark:border-slate-800">
        <div>
          <span className="text-3xl font-black text-slate-900 dark:text-white">
            {meta.priceFormatted}
          </span>
          {meta.comparePriceFormatted && (
            <span className="ml-3 text-sm font-medium text-slate-400 line-through">
              {meta.comparePriceFormatted}
            </span>
          )}
          <span className="ml-2 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300">
            In Stock
          </span>
        </div>
        <div className="flex items-center gap-1.5 text-amber-500">
          <Star className="h-4 w-4 fill-current" />
          <span className="font-bold text-slate-900 dark:text-white">{meta.rating}</span>
          <span className="text-xs text-slate-400">({meta.reviewCount} reviews)</span>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-800/40">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Verified Seller Store</p>
        <p className="text-base font-bold text-slate-900 dark:text-white">{meta.store}</p>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Direct fulfillment with insured express transit across India
        </p>
      </div>

      <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
        Carefully inspected and certified by our quality team. Includes tamper-evident sealing, manufacturer invoice, and standard guarantee.
      </p>

      <div className="flex flex-col sm:flex-row items-center gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
        <button
          type="button"
          onClick={() => {
            alert(`Added ${item.title} to Cart!`);
          }}
          className="flex-1 w-full inline-flex items-center justify-center gap-2 rounded-2xl bg-indigo-600 px-6 py-3.5 text-base font-bold text-white shadow-lg shadow-indigo-600/30 transition hover:bg-indigo-500"
        >
          <ShoppingBag className="h-5 w-5" />
          <span>Add to Cart ({meta.priceFormatted})</span>
        </button>

        <Link
          href={`/product/${meta.slug || 'sample'}`}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-3.5 text-base font-bold text-slate-800 shadow-sm transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:hover:bg-slate-700"
        >
          <span>View full page</span>
          <ExternalLink className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}

function renderCategoryDetail(
  item: ExpandingCardItem,
  onClose: () => void
) {
  const meta = item.metadata || {};
  return (
    <div className="space-y-6">
      <div className="border-b border-slate-100 pb-4 dark:border-slate-800">
        <h4 className="text-sm font-semibold uppercase tracking-wider text-slate-400 mb-2">
          Featured Subcategories
        </h4>
        <div className="flex flex-wrap gap-2">
          {meta.subcategories?.map((sub: string) => (
            <Link
              key={sub}
              href={`/search?q=${encodeURIComponent(sub)}`}
              className="rounded-full border border-slate-200 bg-slate-50 px-3.5 py-1 text-xs font-semibold text-slate-700 hover:border-indigo-500 hover:text-indigo-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
            >
              {sub}
            </Link>
          ))}
        </div>
      </div>

      <div>
        <h4 className="text-sm font-semibold uppercase tracking-wider text-slate-400 mb-3">
          Top Rated Products in this Department
        </h4>
        <div className="space-y-2">
          {meta.topProducts?.map((p: any) => (
            <Link
              key={p.slug}
              href={`/product/${p.slug}`}
              className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 p-3 hover:border-indigo-400 transition dark:border-slate-800 dark:bg-slate-800/40"
            >
              <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">{p.name}</span>
              <span className="text-sm font-bold text-indigo-600 dark:text-indigo-400">{p.price}</span>
            </Link>
          ))}
        </div>
      </div>

      <div className="pt-2">
        <Link
          href={`/category/${meta.slug}`}
          className="w-full inline-flex items-center justify-center gap-2 rounded-2xl bg-indigo-600 px-6 py-3.5 text-base font-bold text-white shadow-lg transition hover:bg-indigo-500"
        >
          <span>Explore Entire {item.title} Department</span>
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}

export default function CustomerHomePage() {
  const [data, setData] = useState<HomeRecommendationsResponse>(fallbackHomeData);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Attempt real API fetch
    const fetchFeed = async () => {
      try {
        const apiBase = process.env.NEXT_PUBLIC_API_URL || '';
        const res = await fetch(`${apiBase}/api/recommendations/home`);
        if (res.ok) {
          const json = await res.json();
          if (json && (json.rails?.length > 0 || json.trending?.length > 0)) {
            setData(json);
          }
        }
      } catch {
        // Use initial fallback
      }
    };
    fetchFeed();
  }, []);

  const removeSearch = (query: string) => {
    setData((prev) => ({
      ...prev,
      recentSearches: prev.recentSearches.filter((q) => q !== query),
    }));
  };

  const clearHistory = async () => {
    setData((prev) => ({
      ...prev,
      recentSearches: [],
      rails: [],
    }));
    try {
      const apiBase = process.env.NEXT_PUBLIC_API_URL || '';
      await fetch(`${apiBase}/api/events/clear-history`, { method: 'POST' });
    } catch {}
  };

  return (
    <div className="container mx-auto space-y-12 px-4 py-8">
      {/* 1. TOP SECTION: "Pick up where you left off" */}
      {data.recentSearches && data.recentSearches.length > 0 && (
        <section
          id="top-pickup-section"
          className="rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50/70 via-white to-violet-50/50 p-6 shadow-sm dark:border-indigo-950 dark:from-slate-900 dark:via-slate-900/60 dark:to-indigo-950/30"
        >
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-600 text-white shadow-sm">
                <Sparkles className="h-4 w-4" />
              </span>
              <h2 className="text-lg font-bold tracking-tight text-slate-900 dark:text-white">
                Pick up where you left off
              </h2>
            </div>
            <button
              onClick={clearHistory}
              className="text-xs font-medium text-slate-500 hover:text-rose-600 dark:text-slate-400"
            >
              Clear search history
            </button>
          </div>

          {/* Recent Search Chips */}
          <div className="mb-6 flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Recent searches:
            </span>
            {data.recentSearches.slice(0, 5).map((query) => (
              <span
                key={query}
                className="inline-flex items-center gap-1.5 rounded-full border border-indigo-200/80 bg-white px-3 py-1 text-xs font-medium text-indigo-900 shadow-sm transition hover:border-indigo-400 dark:border-indigo-800 dark:bg-slate-800 dark:text-indigo-200"
              >
                <Link href={`/search?q=${encodeURIComponent(query)}`}>
                  {query}
                </Link>
                <button
                  onClick={() => removeSearch(query)}
                  className="rounded-full p-0.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-700"
                  aria-label={`Remove ${query}`}
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>

          {/* Dynamic Personalized Rails */}
          {data.rails && data.rails.map((rail, idx) => (
            <div key={idx} className="mb-6 last:mb-0 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                    {rail.title}
                  </h3>
                  {rail.reason && (
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {rail.reason}
                    </p>
                  )}
                </div>
                <Link
                  href={`/search?q=${encodeURIComponent(rail.title.replace(/Because you searched "([^"]+)"/, '$1'))}`}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400"
                >
                  View more <ArrowRight className="h-3 w-3" />
                </Link>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {rail.products.map((p: any) => (
                  <ProductCard key={p.id} product={p} />
                ))}
              </div>
            </div>
          ))}
        </section>
      )}

      {/* 1.5. APP STORE "TODAY" SPOTLIGHT BANNER */}
      <section className="relative overflow-hidden rounded-3xl border border-indigo-500/20 bg-gradient-to-r from-slate-950 via-indigo-950/80 to-slate-900 p-6 sm:p-8 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="max-w-xl space-y-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-500/20 px-3 py-1 text-xs font-bold uppercase tracking-wider text-indigo-300 border border-indigo-500/30">
              <Sparkles className="h-3.5 w-3.5" />
              Featured Editorial
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white">
              Today in Shop:Sell Spotlight
            </h2>
            <p className="text-sm text-slate-300">
              Experience our App Store &ldquo;Today&rdquo; style interactive shared-layout cards. Click into high-resolution artisan showcases with zero page flicker.
            </p>
          </div>
          <Link
            href="/demo/today"
            className="inline-flex items-center gap-2 self-start md:self-auto rounded-2xl bg-indigo-600 px-6 py-3.5 text-sm font-bold text-white shadow-lg shadow-indigo-600/30 transition hover:bg-indigo-500"
          >
            <span>Explore Today Cards</span>
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      {/* 2. RECOMMENDED FOR YOU (Blended Algorithm Score with Expanding Quick View) */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Compass className="h-5 w-5 text-indigo-600" />
            <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
              Recommended for You
            </h2>
          </div>
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Click any card to expand quick view
          </span>
        </div>

        <ExpandingCardGrid
          items={(data.recommended || []).map(mapProductToExpandingCard)}
          layoutGroupId="home-recommended-group"
          className="grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
          cardAspect="aspect-[4/5]"
          renderDetail={renderProductDetail}
        />
      </section>

      {/* 3. TRENDING NEAR YOU (Expanding Quick View) */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-indigo-600" />
            <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
              Trending Near You
            </h2>
          </div>
          <Link
            href="/search?sort=popular"
            className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400"
          >
            Explore trending collection &rarr;
          </Link>
        </div>

        <ExpandingCardGrid
          items={(data.trending || []).map(mapProductToExpandingCard)}
          layoutGroupId="home-trending-group"
          className="grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
          cardAspect="aspect-[4/5]"
          renderDetail={renderProductDetail}
        />
      </section>

      {/* 4. CURATED DEPARTMENTS (Expanding Category Details) */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Tag className="h-5 w-5 text-indigo-600" />
            <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
              Explore Curated Departments
            </h2>
          </div>
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Expand to view subcategories &amp; top products
          </span>
        </div>

        <ExpandingCardGrid
          items={categoryExpandingCards}
          layoutGroupId="home-categories-group"
          className="grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
          cardAspect="aspect-[4/5]"
          renderDetail={renderCategoryDetail}
        />
      </section>

      {/* 5. TRUST BADGES */}
      <section className="grid grid-cols-1 gap-4 rounded-xl border border-slate-200 bg-slate-50/50 p-6 sm:grid-cols-3 dark:border-slate-800 dark:bg-slate-900/40">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-400">
            <Truck className="h-5 w-5" />
          </div>
          <div>
            <h5 className="text-sm font-semibold text-slate-900 dark:text-white">
              Pan-India Express Delivery
            </h5>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Direct from verified multi-vendor stores
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <h5 className="text-sm font-semibold text-slate-900 dark:text-white">
              Secure Razorpay Checkout
            </h5>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              UPI, Cards, NetBanking, 100% buyer protection
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400">
            <RotateCcw className="h-5 w-5" />
          </div>
          <div>
            <h5 className="text-sm font-semibold text-slate-900 dark:text-white">
              7-Day Easy Returns
            </h5>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Hassle-free refunds & dispute mediation
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}

function ProductCard({ product }: { product: any }) {
  const image =
    product.images?.[0] ||
    product.image ||
    'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500';
  const rating = product.rating_avg || product.rating || 4.8;
  const reviewCount = product.rating_count || product.reviews || 42;
  const store = product.store_name || product.store || 'Verified Store';
  const slug = product.slug || product.id;

  return (
    <div className="group relative flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white transition hover:-translate-y-1 hover:shadow-md dark:border-slate-800 dark:bg-slate-900">
      <Link href={`/product/${slug}`} className="relative aspect-square w-full overflow-hidden bg-slate-100 dark:bg-slate-800">
        <img
          src={image}
          alt={product.name}
          className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
        />
        <span className="absolute left-2.5 top-2.5 rounded-md bg-white/90 px-2 py-0.5 text-[11px] font-semibold text-slate-700 shadow-sm backdrop-blur dark:bg-slate-900/90 dark:text-slate-300">
          {store}
        </span>
      </Link>
      <div className="flex flex-1 flex-col p-3.5">
        <div className="mb-1 flex items-center gap-1 text-xs text-amber-500">
          <Star className="h-3.5 w-3.5 fill-current" />
          <span className="font-semibold">{rating}</span>
          <span className="text-slate-400">({reviewCount})</span>
        </div>
        <Link href={`/product/${slug}`}>
          <h4 className="line-clamp-2 text-sm font-semibold text-slate-900 transition hover:text-indigo-600 dark:text-white dark:hover:text-indigo-400">
            {product.name}
          </h4>
        </Link>
        <div className="mt-auto flex items-baseline gap-2 pt-2">
          <span className="text-base font-bold text-slate-900 dark:text-white">
            ₹{Number(product.price).toLocaleString('en-IN')}
          </span>
          {product.compare_at_price && (
            <span className="text-xs text-slate-400 line-through">
              ₹{Number(product.compare_at_price).toLocaleString('en-IN')}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
