'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import Link from 'next/link';
import {
  motion,
  AnimatePresence,
  PanInfo,
  useMotionValue,
  useTransform,
} from 'motion/react';
import {
  ChevronUp,
  ChevronDown,
  X,
  Sparkles,
  Flame,
  ShoppingBag,
  Star,
  Check,
  Maximize2,
  Minimize2,
} from 'lucide-react';
import {
  SheetSnapState,
  SheetDimensions,
  DEFAULT_SHEET_DIMENSIONS,
  getSnapTranslateY,
  resolveSnapPoint,
  sheetSpring,
} from './sheet-motion';
import { useAuth } from '@/lib/auth/auth-context';
import { useCart } from '@/lib/cart/cart-context';

export interface PeekSheetProduct {
  id: string;
  name: string;
  price: number;
  compare_at_price?: number;
  rating_avg?: number;
  rating_count?: number;
  store_name?: string;
  category?: string;
  image?: string;
  images?: string[];
  slug?: string;
  badge?: string;
}

export interface DraggablePeekSheetProps {
  products?: PeekSheetProduct[];
  title?: string;
  subtitle?: string;
  initialSnap?: SheetSnapState;
  allowClose?: boolean;
  className?: string;
  activeSpotlightId?: string | null;
  onSelectProduct?: (product: PeekSheetProduct) => void;
}

const DEFAULT_DEAL_PRODUCTS: PeekSheetProduct[] = [
  {
    id: 'deal-s25fe',
    name: 'Samsung Galaxy S25 FE (128GB)',
    price: 46999,
    compare_at_price: 59999,
    rating_avg: 4.8,
    rating_count: 1240,
    store_name: 'Samsung Flagship',
    category: 'Mobiles',
    image: 'https://images.unsplash.com/photo-1598327105666-5b89351aff97?w=600&q=80',
    slug: 'samsung-galaxy-s25-fe',
    badge: 'Festival Spotlight',
  },
  {
    id: 'deal-mivi-5g',
    name: 'Mivi One 5G Smartphone',
    price: 11999,
    compare_at_price: 16999,
    rating_avg: 4.7,
    rating_count: 890,
    store_name: 'Mivi Direct',
    category: 'Mobiles',
    image: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=600&q=80',
    slug: 'mivi-one-5g',
    badge: 'Flipkart Unique',
  },
  {
    id: 'deal-earbuds',
    name: 'AcousticPro True Wireless ANC',
    price: 3499,
    compare_at_price: 4999,
    rating_avg: 4.8,
    rating_count: 142,
    store_name: 'SoundWave Audio',
    category: 'Audio',
    image: 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=600&q=80',
    slug: 'acousticpro-true-wireless-earbuds',
    badge: 'Top Rated',
  },
  {
    id: 'deal-smartwatch',
    name: 'Apex Horizon AMOLED Smartwatch',
    price: 2899,
    compare_at_price: 5999,
    rating_avg: 4.6,
    rating_count: 310,
    store_name: 'Apex Tech India',
    category: 'Wearables',
    image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&q=80',
    slug: 'apex-horizon-amoled-smartwatch',
    badge: '52% Off',
  },
  {
    id: 'deal-gan-charger',
    name: '45W Ultra-Fast Dual GaN Charger',
    price: 1499,
    compare_at_price: 2499,
    rating_avg: 4.9,
    rating_count: 420,
    store_name: 'Apex Tech India',
    category: 'Accessories',
    image: 'https://images.unsplash.com/photo-1583863788434-e58a36330cf0?w=600&q=80',
    slug: '45w-ultra-fast-dual-gan-charger',
    badge: 'Bestseller',
  },
  {
    id: 'deal-s25-ultra',
    name: 'Samsung Galaxy S25 Ultra (256GB)',
    price: 57999,
    compare_at_price: 74999,
    rating_avg: 4.9,
    rating_count: 2150,
    store_name: 'Samsung Flagship',
    category: 'Mobiles',
    image: 'https://images.unsplash.com/photo-1610945415295-d9bbf067e59c?w=600&q=80',
    slug: 'samsung-galaxy-s25-ultra',
    badge: 'Flat Offer',
  },
  {
    id: 'deal-apple-airpods',
    name: 'Apple AirPods Pro (2nd Generation)',
    price: 17999,
    compare_at_price: 24900,
    rating_avg: 4.9,
    rating_count: 3410,
    store_name: 'Apple Authorised Reseller',
    category: 'Audio',
    image: 'https://images.unsplash.com/photo-1600294037681-c80b4cb5b434?w=600&q=80',
    slug: 'apple-airpods-pro-2nd-gen',
    badge: 'Bestseller',
  },
  {
    id: 'deal-sony-wh1000xm5',
    name: 'Sony WH-1000XM5 Wireless ANC Headphones',
    price: 24990,
    compare_at_price: 34990,
    rating_avg: 4.85,
    rating_count: 1820,
    store_name: 'Sony Centre India',
    category: 'Audio',
    image: 'https://images.unsplash.com/photo-1546435770-a3e426bf472b?w=600&q=80',
    slug: 'sony-wh-1000xm5-wireless-anc',
    badge: 'Lowest Price',
  },
  {
    id: 'deal-realme-pad',
    name: 'Realme Pad 2 11.5" (120Hz 2K Display)',
    price: 13499,
    compare_at_price: 19999,
    rating_avg: 4.65,
    rating_count: 670,
    store_name: 'Realme Official',
    category: 'Mobiles',
    image: 'https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=600&q=80',
    slug: 'realme-pad-2-11-5-inch',
    badge: 'Crazy Deal',
  },
  {
    id: 'deal-noise-smartwatch',
    name: 'Noise ColorFit Pro 5 Max AMOLED',
    price: 2499,
    compare_at_price: 6999,
    rating_avg: 4.6,
    rating_count: 1540,
    store_name: 'Noise Official Store',
    category: 'Wearables',
    image: 'https://images.unsplash.com/photo-1508685096489-7aacd43bd3b1?w=600&q=80',
    slug: 'noise-colorfit-pro-5-max',
    badge: 'Festive Launch',
  },
  {
    id: 'deal-keyboard',
    name: 'Custom Walnut Mechanical Keyboard',
    price: 7499,
    compare_at_price: 9999,
    rating_avg: 4.96,
    rating_count: 65,
    store_name: 'Apex Tech India',
    category: 'Accessories',
    image: 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=600&q=80',
    slug: 'custom-walnut-mechanical-keyboard',
    badge: 'Artisan Pick',
  },
];

