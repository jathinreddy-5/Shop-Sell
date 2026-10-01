'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
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
  ArrowLeft,
} from 'lucide-react';

interface ProductData {
  slug: string;
  name: string;
  category: string;
  categorySlug: string;
  price: number;
  compareAtPrice?: number;
  rating: number;
  reviewCount: number;
  soldCount: string;
  storeName: string;
  storeSlug: string;
  images: string[];
  variants: string[];
  description: string;
}

const PRODUCT_CATALOG: Record<string, ProductData> = {
  'acousticpro-true-wireless-earbuds': {
    slug: 'acousticpro-true-wireless-earbuds',
    name: 'AcousticPro True Wireless Earbuds',
    category: 'Audio & Headphones',
    categorySlug: 'electronics-gadgets',
    price: 3499,
    compareAtPrice: 4999,
    rating: 4.8,
    reviewCount: 142,
    soldCount: '1,240 sold',
    storeName: 'SoundWave Audio Lab',
    storeSlug: 'soundwave-audio-lab',
    images: [
      'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=800&q=80',
      'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&q=80',
      'https://images.unsplash.com/photo-1545454675-3531b543be5d?w=800&q=80',
    ],
    variants: ['Matte Black', 'Arctic White', 'Navy Blue'],
    description: 'Custom-tuned 11mm beryllium drivers with lossless audio streaming, low-latency gaming mode, and active spatial noise cancellation.',
  },
  'noise-isolating-anc-studio-buds': {
    slug: 'noise-isolating-anc-studio-buds',
    name: 'Noise Isolating ANC Studio Buds',
    category: 'Audio & Headphones',
    categorySlug: 'electronics-gadgets',
    price: 4299,
    compareAtPrice: 5999,
    rating: 4.9,
    reviewCount: 89,
    soldCount: '860 sold',
    storeName: 'SoundWave Audio Lab',
    storeSlug: 'soundwave-audio-lab',
    images: [
      'https://images.unsplash.com/photo-1606220588913-b3aacb4d2f46?w=800&q=80',
      'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=800&q=80',
      'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&q=80',
    ],
    variants: ['Carbon Grey', 'Frost Silver'],
    description: 'Studio reference in-ear monitors equipped with hybrid active noise cancellation, transparency monitoring, and 36-hour total battery reserve.',
  },
  'minimalist-bluetooth-pocket-speaker': {
    slug: 'minimalist-bluetooth-pocket-speaker',
    name: 'Minimalist Bluetooth Pocket Speaker',
    category: 'Audio & Headphones',
    categorySlug: 'electronics-gadgets',
    price: 1999,
    compareAtPrice: 2499,
    rating: 4.7,
    reviewCount: 58,
    soldCount: '410 sold',
    storeName: 'Apex Tech India',
    storeSlug: 'apex-tech-india',
    images: [
      'https://images.unsplash.com/photo-1545454675-3531b543be5d?w=800&q=80',
      'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&q=80',
    ],
    variants: ['Stone White', 'Anodized Black'],
    description: 'Ultra-compact IPX7 water-resistant Bluetooth 5.3 pocket speaker delivering deep 360-degree punchy bass in a machined aluminium chassis.',
  },
  'hi-fi-over-ear-studio-monitors': {
    slug: 'hi-fi-over-ear-studio-monitors',
    name: 'Hi-Fi Over-Ear Studio Monitors',
    category: 'Audio & Headphones',
    categorySlug: 'electronics-gadgets',
    price: 8999,
    compareAtPrice: 11999,
    rating: 4.95,
    reviewCount: 210,
    soldCount: '530 sold',
    storeName: 'Apex Tech India',
    storeSlug: 'apex-tech-india',
    images: [
      'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&q=80',
      'https://images.unsplash.com/photo-1545454675-3531b543be5d?w=800&q=80',
    ],
    variants: ['Midnight Onyx', 'Walnut Brown'],
    description: 'Open-back planar magnetic monitors engineered for mastering sound engineers and discerning audiophiles seeking expansive holographic soundstage.',
  },
  'organic-wildflower-forest-honey': {
    slug: 'organic-wildflower-forest-honey',
    name: 'Organic Wildflower Forest Honey 500g',
    category: 'Gourmet & Organic Foods',
    categorySlug: 'organic-foods-gourmet',
    price: 649,
    compareAtPrice: 799,
    rating: 4.9,
    reviewCount: 320,
    soldCount: '2,150 sold',
    storeName: 'Himalayan Organics',
    storeSlug: 'himalayan-organics',
    images: [
      'https://images.unsplash.com/photo-1587049352847-4a222e784d38?w=800&q=80',
      'https://images.unsplash.com/photo-1558642452-9d2a7deb7f62?w=800&q=80',
    ],
    variants: ['500g Glass Jar', '1kg Value Pack'],
    description: 'Cold-extracted raw wildflower honey collected by indigenous forest tribes in the Himalayan foothills. Unpasteurized and enzyme-rich.',
  },
  'handcrafted-ceramic-dripper-set': {
    slug: 'handcrafted-ceramic-dripper-set',
    name: 'Handcrafted Ceramic Dripper Set',
    category: 'Home & Ceramics',
    categorySlug: 'home-kitchen',
    price: 1899,
    compareAtPrice: 2200,
    rating: 4.85,
    reviewCount: 76,
    soldCount: '340 sold',
    storeName: 'Clay & Kiln Studio',
    storeSlug: 'clay-and-kiln-studio',
    images: [
      'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=800&q=80',
      'https://images.unsplash.com/photo-1578749556568-bc2c40e68b61?w=800&q=80',
    ],
    variants: ['Sand Matte Glaze', 'Charcoal Kiln Glaze'],
    description: 'Individually wheel-thrown stoneware dripper with matching serving carafe. Designed with 60-degree internal spirals for optimal brew extraction.',
  },
  'pure-khadi-linen-casual-shirt': {
    slug: 'pure-khadi-linen-casual-shirt',
    name: 'Pure Khadi Linen Casual Shirt',
    category: 'Khadi & Apparel',
    categorySlug: 'mens-fashion',
    price: 2499,
    compareAtPrice: 3299,
    rating: 4.75,
    reviewCount: 112,
    soldCount: '780 sold',
    storeName: 'Vedic Loom Collective',
    storeSlug: 'vedic-loom-collective',
    images: [
      'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=800&q=80',
      'https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?w=800&q=80',
    ],
    variants: ['Natural Ecru - M', 'Natural Ecru - L', 'Indigo Blue - L'],
    description: 'Woven on heritage wooden pit-looms using 100% organic indigenous handspun yarn. Breathable, sweat-wicking, and softens beautifully with every wash.',
  },
  'cold-pressed-virgin-coconut-oil': {
    slug: 'cold-pressed-virgin-coconut-oil',
    name: 'Cold-Pressed Virgin Coconut Oil',
    category: 'Gourmet & Organic Foods',
    categorySlug: 'organic-foods-gourmet',
    price: 499,
    compareAtPrice: 599,
    rating: 4.92,
    reviewCount: 410,
    soldCount: '1,920 sold',
    storeName: 'Himalayan Organics',
    storeSlug: 'himalayan-organics',
    images: [
      'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=800&q=80',
    ],
    variants: ['500ml Glass Bottle', '1L Tin Canister'],
    description: 'First cold-pressed from fresh organic Kerala copra within 24 hours of harvest. Rich in medium-chain triglycerides with zero added chemicals.',
  },
  'custom-walnut-mechanical-keyboard': {
    slug: 'custom-walnut-mechanical-keyboard',
    name: 'Custom Walnut Mechanical Keyboard',
    category: 'Electronics & Gadgets',
    categorySlug: 'electronics-gadgets',
    price: 7499,
    compareAtPrice: 9999,
    rating: 4.96,
    reviewCount: 65,
    soldCount: '290 sold',
    storeName: 'Apex Tech India',
    storeSlug: 'apex-tech-india',
    images: [
      'https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=800&q=80',
      'https://images.unsplash.com/photo-1595225476474-87563907a212?w=800&q=80',
    ],
    variants: ['Gateron Brown (Tactile)', 'Gateron Yellow (Linear)'],
    description: 'Hand-milled solid American black walnut casing, gasket-mounted brass switch plate, hot-swappable PCB, and PBT double-shot dye-sublimated keycaps.',
  },
  'stoneware-matte-espresso-cups': {
    slug: 'stoneware-matte-espresso-cups',
    name: 'Stoneware Matte Espresso Cups (Set of 4)',
    category: 'Home & Ceramics',
    categorySlug: 'home-kitchen',
    price: 1299,
    compareAtPrice: 1599,
    rating: 4.8,
    reviewCount: 94,
    soldCount: '480 sold',
    storeName: 'Clay & Kiln Studio',
    storeSlug: 'clay-and-kiln-studio',
    images: [
      'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=800&q=80',
    ],
    variants: ['Terracotta Red', 'Basalt Black'],
    description: 'Double-walled high-fired stoneware cups maintaining thermal stability for espresso shots without scalding hands. Dishwasher and microwave safe.',
  },
  'leather-weekender-duffel': {
    slug: 'leather-weekender-duffel',
    name: 'Full Grain Leather Weekender Duffel',
    category: 'Leather & Travel Goods',
    categorySlug: 'handmade-crafts-pottery',
    price: 6899,
    compareAtPrice: 8999,
    rating: 4.91,
    reviewCount: 150,
    soldCount: '520 sold',
    storeName: 'Heritage Leathers Co',
    storeSlug: 'heritage-leathers-co',
    images: [
      'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=800&q=80',
    ],
    variants: ['Vintage Cognac', 'Dark Chocolate'],
    description: 'Vegetable-tanned full grain buff leather, heavy brass YKK hardware, reinforced stress rivets, and waterproof Scottish waxed canvas interior lining.',
  },
  'organic-assam-tea': {
    slug: 'organic-assam-tea',
    name: 'Organic Single-Estate Assam CTC Tea',
    category: 'Gourmet & Organic Foods',
    categorySlug: 'organic-foods-gourmet',
    price: 450,
    compareAtPrice: 550,
    rating: 4.88,
    reviewCount: 230,
    soldCount: '1,450 sold',
    storeName: 'Himalayan Organics',
    storeSlug: 'himalayan-organics',
    images: [
      'https://images.unsplash.com/photo-1576092768241-dec231879fc3?w=800&q=80',
    ],
    variants: ['250g Tin Caddy', '500g Fresh Foil Pack'],
    description: 'Second-flush high-elevation orthodox and CTC blend from a century-old organic Upper Assam estate. Rich, malty amber liquor ideal for morning chai.',
  },
};

