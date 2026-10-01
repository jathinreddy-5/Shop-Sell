'use client';

import React, {
  useState,
  useRef,
  useEffect,
  useCallback,
  useId,
} from 'react';
import { createPortal } from 'react-dom';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import {
  motion,
  AnimatePresence,
  LayoutGroup,
  useReducedMotion,
  Transition,
} from 'motion/react';
import { X } from 'lucide-react';
import { twMerge } from 'tailwind-merge';
import { clsx } from 'clsx';
import { useLockBodyScroll } from '../../hooks/use-lock-body-scroll';
import { LoadingThreeDotsJumping } from '../loading';

export interface ExpandingCardItem {
  id: string;
  image: string;
  category: string;
  title: string;
  subtitle: string;
  content?: React.ReactNode;
  detailContent?: React.ReactNode;
  priority?: boolean;
  aspectRatio?: string;
  badge?: string;
  isLoading?: boolean;
  metadata?: Record<string, any>;
}

export interface ExpandingCardGridProps {
  items: ExpandingCardItem[];
  renderDetail?: (
    item: ExpandingCardItem,
    onClose: () => void,
    onSwitchCard: (nextId: string) => void
  ) => React.ReactNode;
  className?: string;
  cardAspect?: string;
  layoutGroupId?: string;
  activeId?: string | null;
  onActiveIdChange?: (id: string | null) => void;
  onCardOpen?: (item: ExpandingCardItem) => void;
  onCardClose?: () => void;
}

const SPRING_TRANSITION: Transition = {
  type: 'spring',
  stiffness: 300,
  damping: 30,
};

const REDUCED_TRANSITION: Transition = {
  duration: 0.18,
  ease: 'easeInOut',
};

