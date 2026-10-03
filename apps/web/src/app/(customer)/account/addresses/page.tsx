'use client';

import React, { useState, useEffect } from 'react';
import { MapPin, Plus, Trash2, Check, AlertCircle, X, Home, Briefcase, Building } from 'lucide-react';
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
  gstin?: string | null;
  is_default: boolean;
}

export default function AccountAddressesPage() {
  const { token, isLoading: isAuthLoading } = useAuth();
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Form State
  const [label, setLabel] = useState('Home');
  const [type, setType] = useState<'shipping' | 'billing'>('shipping');
  const [recipientName, setRecipientName] = useState('');
  const [phone, setPhone] = useState('');
  const [line1, setLine1] = useState('');
  const [line2, setLine2] = useState('');
  const [landmark, setLandmark] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [pincode, setPincode] = useState('');
  const [gstin, setGstin] = useState('');
  const [isDefault, setIsDefault] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Load Addresses
  const loadAddresses = async () => {
    if (!token) return;
    setIsLoading(true);
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

  // Create Address
  const handleSaveAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const cleanPhone = phone.startsWith('+') ? phone : `+91${phone.replace(/\D/g, '')}`;
    if (cleanPhone.length < 11) {
      setErrorMessage('Please enter a valid phone number in E.164 format (e.g. +919876543210)');
      return;
    }

    if (pincode.replace(/\D/g, '').length !== 6) {
      setErrorMessage('Please enter a valid 6-digit Indian postal pincode');
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
          label,
          type,
          recipient_name: recipientName.trim(),
          phone_e164: cleanPhone,
          line1: line1.trim(),
          line2: line2.trim() || undefined,
          landmark: landmark.trim() || undefined,
          city: city.trim(),
          state: state.trim(),
          pincode: pincode.trim(),
          country_code: 'IN',
          gstin: gstin.trim() || undefined,
          is_default: isDefault,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'Failed to save address');
      }

      setIsModalOpen(false);
      resetForm();
      loadAddresses();
    } catch (err: any) {
      setErrorMessage(err.message || 'Error saving address');
    } finally {
      setIsSaving(false);
    }
  };

  // Delete Address
  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this delivery address?')) return;
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

  // Set Default
  const handleSetDefault = async (id: string, addrType: 'shipping' | 'billing') => {
    try {
      const res = await fetch(`/api/addresses/${id}/default`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ type: addrType }),
      });
      if (res.ok) {
        loadAddresses();
      }
    } catch {}
  };

  const resetForm = () => {
    setRecipientName('');
    setPhone('');
    setLine1('');
    setLine2('');
    setLandmark('');
    setCity('');
    setState('');
    setPincode('');
    setGstin('');
    setIsDefault(false);
  };

  if (isAuthLoading || isLoading) {
    return (
      <div className="flex min-h-[250px] items-center justify-center rounded-3xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900 shadow-sm">
        <LoadingThreeDotsJumping label="Loading delivery addresses" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 dark:border-slate-800 dark:bg-slate-900 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              Saved Delivery Addresses
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Manage shipping and billing addresses for 1-click checkout.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setErrorMessage(null);
              setIsModalOpen(true);
            }}
            className="inline-flex items-center gap-1.5 rounded-2xl bg-[#6D3DF5] px-4 py-2 text-xs font-bold text-white shadow-md shadow-[#6D3DF5]/20 hover:bg-[#5B2FE0] transition"
          >
            <Plus className="h-4 w-4" />
            <span>Add Address</span>
          </button>
        </div>

        {addresses.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 p-8 text-center dark:border-slate-800">
            <MapPin className="mx-auto h-8 w-8 text-slate-300 dark:text-slate-600 mb-2" />
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
              No delivery addresses saved yet
            </p>
            <p className="text-xs text-slate-400 mt-1">
              Add a home or office address to make your next checkout effortless.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {addresses.map((addr) => (
              <div
                key={addr.id}
                className="relative rounded-2xl border border-slate-200 p-5 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 transition bg-slate-50/50 dark:bg-slate-800/30 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                        {addr.label}
                      </span>
                      {addr.is_default && (
                        <span className="rounded-full bg-purple-100 px-2 py-0.5 text-[10px] font-bold text-[#6D3DF5] dark:bg-purple-950 dark:text-purple-300">
                          Default {addr.type}
                        </span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDelete(addr.id)}
                      className="text-slate-400 hover:text-red-600 transition"
                      aria-label="Delete address"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>

                  <p className="text-sm font-bold text-slate-900 dark:text-white">
                    {addr.recipient_name}
                  </p>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    {addr.line1}
                    {addr.line2 ? `, ${addr.line2}` : ''}
                    {addr.landmark ? `, Near ${addr.landmark}` : ''}
                  </p>
                  <p className="text-xs font-medium text-slate-700 dark:text-slate-300 mt-1">
                    {addr.city}, {addr.state} - {addr.pincode}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">Phone: {addr.phone_e164}</p>
                  {addr.gstin && (
                    <p className="text-[11px] text-slate-400 mt-0.5">GSTIN: {addr.gstin}</p>
                  )}
                </div>

                {!addr.is_default && (
                  <div className="pt-4 mt-3 border-t border-slate-200/60 dark:border-slate-700/60 flex items-center justify-end">
                    <button
                      type="button"
                      onClick={() => handleSetDefault(addr.id, addr.type)}
                      className="text-xs font-semibold text-[#6D3DF5] hover:underline"
                    >
                      Make Default {addr.type}
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Address Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-lg rounded-3xl bg-white p-6 sm:p-8 shadow-2xl border border-slate-100 dark:border-slate-800 dark:bg-slate-900 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800 mb-4">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                Add New Delivery Address
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {errorMessage && (
              <div className="mb-4 flex items-center gap-2 rounded-2xl bg-red-50 p-3 text-xs text-red-700 dark:bg-red-950/40 dark:text-red-300">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handleSaveAddress} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                    Address Label
                  </label>
                  <select
                    value={label}
                    onChange={(e) => setLabel(e.target.value)}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-2.5 text-xs font-medium dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  >
                    <option value="Home">Home</option>
                    <option value="Work">Work / Office</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                    Address Type
                  </label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value as any)}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-2.5 text-xs font-medium dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  >
                    <option value="shipping">Shipping Address</option>
                    <option value="billing">Billing Address</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                  Recipient Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={recipientName}
                  onChange={(e) => setRecipientName(e.target.value)}
                  placeholder="e.g. Suresh Kumar"
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-2.5 text-xs font-medium dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                  Mobile Number (E.164) <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+91 98765 43210"
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-2.5 text-xs font-medium dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                  Flat, House No., Building, Street <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={line1}
                  onChange={(e) => setLine1(e.target.value)}
                  placeholder="Flat 402, Sunshine Residency, 12th Main Road"
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-2.5 text-xs font-medium dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                    Area / Locality
                  </label>
                  <input
                    type="text"
                    value={line2}
                    onChange={(e) => setLine2(e.target.value)}
                    placeholder="Indiranagar"
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-2.5 text-xs font-medium dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                    Landmark
                  </label>
                  <input
                    type="text"
                    value={landmark}
                    onChange={(e) => setLandmark(e.target.value)}
                    placeholder="Near Metro Station"
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-2.5 text-xs font-medium dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                    City <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="Bengaluru"
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-2.5 text-xs font-medium dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                    State <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    placeholder="Karnataka"
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-2.5 text-xs font-medium dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                    Pincode <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    value={pincode}
                    onChange={(e) => setPincode(e.target.value.replace(/\D/g, ''))}
                    placeholder="560038"
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-2.5 text-xs font-medium dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                  GSTIN (Optional, for business tax invoice)
                </label>
                <input
                  type="text"
                  maxLength={15}
                  value={gstin}
                  onChange={(e) => setGstin(e.target.value.toUpperCase())}
                  placeholder="29ABCDE1234F1Z5"
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-2.5 text-xs font-medium dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>

              <div className="pt-2">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700 dark:text-slate-300">
                  <input
                    type="checkbox"
                    checked={isDefault}
                    onChange={(e) => setIsDefault(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-[#6D3DF5] focus:ring-[#6D3DF5]"
                  />
                  <span>Set as default {type} address</span>
                </label>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-2xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="rounded-2xl bg-[#6D3DF5] px-5 py-2 text-xs font-bold text-white shadow-md shadow-[#6D3DF5]/30 hover:bg-[#5B2FE0] disabled:opacity-50"
                >
                  {isSaving ? 'Saving...' : 'Save Address'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
