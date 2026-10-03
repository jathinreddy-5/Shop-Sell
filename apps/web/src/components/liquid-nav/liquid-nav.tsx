'use client';

import React, {
  useEffect,
  useRef,
  useState,
  useCallback,
  useMemo,
  useId,
} from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '@/lib/auth/auth-context';
import { LiquidNavProps, LiquidNavItem } from './types';
import {
  createLiquidPath,
  DEFAULT_NOTCH_CONFIG,
} from './notch-path';

const liquidSpring = {
  type: 'spring' as const,
  stiffness: 260,
  damping: 28,
  mass: 0.7,
};

const CIRCLE_SIZE = 44;

export function LiquidNav({
  items,
  variant,
  activeId: controlledActiveId,
  onChange,
  className = '',
  ariaLabel = 'Navigation',
}: LiquidNavProps) {
  const pathname = usePathname();
  const { user } = useAuth();
  const containerRef = useRef<HTMLDivElement>(null);
  const itemsRef = useRef<Map<string, HTMLElement>>(new Map());
  const pathId = useId();

  // 1. Filter items based on auth & role requirements before measuring
  const visibleItems = useMemo(() => {
    return items.filter((item) => {
      if (item.requiresAuth && !user) return false;
      if (item.roles && item.roles.length > 0) {
        if (!user) return false;
        const hasRole = item.roles.some((r) => user.roles.includes(r));
        if (!hasRole) return false;
      }
      return true;
    });
  }, [items, user]);

  // 2. Derive active item from URL or controlled prop
  const computedActiveId = useMemo(() => {
    if (controlledActiveId !== undefined) return controlledActiveId;
    if (!pathname || visibleItems.length === 0) return '';

    // Best matching route: exact match first, then longest matching prefix
    let bestMatch: LiquidNavItem | null = null;
    let longestLength = 0;

    for (const item of visibleItems) {
      if (!item.href) continue;
      if (pathname === item.href) {
        return item.id;
      }
      if (
        item.href !== '/' &&
        pathname.startsWith(item.href) &&
        item.href.length > longestLength
      ) {
        bestMatch = item;
        longestLength = item.href.length;
      }
    }

    return bestMatch ? bestMatch.id : (visibleItems[0]?.id ?? '');
  }, [controlledActiveId, pathname, visibleItems]);

  const [activeId, setActiveId] = useState<string>(computedActiveId);

  // Sync activeId when computed route changes (e.g. navigation settles, browser back/forward)
  useEffect(() => {
    if (computedActiveId) {
      setActiveId(computedActiveId);
    }
  }, [computedActiveId]);

  // Dimension state for responsive SVG sizing
  const [dimensions, setDimensions] = useState<{ width: number; height: number }>({
    width: variant === 'side' ? 68 : variant === 'top' ? 280 : 360,
    height: variant === 'side' ? 420 : variant === 'top' ? 56 : 64,
  });

  // Measure element center relative to container
  const measureCenter = useCallback(
    (targetId: string): number | null => {
      const container = containerRef.current;
      const el = itemsRef.current.get(targetId);
      if (!container || !el) return null;

      const cRect = container.getBoundingClientRect();
      const eRect = el.getBoundingClientRect();

      if (variant === 'side') {
        return eRect.top - cRect.top + eRect.height / 2;
      } else {
        return eRect.left - cRect.left + eRect.width / 2;
      }
    },
    [variant]
  );

  // Geometric fallback center for initial render before DOM measurement
  const getFallbackCenter = useCallback(
    (id: string): number => {
      const idx = visibleItems.findIndex((it) => it.id === id);
      if (idx < 0) return 0;
      const total = Math.max(1, visibleItems.length);
      const span = variant === 'side' ? dimensions.height : dimensions.width;
      return (idx + 0.5) * (span / total);
    },
    [variant, visibleItems, dimensions]
  );

  // Synchronized active center: both notch and circle derive position from this exact value
  const [activeCenter, setActiveCenter] = useState<number>(() => {
    const idx = visibleItems.findIndex((it) => it.id === computedActiveId);
    const total = Math.max(1, visibleItems.length);
    const span = variant === 'side' ? 420 : variant === 'top' ? 280 : 360;
    return idx >= 0 ? (idx + 0.5) * (span / total) : 40;
  });

  // Re-measure and update activeCenter on activeId change
  useEffect(() => {
    if (!activeId) return;
    const measured = measureCenter(activeId);
    if (measured !== null) {
      setActiveCenter(measured);
    } else {
      setActiveCenter(getFallbackCenter(activeId));
    }
  }, [activeId, measureCenter, getFallbackCenter]);

  // ResizeObserver for dynamic recomputation on resize, layout shift, or font load
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const updateMeasurements = () => {
      const rect = container.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        setDimensions({ width: rect.width, height: rect.height });
      }
      if (activeId) {
        const measured = measureCenter(activeId);
        if (measured !== null) {
          setActiveCenter(measured);
        }
      }
    };

    updateMeasurements();

    const observer = new ResizeObserver(() => {
      updateMeasurements();
    });

    observer.observe(container);
    visibleItems.forEach((it) => {
      const el = itemsRef.current.get(it.id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, [activeId, measureCenter, visibleItems]);

  // Handle user click: optimistic target derivation, no unmounts, uninterrupted spring
  const handleItemClick = (item: LiquidNavItem, e: React.MouseEvent) => {
    if (item.onClick) {
      item.onClick();
    }

    if (item.id === activeId) {
      return;
    }

    // Immediately measure and update activeCenter for zero-latency target derivation
    const measured = measureCenter(item.id);
    if (measured !== null) {
      setActiveCenter(measured);
    } else {
      setActiveCenter(getFallbackCenter(item.id));
    }

    setActiveId(item.id);
    if (onChange) onChange(item.id);
  };

  // Keyboard navigation support (ArrowLeft/ArrowRight or ArrowUp/ArrowDown)
  const handleKeyDown = (e: React.KeyboardEvent) => {
    const isHorizontal = variant === 'bottom' || variant === 'top';
    const nextKey = isHorizontal ? 'ArrowRight' : 'ArrowDown';
    const prevKey = isHorizontal ? 'ArrowLeft' : 'ArrowUp';

    const currentIndex = visibleItems.findIndex((it) => it.id === activeId);
    if (currentIndex === -1) return;

    let targetIndex = currentIndex;
    if (e.key === nextKey) {
      targetIndex = (currentIndex + 1) % visibleItems.length;
    } else if (e.key === prevKey) {
      targetIndex = (currentIndex - 1 + visibleItems.length) % visibleItems.length;
    } else {
      return;
    }

    e.preventDefault();
    const targetItem = visibleItems[targetIndex];
    if (targetItem) {
      const measured = measureCenter(targetItem.id);
      if (measured !== null) {
        setActiveCenter(measured);
      } else {
        setActiveCenter(getFallbackCenter(targetItem.id));
      }
      setActiveId(targetItem.id);
      if (onChange) onChange(targetItem.id);
      itemsRef.current.get(targetItem.id)?.focus();
    }
  };

  // Active item object
  const activeItem = visibleItems.find((it) => it.id === activeId) || null;
  const ActiveIcon = activeItem?.icon;

  // Deterministic SVG path: command structure is always identical (M, L, C, C, L, ...)
  const path = useMemo(() => {
    return createLiquidPath(variant, dimensions.width, dimensions.height, activeCenter);
  }, [variant, dimensions, activeCenter]);

  // Floating circle target position: both circle and notch share the same activeCenter and overlap seamlessly
  const targetX =
    variant === 'side'
      ? dimensions.width - 38
      : activeCenter - CIRCLE_SIZE / 2;

  const targetY =
    variant === 'bottom'
      ? -10
      : variant === 'top'
      ? dimensions.height - 40
      : activeCenter - CIRCLE_SIZE / 2;

  return (
    <nav
      aria-label={ariaLabel}
      onKeyDown={handleKeyDown}
      className={`relative select-none ${
        variant === 'side' ? 'w-full h-full' : 'w-full'
      } ${className}`}
      data-testid="liquid-nav"
      data-variant={variant}
      data-active-id={activeId}
    >
      <div
        ref={containerRef}
        className={`relative ${
          variant === 'side'
            ? 'flex flex-col items-center justify-start h-full w-full py-4'
            : variant === 'top'
            ? 'flex items-center justify-between h-14 w-full px-2'
            : 'flex items-center justify-around h-16 w-full px-2'
        }`}
        style={{
          background: 'transparent',
        }}
      >
        {/* Single Organic SVG Bar with Gliding Notch - seamlessly blending into header */}
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none z-0"
          width={dimensions.width}
          height={dimensions.height}
          viewBox={`0 0 ${dimensions.width} ${dimensions.height}`}
          aria-hidden="true"
        >
          <motion.path
            id="liquid-nav-path"
            data-testid="liquid-nav-svg-path"
            data-center={activeCenter.toFixed(1)}
            fill="#F8FAFC"
            className="fill-slate-50 dark:fill-slate-900"
            stroke="none"
            initial={false}
            animate={{ d: path }}
            transition={liquidSpring}
          />
        </svg>

        {/* Persistent Floating Elevated Circle with Active Icon in Yellow (#FFE500) */}
        <motion.div
          data-testid="liquid-nav-circle"
          data-center={activeCenter.toFixed(1)}
          className="absolute left-0 top-0 pointer-events-none z-20 flex items-center justify-center will-change-transform"
          style={{
            width: CIRCLE_SIZE,
            height: CIRCLE_SIZE,
          }}
          initial={false}
          animate={{
            x: targetX,
            y: targetY,
            opacity: activeItem ? 1 : 0,
            scale: activeItem ? 1 : 0.8,
          }}
          transition={liquidSpring}
        >
          <div
            className="relative flex h-11 w-11 items-center justify-center rounded-full"
            style={{
              backgroundColor: '#111827',
              border: '2px solid rgba(255, 229, 0, 0.55)',
              boxShadow: '0 6px 18px rgba(15, 23, 42, 0.16)',
            }}
          >
            <AnimatePresence mode="popLayout" initial={false}>
              {activeItem && (
                <motion.div
                  key={activeItem.id}
                  initial={{
                    opacity: 0,
                    scale: 0.65,
                    rotate: -8,
                  }}
                  animate={{
                    opacity: 1,
                    scale: 1,
                    rotate: 0,
                  }}
                  exit={{
                    opacity: 0,
                    scale: 0.65,
                    rotate: 8,
                  }}
                  transition={{
                    duration: 0.18,
                    ease: 'easeOut',
                  }}
                  className="flex items-center justify-center"
                >
                  {activeItem.avatarUrl ? (
                    <div className="relative h-8 w-8 overflow-hidden rounded-full ring-2 ring-[#FFE500]">
                      <Image
                        src={activeItem.avatarUrl}
                        alt={activeItem.label}
                        fill
                        className="object-cover"
                      />
                    </div>
                  ) : ActiveIcon ? (
                    <ActiveIcon className="h-5 w-5 text-[#FFE500] drop-shadow-[0_0_6px_rgba(255,229,0,0.35)]" />
                  ) : null}

                  {/* Badge visible inside active circle */}
                  {activeItem.badge !== undefined && activeItem.badge !== null && (
                    <span
                      className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#FFE500] px-1 text-[10px] font-black text-black ring-2 ring-zinc-900 shadow-sm"
                      data-testid="liquid-nav-active-badge"
                    >
                      {activeItem.badge}
                    </span>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>

        {/* Navigation Items (Links / Interactive targets) */}
        <div
          className={`relative z-10 flex w-full ${
            variant === 'side'
              ? 'flex-col items-center space-y-3'
              : 'flex-row items-center justify-around'
          }`}
        >
          {visibleItems.map((item) => {
            const isActive = item.id === activeId;
            const Icon = item.icon;

            return (
              <Link
                key={item.id}
                href={item.href}
                prefetch
                ref={(el) => {
                  if (el) itemsRef.current.set(item.id, el);
                  else itemsRef.current.delete(item.id);
                }}
                onClick={(e) => handleItemClick(item, e)}
                aria-current={isActive ? 'page' : undefined}
                aria-label={item.label}
                title={item.label}
                className={`group relative flex items-center justify-center outline-none focus-visible:ring-2 focus-visible:ring-[#FFE500] rounded-xl ${
                  variant === 'side'
                    ? 'h-11 w-11'
                    : 'h-11 min-w-[48px] px-2'
                }`}
                data-testid={`liquid-nav-item-${item.id}`}
                data-active={isActive ? 'true' : 'false'}
              >
                {/* Inactive Icon on the bar: state-driven Motion transition */}
                <motion.div
                  initial={false}
                  animate={{
                    opacity: isActive ? 0 : 0.85,
                    scale: isActive ? 0.75 : 1,
                  }}
                  transition={{ duration: 0.18, ease: 'easeOut' }}
                  className="flex flex-col items-center justify-center group-hover:scale-110 transition-transform"
                  style={{ pointerEvents: isActive ? 'none' : 'auto' }}
                >
                  {item.avatarUrl ? (
                    <div className="relative h-6 w-6 overflow-hidden rounded-full ring-1 ring-slate-300">
                      <Image
                        src={item.avatarUrl}
                        alt={item.label}
                        fill
                        className="object-cover"
                      />
                    </div>
                  ) : (
                    <Icon className="h-5 w-5 text-[#475569] group-hover:text-[#1E293B] transition-colors" />
                  )}

                  {/* Desktop label if space permits in horizontal nav */}
                  {variant === 'top' && (
                    <span className="mt-0.5 text-[10px] font-medium tracking-tight text-[#64748B] group-hover:text-[#1E293B] transition-colors">
                      {item.label}
                    </span>
                  )}
                </motion.div>

                {/* Badge on inactive item */}
                {!isActive && item.badge !== undefined && item.badge !== null && (
                  <span
                    className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-indigo-600 px-1 text-[10px] font-bold text-white shadow-sm"
                    data-testid={`liquid-nav-badge-${item.id}`}
                  >
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
