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
import { useAuth } from '@/lib/auth/auth-context';
import { LiquidNavProps, LiquidNavItem } from './types';
import {
  generateNotchPath,
  springEase,
  DEFAULT_NOTCH_CONFIG,
} from './notch-path';

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

    return bestMatch ? bestMatch.id : '';
  }, [controlledActiveId, pathname, visibleItems]);

  const [activeId, setActiveId] = useState<string>(computedActiveId);

  // Sync activeId when computed route changes (e.g. navigation settles, browser back/forward)
  const prevComputedRef = useRef<string>(computedActiveId);
  useEffect(() => {
    if (computedActiveId !== prevComputedRef.current) {
      prevComputedRef.current = computedActiveId;
      setActiveId(computedActiveId);
    }
  }, [computedActiveId]);

  // Dimension & animation state
  const [dimensions, setDimensions] = useState<{ width: number; height: number }>({
    width: variant === 'side' ? 68 : variant === 'top' ? 280 : 360,
    height: variant === 'side' ? 420 : variant === 'top' ? 56 : 64,
  });

  // Center position along the rail (x for top/bottom, y for side)
  const [centerPos, setCenterPos] = useState<number>(() => {
    // Initial SSR heuristic estimate to prevent flash at 0
    const idx = visibleItems.findIndex((it) => it.id === computedActiveId);
    if (idx < 0) return -1;
    const total = Math.max(1, visibleItems.length);
    const span = variant === 'side' ? 420 : 360;
    return (idx + 0.5) * (span / total);
  });

  const centerPosRef = useRef<number>(centerPos);
  useEffect(() => {
    centerPosRef.current = centerPos;
  }, [centerPos]);

  const [stretch, setStretch] = useState<number>(1.0);
  const [isTransitioning, setIsTransitioning] = useState<boolean>(false);

  // Track animation state ref to enable clean interruption on rapid clicks
  const animRef = useRef<{
    rafId: number | null;
    startTime: number;
    startCenter: number;
    targetCenter: number;
    stretchMagnitude: number;
  }>({
    rafId: null,
    startTime: 0,
    startCenter: centerPos,
    targetCenter: centerPos,
    stretchMagnitude: 0,
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

  // Smooth interruptible animation loop
  const animateTo = useCallback(
    (targetCenter: number, isImmediate = false) => {
      // Check prefers-reduced-motion
      const prefersReducedMotion =
        typeof window !== 'undefined' &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches;

      if (isImmediate || prefersReducedMotion) {
        if (animRef.current.rafId) {
          cancelAnimationFrame(animRef.current.rafId);
          animRef.current.rafId = null;
        }
        centerPosRef.current = targetCenter;
        setCenterPos(targetCenter);
        setStretch(1.0);
        setIsTransitioning(false);
        return;
      }

      // Calculate distance for dynamic stretch scaling
      const currentC = centerPosRef.current >= 0 ? centerPosRef.current : targetCenter;
      const distance = Math.abs(targetCenter - currentC);
      if (distance < 0.5) {
        centerPosRef.current = targetCenter;
        setCenterPos(targetCenter);
        setStretch(1.0);
        setIsTransitioning(false);
        return;
      }

      // Longer jumps stretch more (up to +38%)
      const stretchMagnitude = Math.min(0.38, (distance / 280) * 0.38);

      if (animRef.current.rafId) {
        cancelAnimationFrame(animRef.current.rafId);
      }

      animRef.current = {
        rafId: null,
        startTime: performance.now(),
        startCenter: currentC,
        targetCenter,
        stretchMagnitude,
      };

      setIsTransitioning(true);
      const duration = DEFAULT_NOTCH_CONFIG.durationMs;

      const step = (now: number) => {
        const elapsed = now - animRef.current.startTime;
        const t = Math.min(1, Math.max(0, elapsed / duration));

        const easedT = springEase(t);
        const nextCenter =
          animRef.current.startCenter +
          (animRef.current.targetCenter - animRef.current.startCenter) * easedT;

        // Notch stretch peaks halfway through the jump
        const currentStretch =
          1.0 + animRef.current.stretchMagnitude * Math.sin(Math.PI * t);

        centerPosRef.current = nextCenter;
        setCenterPos(nextCenter);
        setStretch(currentStretch);

        if (t < 1) {
          animRef.current.rafId = requestAnimationFrame(step);
        } else {
          centerPosRef.current = animRef.current.targetCenter;
          setCenterPos(animRef.current.targetCenter);
          setStretch(1.0);
          setIsTransitioning(false);
          animRef.current.rafId = null;
        }
      };

      animRef.current.rafId = requestAnimationFrame(step);
    },
    []
  );

  // Trigger animation whenever activeId changes
  useEffect(() => {
    if (!activeId) return;
    const targetPos = measureCenter(activeId);
    if (targetPos !== null) {
      animateTo(targetPos);
    }
  }, [activeId, measureCenter, animateTo]);

  // ResizeObserver for dynamic recomputation on resize, layout shift, or font load
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const updateContainerDimensions = () => {
      const rect = container.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        setDimensions({ width: rect.width, height: rect.height });
      }
    };

    updateContainerDimensions();

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.target === container) {
          const rect = container.getBoundingClientRect();
          if (rect.width > 0 && rect.height > 0) {
            setDimensions({ width: rect.width, height: rect.height });
          }
        }
      }

      if (activeId) {
        const measured = measureCenter(activeId);
        if (measured !== null && !isTransitioning) {
          centerPosRef.current = measured;
          setCenterPos(measured);
        }
      }
    });

    observer.observe(container);
    visibleItems.forEach((it) => {
      const el = itemsRef.current.get(it.id);
      if (el) observer.observe(el);
    });

    // Initial measurement
    if (activeId) {
      const initialMeasured = measureCenter(activeId);
      if (initialMeasured !== null) {
        centerPosRef.current = initialMeasured;
        setCenterPos(initialMeasured);
      }
    }

    return () => {
      observer.disconnect();
      if (animRef.current.rafId) {
        cancelAnimationFrame(animRef.current.rafId);
      }
    };
  }, [visibleItems, activeId, measureCenter, isTransitioning]);

  // Handle user click: optimistic, immediate animation start, no replay if already active
  const handleItemClick = (item: LiquidNavItem, e: React.MouseEvent) => {
    if (item.onClick) {
      item.onClick();
    }

    if (item.id === activeId) {
      // Do nothing if already active (no replay)
      return;
    }

    // Optimistic state change
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
      setActiveId(targetItem.id);
      if (onChange) onChange(targetItem.id);
      const targetPos = measureCenter(targetItem.id);
      if (targetPos !== null) {
        animateTo(targetPos);
      }
      itemsRef.current.get(targetItem.id)?.focus();
    }
  };

  // Active item object
  const activeItem = visibleItems.find((it) => it.id === activeId) || null;

  // Dynamic SVG path for the bar with the carved notch
  const pathData = useMemo(() => {
    return generateNotchPath({
      variant,
      width: dimensions.width,
      height: dimensions.height,
      center: activeItem && centerPos >= 0 ? centerPos : -1,
      notchRadius: DEFAULT_NOTCH_CONFIG.radius,
      notchDepth: DEFAULT_NOTCH_CONFIG.depth,
      stretch,
    });
  }, [variant, dimensions, centerPos, stretch, activeItem]);

  // Compute floating circle transform coordinates
  const circleTransform = useMemo(() => {
    const circleSize = 48;
    const r = circleSize / 2;

    if (variant === 'bottom') {
      // Circle rises upward out of the notch
      // Center X = centerPos, Center Y = 10
      const x = centerPos - r;
      const y = -14;
      return `translate3d(${x.toFixed(2)}px, ${y.toFixed(2)}px, 0)`;
    }

    if (variant === 'top') {
      // Circle hangs below the bar
      // Center X = centerPos, Center Y = height - 10
      const x = centerPos - r;
      const y = dimensions.height - 34;
      return `translate3d(${x.toFixed(2)}px, ${y.toFixed(2)}px, 0)`;
    }

    // variant === 'side'
    // Circle glides vertically along the rail
    const x = dimensions.width - 34;
    const y = centerPos - r;
    return `translate3d(${x.toFixed(2)}px, ${y.toFixed(2)}px, 0)`;
  }, [variant, centerPos, dimensions]);

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
      >
        {/* Single Organic SVG Bar with Gliding Notch */}
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none drop-shadow-md z-0"
          width={dimensions.width}
          height={dimensions.height}
          viewBox={`0 0 ${dimensions.width} ${dimensions.height}`}
          aria-hidden="true"
        >
          <defs>
            <linearGradient id={`${pathId}-fill`} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#09090b" />
              <stop offset="100%" stopColor="#18181b" />
            </linearGradient>
            <filter id={`${pathId}-glow`} x1="-20%" y1="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="2" stdDeviation="4" floodColor="#000000" floodOpacity="0.4" />
            </filter>
          </defs>
          <path
            id="liquid-nav-path"
            d={pathData}
            fill={`url(#${pathId}-fill)`}
            filter={`url(#${pathId}-glow)`}
            data-testid="liquid-nav-svg-path"
            data-center={centerPos.toFixed(1)}
          />
        </svg>

        {/* Floating Elevated Circle with Active Icon in Yellow (#FFE500) */}
        {activeItem && centerPos >= 0 && (
          <div
            className="absolute left-0 top-0 pointer-events-none z-20 flex items-center justify-center will-change-transform"
            style={{
              transform: circleTransform,
              width: 48,
              height: 48,
            }}
            data-testid="liquid-nav-circle"
            data-center={centerPos.toFixed(1)}
          >
            <div className="relative flex h-12 w-12 items-center justify-center rounded-full bg-zinc-900 border-2 border-amber-400/40 shadow-lg shadow-amber-400/20">
              <div
                key={activeItem.id}
                className="flex items-center justify-center transition-all duration-300 transform scale-100 opacity-100"
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
                ) : (
                  <activeItem.icon className="h-5 w-5 text-[#FFE500] drop-shadow-[0_0_8px_rgba(255,229,0,0.6)]" />
                )}

                {/* Badge visible inside active circle */}
                {activeItem.badge !== undefined && activeItem.badge !== null && (
                  <span
                    className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#FFE500] px-1 text-[10px] font-black text-black ring-2 ring-zinc-900 shadow-sm"
                    data-testid="liquid-nav-active-badge"
                  >
                    {activeItem.badge}
                  </span>
                )}
              </div>
            </div>
          </div>
        )}

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
                className={`group relative flex items-center justify-center outline-none transition-all duration-300 focus-visible:ring-2 focus-visible:ring-[#FFE500] rounded-xl ${
                  variant === 'side'
                    ? 'h-11 w-11'
                    : 'h-11 min-w-[48px] px-2'
                }`}
                data-testid={`liquid-nav-item-${item.id}`}
                data-active={isActive ? 'true' : 'false'}
              >
                {/* Inactive Icon on the bar: smooth scale & transition */}
                <div
                  className={`flex flex-col items-center justify-center transition-all duration-300 ${
                    isActive
                      ? 'opacity-0 scale-75 pointer-events-none'
                      : 'opacity-80 group-hover:opacity-100 group-hover:scale-110 text-white'
                  }`}
                >
                  {item.avatarUrl ? (
                    <div className="relative h-6 w-6 overflow-hidden rounded-full ring-1 ring-white/40">
                      <Image
                        src={item.avatarUrl}
                        alt={item.label}
                        fill
                        className="object-cover"
                      />
                    </div>
                  ) : (
                    <Icon className="h-5 w-5 text-white" />
                  )}

                  {/* Desktop label if space permits in horizontal nav */}
                  {variant === 'top' && (
                    <span className="mt-0.5 text-[10px] font-medium tracking-tight text-white/90">
                      {item.label}
                    </span>
                  )}
                </div>

                {/* Badge on inactive item */}
                {!isActive && item.badge !== undefined && item.badge !== null && (
                  <span
                    className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-indigo-500 px-1 text-[10px] font-bold text-white shadow-sm"
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
