'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Sparkles,
  Star,
  ShieldCheck,
  Truck,
  RotateCcw,
  ShoppingBag,
  ExternalLink,
  CheckCircle,
  ArrowRight,
  Flame,
} from 'lucide-react';
import { ExpandingCardGrid, ExpandingCardItem } from '../../../components/expanding-cards';
import { useAuth } from '@/lib/auth/auth-context';
import { useCart } from '@/lib/cart/cart-context';

export default function TodayDemoPage() {
  const { user } = useAuth();
  const { addToCart, openLoginPrompt } = useCart();
  const [addedItems, setAddedItems] = useState<Record<string, boolean>>({});

  const handleAddToCart = (item: ExpandingCardItem, onClose?: () => void) => {
    if (!user) {
      if (onClose) onClose();
      openLoginPrompt(item.title);
      return;
    }
    const meta = item.metadata || {};
    const numericPrice = typeof meta.price === 'string' ? parseInt(meta.price.replace(/[^\d]/g, ''), 10) || 3499 : 3499;
    const success = addToCart({
      id: item.id,
      name: item.title,
      slug: (meta.slug as string) || 'sample',
      store: 'Shop:Sell Verified',
      price: numericPrice,
      qty: 1,
      image: item.image,
    });
    if (success) {
      setAddedItems((prev) => ({ ...prev, [item.id]: true }));
      setTimeout(() => {
        setAddedItems((prev) => ({ ...prev, [item.id]: false }));
      }, 2500);
    }
  };

  const sampleCards: ExpandingCardItem[] = [
    {
      id: 'today-card-1',
      image: 'https://images.unsplash.com/photo-1606220588913-b3aacb4d2f46?w=1000&q=80',
      category: 'Audio Engineering',
      title: 'AcousticPro Studio Buds',
      subtitle: 'Custom-tuned 11mm beryllium drivers with lossless audio streaming and active spatial noise cancellation.',
      priority: true,
      badge: 'Staff Pick',
      metadata: {
        price: '₹4,299',
        comparePrice: '₹5,999',
        rating: 4.9,
        reviews: 142,
        seller: 'SoundWave Audio Lab',
        slug: 'noise-isolating-anc-studio-buds',
        stock: 'In Stock (18 units left)',
      },
    },
    {
      id: 'today-card-2',
      image: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=1000&q=80',
      category: 'Artisanal Ceramics',
      title: 'Handthrown Matte Pour-Over Set',
      subtitle: 'Wheel-thrown volcanic clay crafted by master potters with natural matte reactive glaze.',
      priority: true,
      badge: 'Handcrafted',
      metadata: {
        price: '₹1,899',
        comparePrice: '₹2,200',
        rating: 4.95,
        reviews: 76,
        seller: 'Clay & Kiln Studio',
        slug: 'handcrafted-ceramic-dripper-set',
        stock: 'In Stock (Only 5 left)',
      },
    },
    {
      id: 'today-card-3',
      image: 'https://images.unsplash.com/photo-1587049352847-4a222e784d38?w=1000&q=80',
      category: 'Organic Harvest',
      title: 'Wildflower Forest Honey',
      subtitle: 'Pure unpasteurized single-origin raw nectar gathered from alpine flora at 2,400m altitude.',
      badge: 'Certified Organic',
      metadata: {
        price: '₹649',
        comparePrice: '₹799',
        rating: 4.92,
        reviews: 320,
        seller: 'Himalayan Organics',
        slug: 'organic-wildflower-forest-honey',
        stock: 'In Stock (Ready to dispatch)',
      },
    },
    {
      id: 'today-card-4',
      image: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=1000&q=80',
      category: 'Heritage Leathers',
      title: 'Full-Grain Weekender Duffel',
      subtitle: 'Hand-burnished vegetable-tanned leather with antique solid brass hardware and reinforced stitching.',
      badge: 'Lifetime Warranty',
      metadata: {
        price: '₹6,899',
        comparePrice: '₹8,999',
        rating: 4.91,
        reviews: 150,
        seller: 'Heritage Leathers Co',
        slug: 'leather-weekender-duffel',
        stock: 'Low Stock (2 units)',
      },
    },
    {
      id: 'today-card-5',
      image: 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=1000&q=80',
      category: 'Custom Computing',
      title: 'Walnut Mechanical Keyboard',
      subtitle: 'Precision-milled solid American black walnut casing with gasket mount and lubed switches.',
      badge: 'Limited Run',
      metadata: {
        price: '₹7,499',
        comparePrice: '₹9,999',
        rating: 4.96,
        reviews: 65,
        seller: 'Apex Tech India',
        slug: 'custom-walnut-mechanical-keyboard',
        stock: 'In Stock (12 units left)',
      },
    },
    {
      id: 'today-card-6',
      image: 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=1000&q=80',
      category: 'Sustainable Apparel',
      title: 'Handloom Khadi Overshirt',
      subtitle: 'Spun from hand-carded indigenous cotton fibers with natural indigo mineral vat dye.',
      badge: 'Fair Trade',
      metadata: {
        price: '₹2,499',
        comparePrice: '₹3,299',
        rating: 4.88,
        reviews: 112,
        seller: 'Vedic Loom Collective',
        slug: 'pure-khadi-linen-casual-shirt',
        stock: 'In Stock (Multiple sizes available)',
      },
    },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 antialiased selection:bg-emerald-500 selection:text-white">
      {/* Top Ambient Glow */}
      <div className="pointer-events-none fixed inset-0 z-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(5,150,105,0.15),rgba(255,255,255,0))]" />

      <main className="relative z-10 mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
        {/* Header Section */}
        <header className="mb-10 text-left">
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-1 text-xs font-semibold text-emerald-400 backdrop-blur-md mb-4">
            <Sparkles className="h-3.5 w-3.5" />
            <span>App Store &ldquo;Today&rdquo; Shared-Layout Engine</span>
          </div>

          <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-white">
            Today in Shop:Sell
          </h1>
          <p className="mt-3 max-w-2xl text-base sm:text-lg text-slate-400">
            Hand-curated spotlight collections from independent Indian artisans and verified vendors. Click any card to expand into an immersive shared-layout quick view.
          </p>
        </header>

        {/* The Reusable ExpandingCardGrid Component */}
        <ExpandingCardGrid
          items={sampleCards}
          layoutGroupId="today-spotlight-group"
          renderDetail={(item, onClose, onSwitchCard) => {
            const meta = item.metadata || {};
            const isAdded = !!addedItems[item.id];

            return (
              <div className="space-y-6">
                {/* Meta Bar: Price, Stock, Rating */}
                <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-5 dark:border-slate-800">
                  <div className="flex items-baseline gap-3">
                    <span className="text-3xl font-black text-slate-900 dark:text-white">
                      {meta.price}
                    </span>
                    {meta.comparePrice && (
                      <span className="text-sm font-medium text-slate-400 line-through">
                        {meta.comparePrice}
                      </span>
                    )}
                    <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300">
                      Save 25%
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="flex items-center text-amber-500">
                      <Star className="h-4 w-4 fill-current" />
                      <span className="ml-1 text-sm font-bold text-slate-900 dark:text-white">
                        {meta.rating}
                      </span>
                    </div>
                    <span className="text-xs text-slate-400">
                      ({meta.reviews} verified reviews)
                    </span>
                  </div>
                </div>

                {/* Seller & Verification Details */}
                <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4 dark:border-slate-800/80 dark:bg-slate-800/40">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                        Verified Store
                      </p>
                      <p className="text-base font-bold text-slate-900 dark:text-white">
                        {meta.seller}
                      </p>
                    </div>
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                      <ShieldCheck className="h-4 w-4" />
                      100% Authentic
                    </span>
                  </div>
                  <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                    {meta.stock} • Ships within 24 hours with real-time tracking
                  </p>
                </div>

                {/* Description Narrative */}
                <div className="space-y-3 text-slate-600 dark:text-slate-300">
                  <h4 className="text-base font-bold text-slate-900 dark:text-white">
                    The Story Behind This Piece
                  </h4>
                  <p className="leading-relaxed text-sm sm:text-base">
                    Every piece featured in our Today collection is sourced directly from certified creators across India. Our rigorous quality benchmarks guarantee genuine materials, fair compensation for craftspeople, and secure transaction handling.
                  </p>
                  <p className="leading-relaxed text-sm text-slate-500 dark:text-slate-400">
                    Engineered with zero compromises. Enjoy complimentary pan-India insured shipping and 7-day hassle-free doorstep returns.
                  </p>
                </div>

                {/* Quick Switch to another card without closing (No-jump shared animation) */}
                <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4 dark:border-slate-800/60 dark:bg-slate-800/30">
                  <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2.5">
                    Compare & Switch Piece
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {sampleCards
                      .filter((c) => c.id !== item.id)
                      .slice(0, 3)
                      .map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => onSwitchCard(c.id)}
                          className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:border-[#059669] hover:text-[#059669] dark:hover:text-emerald-400 transition shadow-sm active:scale-95"
                        >
                          <span>Switch to {c.title.split(' ')[0]}</span>
                          <ArrowRight className="h-3 w-3" />
                        </button>
                      ))}
                  </div>
                </div>

                {/* Key Benefits Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                  <div className="flex items-center gap-2.5 rounded-xl border border-slate-100 bg-white p-3 dark:border-slate-800 dark:bg-slate-800/60">
                    <Truck className="h-5 w-5 text-[#059669]" />
                    <div>
                      <p className="text-xs font-bold text-slate-900 dark:text-white">Express Delivery</p>
                      <p className="text-[11px] text-slate-400">2-4 business days</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2.5 rounded-xl border border-slate-100 bg-white p-3 dark:border-slate-800 dark:bg-slate-800/60">
                    <ShieldCheck className="h-5 w-5 text-emerald-500" />
                    <div>
                      <p className="text-xs font-bold text-slate-900 dark:text-white">Buyer Guarantee</p>
                      <p className="text-[11px] text-slate-400">Razorpay Protected</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2.5 rounded-xl border border-slate-100 bg-white p-3 dark:border-slate-800 dark:bg-slate-800/60">
                    <RotateCcw className="h-5 w-5 text-amber-500" />
                    <div>
                      <p className="text-xs font-bold text-slate-900 dark:text-white">7-Day Return</p>
                      <p className="text-[11px] text-slate-400">No questions asked</p>
                    </div>
                  </div>
                </div>

                {/* CTAs */}
                <div className="flex flex-col sm:flex-row items-center gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => handleAddToCart(item, onClose)}
                    className="flex-1 w-full inline-flex items-center justify-center gap-2 rounded-2xl bg-[#059669] px-6 py-4 text-base font-bold text-white shadow-lg shadow-emerald-950/20 transition hover:bg-[#047857] focus:outline-none focus-visible:ring-4 focus-visible:ring-emerald-400 active:scale-[0.98]"
                  >
                    {isAdded ? (
                      <>
                        <CheckCircle className="h-5 w-5" />
                        <span>Added to Cart!</span>
                      </>
                    ) : (
                      <>
                        <ShoppingBag className="h-5 w-5" />
                        <span>Add to Cart ({meta.price})</span>
                      </>
                    )}
                  </button>

                  <Link
                    href={`/product/${meta.slug || 'sample'}`}
                    onClick={onClose}
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-4 text-base font-bold text-slate-800 shadow-sm transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:hover:bg-slate-700"
                  >
                    <span>View full page</span>
                    <ExternalLink className="h-4 w-4" />
                  </Link>
                </div>
              </div>
            );
          }}
        />

        {/* Bottom Navigation Link Back */}
        <footer className="mt-16 text-center border-t border-slate-800/80 pt-8">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm font-semibold text-[#059669] hover:text-emerald-400 transition-colors"
          >
            <span>Back to Shop:Sell Marketplace Home</span>
            <ArrowRight className="h-4 w-4" />
          </Link>
        </footer>
      </main>
    </div>
  );
}
