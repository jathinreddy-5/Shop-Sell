'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/auth-context';
import {
  Shield,
  Mail,
  User as UserIcon,
  Download,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Tag,
  Shirt,
  Store,
  ArrowRight,
  LogOut,
  Edit3,
  X as XIcon,
  Check,
  Sparkles,
} from 'lucide-react';
import { LoadingThreeDotsJumping } from '@/components/loading';

export default function AccountProfilePage() {
  const router = useRouter();
  const { user, logout, isLoading: isAuthLoading } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [availableInterests, setAvailableInterests] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Editable Form States
  const [fullName, setFullName] = useState('');
  const [pincode, setPincode] = useState('');
  const [shoppingFor, setShoppingFor] = useState('prefer_not_to_say');
  const [gender, setGender] = useState('prefer_not_to_say');
  const [selectedInterestIds, setSelectedInterestIds] = useState<string[]>([]);
  const [sizeProfile, setSizeProfile] = useState<{ topSize?: string; shoeSize?: string }>({});
  const [marketingConsent, setMarketingConsent] = useState(false);

  // Load Profile & Interests
  useEffect(() => {
    if (isAuthLoading) return;

    if (!user) {
      setIsLoading(false);
      return;
    }

    async function loadData() {
      setIsLoading(true);
      try {
        const [profRes, intRes] = await Promise.all([
          fetch('/api/profile/me'),
          fetch('/api/profile/interests'),
        ]);

        if (profRes.ok) {
          const profData = await profRes.json();
          setProfile(profData);
          setFullName(profData.full_name || '');
          setPincode(profData.default_pincode || '');
          setShoppingFor(profData.shopping_for || 'prefer_not_to_say');
          setGender(profData.gender || 'prefer_not_to_say');
          setSelectedInterestIds(profData.interest_ids || []);
          setSizeProfile(profData.size_profile || {});
          setMarketingConsent(Boolean(profData.marketing_consent));
        }

        if (intRes.ok) {
          const intData = await intRes.json();
          setAvailableInterests(intData);
        }
      } catch (err: any) {
        setErrorMessage('Failed to load profile details');
      } finally {
        setIsLoading(false);
      }
    }

    loadData();

    // Re-sync if profile updated via onboarding modal elsewhere
    const handleProfileUpdated = () => {
      loadData();
    };
    window.addEventListener('shopsell:profile-updated', handleProfileUpdated);
    return () => {
      window.removeEventListener('shopsell:profile-updated', handleProfileUpdated);
    };
  }, [user, isAuthLoading]);

  // Handle Save Profile
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setIsSaving(true);
    setStatusMessage(null);
    setErrorMessage(null);

    try {
      // 1. Save Step 1 fields (Name, Pincode, Interests, Sizing)
      const res1 = await fetch('/api/profile/onboarding/step1', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          full_name: fullName.trim(),
          pincode: pincode.length === 6 ? pincode : undefined,
          interest_ids: selectedInterestIds,
          size_profile: sizeProfile,
        }),
      });

      // 2. Save Step 2 fields (Shopping For, Gender, Marketing)
      const res2 = await fetch('/api/profile/onboarding/step2', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          shopping_for: shoppingFor,
          gender: gender,
          marketing_consent: marketingConsent,
          marketing_consent_text_version: 'v1.0.0-2026',
        }),
      });

      if (!res1.ok || !res2.ok) {
        throw new Error('Failed to update profile details');
      }

      const updated = await res2.json();
      setProfile(updated);
      setIsEditing(false);
      setStatusMessage('Your profile changes and recommendation preferences have been successfully updated!');
    } catch (err: any) {
      setErrorMessage(err.message || 'Error updating profile');
    } finally {
      setIsSaving(false);
    }
  };

  // Cancel Edit and Revert Form
  const handleCancelEdit = () => {
    if (profile) {
      setFullName(profile.full_name || '');
      setPincode(profile.default_pincode || '');
      setShoppingFor(profile.shopping_for || 'prefer_not_to_say');
      setGender(profile.gender || 'prefer_not_to_say');
      setSelectedInterestIds(profile.interest_ids || []);
      setSizeProfile(profile.size_profile || {});
      setMarketingConsent(Boolean(profile.marketing_consent));
    }
    setIsEditing(false);
    setErrorMessage(null);
  };

  // Toggle Interest in Edit Mode
  const toggleInterest = (id: string) => {
    setSelectedInterestIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  // Export My Data (GDPR / DPDP Act)
  const handleExportData = async () => {
    if (!user) return;
    try {
      const res = await fetch('/api/profile/export');
      const data = await res.json();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `shopsell-data-export-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setErrorMessage('Could not generate data export');
    }
  };

  // Delete My Account
  const handleDeleteAccount = async () => {
    if (!user) return;
    const confirmed = window.confirm(
      'Are you sure you want to permanently delete your account? This action is irreversible.'
    );
    if (!confirmed) return;

    try {
      const res = await fetch('/api/profile', {
        method: 'DELETE',
      });
      if (res.ok) {
        logout();
        window.location.href = '/login';
      }
    } catch {
      setErrorMessage('Failed to erase account');
    }
  };

  // Direct Logout from Profile Session
  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  // Format Display Helpers
  const formatShoppingFor = (val?: string) => {
    switch (val) {
      case 'womens':
        return "Women's Fashion";
      case 'mens':
        return "Men's Fashion";
      case 'unisex':
        return 'Unisex / All Styles';
      case 'kids':
        return 'Kids & Family';
      default:
        return 'Not specified';
    }
  };

  const formatGender = (val?: string) => {
    switch (val) {
      case 'female':
        return 'Female';
      case 'male':
        return 'Male';
      case 'non_binary':
        return 'Non-Binary';
      default:
        return 'Not specified';
    }
  };

  const selectedInterests = availableInterests.filter((i) =>
    (profile?.interest_ids || selectedInterestIds).includes(i.id)
  );

  if (isAuthLoading || isLoading) {
    return (
      <div className="flex min-h-[350px] items-center justify-center p-8">
        <LoadingThreeDotsJumping label="Loading personal profile" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Status Messages */}
      {statusMessage && (
        <div className="flex items-center gap-2 rounded-2xl bg-emerald-50 p-3.5 text-xs font-semibold text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>{statusMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="flex items-center gap-2 rounded-2xl bg-red-50 p-3.5 text-xs font-semibold text-red-800 dark:bg-red-950/40 dark:text-red-300 border border-red-200">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Personal Information Card: View Mode vs Edit Mode */}
      <div className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 dark:border-slate-800 dark:bg-slate-900 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-100 pb-4 dark:border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                Personal Information
              </h2>
              {profile?.onboarding_status === 'completed' && (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[10px] font-bold text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400 border border-emerald-200/60">
                  <Check className="h-2.5 w-2.5" />
                  Verified Profile
                </span>
              )}
            </div>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
              Details provided during account creation and used for delivery and personalized styling.
            </p>
          </div>

          {!isEditing ? (
            <button
              type="button"
              onClick={() => {
                setStatusMessage(null);
                setErrorMessage(null);
                setIsEditing(true);
              }}
              data-testid="edit-profile-btn"
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-800 shadow-sm hover:bg-slate-50 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-750 transition shrink-0"
            >
              <Edit3 className="h-3.5 w-3.5 text-[#059669]" />
              <span>Edit Profile</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={handleCancelEdit}
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 transition shrink-0"
            >
              <XIcon className="h-3.5 w-3.5" />
              <span>Cancel</span>
            </button>
          )}
        </div>

        {/* --- VIEW MODE --- */}
        {!isEditing ? (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Full Name */}
              <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4 dark:border-slate-800/80 dark:bg-slate-800/40">
                <span className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Full Name
                </span>
                <p className="mt-1 text-sm font-bold text-slate-900 dark:text-white">
                  {profile?.full_name || fullName || (
                    <span className="text-slate-400 italic font-normal">Not provided</span>
                  )}
                </p>
              </div>

              {/* Email Address */}
              <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4 dark:border-slate-800/80 dark:bg-slate-800/40">
                <span className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Email Address
                </span>
                <p className="mt-1 text-sm font-bold text-slate-900 dark:text-white truncate">
                  {user?.email || profile?.email || (
                    <span className="text-slate-400 italic font-normal">Not provided</span>
                  )}
                </p>
              </div>

              {/* Default Pincode */}
              <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4 dark:border-slate-800/80 dark:bg-slate-800/40">
                <span className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Default Delivery Pincode
                </span>
                <p className="mt-1 text-sm font-bold text-slate-900 dark:text-white">
                  {profile?.default_pincode || pincode || (
                    <span className="text-slate-400 italic font-normal">Not provided</span>
                  )}
                </p>
              </div>

              {/* Shopping For */}
              <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4 dark:border-slate-800/80 dark:bg-slate-800/40">
                <span className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Shopping Preference
                </span>
                <p className="mt-1 text-sm font-bold text-slate-900 dark:text-white">
                  {formatShoppingFor(profile?.shopping_for || shoppingFor)}
                </p>
              </div>

              {/* Gender */}
              <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4 dark:border-slate-800/80 dark:bg-slate-800/40">
                <span className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Gender (Sizing Fit)
                </span>
                <p className="mt-1 text-sm font-bold text-slate-900 dark:text-white">
                  {formatGender(profile?.gender || gender)}
                </p>
              </div>

              {/* Size Profile */}
              <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4 dark:border-slate-800/80 dark:bg-slate-800/40">
                <span className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Size Profile
                </span>
                <div className="mt-1.5 flex flex-wrap items-center gap-2">
                  {(profile?.size_profile?.topSize || sizeProfile.topSize) && (
                    <span className="inline-flex items-center gap-1.5 rounded-xl bg-slate-200/70 px-3 py-1 text-xs font-semibold text-slate-800 dark:bg-slate-700 dark:text-slate-200">
                      <Shirt className="h-3 w-3 text-[#059669]" />
                      Top: {profile?.size_profile?.topSize || sizeProfile.topSize}
                    </span>
                  )}
                  {(profile?.size_profile?.shoeSize || sizeProfile.shoeSize) && (
                    <span className="inline-flex items-center gap-1.5 rounded-xl bg-slate-200/70 px-3 py-1 text-xs font-semibold text-slate-800 dark:bg-slate-700 dark:text-slate-200">
                      Footwear: {profile?.size_profile?.shoeSize || sizeProfile.shoeSize}
                    </span>
                  )}
                  {!(profile?.size_profile?.topSize || sizeProfile.topSize) &&
                    !(profile?.size_profile?.shoeSize || sizeProfile.shoeSize) && (
                      <span className="text-slate-400 italic text-sm font-normal">
                        Not specified
                      </span>
                    )}
                </div>
              </div>
            </div>

            {/* Category Interests */}
            <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4 dark:border-slate-800/80 dark:bg-slate-800/40">
              <span className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                Category Interests
              </span>
              {selectedInterests.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {selectedInterests.map((interest) => (
                    <span
                      key={interest.id}
                      className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200/80 px-3.5 py-1 text-xs font-semibold text-emerald-800 dark:bg-emerald-950/50 dark:border-emerald-800/60 dark:text-emerald-300"
                    >
                      <Tag className="h-3 w-3 text-[#059669]" />
                      {interest.label}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-400 italic">No specific categories selected yet</p>
              )}
            </div>

            {/* Marketing & Newsletter */}
            <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4 dark:border-slate-800/80 dark:bg-slate-800/40">
              <span className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                Newsletter &amp; Updates
              </span>
              <div className="flex items-center gap-2 mt-1">
                {marketingConsent ? (
                  <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 dark:text-emerald-400">
                    <CheckCircle2 className="h-4 w-4 text-[#059669]" />
                    Subscribed to promotional alerts, artisan spotlights, and seasonal deals
                  </span>
                ) : (
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    Not subscribed to promotional newsletters
                  </span>
                )}
              </div>
            </div>
          </div>
        ) : (
          /* --- EDIT MODE --- */
          <form onSubmit={handleSaveProfile} className="space-y-6 animate-in fade-in duration-150">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-900 dark:text-slate-200 mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Enter your full name"
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm font-medium text-slate-900 focus:border-[#059669] focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-900 dark:text-slate-200 mb-1">
                  Default Delivery Pincode
                </label>
                <input
                  type="text"
                  maxLength={6}
                  value={pincode}
                  onChange={(e) => setPincode(e.target.value.replace(/\D/g, ''))}
                  placeholder="560034"
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm font-medium text-slate-900 focus:border-[#059669] focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-900 dark:text-slate-200 mb-1">
                  Shopping For (Recommendation Signal)
                </label>
                <select
                  value={shoppingFor}
                  onChange={(e) => setShoppingFor(e.target.value)}
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
                <label className="block text-xs font-bold text-slate-900 dark:text-slate-200 mb-1">
                  Gender (Sizing fit only)
                </label>
                <select
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm font-medium text-slate-900 focus:border-[#059669] focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                >
                  <option value="prefer_not_to_say">Prefer not to say</option>
                  <option value="female">Female</option>
                  <option value="male">Male</option>
                  <option value="non_binary">Non-Binary</option>
                </select>
              </div>
            </div>

            {/* Sizing Preferences */}
            <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
              <label className="block text-xs font-bold text-slate-900 dark:text-slate-200 mb-2">
                Size Profile
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <span className="block text-[11px] text-slate-500 mb-1 font-medium">Top / Shirt Size</span>
                  <select
                    value={sizeProfile.topSize || ''}
                    onChange={(e) => setSizeProfile((p) => ({ ...p, topSize: e.target.value }))}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-white focus:border-[#059669] focus:outline-none"
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
                  <span className="block text-[11px] text-slate-500 mb-1 font-medium">Footwear (UK)</span>
                  <select
                    value={sizeProfile.shoeSize || ''}
                    onChange={(e) => setSizeProfile((p) => ({ ...p, shoeSize: e.target.value }))}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-white focus:border-[#059669] focus:outline-none"
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

            {/* Category Interests */}
            <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
              <label className="block text-xs font-bold text-slate-900 dark:text-slate-200 mb-2">
                Category Interests (Click to toggle)
              </label>
              <div className="flex flex-wrap gap-2">
                {availableInterests.map((interest) => {
                  const selected = selectedInterestIds.includes(interest.id);
                  return (
                    <button
                      key={interest.id}
                      type="button"
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
            </div>

            {/* Marketing Consent */}
            <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
              <label className="flex items-start gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={marketingConsent}
                  onChange={(e) => setMarketingConsent(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-slate-300 text-[#059669] focus:ring-[#059669]"
                />
                <span className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  Receive curated promotional newsletters, artisan spotlights, and seasonal discount alerts.
                </span>
              </label>
            </div>

            {/* Actions: Save & Cancel */}
            <div className="flex items-center gap-3 pt-2">
              <button
                type="submit"
                disabled={isSaving}
                className="rounded-2xl bg-[#059669] px-6 py-2.5 text-xs font-bold text-white shadow-md shadow-emerald-950/20 hover:bg-[#047857] transition disabled:opacity-50"
              >
                {isSaving ? 'Saving Changes...' : 'Save Profile Changes'}
              </button>
              <button
                type="button"
                onClick={handleCancelEdit}
                disabled={isSaving}
                className="rounded-2xl border border-slate-200 bg-white px-5 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 transition"
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Become a Seller Section */}
      <div className="rounded-3xl border border-emerald-100 bg-gradient-to-r from-emerald-50/70 via-teal-50/40 to-white p-6 sm:p-8 dark:border-emerald-950 dark:bg-slate-900/60 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#059669] text-white shadow-md shadow-emerald-950/20">
              <Store className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                Become a Seller on Shop:Sell
              </h2>
              <span className="text-[11px] font-semibold text-[#059669] dark:text-emerald-400 uppercase tracking-wider">
                Merchant Registration
              </span>
            </div>
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-400 max-w-lg leading-relaxed pt-1">
            Sell to millions of customers across India. Submit your business entity, PAN, GSTIN, and bank verification for automated daily settlements.
          </p>
        </div>
        <Link
          href="/become-a-seller"
          className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#059669] px-6 py-3 text-xs font-bold text-white shadow-md shadow-emerald-950/20 hover:bg-[#047857] transition shrink-0"
        >
          <span>Apply to Sell</span>
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      {/* Data Privacy & Compliance (DPDP Act & GDPR) */}
      <div className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 dark:border-slate-800 dark:bg-slate-900 shadow-sm space-y-4">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white border-b border-slate-100 pb-3 dark:border-slate-800">
          Data Rights &amp; Privacy
        </h2>
        <p className="text-xs text-slate-500 leading-relaxed">
          Under the Digital Personal Data Protection (DPDP) Act 2023 and GDPR, you have the right to export your personal records or request immediate account erasure.
        </p>

        <div className="flex flex-wrap items-center gap-3 pt-2">
          <button
            type="button"
            onClick={handleExportData}
            className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
          >
            <Download className="h-4 w-4 text-[#059669]" />
            <span>Export My Data (JSON)</span>
          </button>

          <button
            type="button"
            onClick={handleDeleteAccount}
            className="inline-flex items-center gap-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-2.5 text-xs font-bold text-red-700 hover:bg-red-100 dark:border-red-900/40 dark:bg-red-950/20 dark:text-red-400"
          >
            <Trash2 className="h-4 w-4 text-red-600" />
            <span>Delete Account &amp; Data</span>
          </button>
        </div>
      </div>

      {/* Profile Session & Security */}
      <div
        data-testid="profile-session-card"
        className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 dark:border-slate-800 dark:bg-slate-900 shadow-sm space-y-4"
      >
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-100 pb-4 dark:border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
              </span>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                Profile Session &amp; Security
              </h2>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Active authenticated session for{' '}
              <strong className="text-slate-800 dark:text-slate-200">
                {user?.email || profile?.email || 'Current User'}
              </strong>
              . Logging out will clear your session and return directly to the authentication page.
            </p>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            data-testid="profile-session-logout-btn"
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-red-600 px-5 py-2.5 text-xs font-bold text-white shadow-md shadow-red-500/20 hover:bg-red-700 transition shrink-0 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
          >
            <LogOut className="h-4 w-4" />
            <span>Log Out</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1 text-xs">
          <div className="rounded-2xl bg-slate-50 p-3.5 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
            <span className="text-[11px] text-slate-500 dark:text-slate-400 block font-medium">
              Authenticated Account
            </span>
            <span className="font-semibold text-slate-800 dark:text-slate-200 truncate block mt-0.5">
              {user?.email || profile?.email || 'Customer'}
            </span>
          </div>
          <div className="rounded-2xl bg-slate-50 p-3.5 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
            <span className="text-[11px] text-slate-500 dark:text-slate-400 block font-medium">
              Session Status
            </span>
            <span className="font-semibold text-emerald-600 dark:text-emerald-400 block mt-0.5">
              Active &amp; Verified
            </span>
          </div>
          <div className="rounded-2xl bg-slate-50 p-3.5 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
            <span className="text-[11px] text-slate-500 dark:text-slate-400 block font-medium">
              Account Role
            </span>
            <span className="font-semibold text-[#059669] dark:text-emerald-400 capitalize block mt-0.5">
              {user?.roles?.join(', ') || 'Customer'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
