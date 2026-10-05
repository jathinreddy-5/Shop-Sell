'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import {
  X,
  Sparkles,
  MapPin,
  CheckCircle2,
  AlertCircle,
  Phone,
  Mail,
  ArrowRight,
  ShieldCheck,
  Tag,
  Shirt,
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
  const [step, setStep] = useState<1 | 2>(1);
  const [step1StartTime, setStep1StartTime] = useState<number>(Date.now());
  const [step2StartTime, setStep2StartTime] = useState<number>(Date.now());

  // Step 1 States
  const [fullName, setFullName] = useState(currentUser?.user_metadata?.full_name || currentUser?.full_name || '');
  const [pincode, setPincode] = useState(currentUser?.default_pincode || '');
  const [availableInterests, setAvailableInterests] = useState<InterestCategory[]>([]);
  const [selectedInterestIds, setSelectedInterestIds] = useState<string[]>([]);
  const [sizeProfile, setSizeProfile] = useState<{ topSize?: string; shoeSize?: string }>({});

  // Pincode Serviceability State
  const [isCheckingPincode, setIsCheckingPincode] = useState(false);
  const [serviceability, setServiceability] = useState<{
    isServiceable?: boolean;
    message?: string;
    city?: string;
  } | null>(null);
  const [waitlistJoined, setWaitlistJoined] = useState(false);

  // Step 2 States
  const isEmailUser = Boolean(currentUser?.email && !currentUser?.email.includes('@phone.shopsell'));
  const [contactInput, setContactInput] = useState(currentUser?.phone_e164 || currentUser?.phone || '');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpCooldown, setOtpCooldown] = useState(0);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [phoneVerified, setPhoneVerified] = useState(Boolean(currentUser?.phone_verified));

  const [shoppingFor, setShoppingFor] = useState<'womens' | 'mens' | 'unisex' | 'kids' | 'prefer_not_to_say'>('prefer_not_to_say');
  const [gender, setGender] = useState<'female' | 'male' | 'non_binary' | 'prefer_not_to_say'>('prefer_not_to_say');
  const [marketingConsent, setMarketingConsent] = useState(false);

  // UI & Feedback
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const previousActiveElement = useRef<HTMLElement | null>(null);

  // 1. Accessibility: Focus trap & Escape listener
  useEffect(() => {
    if (!isOpen) return;

    previousActiveElement.current = document.activeElement as HTMLElement;
    emitAnalyticsEvent('onboarding_modal_viewed', { step: 1 });
    setStep1StartTime(Date.now());

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleSkip();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  // 2. Fetch normalized interest taxonomy
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
  }, [isOpen]);

  // 3. Debounced Pincode Serviceability Check
  useEffect(() => {
    const cleanPin = pincode.replace(/\D/g, '');
    if (cleanPin.length !== 6) {
      setServiceability(null);
      setWaitlistJoined(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsCheckingPincode(true);
      try {
        const res = await fetch(`/api/pincode/${cleanPin}/serviceability`);
        const data = await res.json();
        setServiceability(data);
        emitAnalyticsEvent('field_completed', {
          fieldName: 'pincode',
          hasPincode: true,
          isServiceable: data.isServiceable,
        });
      } catch {
        setServiceability({ isServiceable: false, message: 'Could not verify delivery to this pincode' });
      } finally {
        setIsCheckingPincode(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [pincode]);

  // 4. OTP Countdown
  useEffect(() => {
    if (otpCooldown <= 0) return;
    const interval = setInterval(() => setOtpCooldown((prev) => prev - 1), 1000);
    return () => clearInterval(interval);
  }, [otpCooldown]);

  // Has apparel category selected for conditional sizing reveal
  const hasApparelSelected = availableInterests
    .filter((i) => selectedInterestIds.includes(i.id))
    .some((i) => i.is_apparel);

  // Toggle Interest Chip
  const toggleInterest = (id: string) => {
    setSelectedInterestIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Join Pincode Waitlist
  const handleJoinWaitlist = async () => {
    try {
      await fetch('/api/pincode/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pincode: pincode.trim(),
          email: currentUser?.email || undefined,
        }),
      });
      setWaitlistJoined(true);
      emitAnalyticsEvent('waitlist_joined', { hasPincode: true });
    } catch {}
  };

  // Handle Step 1 Submission
  const handleStep1Submit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMessage(null);

    const trimmedName = fullName.trim();
    if (trimmedName.length < 2) {
      setErrorMessage('Please enter your full name (minimum 2 characters)');
      emitAnalyticsEvent('field_error', { step: 1, fieldName: 'full_name', errorType: 'too_short' });
      return;
    }

    setIsSaving(true);
    try {
      const token = localStorage.getItem('shopsell_token');
      const res = await fetch('/api/profile/onboarding/step1', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          full_name: trimmedName,
          pincode: pincode.length === 6 ? pincode : undefined,
          interest_ids: selectedInterestIds,
          size_profile: hasApparelSelected ? sizeProfile : undefined,
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.message || 'Failed to save profile');
      }

      const durationMs = Date.now() - step1StartTime;
      emitAnalyticsEvent('step_completed', {
        step: 1,
        durationMs,
        interestsCount: selectedInterestIds.length,
      });

      // Transition to Step 2
      setStep(2);
      setStep2StartTime(Date.now());
      emitAnalyticsEvent('step_viewed', { step: 2 });
    } catch (err: any) {
      setErrorMessage(err.message || 'Network error saving step 1');
    } finally {
      setIsSaving(false);
    }
  };

  // Step 2: Send Phone OTP
  const handleSendOtp = async () => {
    const rawDigits = contactInput.replace(/\D/g, '');
    const cleanPhone = contactInput.startsWith('+') ? contactInput : `+91${rawDigits.slice(-10)}`;
    setErrorMessage(null);

    if (rawDigits.length < 10) {
      setErrorMessage('Please enter a valid 10-digit mobile number');
      return;
    }

    try {
      const token = localStorage.getItem('shopsell_token');
      const res = await fetch('/api/profile/phone/otp/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ phone: cleanPhone }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.message || 'Failed to send OTP');
      }

      setOtpSent(true);
      setOtpCooldown(30);
      emitAnalyticsEvent('otp_sent', { step: 2 });
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to send OTP code');
    }
  };

  // Step 2: Verify Phone OTP
  const handleVerifyOtp = async () => {
    if (otp.length !== 6) {
      setErrorMessage('Please enter the 6-digit verification code');
      return;
    }

    const rawDigits = contactInput.replace(/\D/g, '');
    const cleanPhone = contactInput.startsWith('+') ? contactInput : `+91${rawDigits.slice(-10)}`;

    setIsVerifyingOtp(true);
    setErrorMessage(null);
    try {
      const token = localStorage.getItem('shopsell_token');
      const res = await fetch('/api/profile/phone/otp/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ phone: cleanPhone, otp }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.message || 'Invalid verification code');
      }

      setPhoneVerified(true);
      setOtpSent(false);
      emitAnalyticsEvent('otp_verified', { step: 2 });
    } catch (err: any) {
      setErrorMessage(err.message || 'Verification failed');
    } finally {
      setIsVerifyingOtp(false);
    }
  };

  // Step 2: Complete Onboarding
  const handleStep2Submit = async () => {
    setIsSaving(true);
    setErrorMessage(null);

    try {
      const token = localStorage.getItem('shopsell_token');
      const res = await fetch('/api/profile/onboarding/step2', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          shopping_for: shoppingFor,
          gender: gender,
          marketing_consent: marketingConsent,
          marketing_consent_text_version: 'v1.0.0-2026',
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.message || 'Failed to save preferences');
      }

      const durationMs = Date.now() - step2StartTime;
      emitAnalyticsEvent('onboarding_completed', {
        durationMs,
        shoppingFor,
        marketingConsent,
      });

      if (onComplete) onComplete();
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Error completing setup');
    } finally {
      setIsSaving(false);
    }
  };

  // Handle Skip
  const handleSkip = async () => {
    try {
      const token = localStorage.getItem('shopsell_token');
      await fetch('/api/profile/onboarding/skip', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      emitAnalyticsEvent('step_skipped', { step });
    } catch {}

    if (previousActiveElement.current) {
      previousActiveElement.current.focus();
    }
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="onboarding-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
    >
      <div
        ref={modalRef}
        className="relative w-full max-w-lg rounded-3xl bg-white p-6 sm:p-8 shadow-2xl border border-slate-100 dark:border-slate-800 dark:bg-slate-900 overflow-hidden"
      >
        {/* Header with Step Indicator & Skip Button */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-4 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-emerald-100 text-xs font-bold text-[#059669] dark:bg-emerald-950/60 dark:text-emerald-400">
              {step}/2
            </span>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              {step === 1 ? 'Step 1: Your Profile' : 'Step 2: Preferences'}
            </span>
          </div>

          <button
            type="button"
            onClick={handleSkip}
            className="inline-flex items-center gap-1 text-xs font-bold text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition focus:outline-none"
          >
            <span>Skip for now</span>
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Global Error Banner */}
        {errorMessage && (
          <div
            role="alert"
            aria-live="polite"
            className="mt-4 flex items-center gap-2 rounded-2xl bg-red-50 p-3 text-xs text-red-700 dark:bg-red-950/40 dark:text-red-300"
          >
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* STEP 1: IDENTITY, PINCODE, INTERESTS */}
        {step === 1 && (
          <form onSubmit={handleStep1Submit} className="mt-5 space-y-5" noValidate>
            <div>
              <h2
                id="onboarding-modal-title"
                className="text-xl font-extrabold text-slate-900 dark:text-white"
              >
                Welcome to Shop:Sell! Let&apos;s personalize your visit
              </h2>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Takes about 15 seconds. You can edit any answer in Account Settings anytime.
              </p>
            </div>

            {/* Full Name */}
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
                placeholder="e.g. Priya Sharma"
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm font-medium text-slate-900 focus:border-[#059669] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#059669]/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
              <p className="mt-1 text-[11px] text-slate-400">
                Purpose: Needed for order delivery receipts, tax invoices, and shipping labels.
              </p>
            </div>

            {/* Pincode & Live Serviceability */}
            <div>
              <label
                htmlFor="onboarding-pincode"
                className="block text-xs font-bold text-slate-900 dark:text-slate-200 mb-1"
              >
                Delivery Pincode (Optional)
              </label>
              <div className="relative flex items-center">
                <div className="absolute left-3 text-slate-400">
                  <MapPin className="h-4 w-4" />
                </div>
                <input
                  id="onboarding-pincode"
                  type="text"
                  inputMode="numeric"
                  autoComplete="postal-code"
                  maxLength={6}
                  value={pincode}
                  onChange={(e) => setPincode(e.target.value.replace(/\D/g, ''))}
                  placeholder="e.g. 560034"
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 pl-9 pr-10 py-2.5 text-sm font-medium text-slate-900 focus:border-[#059669] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#059669]/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
                {isCheckingPincode && (
                  <div className="absolute right-3">
                    <LoadingThreeDotsJumping size={16} color="#059669" />
                  </div>
                )}
              </div>

              {/* Serviceability Results */}
              {serviceability && (
                <div className="mt-2 text-xs">
                  {serviceability.isServiceable ? (
                    <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-semibold">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      <span>{serviceability.message}</span>
                    </div>
                  ) : (
                    <div className="rounded-xl border border-amber-200 bg-amber-50 p-2.5 text-amber-800 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-300">
                      <p>{serviceability.message}</p>
                      {!waitlistJoined ? (
                        <button
                          type="button"
                          onClick={handleJoinWaitlist}
                          className="mt-1.5 text-xs font-bold text-[#059669] underline hover:text-[#047857]"
                        >
                          Join pincode waitlist
                        </button>
                      ) : (
                        <span className="mt-1 block text-xs font-semibold text-emerald-600">
                          ✓ You are on the waitlist! We will notify you once we deliver here.
                        </span>
                      )}
                    </div>
                  )}
                </div>
              )}
              <p className="mt-1 text-[11px] text-slate-400">
                Purpose: Used to compute accurate shipping timelines before checkout.
              </p>
            </div>

            {/* Interest Categories Chips */}
            <div>
              <label className="block text-xs font-bold text-slate-900 dark:text-slate-200 mb-1.5">
                Categories you love exploring:
              </label>
              <div className="flex flex-wrap gap-2 max-h-36 overflow-y-auto pr-1">
                {availableInterests.map((interest) => {
                  const selected = selectedInterestIds.includes(interest.id);
                  return (
                    <button
                      key={interest.id}
                      type="button"
                      role="checkbox"
                      aria-checked={selected}
                      onClick={() => toggleInterest(interest.id)}
                      className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${
                        selected
                          ? 'bg-[#059669] text-white shadow-sm'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'
                      }`}
                    >
                      <Tag className="h-3 w-3" />
                      <span>{interest.label}</span>
                    </button>
                  );
                })}
              </div>
              <p className="mt-1 text-[11px] text-slate-400">
                Purpose: Seeds your personalized recommendations. We never hard-filter products.
              </p>
            </div>

            {/* Conditional Apparel Sizing Reveal (No Layout Shift) */}
            {hasApparelSelected && (
              <div className="rounded-2xl border border-emerald-100 bg-emerald-50/60 p-3.5 dark:border-emerald-900/30 dark:bg-emerald-950/20">
                <div className="flex items-center gap-2 mb-2 text-xs font-bold text-emerald-900 dark:text-emerald-300">
                  <Shirt className="h-4 w-4 text-[#059669]" />
                  <span>Sizing Preferences (Optional)</span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                      Apparel Size
                    </label>
                    <select
                      value={sizeProfile.topSize || ''}
                      onChange={(e) => setSizeProfile((p) => ({ ...p, topSize: e.target.value }))}
                      className="w-full rounded-xl border border-slate-200 bg-white p-2 text-xs font-semibold text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    >
                      <option value="">Select size</option>
                      {['XS', 'S', 'M', 'L', 'XL', 'XXL'].map((sz) => (
                        <option key={sz} value={sz}>
                          {sz}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                      Footwear Size (UK)
                    </label>
                    <select
                      value={sizeProfile.shoeSize || ''}
                      onChange={(e) => setSizeProfile((p) => ({ ...p, shoeSize: e.target.value }))}
                      className="w-full rounded-xl border border-slate-200 bg-white p-2 text-xs font-semibold text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    >
                      <option value="">Select shoe size</option>
                      {['UK 6', 'UK 7', 'UK 8', 'UK 9', 'UK 10', 'UK 11'].map((sz) => (
                        <option key={sz} value={sz}>
                          {sz}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <p className="mt-1.5 text-[10px] text-emerald-700/80 dark:text-emerald-400">
                  Purpose: Used solely for size filtering recommendations.
                </p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={handleSkip}
                className="text-xs font-bold text-slate-500 hover:text-slate-800 dark:text-slate-400"
              >
                Skip for now
              </button>

              <button
                type="submit"
                disabled={isSaving}
                className="inline-flex items-center gap-2 rounded-2xl bg-[#059669] px-5 py-2.5 text-xs font-bold text-white shadow-md shadow-emerald-950/20 hover:bg-[#047857] transition disabled:opacity-50"
              >
                <span>Continue to Step 2</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </form>
        )}

        {/* STEP 2: MISSING CONTACT, SHOPPING FOR, GENDER & CONSENT */}
        {step === 2 && (
          <div className="mt-5 space-y-5">
            <div>
              <h2 className="text-xl font-extrabold text-slate-900 dark:text-white">
                Final Step: Discovery & Verification
              </h2>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Helps boost styles you like and send delivery updates. (Skippable here; verified at checkout).
              </p>
            </div>

            {/* Missing Contact Method (Mobile if Email Auth, Email if Phone Auth) */}
            {isEmailUser && (
              <div>
                <label className="block text-xs font-bold text-slate-900 dark:text-slate-200 mb-1">
                  Mobile Number (Optional)
                </label>
                <div className="flex gap-2">
                  <div className="relative flex-1 flex items-center">
                    <div className="absolute left-3 text-slate-400">
                      <Phone className="h-4 w-4" />
                    </div>
                    <input
                      type="tel"
                      inputMode="numeric"
                      autoComplete="tel"
                      disabled={phoneVerified}
                      value={contactInput}
                      onChange={(e) => setContactInput(e.target.value)}
                      placeholder="+91 98765 43210"
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50 pl-9 pr-3 py-2 text-sm font-medium text-slate-900 focus:border-[#059669] focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    />
                  </div>

                  {!phoneVerified ? (
                    <button
                      type="button"
                      disabled={otpCooldown > 0}
                      onClick={handleSendOtp}
                      className="rounded-2xl border border-[#059669] px-3.5 py-2 text-xs font-bold text-[#059669] hover:bg-emerald-50 disabled:opacity-50"
                    >
                      {otpCooldown > 0 ? `${otpCooldown}s` : otpSent ? 'Resend' : 'Send OTP'}
                    </button>
                  ) : (
                    <span className="flex items-center gap-1 rounded-2xl bg-emerald-50 px-3 text-xs font-bold text-emerald-600">
                      <ShieldCheck className="h-4 w-4" /> Verified
                    </span>
                  )}
                </div>

                {otpSent && !phoneVerified && (
                  <div className="mt-2 flex items-center gap-2">
                    <input
                      type="text"
                      inputMode="numeric"
                      maxLength={6}
                      value={otp}
                      onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                      placeholder="Enter 6-digit OTP (dev: 123456)"
                      className="w-48 rounded-xl border border-emerald-200 p-2 text-xs font-bold tracking-widest text-center focus:outline-none dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                    />
                    <button
                      type="button"
                      onClick={handleVerifyOtp}
                      disabled={isVerifyingOtp || otp.length !== 6}
                      className="rounded-xl bg-[#059669] px-3 py-2 text-xs font-bold text-white hover:bg-[#047857] disabled:opacity-50"
                    >
                      {isVerifyingOtp ? 'Verifying...' : 'Verify'}
                    </button>
                  </div>
                )}
                <p className="mt-1 text-[11px] text-slate-400">
                  Purpose: Used for courier tracking updates and instant delivery alerts via SMS.
                </p>
              </div>
            )}

            {/* Shopping For Selector (Boost Signal Only) */}
            <div>
              <label className="block text-xs font-bold text-slate-900 dark:text-slate-200 mb-1.5">
                Who are you usually shopping for?
              </label>
              <div className="flex flex-wrap gap-2">
                {[
                  { id: 'womens', label: "Women's" },
                  { id: 'mens', label: "Men's" },
                  { id: 'unisex', label: 'Unisex' },
                  { id: 'kids', label: 'Kids & Family' },
                  { id: 'prefer_not_to_say', label: 'Prefer not to say' },
                ].map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setShoppingFor(opt.id as any)}
                    className={`rounded-2xl px-3 py-1.5 text-xs font-semibold border transition ${
                      shoppingFor === opt.id
                        ? 'border-[#059669] bg-emerald-50 text-[#059669] dark:bg-emerald-950/50 dark:text-emerald-300'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              <p className="mt-1 text-[11px] text-slate-400">
                Purpose: Primary recommendation signal. Used exclusively to boost relevant styles, never to hard-filter.
              </p>
            </div>

            {/* Gender Selector (Demographics for sizing only) */}
            <div>
              <label className="block text-xs font-bold text-slate-900 dark:text-slate-200 mb-1.5">
                Gender (Optional)
              </label>
              <div className="flex flex-wrap gap-2">
                {[
                  { id: 'female', label: 'Female' },
                  { id: 'male', label: 'Male' },
                  { id: 'non_binary', label: 'Non-Binary' },
                  { id: 'prefer_not_to_say', label: 'Prefer not to say' },
                ].map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setGender(opt.id as any)}
                    className={`rounded-2xl px-3 py-1.5 text-xs font-semibold border transition ${
                      gender === opt.id
                        ? 'border-[#059669] bg-emerald-50 text-[#059669] dark:bg-emerald-950/50 dark:text-emerald-300'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              <p className="mt-1 text-[11px] text-slate-400">
                Purpose: Stored for tailored fit and sizing suggestions only.
              </p>
            </div>

            {/* Marketing Consent (UNTICKED by default) */}
            <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-3.5 dark:border-slate-800 dark:bg-slate-800/40">
              <label className="flex items-start gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={marketingConsent}
                  onChange={(e) => setMarketingConsent(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-slate-300 text-[#059669] focus:ring-[#059669]"
                />
                <span className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  I agree to receive occasional personalized offers, artisan spotlight newsletters, and festival discounts via WhatsApp, SMS, or Email. You can unsubscribe anytime in Account Settings. See{' '}
                  <Link href="/privacy" className="text-[#059669] underline" target="_blank">
                    Privacy Policy
                  </Link>
                  .
                </span>
              </label>
            </div>

            {/* Navigation / Completion */}
            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="text-xs font-bold text-slate-500 hover:text-slate-800 dark:text-slate-400"
              >
                Back to Step 1
              </button>

              <button
                type="button"
                onClick={handleStep2Submit}
                disabled={isSaving}
                className="inline-flex items-center gap-2 rounded-2xl bg-[#059669] px-6 py-2.5 text-xs font-bold text-white shadow-md shadow-emerald-950/20 hover:bg-[#047857] transition disabled:opacity-50"
              >
                <span>{isSaving ? 'Saving...' : 'Complete Setup'}</span>
                <CheckCircle2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
