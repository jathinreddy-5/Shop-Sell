'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  MapPin,
  CheckCircle2,
  AlertCircle,
  Tag,
} from 'lucide-react';
import { emitAnalyticsEvent } from '@/lib/analytics/events';
import { LoadingThreeDotsJumping } from '@/components/loading';

export const MAX_ONBOARDING_SKIPS = 2;
export const REPROMPT_INTERVAL_DAYS = 7;

interface InterestCategory {
  id: string;
  slug: string;
  label: string;
  is_apparel: boolean;
  sort_order: number;
}

interface OnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: any;
  onComplete?: () => void;
}

export function OnboardingModal({
  isOpen,
  onClose,
  currentUser,
  onComplete,
}: OnboardingModalProps) {
  // Form states
  const [fullName, setFullName] = useState('');
  const [pincode, setPincode] = useState('');
  const [shoppingFor, setShoppingFor] = useState<'womens' | 'mens' | 'unisex' | 'kids' | 'prefer_not_to_say'>('prefer_not_to_say');
  const [gender, setGender] = useState<'female' | 'male' | 'non_binary' | 'prefer_not_to_say'>('prefer_not_to_say');
  const [sizeProfile, setSizeProfile] = useState<{ topSize?: string; shoeSize?: string }>({});
  const [availableInterests, setAvailableInterests] = useState<InterestCategory[]>([]);
  const [selectedInterestIds, setSelectedInterestIds] = useState<string[]>([]);
  const [marketingConsent, setMarketingConsent] = useState(false);

  // Pincode validation state
  const [isCheckingPincode, setIsCheckingPincode] = useState(false);
  const [serviceability, setServiceability] = useState<{
    isServiceable?: boolean;
    message?: string;
  } | null>(null);

  // Status & Feedback
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  // Sync initial state from currentUser
  useEffect(() => {
    if (currentUser) {
      const name =
        currentUser?.user_metadata?.full_name ||
        currentUser?.full_name ||
        '';
      if (name && name !== 'Shop:Sell Member') {
        setFullName(name);
      }
      if (currentUser?.default_pincode) {
        setPincode(currentUser.default_pincode);
      }
      if (currentUser?.shopping_for) {
        setShoppingFor(currentUser.shopping_for);
      }
      if (currentUser?.gender) {
        setGender(currentUser.gender);
      }
      if (currentUser?.size_profile) {
        setSizeProfile(currentUser.size_profile);
      }
      if (currentUser?.marketing_consent !== undefined) {
        setMarketingConsent(Boolean(currentUser.marketing_consent));
      }
      if (Array.isArray(currentUser?.interest_ids)) {
        setSelectedInterestIds(currentUser.interest_ids);
      }
    }
  }, [currentUser]);

  // Load interest categories from backend
  useEffect(() => {
    if (!isOpen) return;
    async function loadInterests() {
      try {
        const res = await fetch('/api/profile/interests');
        if (res.ok) {
          const data = await res.json();
          setAvailableInterests(data);
        }
      } catch {}
    }
    loadInterests();
    emitAnalyticsEvent('onboarding_modal_viewed', { step: 1 });
  }, [isOpen]);

  // Debounced pincode serviceability check
  useEffect(() => {
    const cleanPin = pincode.replace(/\D/g, '');
    if (cleanPin.length !== 6) {
      setServiceability(null);
      return;
    }

    const timer = setTimeout(async () => {
      setIsCheckingPincode(true);
      try {
        const res = await fetch(`/api/pincode/${cleanPin}/serviceability`);
        const data = await res.json();
        setServiceability(data);
      } catch {
        setServiceability({ isServiceable: true, message: 'Pincode saved' });
      } finally {
        setIsCheckingPincode(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [pincode]);

  // Toggle interest category
  const toggleInterest = (id: string) => {
    setSelectedInterestIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Submit complete personal information and persist to database
  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMessage(null);

    const trimmedName = fullName.trim();
    if (trimmedName.length < 2) {
      setErrorMessage('Please enter your full name (minimum 2 characters)');
      return;
    }

    setIsSaving(true);
    try {
      // 1. Save Step 1: Name, Pincode, Size Profile & Interests
      const res1 = await fetch('/api/profile/onboarding/step1', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: trimmedName,
          pincode: pincode.length === 6 ? pincode : undefined,
          interest_ids: selectedInterestIds,
          size_profile: sizeProfile,
        }),
      });

      if (!res1.ok) {
        const errData = await res1.json().catch(() => ({}));
        throw new Error(errData.message || 'Failed to save personal information');
      }

      // 2. Save Step 2: Shopping For, Gender & Marketing Consent (Completes Onboarding)
      const res2 = await fetch('/api/profile/onboarding/step2', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shopping_for: shoppingFor,
          gender: gender,
          marketing_consent: marketingConsent,
          marketing_consent_text_version: 'v1.0.0-2026',
        }),
      });

      if (!res2.ok) {
        const errData = await res2.json().catch(() => ({}));
        throw new Error(errData.message || 'Failed to save preference signals');
      }

      emitAnalyticsEvent('onboarding_completed', {
        shoppingFor,
        marketingConsent,
        interestsCount: selectedInterestIds.length,
      });

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('shopsell:profile-updated'));
      }

      if (onComplete) onComplete();
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'An error occurred while saving your details');
    } finally {
      setIsSaving(false);
    }
  };

  // Skip handler (records skip and closes)
  const handleSkip = async () => {
    try {
      await fetch('/api/profile/onboarding/skip', { method: 'POST' });
    } catch {}
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="personal-info-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200 overflow-y-auto"
    >
      <div
        ref={modalRef}
        className="relative my-8 w-full max-w-2xl rounded-3xl bg-white p-6 sm:p-8 shadow-2xl border border-slate-100 dark:border-slate-800 dark:bg-slate-900"
      >
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-100 pb-4 dark:border-slate-800">
          <div>
            <h2
              id="personal-info-modal-title"
              className="text-2xl font-extrabold text-slate-900 dark:text-white"
            >
              Personal Information
            </h2>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Customize your profile so we can show products matching your style and size.
            </p>
          </div>

          <button
            type="button"
            onClick={handleSkip}
            className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition focus:outline-none"
            title="Skip for now"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Global Error Banner */}
        {errorMessage && (
          <div
            role="alert"
            className="mt-4 flex items-center gap-2 rounded-2xl bg-red-50 p-3 text-xs text-red-700 dark:bg-red-950/40 dark:text-red-300"
          >
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-6 space-y-5" noValidate>
          {/* Row 1: Full Name & Default Pincode */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="onboarding-fullname"
                className="block text-xs font-bold text-slate-900 dark:text-slate-200 mb-1"
              >
                Full Name <span className="text-red-500">*</span>
              </label>
              <input
                id="onboarding-fullname"
                type="text"
                autoComplete="name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Enter your full name"
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm font-medium text-slate-900 focus:border-[#059669] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#059669]/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
            </div>

            <div>
              <label
                htmlFor="onboarding-pincode"
                className="block text-xs font-bold text-slate-900 dark:text-slate-200 mb-1"
              >
                Default Pincode
              </label>
              <div className="relative flex items-center">
                <div className="absolute left-3 text-slate-400">
                  <MapPin className="h-4 w-4" />
                </div>
                <input
                  id="onboarding-pincode"
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={pincode}
                  onChange={(e) => setPincode(e.target.value.replace(/\D/g, ''))}
                  placeholder="560034"
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 pl-9 pr-10 py-2.5 text-sm font-medium text-slate-900 focus:border-[#059669] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#059669]/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
                {isCheckingPincode && (
                  <div className="absolute right-3">
                    <LoadingThreeDotsJumping size={16} color="#059669" />
                  </div>
                )}
                {!isCheckingPincode && serviceability?.isServiceable && (
                  <div className="absolute right-3 text-emerald-600">
                    <CheckCircle2 className="h-4 w-4" />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Row 2: Shopping For & Gender */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="onboarding-shopping-for"
                className="block text-xs font-bold text-slate-900 dark:text-slate-200 mb-1"
              >
                Shopping For (Recommendation Signal)
              </label>
              <select
                id="onboarding-shopping-for"
                value={shoppingFor}
                onChange={(e) => setShoppingFor(e.target.value as any)}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm font-medium text-slate-900 focus:border-[#059669] focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              >
                <option value="prefer_not_to_say">Prefer not to say</option>
                <option value="womens">Women&apos;s</option>
                <option value="mens">Men&apos;s</option>
                <option value="unisex">Unisex</option>
                <option value="kids">Kids</option>
              </select>
            </div>

            <div>
              <label
                htmlFor="onboarding-gender"
                className="block text-xs font-bold text-slate-900 dark:text-slate-200 mb-1"
              >
                Gender (Sizing fit only)
              </label>
              <select
                id="onboarding-gender"
                value={gender}
                onChange={(e) => setGender(e.target.value as any)}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm font-medium text-slate-900 focus:border-[#059669] focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              >
                <option value="prefer_not_to_say">Prefer not to say</option>
                <option value="female">Female</option>
                <option value="male">Male</option>
                <option value="non_binary">Non-Binary</option>
              </select>
            </div>
          </div>

          {/* Row 3: Size Profile */}
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
            <label className="block text-xs font-bold text-slate-900 dark:text-slate-200 mb-2">
              Size Profile
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <span className="block text-[11px] text-slate-500 mb-1">Top / Shirt Size</span>
                <select
                  value={sizeProfile.topSize || ''}
                  onChange={(e) => setSizeProfile((p) => ({ ...p, topSize: e.target.value }))}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800 focus:border-[#059669] focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                >
                  <option value="">Not specified</option>
                  {['XS', 'S', 'M', 'L', 'XL', 'XXL'].map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <span className="block text-[11px] text-slate-500 mb-1">Footwear (UK)</span>
                <select
                  value={sizeProfile.shoeSize || ''}
                  onChange={(e) => setSizeProfile((p) => ({ ...p, shoeSize: e.target.value }))}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800 focus:border-[#059669] focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                >
                  <option value="">Not specified</option>
                  {['UK 6', 'UK 7', 'UK 8', 'UK 9', 'UK 10', 'UK 11'].map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Row 4: Category Interests */}
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
            <label className="block text-xs font-bold text-slate-900 dark:text-slate-200 mb-2">
              Category Interests
            </label>
            <div className="flex flex-wrap gap-2 max-h-36 overflow-y-auto pr-1">
              {availableInterests.map((interest) => {
                const selected = selectedInterestIds.includes(interest.id);
                return (
                  <button
                    key={interest.id}
                    type="button"
                    onClick={() => toggleInterest(interest.id)}
                    className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${
                      selected
                        ? 'bg-[#059669] text-white shadow-sm ring-1 ring-emerald-600'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'
                    }`}
                  >
                    <Tag className="h-3 w-3" />
                    <span>{interest.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Marketing Consent Checkbox */}
          <div className="pt-2">
            <label className="flex items-start gap-2.5 text-xs text-slate-600 dark:text-slate-400 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={marketingConsent}
                onChange={(e) => setMarketingConsent(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-slate-300 text-[#059669] focus:ring-[#059669] dark:border-slate-700 dark:bg-slate-800"
              />
              <span>
                Receive curated promotional newsletters, artisan spotlights, and seasonal discount alerts. Changes are logged to the compliance audit trail.
              </span>
            </label>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={handleSkip}
              className="text-xs font-semibold text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
            >
              Skip for now
            </button>

            <button
              type="submit"
              disabled={isSaving}
              className="inline-flex items-center justify-center rounded-2xl bg-[#059669] px-6 py-3 text-sm font-bold text-white shadow-lg shadow-emerald-950/20 hover:bg-[#047857] transition disabled:opacity-50"
            >
              {isSaving ? (
                <LoadingThreeDotsJumping color="#FFFFFF" size={20} />
              ) : (
                <span>Save Preferences</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
