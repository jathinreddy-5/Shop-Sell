'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/auth-context';
import { useCart } from '@/lib/cart/cart-context';
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
  FileText,
  Sparkles,
} from 'lucide-react';
import { getProductGallery } from '@/lib/products/product-images';

export interface ProductSpecifications {
  brandName?: string;
  modelYear?: string;
  countryOfOrigin?: string;
  boxContents?: string;
  warrantyDescription?: string;
  manufacturer?: string;
  modelSeries?: string;
  specificUses?: string;
  unitCount?: string;
  itemTypeName?: string;
  packerContactInfo?: string;
  asin?: string;
  customAttributes?: { key: string; value: string }[];
}

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
  longDescription?: string;
  keyFeatures?: string[];
  specifications?: ProductSpecifications;
}

const PRODUCT_CATALOG: Record<string, ProductData> = {
  'infinix-hot-70-pro-5g': {
    slug: 'infinix-hot-70-pro-5g',
    name: 'Infinix Hot 70 Pro 5G (Titanium Shadow, 256GB)',
    category: 'Electronics & Mobiles',
    categorySlug: 'electronics-gadgets',
    price: 18999,
    compareAtPrice: 24999,
    rating: 4.88,
    reviewCount: 312,
    soldCount: '2,480 sold',
    storeName: 'Infinix Official Store',
    storeSlug: 'infinix-official',
    images: [
      'https://images.unsplash.com/photo-1598327105666-5b89351aff97?w=800&q=80',
      'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=800&q=80',
    ],
    variants: ['Titanium Shadow (256GB)', 'Aurora Blue (256GB)', 'Solar Gold (512GB)'],
    description:
      'Flagship power packed into an ultra-slim chassis with 120Hz curved AMOLED eye-care display, 108MP OIS AI camera, and 68W HyperCharge.',
    longDescription:
      'The Infinix Hot 70 Pro 5G delivers flagship computing and optical brilliance. Featuring a 120Hz curved AMOLED eye-care display with 1.07 billion colors, a 108MP OIS-stabilized AI triple camera, and 68W HyperCharge for quick day-long endurance. Built with an aerospace-grade cooling chamber and MediaTek Dimensity 5G chipset for lag-free gaming, multi-tasking, and creator workflows.',
    keyFeatures: [
      '108MP OIS Ultra-Clear Triple Camera with Nightscape 4.0',
      '6.78-inch FHD+ 120Hz True-Color AMOLED Curved Display',
      '5000 mAh All-Day Battery with 68W Fast Super Charge',
      'MediaTek Dimensity 5G Octa-Core Processor with 12GB RAM Expansion',
      'Dual Stereo Speakers with Hi-Res Audio Certification & DTS',
    ],
    specifications: {
      brandName: 'Infinix',
      modelYear: '2026',
      countryOfOrigin: 'India',
      boxContents: 'Smartphone, 68W Fast Charger, Type-C Cable, SIM Ejector, Protective Case, User Manual',
      warrantyDescription: '1 Year Manufacturor domestic warranty',
      manufacturer: 'Infinix Mobility Limited',
      modelSeries: 'Infinix Hot 70 Pro Series',
      specificUses: 'Photography, High Performance Gaming, Multimedia Streaming',
      unitCount: '1 Count',
      itemTypeName: 'Smartphone',
      packerContactInfo: 'Infinix Mobility Limited, Shenzhen, China / Plot No. 24, Sector 60, Noida, UP - 201301',
      asin: 'B0HJ4PNVSM',
      customAttributes: [
        { key: 'Color', value: 'Titanium Shadow' },
        { key: 'Internal Storage', value: '256GB UFS 3.1' },
        { key: 'Operating System', value: 'Android 15 with XOS 14' },
        { key: 'RAM', value: '12GB (8GB + 4GB Virtual)' },
      ],
    },
  },
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
    longDescription:
      'Engineered for discerning audiophiles, the AcousticPro True Wireless Earbuds combine 11mm custom beryllium diaphragm drivers with 42dB hybrid Active Noise Cancellation. Enjoy 36 hours of playtime with the ultra-compact USB-C fast-charging case and quad-mic beamforming for crystal-clear conference calls.',
    keyFeatures: [
      'Hybrid 42dB ANC with Transparency Ambient Mode',
      'Custom-tuned 11mm Beryllium Diaphragm Drivers',
      '36-Hour Battery Life with Fast Qi Wireless Charging',
      'Quad-Mic ENC Beamforming for Crystal-Clear Calling',
      'IPX5 Sweat & Water Resistance Rating',
    ],
    specifications: {
      brandName: 'AcousticPro',
      modelYear: '2026',
      countryOfOrigin: 'India',
      boxContents: '1 Pair TWS Earbuds, 1x Wireless Charging Case, 3x Silicone Ear Tip Pairs (S/M/L), 1x Type-C Cable, Guide',
      warrantyDescription: '1 Year Comprehensive Brand Replacement Warranty',
      manufacturer: 'AcousticPro Audio Labs India Pvt Ltd',
      modelSeries: 'AcousticPro Studio TWS Series',
      specificUses: 'Hi-Fi Music Listening, Noise Isolation, Video Conferencing, Sports',
      unitCount: '1 Count',
      itemTypeName: 'True Wireless In-Ear Headphones',
      packerContactInfo: 'AcousticPro Logistics Hub, Sector 18, Gurugram, Haryana - 122015',
      asin: 'B09AUDIO01',
      customAttributes: [
        { key: 'Bluetooth Version', value: 'Bluetooth 5.4 Low Latency' },
        { key: 'Audio Codecs', value: 'LDAC, AAC, SBC' },
      ],
    },
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
  const router = useRouter();
  const slug = (params?.slug as string) || '';
  const { user } = useAuth();
  const { addToCart, openLoginPrompt } = useCart();

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
      images: getProductGallery({ name: title, slug }),
      variants: ['Standard Edition', 'Artisan Finish'],
      description: `Authentic ${title}. Handcrafted with precision and verified by Shop:Sell quality assurance before insured express transit across India.`,
      longDescription: `Experience uncompromising quality with ${title}. Meticulously designed for longevity and performance, verified under rigorous quality control standards, and packaged in eco-friendly protective materials for insured doorstep dispatch across India.`,
      keyFeatures: [
        `Authentic ${title} with certified manufacturer warranty`,
        'Precision engineered for durability and reliable daily use',
        'Insured express delivery with real-time shipment tracking',
        'Compliant with Indian Legal Metrology and e-commerce standards',
      ],
      specifications: {
        brandName: 'Shop:Sell Verified',
        modelYear: '2026',
        countryOfOrigin: 'India',
        boxContents: '1x Main Unit, User Guide, Warranty Registration Card',
        warrantyDescription: '1 Year Manufacturer domestic warranty',
        manufacturer: 'Shop:Sell Verified Partner Facility',
        modelSeries: title,
        specificUses: 'General Consumer Daily Use',
        unitCount: '1 Count',
        itemTypeName: 'Consumer Goods',
        packerContactInfo: 'Shop:Sell Express Logistics Hub, Mumbai - 400001',
        asin: `B0${Math.random().toString(36).substring(2, 9).toUpperCase()}`,
      },
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
    if (!user) {
      openLoginPrompt(product.name);
      return;
    }
    const success = addToCart({
      id: product.slug,
      name: product.name,
      slug: product.slug,
      store: product.storeName,
      price: product.price,
      qty,
      image: selectedImage || product.images[0],
    });
    if (success) {
      setIsAdded(true);
      setTimeout(() => setIsAdded(false), 2500);
    }
  };

  const handleBuyNow = () => {
    if (!user) {
      openLoginPrompt(product.name);
      return;
    }
    addToCart({
      id: product.slug,
      name: product.name,
      slug: product.slug,
      store: product.storeName,
      price: product.price,
      qty,
      image: selectedImage || product.images[0],
    });
    router.push('/checkout');
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
          className="inline-flex items-center gap-1 text-xs font-semibold text-[#059669] hover:text-[#047857] dark:text-emerald-400"
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
                      ? 'border-[#059669] ring-2 ring-[#059669]/30'
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
              <span className="rounded-md bg-emerald-50 px-2.5 py-1 text-xs font-bold text-[#059669] dark:bg-emerald-950/60 dark:text-emerald-400">
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
                        ? 'border-[#059669] bg-emerald-50 text-[#059669] dark:bg-emerald-950/60 dark:text-emerald-400'
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
                  : 'bg-[#059669] text-white shadow-emerald-950/20 hover:bg-[#047857]'
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

            <button
              type="button"
              onClick={handleBuyNow}
              className="rounded-xl border border-slate-900 bg-slate-900 px-6 py-3 text-xs font-bold text-white shadow-sm transition hover:bg-slate-800 dark:border-white dark:bg-white dark:text-slate-900"
            >
              Buy Now
            </button>
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
              className="text-xs font-bold text-[#059669] hover:text-[#047857]"
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
              <Truck className="h-4 w-4 text-[#059669]" />
              <span>Fast 48h Dispatch</span>
            </div>
            <div className="flex flex-col items-center gap-1">
              <RotateCcw className="h-4 w-4 text-blue-600" />
              <span>7 Days Return</span>
            </div>
          </div>
        </div>
      </div>

      {/* Comprehensive Product Description & Statutory Specifications */}
      <div className="mt-16 space-y-12 border-t border-slate-200 pt-12 dark:border-slate-800">
        {/* Section 1: Complete Description & Key Highlights */}
        <div className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center gap-2.5 mb-4">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                Product Overview & Description
              </h2>
              <p className="text-xs text-slate-500">
                Detailed commercial specifications and verified product highlights
              </p>
            </div>
          </div>

          <div className="text-sm leading-relaxed text-slate-600 dark:text-slate-300 space-y-4">
            <p>{product.longDescription || product.description}</p>
          </div>

          {product.keyFeatures && product.keyFeatures.length > 0 && (
            <div className="mt-6 pt-6 border-t border-slate-100 dark:border-slate-800">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3 flex items-center gap-1.5">
                <Sparkles className="h-4 w-4 text-amber-500" />
                Key Highlights & Features
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {product.keyFeatures.map((feat, idx) => (
                  <div
                    key={idx}
                    className="flex items-start gap-2.5 rounded-xl bg-slate-50 p-3 text-xs font-medium text-slate-700 dark:bg-slate-800/50 dark:text-slate-200"
                  >
                    <Check className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span>{feat}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Section 2: Technical & Statutory Specifications (Matching User's Reference Image) */}
        {product.specifications && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-100 text-[#047857] dark:bg-emerald-950 dark:text-emerald-400">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                    Technical & Statutory Specifications
                  </h2>
                  <p className="text-xs text-slate-500">
                    Mandatory declarations under Legal Metrology (Packaged Commodities) Rules
                  </p>
                </div>
              </div>
              <span className="self-start sm:self-auto rounded-full bg-slate-100 px-3 py-1 font-mono text-[11px] font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                ASIN: {product.specifications.asin || 'B0HJ4PNVSM'}
              </span>
            </div>

            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs dark:border-slate-800 dark:bg-slate-900">
              <table className="w-full text-left text-xs sm:text-sm">
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition">
                    <td className="w-1/3 py-3.5 px-5 font-bold text-slate-900 dark:text-slate-200">
                      Brand Name
                    </td>
                    <td className="w-2/3 py-3.5 px-5 text-slate-700 dark:text-slate-300">
                      {product.specifications.brandName || 'Infinix'}
                    </td>
                  </tr>
                  <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition">
                    <td className="py-3.5 px-5 font-bold text-slate-900 dark:text-slate-200">
                      Model Year
                    </td>
                    <td className="py-3.5 px-5 text-slate-700 dark:text-slate-300">
                      {product.specifications.modelYear || '2026'}
                    </td>
                  </tr>
                  <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition">
                    <td className="py-3.5 px-5 font-bold text-slate-900 dark:text-slate-200">
                      Country of Origin
                    </td>
                    <td className="py-3.5 px-5 text-slate-700 dark:text-slate-300">
                      {product.specifications.countryOfOrigin || 'India'}
                    </td>
                  </tr>
                  <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition">
                    <td className="py-3.5 px-5 font-bold text-slate-900 dark:text-slate-200">
                      Box Contents
                    </td>
                    <td className="py-3.5 px-5 text-slate-700 dark:text-slate-300">
                      {product.specifications.boxContents || 'Smartphone, Accessories'}
                    </td>
                  </tr>
                  <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition">
                    <td className="py-3.5 px-5 font-bold text-slate-900 dark:text-slate-200">
                      Warranty Description
                    </td>
                    <td className="py-3.5 px-5 text-slate-700 dark:text-slate-300">
                      {product.specifications.warrantyDescription || '1 Year Manufacturer domestic warranty'}
                    </td>
                  </tr>
                  <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition">
                    <td className="py-3.5 px-5 font-bold text-slate-900 dark:text-slate-200">
                      Manufacturer
                    </td>
                    <td className="py-3.5 px-5 text-slate-700 dark:text-slate-300">
                      {product.specifications.manufacturer || 'Infinix Mobility Limited'}
                    </td>
                  </tr>
                  <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition">
                    <td className="py-3.5 px-5 font-bold text-slate-900 dark:text-slate-200">
                      Model Series
                    </td>
                    <td className="py-3.5 px-5 text-slate-700 dark:text-slate-300">
                      {product.specifications.modelSeries || product.name}
                    </td>
                  </tr>
                  <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition">
                    <td className="py-3.5 px-5 font-bold text-slate-900 dark:text-slate-200">
                      Specific Uses For Product
                    </td>
                    <td className="py-3.5 px-5 text-slate-700 dark:text-slate-300">
                      {product.specifications.specificUses || 'Photography, Gaming, Daily Communication'}
                    </td>
                  </tr>
                  <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition">
                    <td className="py-3.5 px-5 font-bold text-slate-900 dark:text-slate-200">
                      Unit Count
                    </td>
                    <td className="py-3.5 px-5 text-slate-700 dark:text-slate-300">
                      {product.specifications.unitCount || '1 Count'}
                    </td>
                  </tr>
                  <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition">
                    <td className="py-3.5 px-5 font-bold text-slate-900 dark:text-slate-200">
                      Item Type Name
                    </td>
                    <td className="py-3.5 px-5 text-slate-700 dark:text-slate-300">
                      {product.specifications.itemTypeName || product.category}
                    </td>
                  </tr>
                  <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition">
                    <td className="py-3.5 px-5 font-bold text-slate-900 dark:text-slate-200">
                      Packer Contact Information
                    </td>
                    <td className="py-3.5 px-5 text-slate-700 dark:text-slate-300">
                      {product.specifications.packerContactInfo || 'Infinix Mobility Limited, Shenzhen, China'}
                    </td>
                  </tr>
                  <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition">
                    <td className="py-3.5 px-5 font-bold text-slate-900 dark:text-slate-200">
                      ASIN
                    </td>
                    <td className="py-3.5 px-5 font-mono font-bold text-[#059669] dark:text-emerald-400">
                      {product.specifications.asin || 'B0HJ4PNVSM'}
                    </td>
                  </tr>
                  {product.specifications.customAttributes?.map((attr, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition">
                      <td className="py-3.5 px-5 font-bold text-slate-900 dark:text-slate-200">
                        {attr.key}
                      </td>
                      <td className="py-3.5 px-5 text-slate-700 dark:text-slate-300">
                        {attr.value}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
