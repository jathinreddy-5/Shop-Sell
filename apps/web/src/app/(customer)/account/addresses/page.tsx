'use client';

import React, { useState, useEffect } from 'react';
import { MapPin, Plus, Trash2, CheckCircle2, AlertCircle, X } from 'lucide-react';
import { useAuth } from '@/lib/auth/auth-context';
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

export default function AccountAddressesPage() {
  const { user, token, isLoading: isAuthLoading } = useAuth();
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Address Form State
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [pincode, setPincode] = useState('');
  const [houseBuilding, setHouseBuilding] = useState('');
  const [streetArea, setStreetArea] = useState('');
  const [landmark, setLandmark] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [country, setCountry] = useState('India');
  const [addressType, setAddressType] = useState<'Home' | 'Work' | 'Other'>('Home');
  const [saveForFuture, setSaveForFuture] = useState(true);

  // Load Addresses
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
    } catch {
      setErrorMessage('Failed to load delivery addresses');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAddresses();
  }, [token]);

  // Handle Pincode Auto-Fill for City/State
  const handlePincodeChange = async (val: string) => {
    const clean = val.replace(/\D/g, '').slice(0, 6);
    setPincode(clean);
    if (clean.length === 6) {
      try {
        const res = await fetch(`/api/pincode/${clean}/serviceability`);
        if (res.ok) {
          const data = await res.json();
          if (data.city) setCity((prev) => prev || data.city);
          if (data.state) setState((prev) => prev || data.state);
        }
      } catch {}
    }
  };

  const resetForm = () => {
    setFullName('');
    setPhone('');
    setPincode('');
    setHouseBuilding('');
    setStreetArea('');
    setLandmark('');
    setCity('');
    setState('');
    setCountry('India');
    setAddressType('Home');
    setSaveForFuture(true);
  };

  // Save Address
  const handleSaveAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setErrorMessage(null);
    setSuccessMessage(null);

    const cleanPhone = phone.startsWith('+') ? phone : `+91${phone.replace(/\D/g, '')}`;
    if (cleanPhone.length < 12) {
      setErrorMessage('Please enter a valid 10-digit mobile number');
      return;
    }

    if (pincode.replace(/\D/g, '').length !== 6) {
      setErrorMessage('Please enter a valid 6-digit Indian PIN code');
      return;
    }

    if (!state) {
      setErrorMessage('Please select a State');
      return;
    }

    setIsSaving(true);
    try {
      const res = await fetch('/api/addresses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          label: addressType,
          type: 'shipping',
          recipient_name: fullName.trim(),
          phone_e164: cleanPhone,
          line1: houseBuilding.trim(),
          line2: streetArea.trim() || undefined,
          landmark: landmark.trim() || undefined,
          city: city.trim(),
          state: state.trim(),
          pincode: pincode.trim(),
          country_code: 'IN',
          is_default: saveForFuture,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'Failed to save address');
      }

      setSuccessMessage('Address saved successfully!');
      resetForm();
      setShowAddressForm(false);
      await loadAddresses();
    } catch (err: any) {
      setErrorMessage(err.message || 'Error saving address');
    } finally {
      setIsSaving(false);
    }
  };

  // Delete Address
  const handleDeleteAddress = async (id: string) => {
    if (!window.confirm('Delete this delivery address?')) return;
    try {
      const res = await fetch(`/api/addresses/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        await loadAddresses();
      }
    } catch {}
  };

  // Set Default Address
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
        await loadAddresses();
      }
    } catch {}
  };

  if (isAuthLoading || isLoading) {
    return (
      <div className="flex min-h-[300px] items-center justify-center rounded-3xl border border-slate-200 bg-white p-8 dark:border-slate-800 dark:bg-slate-900 shadow-sm">
        <LoadingThreeDotsJumping label="Loading saved addresses" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 dark:border-slate-800 dark:bg-slate-900 shadow-sm space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-4 dark:border-slate-800">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <MapPin className="h-5 w-5 text-[#059669]" />
              <span>Saved Addresses</span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Manage shipping and delivery addresses for quick 1-click checkout.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              resetForm();
              setErrorMessage(null);
              setSuccessMessage(null);
              setShowAddressForm((prev) => !prev);
            }}
            className="inline-flex items-center gap-1.5 rounded-2xl bg-[#059669] px-4 py-2 text-xs font-bold text-white shadow-md shadow-emerald-950/20 hover:bg-[#047857] transition"
          >
            <Plus className="h-4 w-4" />
            <span>New address</span>
          </button>
        </div>

        {/* Status Messages */}
        {successMessage && (
          <div className="flex items-center gap-2 rounded-2xl bg-emerald-50 p-3.5 text-xs font-semibold text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        {errorMessage && (
          <div className="flex items-center gap-2 rounded-2xl bg-red-50 p-3.5 text-xs font-semibold text-red-800 dark:bg-red-950/40 dark:text-red-300 border border-red-200">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Saved Addresses Cards Grid (shown when form is closed) */}
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
                        <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-bold text-[#059669] dark:bg-emerald-950 dark:text-emerald-300">
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
                  <p className="text-xs text-slate-500 mt-1">Phone: {addr.phone_e164}</p>
                </div>

                {!addr.is_default && (
                  <div className="pt-3 mt-3 border-t border-slate-200/60 dark:border-slate-700/60 flex items-center justify-end">
                    <button
                      type="button"
                      onClick={() => handleSetDefaultAddress(addr.id)}
                      className="text-xs font-semibold text-[#059669] hover:underline"
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
                resetForm();
                setShowAddressForm(true);
              }}
              className="inline-flex items-center gap-1.5 rounded-2xl bg-[#059669] px-4 py-2 text-xs font-bold text-white shadow-md shadow-emerald-950/20 hover:bg-[#047857] transition"
            >
              <Plus className="h-4 w-4" />
              <span>New address</span>
            </button>
          </div>
        )}

        {/* Inline Add Address Details Form */}
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
                  className="text-xs font-bold text-slate-500 hover:text-slate-800 dark:text-slate-400 flex items-center gap-1"
                >
                  <X className="h-3.5 w-3.5" />
                  <span>Cancel</span>
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
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Enter recipient full name"
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm font-medium text-slate-900 focus:border-[#059669] focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white transition"
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
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                  placeholder="9876543210"
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 pl-12 pr-3.5 py-2.5 text-sm font-medium text-slate-900 focus:border-[#059669] focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white transition"
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
                value={pincode}
                onChange={(e) => handlePincodeChange(e.target.value)}
                placeholder="6-digit PIN code (e.g. 560001)"
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm font-medium text-slate-900 focus:border-[#059669] focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white transition"
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
                value={houseBuilding}
                onChange={(e) => setHouseBuilding(e.target.value)}
                placeholder="Flat / House no., Floor, Building name"
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm font-medium text-slate-900 focus:border-[#059669] focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white transition"
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
                value={streetArea}
                onChange={(e) => setStreetArea(e.target.value)}
                placeholder="Street name, Area, Locality"
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm font-medium text-slate-900 focus:border-[#059669] focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white transition"
              />
            </div>

            {/* Landmark */}
            <div>
              <label className="block text-xs font-bold text-slate-900 dark:text-slate-200 mb-1">
                Landmark
              </label>
              <input
                type="text"
                value={landmark}
                onChange={(e) => setLandmark(e.target.value)}
                placeholder="e.g. Near City Park or Behind Hospital (Optional)"
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm font-medium text-slate-900 focus:border-[#059669] focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white transition"
              />
            </div>

            {/* City * & State * */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-900 dark:text-slate-200 mb-1">
                  City <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="City / Town"
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm font-medium text-slate-900 focus:border-[#059669] focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white transition"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-900 dark:text-slate-200 mb-1">
                  State <span className="text-red-500">*</span>
                </label>
                <select
                  required
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm font-medium text-slate-900 focus:border-[#059669] focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white transition"
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
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm font-medium text-slate-900 focus:border-[#059669] focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white transition"
              >
                <option value="India">India ▼</option>
              </select>
            </div>

            {/* Address Type: [Home] [Work] [Other] */}
            <div>
              <label className="block text-xs font-bold text-slate-900 dark:text-slate-200 mb-2">
                Address Type
              </label>
              <div className="flex gap-2">
                {(['Home', 'Work', 'Other'] as const).map((t) => (
                  <label
                    key={t}
                    className={`flex-1 flex items-center justify-center rounded-2xl border py-2.5 px-3 text-xs font-bold cursor-pointer transition ${
                      addressType === t
                        ? 'border-[#059669] bg-emerald-50 text-[#059669] dark:bg-emerald-950/40 dark:text-emerald-300'
                        : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="addressType"
                      value={t}
                      checked={addressType === t}
                      onChange={() => setAddressType(t)}
                      className="sr-only"
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
                  checked={saveForFuture}
                  onChange={(e) => setSaveForFuture(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-[#059669] focus:ring-[#059669]"
                />
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Save this address for future orders
                </span>
              </label>
            </div>

            {/* Action Buttons: [Cancel] [Save Address] */}
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
                disabled={isSaving}
                className="rounded-2xl bg-[#059669] px-7 py-2.5 text-xs font-bold text-white shadow-md shadow-emerald-950/20 hover:bg-[#047857] transition disabled:opacity-50"
              >
                {isSaving ? 'Saving Address...' : 'Save Address'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
