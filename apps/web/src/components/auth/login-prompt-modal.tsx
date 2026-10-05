'use client';

import React, { useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Lock, X, ArrowRight, ShieldCheck, Sparkles, CheckCircle2 } from 'lucide-react';
import { BrandIcon } from '@/components/brand/brand-icon';

export interface LoginPromptModalProps {
  isOpen: boolean;
  onClose: () => void;
  productName?: string | null;
  title?: string;
  description?: string;
}

export function LoginPromptModal({
  isOpen,
  onClose,
  productName,
  title = 'Please Sign In to Continue',
  description,
}: LoginPromptModalProps) {
  const pathname = usePathname();
  const modalRef = useRef<HTMLDivElement>(null);

  // Close on Escape key press
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Lock body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const currentPath = pathname || '/';
  const redirectQuery = `?redirect=${encodeURIComponent(currentPath)}`;

  const promptDescription =
    description ||
    (productName
      ? `Please sign in or create an account to add "${productName}" to your shopping cart and continue checkout.`
      : 'Please sign in or create an account to add items to your shopping cart and complete your purchase.');

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="login-prompt-title"
      aria-describedby="login-prompt-desc"
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6"
    >
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity"
        aria-hidden="true"
      />

      {/* Modal Card */}
      <div
        ref={modalRef}
        className="relative w-full max-w-md transform overflow-hidden rounded-3xl border border-slate-200/80 bg-white p-6 sm:p-8 shadow-2xl transition-all dark:border-slate-800 dark:bg-slate-900 z-10 animate-in fade-in zoom-in-95 duration-200"
      >
        {/* Close button */}
        <button
          onClick={onClose}
          aria-label="Close modal"
          className="absolute right-4 top-4 rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Header Icon with Gradient */}
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-[#047857] to-[#10B981] shadow-lg shadow-emerald-900/20">
          <BrandIcon className="h-8 w-8" />
        </div>

        {/* Title & Description */}
        <div className="text-center">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 mb-2 border border-emerald-200/60 dark:border-emerald-800/40">
            <Lock className="h-3 w-3" />
            <span>Authentication Required</span>
          </div>
          <h3
            id="login-prompt-title"
            className="text-xl font-bold tracking-tight text-slate-900 dark:text-white"
          >
            {title}
          </h3>
          <p
            id="login-prompt-desc"
            className="mt-2 text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed"
          >
            {promptDescription}
          </p>
        </div>

        {/* Highlights / Features */}
        <div className="mt-5 space-y-2 rounded-2xl bg-slate-50 p-3.5 text-xs text-slate-600 dark:bg-slate-800/60 dark:text-slate-300 border border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
            <span>Save your cart securely across all devices</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
            <span>Fast, 100% secure checkout with Razorpay</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
            <span>Real-time courier dispatch and delivery tracking</span>
          </div>
        </div>

        {/* CTA Buttons */}
        <div className="mt-6 flex flex-col gap-2.5">
          <Link
            href={`/login${redirectQuery}`}
            onClick={onClose}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#059669] py-3.5 text-sm font-bold text-white shadow-lg shadow-emerald-950/20 transition hover:bg-[#047857]"
          >
            <span>Log In to Your Account</span>
            <ArrowRight className="h-4 w-4" />
          </Link>

          <Link
            href={`/signup${redirectQuery}`}
            onClick={onClose}
            className="flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
          >
            <span>Create New Account</span>
          </Link>

          <button
            type="button"
            onClick={onClose}
            className="pt-1 text-center text-xs font-semibold text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition"
          >
            Continue Browsing
          </button>
        </div>
      </div>
    </div>
  );
}