export function ExpandingCardGrid({
  items,
  renderDetail,
  className = '',
  cardAspect = 'aspect-[4/5] sm:aspect-[3/4]',
  layoutGroupId,
  activeId: controlledActiveId,
  onActiveIdChange,
  onCardOpen,
  onCardClose,
}: ExpandingCardGridProps) {
  const [internalActiveId, setInternalActiveId] = useState<string | null>(null);
  const [exitingId, setExitingId] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  const isControlled = controlledActiveId !== undefined;
  const activeId = isControlled ? controlledActiveId : internalActiveId;

  const setActiveId = useCallback(
    (id: string | null) => {
      if (!isControlled) {
        setInternalActiveId(id);
      }
      onActiveIdChange?.(id);
    },
    [isControlled, onActiveIdChange]
  );

  const shouldReduceMotion = useReducedMotion();
  const transition = shouldReduceMotion ? REDUCED_TRANSITION : SPRING_TRANSITION;

  // Track the originating card element to restore focus on close
  const triggerRefs = useRef<Map<string, HTMLButtonElement>>(new Map());
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  const autoGroupId = useId();
  const finalGroupId = layoutGroupId || `expanding-group-${autoGroupId}`;

  // Lock body scroll with scrollbar width compensation
  useLockBodyScroll(!!activeId);

  useEffect(() => {
    setMounted(true);
  }, []);

  const pathname = usePathname();
  const prevPathnameRef = useRef(pathname);
  useEffect(() => {
    if (prevPathnameRef.current !== pathname) {
      prevPathnameRef.current = pathname;
      if (activeId) {
        setActiveId(null);
        setExitingId(null);
      }
    }
  }, [pathname, activeId, setActiveId]);

  const activeItem = items.find((item) => item.id === activeId) || null;

  const handleOpen = useCallback(
    (item: ExpandingCardItem) => {
      setActiveId(item.id);
      setExitingId(null);
      onCardOpen?.(item);
    },
    [setActiveId, onCardOpen]
  );

  const handleSwitchCard = useCallback(
    (nextId: string) => {
      const nextItem = items.find((item) => item.id === nextId);
      if (nextItem) {
        setActiveId(nextId);
        setExitingId(null);
        onCardOpen?.(nextItem);
      }
    },
    [items, setActiveId, onCardOpen]
  );

  const handleClose = useCallback(() => {
    if (activeId) {
      setExitingId(activeId);
      const prevId = activeId;
      setActiveId(null);
      onCardClose?.();

      // Restore focus to originating card after animation begins
      setTimeout(() => {
        const trigger = triggerRefs.current.get(prevId);
        trigger?.focus();
      }, 50);
    }
  }, [activeId, setActiveId, onCardClose]);

  // Handle keyboard events (Esc to close, Tab focus trapping)
  useEffect(() => {
    if (!activeId) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        handleClose();
        return;
      }

      if (e.key === 'Tab' && dialogRef.current) {
        const focusableElements = dialogRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (focusableElements.length === 0) return;

        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === firstElement) {
            e.preventDefault();
            lastElement.focus();
          }
        } else {
          if (document.activeElement === lastElement) {
            e.preventDefault();
            firstElement.focus();
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeId, handleClose]);

  // Focus close button when sheet opens
  useEffect(() => {
    if (activeId) {
      const timer = setTimeout(() => {
        closeButtonRef.current?.focus();
      }, 60);
      return () => clearTimeout(timer);
    }
  }, [activeId]);

  return (
    <LayoutGroup id={finalGroupId}>
      {/* Responsive Grid: 2 columns on desktop, 1 on mobile (overridable via className) */}
      <div
        className={twMerge(
          clsx('grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8', className)
        )}
        role="region"
        aria-label="Expanding cards gallery"
      >
        {items.map((item, index) => {
          const isOpen = activeId === item.id;
          const isExiting = exitingId === item.id;
          const hideInGrid = isOpen || isExiting;

          return (
            <div key={item.id} className="relative w-full">
              <motion.button
                ref={(el) => {
                  if (el) triggerRefs.current.set(item.id, el);
                  else triggerRefs.current.delete(item.id);
                }}
                layoutId={shouldReduceMotion ? undefined : `card-${item.id}`}
                onClick={() => handleOpen(item)}
                whileHover={
                  shouldReduceMotion
                    ? undefined
                    : { scale: 1.02, transition: { duration: 0.2 } }
                }
                whileTap={shouldReduceMotion ? undefined : { scale: 0.98 }}
                style={{
                  borderRadius: 24,
                  visibility: hideInGrid ? 'hidden' : 'visible',
                }}
                transition={transition}
                className={`group relative block w-full overflow-hidden text-left focus:outline-none focus-visible:ring-4 focus-visible:ring-indigo-500/80 focus-visible:ring-offset-4 focus-visible:ring-offset-slate-950 shadow-xl shadow-black/40 hover:shadow-2xl border border-slate-800 bg-slate-900 ${
                  item.aspectRatio || cardAspect
                }`}
                aria-haspopup="dialog"
                aria-expanded={isOpen}
                aria-label={`${item.category}: ${item.title}. Click to view details.`}
              >
                {/* Cover Image Container */}
                <motion.div
                  layoutId={
                    shouldReduceMotion ? undefined : `image-container-${item.id}`
                  }
                  className="absolute inset-0 h-full w-full overflow-hidden"
                >
                  <Image
                    src={item.image}
                    alt={item.title}
                    fill
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                    priority={index < 2 || item.priority}
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  {/* Cinematic gradient overlay for crisp legibility */}
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-black/20" />
                </motion.div>

                {/* Optional Top Badge */}
                {item.badge && (
                  <div className="absolute top-4 left-4 z-10">
                    <span className="inline-flex items-center rounded-full bg-white/20 backdrop-blur-md px-3 py-1 text-xs font-semibold text-white border border-white/20 shadow-sm">
                      {item.badge}
                    </span>
                  </div>
                )}

                {/* Content Overlay */}
                <div className="absolute inset-0 flex flex-col justify-end p-6 sm:p-7 z-10 pointer-events-none">
                  <motion.span
                    layout="position"
                    layoutId={
                      shouldReduceMotion ? undefined : `category-${item.id}`
                    }
                    className="text-xs font-bold uppercase tracking-widest text-indigo-400 drop-shadow mb-1"
                  >
                    {item.category}
                  </motion.span>

                  <motion.h3
                    layout="position"
                    id={`card-title-${item.id}`}
                    layoutId={
                      shouldReduceMotion ? undefined : `title-${item.id}`
                    }
                    className="text-2xl sm:text-3xl font-extrabold text-white leading-tight tracking-tight drop-shadow-md"
                  >
                    {item.title}
                  </motion.h3>

                  <motion.p
                    layout="position"
                    layoutId={
                      shouldReduceMotion ? undefined : `subtitle-${item.id}`
                    }
                    className="mt-2 text-sm text-slate-300 font-medium line-clamp-2 drop-shadow"
                  >
                    {item.subtitle}
                  </motion.p>
                </div>
              </motion.button>
            </div>
          );
        })}
      </div>

      {/* Portal Container for Centered Sheet & Backdrop */}
      {mounted &&
        createPortal(
          <AnimatePresence
            onExitComplete={() => {
              setExitingId(null);
            }}
          >
            {activeItem && (
              <div
                key="modal-portal-wrapper"
                className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto"
              >
                {/* Dimming Backdrop */}
                <motion.div
                  key="modal-backdrop"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  onClick={handleClose}
                  className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
                  aria-hidden="true"
                />

                {/* Expanding Sheet (Centered, max-w ~720px, rounded-3xl) */}
                <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 pointer-events-none">
                  <motion.div
                    ref={dialogRef}
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby={`card-title-${activeItem.id}`}
                    tabIndex={-1}
                    layoutId={
                      shouldReduceMotion
                        ? undefined
                        : `card-${activeItem.id}`
                    }
                    style={{ borderRadius: 24 }}
                    transition={transition}
                    className="pointer-events-auto relative w-full max-w-[720px] max-h-[90dvh] overflow-y-auto overflow-x-hidden bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xl border border-slate-200 dark:border-slate-800 focus:outline-none inset-x-3 sm:inset-x-0 mx-auto"
                  >
                    {/* Header with Cover Image */}
                    <div className="relative w-full h-72 sm:h-96 overflow-hidden">
                      <motion.div
                        layoutId={
                          shouldReduceMotion
                            ? undefined
                            : `image-container-${activeItem.id}`
                        }
                        className="absolute inset-0 h-full w-full"
                      >
                        <Image
                          src={activeItem.image}
                          alt={activeItem.title}
                          fill
                          sizes="720px"
                          priority
                          className="object-cover"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/50 to-black/30" />
                      </motion.div>

                      {/* Accessible Close Button */}
                      <button
                        ref={closeButtonRef}
                        type="button"
                        onClick={handleClose}
                        aria-label="Close card dialog"
                        className="absolute top-4 right-4 z-20 flex h-10 w-10 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur-md hover:bg-black/80 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-white shadow-lg"
                      >
                        <X className="h-5 w-5" />
                      </button>

                      {/* Header overlay text moving with the image */}
                      <div className="absolute inset-0 flex flex-col justify-end p-6 sm:p-8 z-10 pointer-events-none">
                        <motion.span
                          layout="position"
                          layoutId={
                            shouldReduceMotion
                              ? undefined
                              : `category-${activeItem.id}`
                          }
                          className="text-xs font-bold uppercase tracking-widest text-indigo-400 drop-shadow mb-1"
                        >
                          {activeItem.category}
                        </motion.span>

                        <motion.h2
                          layout="position"
                          id={`card-title-${activeItem.id}`}
                          layoutId={
                            shouldReduceMotion
                              ? undefined
                              : `title-${activeItem.id}`
                          }
                          className="text-2xl sm:text-4xl font-extrabold text-white leading-tight tracking-tight drop-shadow-md"
                        >
                          {activeItem.title}
                        </motion.h2>

                        <motion.p
                          layout="position"
                          layoutId={
                            shouldReduceMotion
                              ? undefined
                              : `subtitle-${activeItem.id}`
                          }
                          className="mt-2 text-sm sm:text-base text-slate-200 font-medium drop-shadow"
                        >
                          {activeItem.subtitle}
                        </motion.p>
                      </div>
                    </div>

                    {/* Sheet Body Content: Fades in with slight delay */}
                    <motion.div
                      initial={{ opacity: 0, y: 14 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      transition={{
                        delay: shouldReduceMotion ? 0 : 0.15,
                        duration: 0.22,
                        ease: 'easeOut',
                      }}
                      className="p-6 sm:p-8"
                    >
                      {activeItem.isLoading ? (
                        <div className="flex min-h-[220px] items-center justify-center p-8">
                          <LoadingThreeDotsJumping label="Loading details" />
                        </div>
                      ) : renderDetail ? (
                        renderDetail(activeItem, handleClose, handleSwitchCard)
                      ) : (
                        activeItem.content
                      )}
                    </motion.div>
                  </motion.div>
                </div>
              </div>
            )}
          </AnimatePresence>,
          document.body
        )}
    </LayoutGroup>
  );
}
