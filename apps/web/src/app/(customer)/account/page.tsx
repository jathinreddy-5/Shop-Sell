'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth/auth-context';
import {
  Shield,
  Mail,
  User as UserIcon,
  MapPin,
  Download,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Tag,
  Shirt,
  Plus,
} from 'lucide-react';
import { LoadingThreeDotsJumping } from '@/components/loading';

interface Address {
  id: string;
  label: string;
  type: 'shipping' | 'billing';
  recipient_name: string;
  phone_e164: string;
  line1: string;
  line2?: string | null;
  landmark?: string | null;
  city: string;
  state: string;
  pincode: string;
  country_code: string;
  is_default: boolean;
}

const INDIAN_STATES = [
  'Andhra Pradesh',
  'Arunachal Pradesh',
  'Assam',
  'Bihar',
  'Chhattisgarh',
  'Goa',
  'Gujarat',
  'Haryana',
  'Himachal Pradesh',
  'Jharkhand',
  'Karnataka',
  'Kerala',
  'Madhya Pradesh',
  'Maharashtra',
  'Manipur',
  'Meghalaya',
  'Mizoram',
  'Nagaland',
  'Odisha',
  'Punjab',
  'Rajasthan',
  'Sikkim',
  'Tamil Nadu',
  'Telangana',
  'Tripura',
  'Uttar Pradesh',
  'Uttarakhand',
  'West Bengal',
  'Andaman and Nicobar Islands',
  'Chandigarh',
  'Dadra and Nagar Haveli and Daman and Diu',
  'Delhi',
  'Jammu and Kashmir',
  'Ladakh',
  'Lakshadweep',
  'Puducherry',
];