function formatSlugToTitle(slug: string): string {
  if (!slug) return 'Featured Marketplace Product';
  return slug
    .replace(/^rec-prod-/, '')
    .replace(/^today-card-\d+-?/, '')
    .replace(/-/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function ProductDetailPage() {
  const params = useParams();
  const slug = (params?.slug as string) || '';

  const product = useMemo<ProductData>(() => {
    if (PRODUCT_CATALOG[slug]) {
      return PRODUCT_CATALOG[slug];
    }
    // Dynamic fallback for any slug (e.g. from search, dynamic feed, or custom catalog ID)
    const title = formatSlugToTitle(slug);
    return {
      slug,
      name: title,
      category: 'Curated Collection',
      categorySlug: 'electronics-gadgets',
      price: 2499,
      compareAtPrice: 3299,
      rating: 4.85,
      reviewCount: 94,
      soldCount: '450+ sold',
      storeName: 'Shop:Sell Verified Store',
      storeSlug: 'verified-store',
      images: [
        'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&q=80',
        'https://images.unsplash.com/photo-1545454675-3531b543be5d?w=800&q=80',
        'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=800&q=80',
      ],
      variants: ['Standard Edition', 'Artisan Finish'],
      description: `Authentic ${title}. Handcrafted with precision and verified by Shop:Sell quality assurance before insured express transit across India.`,
    };
  }, [slug]);

  const [selectedImage, setSelectedImage] = useState(product.images[0]);
  const [selectedVariant, setSelectedVariant] = useState(product.variants[0] || 'Standard');
  const [qty, setQty] = useState(1);
  const [isAdded, setIsAdded] = useState(false);
  const [isWishlisted, setIsWishlisted] = useState(false);

  useEffect(() => {
    setSelectedImage(product.images[0]);
    setSelectedVariant(product.variants[0] || 'Standard');
  }, [product]);

  const handleAddToCart = () => {
    setIsAdded(true);
    setTimeout(() => setIsAdded(false), 2500);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Back button and Breadcrumbs */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <nav className="flex items-center gap-1.5 text-xs text-slate-500">
          <Link href="/" className="hover:text-slate-800 dark:hover:text-slate-200">
            Home
          </Link>
          <ChevronRight className="h-3 w-3" />
          <Link
            href={`/category/${product.categorySlug}`}
            className="hover:text-slate-800 dark:hover:text-slate-200"
          >
            {product.category}
          </Link>
          <ChevronRight className="h-3 w-3" />
          <span className="truncate max-w-[200px] sm:max-w-md font-semibold text-slate-900 dark:text-white">
            {product.name}
          </span>
        </nav>

        <Link
          href="/"
          className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Back to Marketplace</span>
        </Link>
      </div>

      {/* Main PDP Grid */}
      <div className="grid grid-cols-1 gap-12 lg:grid-cols-2">
        {/* Left: Gallery */}
        <div className="space-y-4">
          <div className="aspect-square w-full overflow-hidden rounded-2xl border border-slate-200 bg-slate-100 dark:border-slate-800 dark:bg-slate-900">
            <img
              src={selectedImage}
              alt={product.name}
              className="h-full w-full object-cover transition duration-300"
            />
          </div>
          {product.images.length > 1 && (
            <div className="flex items-center gap-3">
              {product.images.map((img, i) => (
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
          )}
        </div>

        {/* Right: Details & Purchase Actions */}
        <div className="space-y-6">
          {/* Header & Seller */}
          <div>
            <div className="flex items-center justify-between">
              <span className="rounded-md bg-indigo-50 px-2.5 py-1 text-xs font-bold text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-400">
                {product.category}
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
              {product.name}
            </h1>

            {/* Rating */}
            <div className="mt-2 flex items-center gap-2 text-xs">
              <div className="flex items-center text-amber-500">
                {[1, 2, 3, 4, 5].map((s) => (
                  <Star key={s} className="h-4 w-4 fill-current" />
                ))}
              </div>
              <span className="font-bold text-slate-800 dark:text-slate-200">{product.rating}</span>
              <span className="text-slate-400">({product.reviewCount} verified reviews)</span>
              <span className="text-slate-300">•</span>
              <span className="text-emerald-600 font-semibold">{product.soldCount}</span>
            </div>
          </div>

          {/* Description */}
          <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
            {product.description}
          </p>

          {/* Pricing & Stock */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-baseline gap-3">
              <span className="text-3xl font-black text-slate-900 dark:text-white">
                ₹{product.price.toLocaleString('en-IN')}
              </span>
              {product.compareAtPrice && (
                <span className="text-base text-slate-400 line-through">
                  ₹{product.compareAtPrice.toLocaleString('en-IN')}
                </span>
              )}
              {product.compareAtPrice && product.compareAtPrice > product.price && (
                <span className="rounded bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                  {Math.round(((product.compareAtPrice - product.price) / product.compareAtPrice) * 100)}% OFF
                </span>
              )}
            </div>
            <p className="mt-1 text-xs text-slate-500">
              Inclusive of all taxes. Free express shipping across India.
            </p>

            <div className="mt-3 flex items-center gap-2">
              <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
              <span className="text-xs font-semibold text-emerald-600">
                In Stock • Ready for Dispatch
              </span>
            </div>
          </div>

          {/* Variant Selector */}
          {product.variants.length > 0 && (
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Option / Finish: <span className="font-normal">{selectedVariant}</span>
              </label>
              <div className="flex flex-wrap gap-2">
                {product.variants.map((v) => (
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
          )}

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
                  {product.storeName}
                </h4>
                <p className="text-[11px] text-slate-500">
                  Verified Seller • 4.9★ ({product.reviewCount * 3}+ seller ratings)
                </p>
              </div>
            </div>
            <Link
              href={`/search?q=${encodeURIComponent(product.storeName)}`}
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