export function DraggablePeekSheet({
  products = DEFAULT_DEAL_PRODUCTS,
  title = 'Deals For You',
  subtitle = 'Personalized picks based on current trends',
  initialSnap = 'peek',
  allowClose = true,
  className = '',
  activeSpotlightId = null,
  onSelectProduct,
}: DraggablePeekSheetProps) {
  const { user } = useAuth();
  const { addToCart, openLoginPrompt } = useCart();

  const [snap, setSnap] = useState<SheetSnapState>(initialSnap);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [addedItems, setAddedItems] = useState<Record<string, boolean>>({});
  const [dimensions, setDimensions] = useState<SheetDimensions>(DEFAULT_SHEET_DIMENSIONS);

  const containerRef = useRef<HTMLDivElement>(null);

  // Update sheet dimensions based on window height
  useEffect(() => {
    const updateDims = () => {
      const vh = window.innerHeight || 800;
      setDimensions({
        containerHeight: Math.min(vh, 760),
        peekHeight: 74,
        halfRatio: 0.52,
        fullRatio: 0.88,
      });
    };
    updateDims();
    window.addEventListener('resize', updateDims);
    return () => window.removeEventListener('resize', updateDims);
  }, []);

  // Sync when activeSpotlightId changes externally (e.g. user tapped banner)
  useEffect(() => {
    if (activeSpotlightId) {
      setSnap('half');
    }
  }, [activeSpotlightId]);

  // Motion Y coordinates
  const currentTranslateY = getSnapTranslateY(snap, dimensions);
  const fullSheetHeight = dimensions.containerHeight * dimensions.fullRatio;

  // Handle Drag End with physics
  const handleDragEnd = (
    _event: MouseEvent | TouchEvent | PointerEvent,
    info: PanInfo
  ) => {
    const nextSnap = resolveSnapPoint({
      currentTranslateY: currentTranslateY + info.offset.y,
      velocityY: info.velocity.y,
      currentSnap: snap,
      dims: dimensions,
      allowClose,
    });
    setSnap(nextSnap);
  };

  // Add to cart handler
  const handleAddToCart = (item: PeekSheetProduct, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) {
      openLoginPrompt(item.name);
      return;
    }
    const success = addToCart({
      id: item.id,
      name: item.name,
      slug: item.slug || item.id,
      store: item.store_name || 'Verified Store',
      price: item.price,
      qty: 1,
      image: item.image || (item.images && item.images[0]) || 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=200&q=80',
    });
    if (success) {
      setAddedItems((prev) => ({ ...prev, [item.id]: true }));
      setTimeout(() => {
        setAddedItems((prev) => ({ ...prev, [item.id]: false }));
      }, 1800);
    }
  };

  // Filter products by selected category
  const categories = useMemo(() => {
    const cats = new Set<string>(['All']);
    products.forEach((p) => {
      if (p.category) cats.add(p.category);
    });
    return Array.from(cats);
  }, [products]);

  const filteredProducts = useMemo(() => {
    if (selectedCategory === 'All') return products;
    return products.filter((p) => p.category === selectedCategory);
  }, [products, selectedCategory]);

  const isExpanded = snap === 'half' || snap === 'full';

  return (
    <>
      {/* 1. Backdrop Dimmer (active when expanded) */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-[2px]"
            onClick={() => setSnap('peek')}
            aria-hidden="true"
          />
        )}
      </AnimatePresence>

      {/* 2. Floating Restore Pill if sheet was closed */}
      <AnimatePresence>
        {snap === 'closed' && (
          <motion.button
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            onClick={() => setSnap('peek')}
            className="fixed bottom-20 right-4 z-50 flex items-center gap-2 rounded-full border border-emerald-200 bg-[#059669] px-4 py-2.5 text-xs font-bold text-white shadow-xl shadow-emerald-950/30 transition hover:bg-[#047857] md:bottom-6"
            aria-label="Reopen Deals Sheet"
          >
            <Flame className="h-4 w-4 text-amber-300 animate-pulse" />
            <span>View Deals ({products.length})</span>
          </motion.button>
        )}
      </AnimatePresence>

      {/* 3. The Draggable Bottom Peek Sheet */}
      <AnimatePresence>
        {snap !== 'closed' && (
          <motion.div
            ref={containerRef}
            role="region"
            aria-label="Personalized Recommendations Peek Sheet"
            className={`fixed bottom-0 left-0 right-0 z-50 mx-auto w-full max-w-lg overflow-hidden rounded-t-[28px] border-t border-stone-200/90 bg-white/95 shadow-2xl backdrop-blur-md dark:border-stone-800 dark:bg-stone-900/95 ${className}`}
            style={{
              height: fullSheetHeight,
              touchAction: 'none',
            }}
            animate={{
              y: currentTranslateY,
            }}
            transition={sheetSpring}
            drag="y"
            dragConstraints={{
              top: 0,
              bottom: fullSheetHeight,
            }}
            dragElastic={0.15}
            onDragEnd={handleDragEnd}
          >
            {/* Drag Handle Bar */}
            <div
              className="flex w-full cursor-grab flex-col items-center justify-center pt-2.5 pb-1.5 active:cursor-grabbing hover:bg-stone-50/50 dark:hover:bg-stone-800/50 transition-colors select-none"
              onClick={() => {
                if (snap === 'peek') setSnap('half');
                else if (snap === 'half') setSnap('full');
                else setSnap('peek');
              }}
            >
              {/* Rounded Pill Handle */}
              <div className="h-1.5 w-12 rounded-full bg-stone-300 dark:bg-stone-600 mb-2 transition-transform hover:scale-105" />

              {/* Collapsed Peek Header */}
              <div className="flex w-full items-center justify-between px-4 pb-1">
                <div className="flex items-center gap-2.5">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-tr from-[#047857] to-[#10B981] text-white shadow-sm">
                    <Flame className="h-4 w-4" />
                  </span>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <h3 className="text-xs font-bold text-stone-900 dark:text-white leading-none">
                        {title}
                      </h3>
                      <span className="rounded-full bg-[#D1FAE5] px-1.5 py-0.2 text-[10px] font-extrabold text-[#065F46] dark:bg-emerald-950/80 dark:text-emerald-300">
                        {products.length} Offers
                      </span>
                    </div>
                    <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 leading-tight mt-0.5">
                      {isExpanded ? subtitle : 'Swipe up to explore curated deals'}
                    </p>
                  </div>
                </div>

                {/* Quick Action Buttons in Peek Bar */}
                <div className="flex items-center gap-1">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (snap === 'peek') setSnap('half');
                      else if (snap === 'half') setSnap('full');
                      else setSnap('peek');
                    }}
                    className="flex h-7 w-7 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800"
                    aria-label={isExpanded ? 'Minimize Sheet' : 'Expand Sheet'}
                  >
                    {isExpanded ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronUp className="h-4 w-4" />
                    )}
                  </button>

                  {isExpanded && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSnap(snap === 'half' ? 'full' : 'half');
                      }}
                      className="hidden sm:flex h-7 w-7 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800"
                      aria-label={snap === 'half' ? 'Full View' : 'Half View'}
                    >
                      {snap === 'half' ? (
                        <Maximize2 className="h-3.5 w-3.5" />
                      ) : (
                        <Minimize2 className="h-3.5 w-3.5" />
                      )}
                    </button>
                  )}

                  {allowClose && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSnap('closed');
                      }}
                      className="flex h-7 w-7 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-rose-600 dark:hover:bg-slate-800"
                      aria-label="Dismiss Sheet"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Scrollable Sheet Content Body */}
            <div
              className="flex-1 overflow-y-auto px-4 pb-20 pt-2 no-scrollbar"
              style={{
                height: fullSheetHeight - dimensions.peekHeight,
                touchAction: 'pan-y',
              }}
            >
              {/* Category Filter Pills */}
              <div className="mb-3 flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`rounded-full px-3 py-1 text-xs font-semibold transition shrink-0 ${
                      selectedCategory === cat
                        ? 'bg-[#059669] text-white shadow-sm'
                        : 'border border-stone-200 bg-stone-50 text-stone-600 hover:bg-stone-100 dark:border-stone-800 dark:bg-stone-800 dark:text-stone-300'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {/* Spotlight Product Banner if matched */}
              {activeSpotlightId && (
                <div className="mb-4 rounded-xl border border-emerald-200 bg-gradient-to-r from-emerald-50 to-teal-50 p-3 dark:border-emerald-900 dark:from-emerald-950/40 dark:to-stone-900">
                  <div className="flex items-center gap-1.5 text-[11px] font-bold text-[#059669] dark:text-emerald-300">
                    <Sparkles className="h-3.5 w-3.5" />
                    <span>Banner Spotlight Deal Active</span>
                  </div>
                </div>
              )}

              {/* Product Deals List */}
              <div className="space-y-3">
                {filteredProducts.map((item) => {
                  const isAdded = !!addedItems[item.id];
                  const discountPercent = item.compare_at_price
                    ? Math.round(
                        ((item.compare_at_price - item.price) / item.compare_at_price) * 100
                      )
                    : null;

                  return (
                    <div
                      key={item.id}
                      onClick={() => onSelectProduct?.(item)}
                      className="group flex items-center gap-3 rounded-2xl border border-stone-200/90 bg-white p-3 shadow-xs transition hover:border-emerald-400 hover:shadow-sm dark:border-stone-800 dark:bg-stone-900/90 dark:hover:border-emerald-700"
                    >
                      {/* Product Thumbnail */}
                      <Link
                        href={`/product/${item.slug || item.id}`}
                        className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-stone-100 dark:bg-stone-800"
                      >
                        <img
                          src={item.image || 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=200&q=80'}
                          alt={item.name}
                          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                        />
                        {item.badge && (
                          <span className="absolute bottom-1 left-1 rounded bg-black/75 px-1 py-0.2 text-[9px] font-black uppercase text-amber-300 backdrop-blur-xs">
                            {item.badge}
                          </span>
                        )}
                      </Link>

                      {/* Product Details */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1 text-[11px] text-stone-500 dark:text-stone-400">
                          <span className="truncate font-medium">{item.store_name}</span>
                          {item.rating_avg && (
                            <>
                              <span>•</span>
                              <span className="flex items-center text-amber-500 font-semibold">
                                <Star className="h-3 w-3 fill-current inline mr-0.5" />
                                {item.rating_avg}
                              </span>
                            </>
                          )}
                        </div>

                        <Link href={`/product/${item.slug || item.id}`}>
                          <h4 className="truncate text-xs font-bold text-stone-900 hover:text-[#059669] dark:text-white dark:hover:text-emerald-400">
                            {item.name}
                          </h4>
                        </Link>

                        <div className="mt-1 flex items-baseline gap-1.5">
                          <span className="text-xs font-black text-stone-900 dark:text-white">
                            ₹{item.price.toLocaleString('en-IN')}
                          </span>
                          {item.compare_at_price && (
                            <span className="text-[11px] text-stone-400 line-through">
                              ₹{item.compare_at_price.toLocaleString('en-IN')}
                            </span>
                          )}
                          {discountPercent && (
                            <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400">
                              {discountPercent}% off
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Quick Add Button */}
                      <button
                        onClick={(e) => handleAddToCart(item, e)}
                        className={`flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-xl px-3 text-xs font-bold shadow-xs transition active:scale-95 ${
                          isAdded
                            ? 'bg-emerald-600 text-white'
                            : 'bg-[#059669] text-white hover:bg-[#047857]'
                        }`}
                        aria-label={`Add ${item.name} to cart`}
                      >
                        {isAdded ? (
                          <>
                            <Check className="h-3.5 w-3.5" />
                            <span>Added</span>
                          </>
                        ) : (
                          <>
                            <ShoppingBag className="h-3.5 w-3.5" />
                            <span>Add</span>
                          </>
                        )}
                      </button>
                    </div>
                  );
                })}
              </div>

              {/* Bottom Quick Action Bar */}
              <div className="mt-4 pt-3 border-t border-stone-100 dark:border-stone-800 flex items-center justify-between text-xs">
                <span className="text-stone-500 dark:text-stone-400 font-medium">
                  Showing top {filteredProducts.length} deals
                </span>
                <Link
                  href="/search?sort=discount"
                  className="font-bold text-[#059669] hover:underline dark:text-emerald-400"
                >
                  View All Festive Discounts &rarr;
                </Link>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