export default function AccountProfilePage() {
  const { user, token, logout, isLoading: isAuthLoading } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [availableInterests, setAvailableInterests] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
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

  // Address Section States
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [isSavingAddress, setIsSavingAddress] = useState(false);
  const [addressSuccessMessage, setAddressSuccessMessage] = useState<string | null>(null);
  const [addressErrorMessage, setAddressErrorMessage] = useState<string | null>(null);

  // Address Form Input Fields
  const [addrFullName, setAddrFullName] = useState('');
  const [addrPhone, setAddrPhone] = useState('');
  const [addrPincode, setAddrPincode] = useState('');
  const [addrLine1, setAddrLine1] = useState('');
  const [addrLine2, setAddrLine2] = useState('');
  const [addrLandmark, setAddrLandmark] = useState('');
  const [addrCity, setAddrCity] = useState('');
  const [addrState, setAddrState] = useState('');
  const [addrCountry, setAddrCountry] = useState('India');
  const [addrType, setAddrType] = useState<'Home' | 'Work' | 'Other'>('Home');
  const [addrSaveFuture, setAddrSaveFuture] = useState(true);

  // Load Addresses Helper
  const loadAddresses = async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/addresses', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setAddresses(data);
      }
    } catch {}
  };

  // Load Profile & Interests & Addresses
  useEffect(() => {
    if (!token) return;

    async function loadData() {
      setIsLoading(true);
      try {
        const [profRes, intRes, addrRes] = await Promise.all([
          fetch('/api/profile/me', { headers: { Authorization: `Bearer ${token}` } }),
          fetch('/api/profile/interests'),
          fetch('/api/addresses', { headers: { Authorization: `Bearer ${token}` } }),
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

          // Pre-populate address form defaults if empty
          setAddrFullName((prev) => prev || profData.full_name || '');
          if (profData.phone_e164 || profData.phone) {
            const rawPhone = (profData.phone_e164 || profData.phone).replace('+91', '').replace(/\D/g, '');
            setAddrPhone((prev) => prev || rawPhone);
          }
          setAddrPincode((prev) => prev || profData.default_pincode || '');
        }

        if (intRes.ok) {
          const intData = await intRes.json();
          setAvailableInterests(intData);
        }

        if (addrRes.ok) {
          const addrData = await addrRes.json();
          setAddresses(addrData);
        }
      } catch (err: any) {
        setErrorMessage('Failed to load profile details');
      } finally {
        setIsLoading(false);
      }
    }

    loadData();
  }, [token]);

  // Handle Pincode Auto-Fill for City/State
  const handlePincodeChange = async (val: string) => {
    const clean = val.replace(/\D/g, '').slice(0, 6);
    setAddrPincode(clean);
    if (clean.length === 6) {
      try {
        const res = await fetch(`/api/pincode/${clean}/serviceability`);
        if (res.ok) {
          const data = await res.json();
          if (data.city) setAddrCity((prev) => prev || data.city);
          if (data.state) setAddrState((prev) => prev || data.state);
        }
      } catch {}
    }
  };

  const resetAddressForm = () => {
    setAddrFullName(profile?.full_name || '');
    const rawPhone = (profile?.phone_e164 || profile?.phone || '').replace('+91', '').replace(/\D/g, '');
    setAddrPhone(rawPhone);
    setAddrPincode(profile?.default_pincode || '');
    setAddrLine1('');
    setAddrLine2('');
    setAddrLandmark('');
    setAddrCity('');
    setAddrState('');
    setAddrCountry('India');
    setAddrType('Home');
    setAddrSaveFuture(true);
  };

  const handleSaveAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setAddressErrorMessage(null);
    setAddressSuccessMessage(null);

    const cleanPhone = addrPhone.startsWith('+') ? addrPhone : `+91${addrPhone.replace(/\D/g, '')}`;
    if (cleanPhone.length < 12) {
      setAddressErrorMessage('Please enter a valid 10-digit mobile number');
      return;
    }

    if (addrPincode.replace(/\D/g, '').length !== 6) {
      setAddressErrorMessage('Please enter a valid 6-digit Indian PIN code');
      return;
    }

    if (!addrState) {
      setAddressErrorMessage('Please select a State');
      return;
    }

    setIsSavingAddress(true);
    try {
      const res = await fetch('/api/addresses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          label: addrType,
          type: 'shipping',
          recipient_name: addrFullName.trim(),
          phone_e164: cleanPhone,
          line1: addrLine1.trim(),
          line2: addrLine2.trim() || undefined,
          landmark: addrLandmark.trim() || undefined,
          city: addrCity.trim(),
          state: addrState.trim(),
          pincode: addrPincode.trim(),
          country_code: 'IN',
          is_default: addrSaveFuture,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'Failed to save address');
      }

      setAddressSuccessMessage('Address saved successfully!');
      resetAddressForm();
      setShowAddressForm(false);
      await loadAddresses();
    } catch (err: any) {
      setAddressErrorMessage(err.message || 'Error saving address');
    } finally {
      setIsSavingAddress(false);
    }
  };

  const handleDeleteAddress = async (id: string) => {
    if (!window.confirm('Delete this address?')) return;
    try {
      const res = await fetch(`/api/addresses/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        loadAddresses();
      }
    } catch {}
  };

  const handleSetDefaultAddress = async (id: string) => {
    try {
      const res = await fetch(`/api/addresses/${id}/default`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ type: 'shipping' }),
      });
      if (res.ok) {
        loadAddresses();
      }
    } catch {}
  };

  // Handle Save Profile
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

    setIsSaving(true);
    setStatusMessage(null);
    setErrorMessage(null);

    try {
      // 1. Save Step 1 fields
      const res1 = await fetch('/api/profile/onboarding/step1', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          full_name: fullName.trim(),
          pincode: pincode.length === 6 ? pincode : undefined,
          interest_ids: selectedInterestIds,
          size_profile: sizeProfile,
        }),
      });

      // 2. Save Step 2 fields
      const res2 = await fetch('/api/profile/onboarding/step2', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          shopping_for: shoppingFor,
          gender: gender,
          marketing_consent: marketingConsent,
          marketing_consent_text_version: 'v1.0.0-2026',
        }),
      });

      if (!res1.ok || !res2.ok) {
        throw new Error('Failed to update profile');
      }

      const updated = await res2.json();
      setProfile(updated);
      setStatusMessage('Your profile changes and recommendation preferences have been updated!');
    } catch (err: any) {
      setErrorMessage(err.message || 'Error updating profile');
    } finally {
      setIsSaving(false);
    }
  };

  // Toggle Interest
  const toggleInterest = (id: string) => {
    setSelectedInterestIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  // Export My Data (GDPR / DPDP Act)
  const handleExportData = async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/profile/export', {
        headers: { Authorization: `Bearer ${token}` },
      });
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
    if (!token) return;
    const confirmed = window.confirm(
      'Are you sure you want to permanently delete your account? This action is irreversible.'
    );
    if (!confirmed) return;

    try {
      const res = await fetch('/api/profile', {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        logout();
        window.location.href = '/';
      }
    } catch {
      setErrorMessage('Failed to erase account');
    }
  };

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

      {/* Main Profile Form */}
      <form onSubmit={handleSaveProfile} className="space-y-6">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 dark:border-slate-800 dark:bg-slate-900 shadow-sm space-y-5">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white border-b border-slate-100 pb-3 dark:border-slate-800">
            Personal Information
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-900 dark:text-slate-200 mb-1">
                Full Name
              </label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm font-medium text-slate-900 focus:border-[#6D3DF5] focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-900 dark:text-slate-200 mb-1">
                Default Pincode
              </label>
              <input
                type="text"
                maxLength={6}
                value={pincode}
                onChange={(e) => setPincode(e.target.value.replace(/\D/g, ''))}
                placeholder="560034"
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm font-medium text-slate-900 focus:border-[#6D3DF5] focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-900 dark:text-slate-200 mb-1">
                Shopping For (Recommendation Signal)
              </label>
              <select
                value={shoppingFor}
                onChange={(e) => setShoppingFor(e.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm font-medium text-slate-900 focus:border-[#6D3DF5] focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
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
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm font-medium text-slate-900 focus:border-[#6D3DF5] focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
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
                <span className="block text-[11px] text-slate-500 mb-1">Top / Shirt Size</span>
                <select
                  value={sizeProfile.topSize || ''}
                  onChange={(e) => setSizeProfile((p) => ({ ...p, topSize: e.target.value }))}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
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
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
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
              Category Interests
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
                        ? 'bg-[#6D3DF5] text-white shadow-sm'
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
                className="mt-0.5 h-4 w-4 rounded border-slate-300 text-[#6D3DF5] focus:ring-[#6D3DF5]"
              />
              <span className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                Receive curated promotional newsletters, artisan spotlights, and seasonal discount alerts. Changes are logged to the compliance audit record.
              </span>
            </label>
          </div>

          {/* Save Button */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={isSaving}
              className="rounded-2xl bg-[#6D3DF5] px-6 py-2.5 text-xs font-bold text-white shadow-md shadow-[#6D3DF5]/30 hover:bg-[#5B2FE0] transition disabled:opacity-50"
            >
              {isSaving ? 'Saving...' : 'Save Profile Changes'}
            </button>
          </div>
        </div>
      </form>

      {/* Delivery Addresses Section */}
      <div className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 dark:border-slate-800 dark:bg-slate-900 shadow-sm space-y-6">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <MapPin className="h-5 w-5 text-[#6D3DF5]" />
              <span>Saved Addresses</span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Manage shipping and delivery addresses for quick 1-click checkout.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              resetAddressForm();
              setAddressErrorMessage(null);
              setAddressSuccessMessage(null);
              setShowAddressForm((prev) => !prev);
            }}
            className="inline-flex items-center gap-1.5 rounded-2xl bg-[#6D3DF5] px-4 py-2 text-xs font-bold text-white shadow-md shadow-[#6D3DF5]/20 hover:bg-[#5B2FE0] transition"
          >
            <Plus className="h-4 w-4" />
            <span>+ New address</span>
          </button>
        </div>

        {/* Address Status Messages */}
        {addressSuccessMessage && (
          <div className="flex items-center gap-2 rounded-2xl bg-emerald-50 p-3.5 text-xs font-semibold text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>{addressSuccessMessage}</span>
          </div>
        )}

        {addressErrorMessage && (
          <div className="flex items-center gap-2 rounded-2xl bg-red-50 p-3.5 text-xs font-semibold text-red-800 dark:bg-red-950/40 dark:text-red-300 border border-red-200">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{addressErrorMessage}</span>
          </div>
        )}

        {/* Saved Addresses Cards Grid */}
        {addresses.length > 0 && !showAddressForm && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {addresses.map((addr) => (
              <div
                key={addr.id}
                className="relative rounded-2xl border border-slate-200 p-5 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 transition bg-slate-50/50 dark:bg-slate-800/30 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="rounded-full bg-slate-200 dark:bg-slate-700 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                        {addr.label || 'Home'}
                      </span>
                      {addr.is_default && (
                        <span className="rounded-full bg-purple-100 px-2.5 py-0.5 text-[10px] font-bold text-[#6D3DF5] dark:bg-purple-950 dark:text-purple-300">
                          Default Address
                        </span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDeleteAddress(addr.id)}
                      className="text-slate-400 hover:text-red-600 transition"
                      aria-label="Delete address"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>

                  <p className="text-sm font-bold text-slate-900 dark:text-white">
                    {addr.recipient_name}
                  </p>
                  <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
                    {addr.line1}
                    {addr.line2 ? `, ${addr.line2}` : ''}
                    {addr.landmark ? `, Near ${addr.landmark}` : ''}
                  </p>
                  <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 mt-1">
                    {addr.city}, {addr.state} - {addr.pincode}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    Phone: {addr.phone_e164}
                  </p>
                </div>

                {!addr.is_default && (
                  <div className="pt-3 mt-3 border-t border-slate-200/60 dark:border-slate-700/60 flex items-center justify-end">
                    <button
                      type="button"
                      onClick={() => handleSetDefaultAddress(addr.id)}
                      className="text-xs font-semibold text-[#6D3DF5] hover:underline"
                    >
                      Make Default
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Empty State when no addresses exist and form is closed */}
        {addresses.length === 0 && !showAddressForm && (
          <div className="rounded-2xl border border-dashed border-slate-200 p-8 text-center dark:border-slate-800">
            <MapPin className="mx-auto h-8 w-8 text-slate-300 dark:text-slate-600 mb-2" />
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
              No delivery addresses saved yet
            </p>
            <p className="text-xs text-slate-400 mt-1 mb-4">
              Add your delivery address for fast 1-click checkout.
            </p>
            <button
              type="button"
              onClick={() => {
                resetAddressForm();
                setShowAddressForm(true);
              }}
              className="inline-flex items-center gap-1.5 rounded-2xl bg-[#6D3DF5] px-4 py-2 text-xs font-bold text-white shadow-md shadow-[#6D3DF5]/20 hover:bg-[#5B2FE0] transition"
            >
              <Plus className="h-4 w-4" />
              <span>+ New address</span>
            </button>
          </div>
        )}

        {/* The Exact Address Form */}
        {showAddressForm && (
          <form onSubmit={handleSaveAddress} className="space-y-4 pt-2">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                Add Address Details
              </h3>
              {addresses.length > 0 && (
                <button
                  type="button"
                  onClick={() => setShowAddressForm(false)}
                  className="text-xs font-bold text-slate-500 hover:text-slate-800 dark:text-slate-400"
                >
                  Cancel
                </button>
              )}
            </div>

            {/* Full Name * */}
            <div>
              <label className="block text-xs font-bold text-slate-900 dark:text-slate-200 mb-1">
                Full Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={addrFullName}
                onChange={(e) => setAddrFullName(e.target.value)}
                placeholder="Enter recipient full name"
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm font-medium text-slate-900 focus:border-[#6D3DF5] focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
            </div>

            {/* Mobile Number * */}
            <div>
              <label className="block text-xs font-bold text-slate-900 dark:text-slate-200 mb-1">
                Mobile Number <span className="text-red-500">*</span>
              </label>
              <div className="relative flex items-center">
                <span className="absolute left-3.5 text-sm font-semibold text-slate-500 select-none">
                  +91
                </span>
                <input
                  type="tel"
                  required
                  maxLength={10}
                  value={addrPhone}
                  onChange={(e) => setAddrPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                  placeholder="9876543210"
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 pl-14 pr-3.5 py-2.5 text-sm font-medium text-slate-900 focus:border-[#6D3DF5] focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>
            </div>

            {/* PIN Code * */}
            <div>
              <label className="block text-xs font-bold text-slate-900 dark:text-slate-200 mb-1">
                PIN Code <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                maxLength={6}
                value={addrPincode}
                onChange={(e) => handlePincodeChange(e.target.value)}
                placeholder="6-digit PIN code (e.g. 560001)"
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm font-medium text-slate-900 focus:border-[#6D3DF5] focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
            </div>

            {/* House / Flat / Building No. * */}
            <div>
              <label className="block text-xs font-bold text-slate-900 dark:text-slate-200 mb-1">
                House / Flat / Building No. <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={addrLine1}
                onChange={(e) => setAddrLine1(e.target.value)}
                placeholder="Flat / House no., Floor, Building name"
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm font-medium text-slate-900 focus:border-[#6D3DF5] focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
            </div>

            {/* Street / Area / Locality * */}
            <div>
              <label className="block text-xs font-bold text-slate-900 dark:text-slate-200 mb-1">
                Street / Area / Locality <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={addrLine2}
                onChange={(e) => setAddrLine2(e.target.value)}
                placeholder="Street name, Area, Locality"
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm font-medium text-slate-900 focus:border-[#6D3DF5] focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
            </div>

            {/* Landmark */}
            <div>
              <label className="block text-xs font-bold text-slate-900 dark:text-slate-200 mb-1">
                Landmark
              </label>
              <input
                type="text"
                value={addrLandmark}
                onChange={(e) => setAddrLandmark(e.target.value)}
                placeholder="e.g. Near City Park or Behind Hospital (Optional)"
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm font-medium text-slate-900 focus:border-[#6D3DF5] focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
            </div>

            {/* City * and State * */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-900 dark:text-slate-200 mb-1">
                  City <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={addrCity}
                  onChange={(e) => setAddrCity(e.target.value)}
                  placeholder="City / Town"
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm font-medium text-slate-900 focus:border-[#6D3DF5] focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-900 dark:text-slate-200 mb-1">
                  State <span className="text-red-500">*</span>
                </label>
                <select
                  required
                  value={addrState}
                  onChange={(e) => setAddrState(e.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm font-medium text-slate-900 focus:border-[#6D3DF5] focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                >
                  <option value="">Select State ▼</option>
                  {INDIAN_STATES.map((st) => (
                    <option key={st} value={st}>
                      {st}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Country */}
            <div>
              <label className="block text-xs font-bold text-slate-900 dark:text-slate-200 mb-1">
                Country
              </label>
              <select
                value={addrCountry}
                onChange={(e) => setAddrCountry(e.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm font-medium text-slate-900 focus:border-[#6D3DF5] focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              >
                <option value="India">India ▼</option>
              </select>
            </div>

            {/* Address Type: ○ Home   ○ Work   ○ Other */}
            <div>
              <label className="block text-xs font-bold text-slate-900 dark:text-slate-200 mb-2">
                Address Type
              </label>
              <div className="flex items-center gap-6">
                {(['Home', 'Work', 'Other'] as const).map((t) => (
                  <label key={t} className="inline-flex items-center gap-2 cursor-pointer text-sm font-semibold text-slate-800 dark:text-slate-200">
                    <input
                      type="radio"
                      name="addressType"
                      value={t}
                      checked={addrType === t}
                      onChange={() => setAddrType(t)}
                      className="h-4 w-4 text-[#6D3DF5] focus:ring-[#6D3DF5] border-slate-300"
                    />
                    <span>{t}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* [✓] Save this address for future orders */}
            <div className="pt-1">
              <label className="flex items-center gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={addrSaveFuture}
                  onChange={(e) => setAddrSaveFuture(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-[#6D3DF5] focus:ring-[#6D3DF5]"
                />
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Save this address for future orders
                </span>
              </label>
            </div>

            {/* Action Buttons: [Save Address] */}
            <div className="pt-3 flex items-center justify-end gap-3">
              {addresses.length > 0 && (
                <button
                  type="button"
                  onClick={() => setShowAddressForm(false)}
                  className="rounded-2xl border border-slate-200 px-5 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300"
                >
                  Cancel
                </button>
              )}
              <button
                type="submit"
                disabled={isSavingAddress}
                className="rounded-2xl bg-[#6D3DF5] px-7 py-2.5 text-xs font-bold text-white shadow-md shadow-[#6D3DF5]/30 hover:bg-[#5B2FE0] transition disabled:opacity-50"
              >
                {isSavingAddress ? 'Saving Address...' : 'Save Address'}
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Data Privacy & Compliance (DPDP Act & GDPR) */}
      <div className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 dark:border-slate-800 dark:bg-slate-900 shadow-sm space-y-4">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white border-b border-slate-100 pb-3 dark:border-slate-800">
          Data Rights & Privacy
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
            <Download className="h-4 w-4 text-[#6D3DF5]" />
            <span>Export My Data (JSON)</span>
          </button>

          <button
            type="button"
            onClick={handleDeleteAccount}
            className="inline-flex items-center gap-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-2.5 text-xs font-bold text-red-700 hover:bg-red-100 dark:border-red-900/40 dark:bg-red-950/20 dark:text-red-400"
          >
            <Trash2 className="h-4 w-4 text-red-600" />
            <span>Delete Account & Data</span>
          </button>
        </div>
      </div>
    </div>
  );
}
