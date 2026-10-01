'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Star,
  ShieldCheck,
  Truck,
  RotateCcw,
  ShoppingBag,
  Heart,
  Store,
  Check,
  ChevronRight,
} from 'lucide-react';

const mockImages = [
  'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&q=80',
  'https://images.unsplash.com/photo-1545454675-3531b543be5d?w=800&q=80',
  'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=800&q=80',
];

export default function ProductDetailPage() {
  const [selectedImage, setSelectedImage] = useState(mockImages[0]);
  const [selectedVariant, setSelectedVariant] = useState('Matte Black');
  const [qty, setQty] = useState(1);
  const [isAdded, setIsAdded] = useState(false);
  const [isWishlisted, setIsWishlisted] = useState(false);

  const handleAddToCart = () => {
    setIsAdded(true);
    setTimeout(() => setIsAdded(false), 2500);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Breadcrumbs */}
      <nav className="mb-6 flex items-center gap-1.5 text-xs text-slate-500">
        <Link href="/" className="hover:text-slate-800 dark:hover:text-slate-200">
          Home
        </Link>
        <ChevronRight className="h-3 w-3" />
        <Link href="/category/audio-headphones" className="hover:text-slate-800 dark:hover:text-slate-200">
          Audio & Headphones
        </Link>
        <ChevronRight className="h-3 w-3" />
        <span className="truncate font-semibold text-slate-900 dark:text-white">
          AcousticPro True Wireless Earbuds
        </span>
      </nav>

      {/* Main PDP Grid */}
      <div className="grid grid-cols-1 gap-12 lg:grid-cols-2">
        {/* Left: Gallery */}
        <div className="space-y-4">
          <div className="aspect-square w-full overflow-hidden rounded-2xl border border-slate-200 bg-slate-100 dark:border-slate-800 dark:bg-slate-900">
            <img
              src={selectedImage}
              alt="Product Main View"
              className="h-full w-full object-cover transition duration-300"
            />
          </div>
          <div className="flex items-center gap-3">
            {mockImages.map((img, i) => (
              <button
                key={i}
                onClick={() => setSelectedImage(img)}
                className={`relative aspect-square w-20 overflow-hidden rounded-xl border-2 transition ${
                  selectedImage === img
                    ? 'border-indigo-600 ring-2 ring-indigo-600/30'
                    : 'border-slate-200 hover:border-slate-400 dark:border-slate-800'
                }`}
              >
                <img src={img} alt={`View ${i + 1}`} className="h-full w-full object-cover" />
              </button>
            ))}
          </div>
        </div>

        {/* Right: Details & Purchase Actions */}
        <div className="space-y-6">
          {/* Header & Seller */}
          <div>
            <div className="flex items-center justify-between">
              <span className="rounded-md bg-indigo-50 px-2.5 py-1 text-xs font-bold text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-400">
                Audio & Headphones
              </span>
              <button
                onClick={() => setIsWishlisted(!isWishlisted)}
                className={`rounded-full p-2 transition ${
                  isWishlisted
                    ? 'bg-rose-50 text-rose-600'
                    : 'bg-slate-100 text-slate-500 hover:text-slate-800 dark:bg-slate-800'
                }`}
              >
                <Heart className={`h-5 w-5 ${isWishlisted ? 'fill-current' : ''}`} />
              </button>
            </div>

            <h1 className="mt-2 text-2xl font-black tracking-tight text-slate-900 sm:text-3xl dark:text-white">
              AcousticPro True Wireless Earbuds
            </h1>

            {/* Rating */}
            <div className="mt-2 flex items-center gap-2 text-xs">
              <div className="flex items-center text-amber-500">
                {[1, 2, 3, 4, 5].map((s) => (
                  <Star key={s} className="h-4 w-4 fill-current" />
                ))}
              </div>
              <span className="font-bold text-slate-800 dark:text-slate-200">4.8</span>
              <span className="text-slate-400">(142 verified reviews)</span>
              <span className="text-slate-300">•</span>
              <span className="text-emerald-600 font-semibold">1,240 sold</span>
            </div>
          </div>

          {/* Pricing & Stock */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-baseline gap-3">
              <span className="text-3xl font-black text-slate-900 dark:text-white">
                ₹3,499
              </span>
              <span className="text-base text-slate-400 line-through">₹4,999</span>
              <span className="rounded bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                30% OFF
              </span>
            </div>
            <p className="mt-1 text-xs text-slate-500">
              Inclusive of all taxes. Free shipping across India.
            </p>

            <div className="mt-3 flex items-center gap-2">
              <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
              <span className="text-xs font-semibold text-emerald-600">
                In Stock (28 units available)
              </span>
            </div>
          </div>

          {/* Variant Selector */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
              Color Finish: <span className="font-normal">{selectedVariant}</span>
            </label>
            <div className="flex gap-2">
              {['Matte Black', 'Arctic White', 'Navy Blue'].map((v) => (
                <button
                  key={v}
                  onClick={() => setSelectedVariant(v)}
                  className={`rounded-xl border px-3.5 py-2 text-xs font-semibold transition ${
                    selectedVariant === v
                      ? 'border-indigo-600 bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-400'
                      : 'border-slate-200 text-slate-700 hover:border-slate-300 dark:border-slate-700 dark:text-slate-300'
                  }`}
                >
                  {v}
                </button>
              ))}
            </div>
          </div>

          {/* Quantity and Actions */}
          <div className="flex items-center gap-3">
            <div className="flex items-center rounded-xl border border-slate-300 bg-white dark:border-slate-700 dark:bg-slate-800">
              <button
                onClick={() => setQty(Math.max(1, qty - 1))}
                className="px-3 py-2.5 text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-700"
              >
                -
              </button>
              <span className="px-3 text-xs font-bold">{qty}</span>
              <button
                onClick={() => setQty(qty + 1)}
                className="px-3 py-2.5 text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-700"
              >
                +
              </button>
            </div>

            <button
              onClick={handleAddToCart}
              className={`flex flex-1 items-center justify-center gap-2 rounded-xl py-3 text-xs font-bold shadow-md transition ${
                isAdded
                  ? 'bg-emerald-600 text-white shadow-emerald-600/20'
                  : 'bg-indigo-600 text-white shadow-indigo-600/20 hover:bg-indigo-500'
              }`}
            >
              {isAdded ? (
                <>
                  <Check className="h-4 w-4" /> Added to Cart!
                </>
              ) : (
                <>
                  <ShoppingBag className="h-4 w-4" /> Add to Cart
                </>
              )}
            </button>

            <Link
              href="/checkout"
              className="rounded-xl border border-slate-900 bg-slate-900 px-6 py-3 text-xs font-bold text-white shadow-sm transition hover:bg-slate-800 dark:border-white dark:bg-white dark:text-slate-900"
            >
              Buy Now
            </Link>
          </div>

          {/* Seller / Store Information Card */}
          <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-600 text-white shadow-sm">
                <Store className="h-5 w-5" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                  SoundWave Audio Lab
                </h4>
                <p className="text-[11px] text-slate-500">
                  Verified Verified Seller • 4.9★ (380+ ratings)
                </p>
              </div>
            </div>
            <Link
              href="/stores/soundwave-audio-lab"
              className="text-xs font-bold text-indigo-600 hover:text-indigo-700"
            >
              Visit Store &rarr;
            </Link>
          </div>

          {/* Highlights & Guarantees */}
          <div className="grid grid-cols-3 gap-2 border-t border-slate-200 pt-4 text-center text-[11px] text-slate-600 dark:border-slate-800 dark:text-slate-400">
            <div className="flex flex-col items-center gap-1">
              <ShieldCheck className="h-4 w-4 text-emerald-600" />
              <span>1 Year Warranty</span>
            </div>
            <div className="flex flex-col items-center gap-1">
              <Truck className="h-4 w-4 text-indigo-600" />
              <span>Fast 48h Dispatch</span>
            </div>
            <div className="flex flex-col items-center gap-1">
              <RotateCcw className="h-4 w-4 text-blue-600" />
              <span>7 Days Return</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
