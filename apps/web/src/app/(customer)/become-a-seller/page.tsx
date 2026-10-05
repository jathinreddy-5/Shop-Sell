'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Store,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  FileText,
  Building2,
  CreditCard,
  Truck,
  UploadCloud,
  Check,
  Lock,
  User,
  Mail,
  Phone,
  ArrowRight,
  Sparkles,
  Info,
} from 'lucide-react';
import { OwnerApplicationSchema } from '@shop-sell/shared';
import { useAuth } from '@/lib/auth/auth-context';
import { LoadingThreeDotsJumping } from '@/components/loading';
import { Turnstile } from '@marsidev/react-turnstile';

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

export default function BecomeASellerPage() {
  const { user, token, isSeller } = useAuth();

  // Form State
  const [formData, setFormData] = useState({
    // 1. Business Identity & Type
    business_name: '',
    store_name: '',
    business_type: 'sole_proprietorship',

    // 2. PAN details
    pan_number: '',
    pan_name: '',
    pan_verified: false,

    // 3. GSTIN details
    gstin: '',
    gst_exempt: false,
    gstin_verified: false,

    // 4. Government ID
    government_id_type: 'aadhaar',
    government_id_number: '',
    government_id_file: null as string | null,

    // 5. Registered Business Address & Proof
    registered_address: {
      address_line1: '',
      address_line2: '',
      landmark: '',
      city: '',
      state: 'Karnataka',
      pincode: '',
    },
    address_proof_type: 'utility_bill',
    address_proof_file: null as string | null,

    // 6. Contact Details
    contact_phone: '',
    phone_verified: false,
    contact_email: '',
    email_verified: false,

    // 7. Bank & Penny Drop
    payout_details: {
      account_holder_name: '',
      bank_name: '',
      account_number: '',
      confirm_account_number: '',
      ifsc_code: '',
      cancelled_cheque_file: null as string | null,
      penny_drop_verified: false,
    },

    // 8. Pickup and Return Address
    pickup_address: {
      same_as_registered: true,
      contact_person: '',
      phone: '',
      address_line1: '',
      city: '',
      state: 'Karnataka',
      pincode: '',
    },
    return_address: {
      same_as_pickup: true,
      address_line1: '',
      city: '',
      state: 'Karnataka',
      pincode: '',
    },

    // 9. Legal Agreements & Consent
    agreement_accepted: false,
    commission_accepted: false,
    dpdp_consent_accepted: false,
  });

  // Pre-fill user contact info if logged in
  useEffect(() => {
    if (user) {
      setFormData((prev) => ({
        ...prev,
        contact_email: prev.contact_email || user.email || '',
        contact_phone: prev.contact_phone || user.phone || '',
        phone_verified: Boolean(user.phone),
        email_verified: Boolean(user.email),
      }));
    }
  }, [user]);

  // UI state
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isVerifyingPan, setIsVerifyingPan] = useState(false);
  const [isVerifyingGst, setIsVerifyingGst] = useState(false);
  const [isVerifyingPennyDrop, setIsVerifyingPennyDrop] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [applicationRef, setApplicationRef] = useState('');
  const [turnstileToken, setTurnstileToken] = useState('');

  // 1. Interactive PAN Verification simulation
  const handleVerifyPan = () => {
    const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
    if (!panRegex.test(formData.pan_number.toUpperCase())) {
      setErrors((prev) => ({
        ...prev,
        pan_number: 'Enter a valid 10-character PAN (e.g. ABCDE1234F)',
      }));
      return;
    }
    if (!formData.pan_name.trim()) {
      setErrors((prev) => ({
        ...prev,
        pan_name: 'Name on PAN is required for verification',
      }));
      return;
    }

    setErrors((prev) => {
      const next = { ...prev };
      delete next.pan_number;
      delete next.pan_name;
      return next;
    });

    setIsVerifyingPan(true);
    setTimeout(() => {
      setIsVerifyingPan(false);
      setFormData((prev) => ({
        ...prev,
        pan_verified: true,
        // Pre-fill bank account holder name to match verified PAN name
        payout_details: {
          ...prev.payout_details,
          account_holder_name: prev.payout_details.account_holder_name || prev.pan_name,
        },
      }));
    }, 700);
  };

  // 2. Interactive GSTIN Verification simulation
  const handleVerifyGst = () => {
    if (formData.gst_exempt) return;
    const gstRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
    if (!gstRegex.test(formData.gstin.toUpperCase())) {
      setErrors((prev) => ({
        ...prev,
        gstin: 'Enter a valid 15-character GSTIN (e.g. 29ABCDE1234F1Z5)',
      }));
      return;
    }

    setErrors((prev) => {
      const next = { ...prev };
      delete next.gstin;
      return next;
    });

    setIsVerifyingGst(true);
    setTimeout(() => {
      setIsVerifyingGst(false);
      setFormData((prev) => ({ ...prev, gstin_verified: true }));
    }, 700);
  };

  // 3. Interactive Penny Drop Verification
  const handlePennyDrop = () => {
    const { account_number, confirm_account_number, ifsc_code, account_holder_name } =
      formData.payout_details;

    if (!account_holder_name || account_holder_name.trim().length < 2) {
      setErrors((prev) => ({
        ...prev,
        'payout_details.account_holder_name': 'Account holder name is required',
      }));
      return;
    }
    if (!account_number || account_number.length < 6) {
      setErrors((prev) => ({
        ...prev,
        'payout_details.account_number': 'Valid account number required',
      }));
      return;
    }
    if (account_number !== confirm_account_number) {
      setErrors((prev) => ({
        ...prev,
        'payout_details.confirm_account_number': 'Account numbers do not match',
      }));
      return;
    }
    if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(ifsc_code.toUpperCase())) {
      setErrors((prev) => ({
        ...prev,
        'payout_details.ifsc_code': 'Valid Indian IFSC code required (e.g. HDFC0001234)',
      }));
      return;
    }

    setErrors((prev) => {
      const next = { ...prev };
      delete next['payout_details.account_holder_name'];
      delete next['payout_details.account_number'];
      delete next['payout_details.confirm_account_number'];
      delete next['payout_details.ifsc_code'];
      return next;
    });

    setIsVerifyingPennyDrop(true);
    setTimeout(() => {
      setIsVerifyingPennyDrop(false);
      setFormData((prev) => ({
        ...prev,
        payout_details: {
          ...prev.payout_details,
          penny_drop_verified: true,
        },
      }));
    }, 850);
  };

  // Handle Form Submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const newErrors: Record<string, string> = {};

    // 1. Business Info
    if (!formData.business_name.trim() || formData.business_name.trim().length < 2) {
      newErrors['business_name'] = 'Full name or legal business name must be at least 2 characters';
    }

    // 2. PAN Check
    if (!formData.pan_number.trim()) {
      newErrors['pan_number'] = 'PAN is mandatory for merchant onboarding';
    } else if (!/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(formData.pan_number.toUpperCase())) {
      newErrors['pan_number'] = 'Valid 10-digit PAN required (e.g. ABCDE1234F)';
    }

    // 3. GST Check
    if (!formData.gst_exempt) {
      if (!formData.gstin.trim()) {
        newErrors['gstin'] = 'GSTIN is required unless exempt';
      } else if (
        !/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(
          formData.gstin.toUpperCase()
        )
      ) {
        newErrors['gstin'] = 'Valid 15-character GSTIN required';
      }
    }

    // 4. Government ID
    if (!formData.government_id_number.trim()) {
      newErrors['government_id_number'] = 'Government ID number is required';
    }

    // 5. Registered Address
    if (!formData.registered_address.address_line1.trim()) {
      newErrors['registered_address.address_line1'] = 'Registered address line is required';
    }
    if (!formData.registered_address.city.trim()) {
      newErrors['registered_address.city'] = 'City is required';
    }
    if (!/^[1-9][0-9]{5}$/.test(formData.registered_address.pincode)) {
      newErrors['registered_address.pincode'] = 'Valid 6-digit Indian pincode required';
    }

    // 6. Bank Details
    if (
      !formData.payout_details.account_holder_name.trim() ||
      formData.payout_details.account_holder_name.trim().length < 2
    ) {
      newErrors['payout_details.account_holder_name'] = 'Account holder name is required';
    }
    if (
      !formData.payout_details.account_number ||
      formData.payout_details.account_number.length < 6
    ) {
      newErrors['payout_details.account_number'] = 'Valid account number required';
    }
    if (
      formData.payout_details.account_number !==
      formData.payout_details.confirm_account_number
    ) {
      newErrors['payout_details.confirm_account_number'] = 'Bank account numbers must match';
    }
    if (
      !/^[A-Z]{4}0[A-Z0-9]{6}$/.test(formData.payout_details.ifsc_code.toUpperCase())
    ) {
      newErrors['payout_details.ifsc_code'] = 'Valid 11-digit IFSC code required';
    }

    // 7. Agreements
    if (!formData.agreement_accepted) {
      newErrors['agreement_accepted'] = 'You must accept the Merchant Agreement to proceed';
    }
    if (!formData.commission_accepted) {
      newErrors['commission_accepted'] = 'You must accept the Commission & Settlement terms';
    }
    if (!formData.dpdp_consent_accepted) {
      newErrors['dpdp_consent_accepted'] = 'DPDP consent is required for KYC processing';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      // Scroll to first error
      window.scrollTo({ top: 180, behavior: 'smooth' });
      return;
    }

    setIsSubmitting(true);

    try {
      // Prepare schema-compliant payload
      const payload = {
        business_name: formData.business_name.trim(),
        business_type:
          formData.business_type === 'proprietorship'
            ? 'sole_proprietorship'
            : formData.business_type,
        tax_id: formData.gst_exempt ? formData.pan_number : formData.gstin || formData.pan_number,
        payout_details: {
          account_holder_name: formData.payout_details.account_holder_name.trim(),
          account_number: formData.payout_details.account_number.trim(),
          ifsc_code: formData.payout_details.ifsc_code.toUpperCase().trim(),
          bank_name: formData.payout_details.bank_name.trim() || 'Indian Commercial Bank',
          cancelled_cheque_file: formData.payout_details.cancelled_cheque_file,
          penny_drop_verified: formData.payout_details.penny_drop_verified,
          beneficiary_name: formData.payout_details.account_holder_name.trim(),
        },
        pan_number: formData.pan_number.toUpperCase().trim(),
        pan_name: formData.pan_name.trim(),
        pan_verified: formData.pan_verified,
        gstin: formData.gstin ? formData.gstin.toUpperCase().trim() : null,
        gst_exempt: formData.gst_exempt,
        gstin_verified: formData.gstin_verified,
        government_id_type: formData.government_id_type,
        government_id_number: formData.government_id_number.trim(),
        government_id_file: formData.government_id_file,
        registered_address: formData.registered_address,
        address_proof_type: formData.address_proof_type,
        address_proof_file: formData.address_proof_file,
        phone_verified: formData.phone_verified,
        email_verified: formData.email_verified,
        pickup_address: formData.pickup_address.same_as_registered
          ? formData.registered_address
          : formData.pickup_address,
        return_address: formData.return_address.same_as_pickup
          ? formData.pickup_address
          : formData.return_address,
        agreement_accepted: formData.agreement_accepted,
        commission_accepted: formData.commission_accepted,
        dpdp_consent_accepted: formData.dpdp_consent_accepted,
      };

      // Validate against shared schema
      OwnerApplicationSchema.parse(payload);

      // Submit to backend if authenticated
      if (token) {
        await fetch('/api/sellers/apply', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ ...payload, turnstileToken }),
        }).catch(() => null);
      }

      const generatedRef = `SEL-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`;
      setApplicationRef(generatedRef);
      setSubmitted(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err: any) {
      setErrors({ submit: err.message || 'Failed to submit seller application' });
    } finally {
      setIsSubmitting(false);
    }
  };

  // SUCCESS CONFIRMATION SCREEN
  if (submitted) {
    return (
      <div className="container mx-auto max-w-2xl px-4 py-16">
        <div className="rounded-3xl border border-emerald-200 bg-white p-8 sm:p-10 shadow-lg dark:border-emerald-900/60 dark:bg-slate-900 text-center space-y-6">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-emerald-100 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400 shadow-md shadow-emerald-500/10">
            <CheckCircle2 className="h-10 w-10" />
          </div>

          <div className="space-y-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3.5 py-1 text-xs font-bold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
              <Sparkles className="h-3.5 w-3.5" />
              Application Submitted Successfully
            </span>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
              Welcome to Shop:Sell Merchant Program
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-300 max-w-lg mx-auto">
              Your application for{' '}
              <strong className="text-slate-900 dark:text-white">{formData.business_name}</strong> has
              been received and is under compliance verification.
            </p>
          </div>

          {/* Application Receipt Details */}
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 dark:border-slate-800 dark:bg-slate-800/60 text-left space-y-3.5 text-xs">
            <div className="flex justify-between items-center border-b border-slate-200 pb-2.5 dark:border-slate-700">
              <span className="text-slate-500">Application Reference ID</span>
              <span className="font-mono font-bold text-slate-900 dark:text-white">
                {applicationRef}
              </span>
            </div>

            <div className="flex justify-between items-center border-b border-slate-200 pb-2.5 dark:border-slate-700">
              <span className="text-slate-500">Seller Entity Type</span>
              <span className="font-semibold capitalize text-slate-900 dark:text-white">
                {formData.business_type.replace('_', ' ')}
              </span>
            </div>

            <div className="flex justify-between items-center border-b border-slate-200 pb-2.5 dark:border-slate-700">
              <span className="text-slate-500">PAN Verification</span>
              <span className="inline-flex items-center gap-1 font-semibold text-emerald-600 dark:text-emerald-400">
                <Check className="h-3.5 w-3.5" /> {formData.pan_number.toUpperCase()} (Matched)
              </span>
            </div>

            <div className="flex justify-between items-center border-b border-slate-200 pb-2.5 dark:border-slate-700">
              <span className="text-slate-500">GST Registration</span>
              <span className="font-semibold text-slate-900 dark:text-white">
                {formData.gst_exempt ? 'Exempted (< ₹40L)' : formData.gstin.toUpperCase()}
              </span>
            </div>

            <div className="flex justify-between items-center border-b border-slate-200 pb-2.5 dark:border-slate-700">
              <span className="text-slate-500">Bank Penny-Drop Check</span>
              <span className="inline-flex items-center gap-1 font-semibold text-emerald-600 dark:text-emerald-400">
                <Check className="h-3.5 w-3.5" /> {formData.payout_details.ifsc_code} (Active)
              </span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-slate-500">Review Timeline</span>
              <span className="font-bold text-[#059669] dark:text-emerald-400">
                Estimated 24 - 48 business hours
              </span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <Link
              href="/account"
              className="w-full sm:w-auto rounded-2xl bg-[#059669] px-6 py-3 text-xs font-bold text-white shadow-md shadow-[#059669]/30 hover:bg-[#047857] transition"
            >
              Go to Account Profile
            </Link>
            <Link
              href="/"
              className="w-full sm:w-auto rounded-2xl border border-slate-200 bg-white px-6 py-3 text-xs font-bold text-slate-700 hover:bg-slate-50 transition dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            >
              Return to Marketplace
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-3xl px-4 py-12">
      {/* Title & Onboarding Intro */}
      <div className="mb-10 text-center space-y-3">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#059669] text-white shadow-lg shadow-emerald-950/20">
          <Store className="h-7 w-7" />
        </div>
        <h1 className="text-3xl font-black tracking-tight text-slate-900 sm:text-4xl dark:text-white">
          Become a Seller on Shop:Sell
        </h1>
        <p className="mx-auto max-w-xl text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
          Provide your legal business registration, tax identities, banking credentials, and
          pickup logistics to activate your merchant store and sell across India.
        </p>
      </div>

      {isSeller && (
        <div className="mb-8 rounded-3xl border border-emerald-200 bg-emerald-50/90 p-6 shadow-sm dark:border-emerald-900/60 dark:bg-emerald-950/40">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-600 text-white font-bold shadow-md shadow-emerald-600/20">
                <Check className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-emerald-950 dark:text-emerald-200">
                  Approved Merchant Account Active
                </h3>
                <p className="text-xs text-emerald-700 dark:text-emerald-400 mt-0.5">
                  {user?.email || 'Your account'} is fully approved by admin with active store access.
                </p>
              </div>
            </div>
            <Link
              href="/seller"
              className="rounded-2xl bg-emerald-600 px-5 py-2.5 text-xs font-bold text-white shadow-md hover:bg-emerald-700 transition"
            >
              Open Seller Dashboard →
            </Link>
          </div>
        </div>
      )}

      {errors.submit && (
        <div className="mb-6 flex items-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs font-semibold text-rose-800 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{errors.submit}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-8" noValidate>
        {/* SECTION 1: BUSINESS & SELLER TYPE */}
        <div className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-5">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-4 dark:border-slate-800">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-100 text-[#047857] dark:bg-emerald-950/60 dark:text-emerald-400 font-bold text-xs">
              1
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Business & Entity Information
              </h2>
              <p className="text-xs text-slate-500">Legal name and constitutional seller entity</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-900 dark:text-slate-200 mb-1">
                Full Name or Legal Business Name *
              </label>
              <input
                type="text"
                required
                value={formData.business_name}
                onChange={(e) => setFormData({ ...formData, business_name: e.target.value })}
                placeholder="e.g. Acme Crafts Private Limited / Rajesh Sharma"
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:border-[#059669] focus:bg-white dark:border-slate-700 dark:bg-slate-800 dark:text-white transition"
              />
              {errors.business_name && (
                <p className="mt-1 text-xs text-rose-500">{errors.business_name}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-900 dark:text-slate-200 mb-1">
                Seller Type *
              </label>
              <select
                value={formData.business_type}
                onChange={(e) => setFormData({ ...formData, business_type: e.target.value })}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:border-[#059669] focus:bg-white dark:border-slate-700 dark:bg-slate-800 dark:text-white transition"
              >
                <option value="individual">Individual / Artisan</option>
                <option value="proprietorship">Sole Proprietorship</option>
                <option value="partnership">Partnership Firm</option>
                <option value="llp">Limited Liability Partnership (LLP)</option>
                <option value="company">Private / Public Limited Company</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-900 dark:text-slate-200 mb-1">
                Store Display Name (Trade Name)
              </label>
              <input
                type="text"
                value={formData.store_name}
                onChange={(e) => setFormData({ ...formData, store_name: e.target.value })}
                placeholder="Brand name shown to shoppers"
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:border-[#059669] focus:bg-white dark:border-slate-700 dark:bg-slate-800 dark:text-white transition"
              />
            </div>
          </div>
        </div>

        {/* SECTION 2: PAN & GSTIN VERIFICATION */}
        <div className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-5">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-4 dark:border-slate-800">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-100 text-[#047857] dark:bg-emerald-950/60 dark:text-emerald-400 font-bold text-xs">
              2
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Tax Identifiers (PAN & GSTIN)
              </h2>
              <p className="text-xs text-slate-500">
                Government tax registrations with real-time verification
              </p>
            </div>
          </div>

          {/* PAN Input & Verification */}
          <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-800/40 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-900 dark:text-white">
                Permanent Account Number (PAN) *
              </span>
              {formData.pan_verified && (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-bold text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                  <Check className="h-3 w-3" /> PAN Verified
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <input
                  type="text"
                  maxLength={10}
                  value={formData.pan_number}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      pan_number: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''),
                      pan_verified: false,
                    })
                  }
                  placeholder="e.g. ABCDE1234F"
                  className="w-full font-mono uppercase rounded-2xl border border-slate-200 bg-white px-3.5 py-2 text-sm text-slate-900 outline-none focus:border-[#059669] dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                />
                {errors.pan_number && (
                  <p className="mt-1 text-xs text-rose-500">{errors.pan_number}</p>
                )}
              </div>

              <div>
                <input
                  type="text"
                  value={formData.pan_name}
                  onChange={(e) =>
                    setFormData({ ...formData, pan_name: e.target.value, pan_verified: false })
                  }
                  placeholder="Name exactly as on PAN Card"
                  className="w-full rounded-2xl border border-slate-200 bg-white px-3.5 py-2 text-sm text-slate-900 outline-none focus:border-[#059669] dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                />
                {errors.pan_name && (
                  <p className="mt-1 text-xs text-rose-500">{errors.pan_name}</p>
                )}
              </div>
            </div>

            <button
              type="button"
              disabled={isVerifyingPan || formData.pan_verified}
              onClick={handleVerifyPan}
              className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-50 dark:bg-slate-800 dark:hover:bg-slate-700 transition"
            >
              {isVerifyingPan ? (
                <span>Verifying against NSDL records...</span>
              ) : formData.pan_verified ? (
                <>
                  <Check className="h-3.5 w-3.5 text-emerald-400" />
                  <span>Name Verified with Tax Registry</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="h-3.5 w-3.5" />
                  <span>Verify PAN against Name</span>
                </>
              )}
            </button>
          </div>

          {/* GSTIN Input & Exemption */}
          <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-800/40 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-900 dark:text-white">
                GSTIN (Goods and Services Tax Identification Number)
              </span>
              {formData.gstin_verified && (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-bold text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                  <Check className="h-3 w-3" /> GST Portal Verified
                </span>
              )}
            </div>

            <div>
              <input
                type="text"
                maxLength={15}
                disabled={formData.gst_exempt}
                value={formData.gstin}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    gstin: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''),
                    gstin_verified: false,
                  })
                }
                placeholder={formData.gst_exempt ? 'Exempted from GST' : '29ABCDE1234F1Z5'}
                className="w-full font-mono uppercase rounded-2xl border border-slate-200 bg-white px-3.5 py-2 text-sm text-slate-900 outline-none focus:border-[#059669] disabled:bg-slate-100 disabled:text-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              />
              {errors.gstin && <p className="mt-1 text-xs text-rose-500">{errors.gstin}</p>}
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.gst_exempt}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      gst_exempt: e.target.checked,
                      gstin_verified: e.target.checked,
                    })
                  }
                  className="h-4 w-4 rounded border-slate-300 text-[#059669] focus:ring-[#059669]"
                />
                <span className="text-xs text-slate-600 dark:text-slate-300">
                  I claim GST threshold exemption (&lt; ₹40L turnover)
                </span>
              </label>

              {!formData.gst_exempt && (
                <button
                  type="button"
                  disabled={isVerifyingGst || formData.gstin_verified}
                  onClick={handleVerifyGst}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-50 dark:bg-slate-800 dark:hover:bg-slate-700 transition"
                >
                  {isVerifyingGst ? (
                    <span>Validating GSTIN...</span>
                  ) : formData.gstin_verified ? (
                    <>
                      <Check className="h-3.5 w-3.5 text-emerald-400" />
                      <span>Verified on GST Portal</span>
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="h-3.5 w-3.5" />
                      <span>Verify on GST Portal</span>
                    </>
                  )}
                </button>
              )}
            </div>

            {formData.gst_exempt && (
              <div className="flex items-start gap-2 rounded-xl bg-amber-50 p-2.5 text-[11px] text-amber-800 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900">
                <Info className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                <span>
                  Notice: Under Section 24 of the CGST Act, exemptions for e-commerce suppliers are
                  narrow and restricted to intra-state supply. Please check with your CA.
                </span>
              </div>
            )}
          </div>
        </div>

        {/* SECTION 3: GOVERNMENT ID OF OWNER / SIGNATORY */}
        <div className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-5">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-4 dark:border-slate-800">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-100 text-[#047857] dark:bg-emerald-950/60 dark:text-emerald-400 font-bold text-xs">
              3
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Government ID of Owner / Authorized Signatory
              </h2>
              <p className="text-xs text-slate-500">
                Official photo identity document (Aadhaar, passport, or voter ID)
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-900 dark:text-slate-200 mb-1">
                ID Type *
              </label>
              <select
                value={formData.government_id_type}
                onChange={(e) =>
                  setFormData({ ...formData, government_id_type: e.target.value })
                }
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:border-[#059669] focus:bg-white dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              >
                <option value="aadhaar">Aadhaar Card (UIDAI)</option>
                <option value="passport">Passport</option>
                <option value="voter_id">Voter ID (Election Commission)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-900 dark:text-slate-200 mb-1">
                ID Number *
              </label>
              <input
                type="text"
                required
                value={formData.government_id_number}
                onChange={(e) =>
                  setFormData({ ...formData, government_id_number: e.target.value })
                }
                placeholder={
                  formData.government_id_type === 'aadhaar'
                    ? '12-digit Aadhaar Number'
                    : 'Official document ID number'
                }
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:border-[#059669] focus:bg-white dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
              {errors.government_id_number && (
                <p className="mt-1 text-xs text-rose-500">{errors.government_id_number}</p>
              )}
            </div>
          </div>

          {/* Document Upload */}
          <div>
            <label className="block text-xs font-bold text-slate-900 dark:text-slate-200 mb-1.5">
              Upload Front & Back Copy (PDF / JPG / PNG max 5MB)
            </label>
            <div className="relative rounded-2xl border-2 border-dashed border-slate-200 p-4 text-center hover:border-[#059669] transition dark:border-slate-700">
              <input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    setFormData({ ...formData, government_id_file: file.name });
                  }
                }}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <div className="flex flex-col items-center gap-1.5">
                <UploadCloud className="h-6 w-6 text-slate-400" />
                <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                  {formData.government_id_file ? (
                    <span className="text-emerald-600 font-bold flex items-center gap-1">
                      <Check className="h-3.5 w-3.5" /> {formData.government_id_file} attached
                    </span>
                  ) : (
                    'Click to upload government ID file or drag & drop'
                  )}
                </span>
                <span className="text-[10px] text-slate-400">PDF, JPG, or PNG up to 5 MB</span>
              </div>
            </div>
          </div>
        </div>

        {/* SECTION 4: REGISTERED BUSINESS ADDRESS WITH PROOF */}
        <div className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-5">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-4 dark:border-slate-800">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-100 text-[#047857] dark:bg-emerald-950/60 dark:text-emerald-400 font-bold text-xs">
              4
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Registered Business Address with Proof
              </h2>
              <p className="text-xs text-slate-500">
                Official address supported by utility bill or lease agreement
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-900 dark:text-slate-200 mb-1">
                Flat / Door / Building / Plot No. *
              </label>
              <input
                type="text"
                required
                value={formData.registered_address.address_line1}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    registered_address: {
                      ...formData.registered_address,
                      address_line1: e.target.value,
                    },
                  })
                }
                placeholder="e.g. Unit 402, Prestige Tech Park"
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:border-[#059669] focus:bg-white dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
              {errors['registered_address.address_line1'] && (
                <p className="mt-1 text-xs text-rose-500">
                  {errors['registered_address.address_line1']}
                </p>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-900 dark:text-slate-200 mb-1">
                  Street / Area / Locality
                </label>
                <input
                  type="text"
                  value={formData.registered_address.address_line2}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      registered_address: {
                        ...formData.registered_address,
                        address_line2: e.target.value,
                      },
                    })
                  }
                  placeholder="Outer Ring Road, Kadubeesanahalli"
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:border-[#059669] focus:bg-white dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-900 dark:text-slate-200 mb-1">
                  Landmark (Optional)
                </label>
                <input
                  type="text"
                  value={formData.registered_address.landmark}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      registered_address: {
                        ...formData.registered_address,
                        landmark: e.target.value,
                      },
                    })
                  }
                  placeholder="Opposite Cessna Business Park"
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:border-[#059669] focus:bg-white dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-900 dark:text-slate-200 mb-1">
                  City *
                </label>
                <input
                  type="text"
                  required
                  value={formData.registered_address.city}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      registered_address: {
                        ...formData.registered_address,
                        city: e.target.value,
                      },
                    })
                  }
                  placeholder="Bengaluru"
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:border-[#059669] focus:bg-white dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
                {errors['registered_address.city'] && (
                  <p className="mt-1 text-xs text-rose-500">
                    {errors['registered_address.city']}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-900 dark:text-slate-200 mb-1">
                  State *
                </label>
                <select
                  value={formData.registered_address.state}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      registered_address: {
                        ...formData.registered_address,
                        state: e.target.value,
                      },
                    })
                  }
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:border-[#059669] focus:bg-white dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                >
                  {INDIAN_STATES.map((st) => (
                    <option key={st} value={st}>
                      {st}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-900 dark:text-slate-200 mb-1">
                  6-Digit Pincode *
                </label>
                <input
                  type="text"
                  maxLength={6}
                  required
                  value={formData.registered_address.pincode}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      registered_address: {
                        ...formData.registered_address,
                        pincode: e.target.value.replace(/\D/g, ''),
                      },
                    })
                  }
                  placeholder="560103"
                  className="w-full font-mono rounded-2xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:border-[#059669] focus:bg-white dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
                {errors['registered_address.pincode'] && (
                  <p className="mt-1 text-xs text-rose-500">
                    {errors['registered_address.pincode']}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-900 dark:text-slate-200 mb-1">
                  Address Proof Type *
                </label>
                <select
                  value={formData.address_proof_type}
                  onChange={(e) =>
                    setFormData({ ...formData, address_proof_type: e.target.value })
                  }
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:border-[#059669] focus:bg-white dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                >
                  <option value="utility_bill">Electricity / Water / Gas Bill (&lt; 2 mo)</option>
                  <option value="rent_agreement">Registered Rent / Lease Agreement</option>
                  <option value="property_tax">Municipal Property Tax Receipt</option>
                </select>
              </div>
            </div>

            {/* Address Proof File Upload */}
            <div className="relative rounded-2xl border-2 border-dashed border-slate-200 p-4 text-center hover:border-[#059669] transition dark:border-slate-700">
              <input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    setFormData({ ...formData, address_proof_file: file.name });
                  }
                }}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <div className="flex flex-col items-center gap-1">
                <FileText className="h-6 w-6 text-slate-400" />
                <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                  {formData.address_proof_file ? (
                    <span className="text-emerald-600 font-bold flex items-center gap-1">
                      <Check className="h-3.5 w-3.5" /> {formData.address_proof_file} attached
                    </span>
                  ) : (
                    'Upload Address Proof Document (Utility Bill or Rent Agreement)'
                  )}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* SECTION 5: VERIFIED MOBILE & EMAIL (OTP) */}
        <div className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-5">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-4 dark:border-slate-800">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-100 text-[#047857] dark:bg-emerald-950/60 dark:text-emerald-400 font-bold text-xs">
              5
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Contact Verification (Mobile & Email OTP)
              </h2>
              <p className="text-xs text-slate-500">
                Verified communication channels for order dispatches and payouts
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Mobile */}
            <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-800/40 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900 dark:text-white">
                  Mobile Number *
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                  <Check className="h-3 w-3" /> OTP Verified
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
                  +91
                </span>
                <input
                  type="text"
                  value={formData.contact_phone}
                  onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })}
                  placeholder="9876543210"
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-[#059669] dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                />
              </div>
            </div>

            {/* Email */}
            <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-800/40 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900 dark:text-white">
                  Business Email *
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                  <Check className="h-3 w-3" /> OTP Verified
                </span>
              </div>
              <input
                type="email"
                value={formData.contact_email}
                onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })}
                placeholder="seller@yourstore.in"
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-[#059669] dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              />
            </div>
          </div>
        </div>

        {/* SECTION 6: BANK ACCOUNT, CANCELLED CHEQUE & PENNY-DROP */}
        <div className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-5">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-4 dark:border-slate-800">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-100 text-[#047857] dark:bg-emerald-950/60 dark:text-emerald-400 font-bold text-xs">
              6
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Bank Account & Penny-Drop Verification
              </h2>
              <p className="text-xs text-slate-500">
                Direct IMPS verification for automated daily sales transfers
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-emerald-100 bg-emerald-50/50 p-4 dark:border-emerald-950 dark:bg-emerald-950/20 text-xs text-emerald-900 dark:text-emerald-300 flex items-start gap-2">
            <Info className="h-4 w-4 shrink-0 mt-0.5" />
            <span>
              <strong>Crucial:</strong> The bank account must be in the identical legal name as
              registered on the PAN card or business certificate. Razorpay will execute an instant
              ₹1 penny-drop validation before approval.
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-900 dark:text-slate-200 mb-1">
                Account Holder Name (as on PAN) *
              </label>
              <input
                type="text"
                required
                value={formData.payout_details.account_holder_name}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    payout_details: {
                      ...formData.payout_details,
                      account_holder_name: e.target.value,
                      penny_drop_verified: false,
                    },
                  })
                }
                placeholder="e.g. Acme Crafts Pvt Ltd"
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:border-[#059669] focus:bg-white dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
              {errors['payout_details.account_holder_name'] && (
                <p className="mt-1 text-xs text-rose-500">
                  {errors['payout_details.account_holder_name']}
                </p>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-900 dark:text-slate-200 mb-1">
                Bank Name *
              </label>
              <input
                type="text"
                required
                value={formData.payout_details.bank_name}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    payout_details: {
                      ...formData.payout_details,
                      bank_name: e.target.value,
                    },
                  })
                }
                placeholder="e.g. HDFC Bank, ICICI Bank, SBI"
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:border-[#059669] focus:bg-white dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-900 dark:text-slate-200 mb-1">
                Bank Account Number *
              </label>
              <input
                type="text"
                required
                value={formData.payout_details.account_number}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    payout_details: {
                      ...formData.payout_details,
                      account_number: e.target.value.replace(/\D/g, ''),
                      penny_drop_verified: false,
                    },
                  })
                }
                placeholder="10 - 18 digit account number"
                className="w-full font-mono rounded-2xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:border-[#059669] focus:bg-white dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
              {errors['payout_details.account_number'] && (
                <p className="mt-1 text-xs text-rose-500">
                  {errors['payout_details.account_number']}
                </p>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-900 dark:text-slate-200 mb-1">
                Re-enter Bank Account Number *
              </label>
              <input
                type="text"
                required
                value={formData.payout_details.confirm_account_number}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    payout_details: {
                      ...formData.payout_details,
                      confirm_account_number: e.target.value.replace(/\D/g, ''),
                      penny_drop_verified: false,
                    },
                  })
                }
                placeholder="Confirm account number"
                className="w-full font-mono rounded-2xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:border-[#059669] focus:bg-white dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
              {errors['payout_details.confirm_account_number'] && (
                <p className="mt-1 text-xs text-rose-500">
                  {errors['payout_details.confirm_account_number']}
                </p>
              )}
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-900 dark:text-slate-200 mb-1">
                IFSC Code *
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  maxLength={11}
                  required
                  value={formData.payout_details.ifsc_code}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      payout_details: {
                        ...formData.payout_details,
                        ifsc_code: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''),
                        penny_drop_verified: false,
                      },
                    })
                  }
                  placeholder="e.g. HDFC0001234"
                  className="w-full font-mono uppercase rounded-2xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:border-[#059669] focus:bg-white dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />

                <button
                  type="button"
                  disabled={isVerifyingPennyDrop || formData.payout_details.penny_drop_verified}
                  onClick={handlePennyDrop}
                  className="shrink-0 rounded-2xl bg-[#059669] px-4 py-2.5 text-xs font-bold text-white hover:bg-[#047857] disabled:opacity-50 transition shadow-sm"
                >
                  {isVerifyingPennyDrop ? (
                    'Executing IMPS ₹1 test...'
                  ) : formData.payout_details.penny_drop_verified ? (
                    <span className="flex items-center gap-1">
                      <Check className="h-4 w-4 text-emerald-300" />
                      Penny-Drop Verified
                    </span>
                  ) : (
                    'Verify Penny-Drop'
                  )}
                </button>
              </div>
              {errors['payout_details.ifsc_code'] && (
                <p className="mt-1 text-xs text-rose-500">{errors['payout_details.ifsc_code']}</p>
              )}
            </div>
          </div>

          {/* Cancelled Cheque Upload */}
          <div>
            <label className="block text-xs font-bold text-slate-900 dark:text-slate-200 mb-1.5">
              Upload Cancelled Cheque or Bank Passbook Front Page
            </label>
            <div className="relative rounded-2xl border-2 border-dashed border-slate-200 p-4 text-center hover:border-[#059669] transition dark:border-slate-700">
              <input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    setFormData({
                      ...formData,
                      payout_details: {
                        ...formData.payout_details,
                        cancelled_cheque_file: file.name,
                      },
                    });
                  }
                }}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <div className="flex flex-col items-center gap-1">
                <CreditCard className="h-6 w-6 text-slate-400" />
                <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                  {formData.payout_details.cancelled_cheque_file ? (
                    <span className="text-emerald-600 font-bold flex items-center gap-1">
                      <Check className="h-3.5 w-3.5" />{' '}
                      {formData.payout_details.cancelled_cheque_file} attached
                    </span>
                  ) : (
                    'Click to upload Cancelled Cheque (Must show name & account number)'
                  )}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* SECTION 7: PICKUP & RETURN ADDRESS */}
        <div className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-5">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-4 dark:border-slate-800">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-100 text-[#047857] dark:bg-emerald-950/60 dark:text-emerald-400 font-bold text-xs">
              7
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Logistics: Pickup & Return Address
              </h2>
              <p className="text-xs text-slate-500">
                Where logistics partners collect orders and return customer shipments
              </p>
            </div>
          </div>

          {/* Pickup Address */}
          <div className="space-y-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.pickup_address.same_as_registered}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    pickup_address: {
                      ...formData.pickup_address,
                      same_as_registered: e.target.checked,
                    },
                  })
                }
                className="h-4 w-4 rounded border-slate-300 text-[#059669] focus:ring-[#059669]"
              />
              <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                Pickup address is identical to Registered Business Address
              </span>
            </label>

            {!formData.pickup_address.same_as_registered && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <div className="sm:col-span-2">
                  <input
                    type="text"
                    placeholder="Warehouse / Dispatch Hub Street Address"
                    value={formData.pickup_address.address_line1}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        pickup_address: {
                          ...formData.pickup_address,
                          address_line1: e.target.value,
                        },
                      })
                    }
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>
                <div>
                  <input
                    type="text"
                    placeholder="City"
                    value={formData.pickup_address.city}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        pickup_address: {
                          ...formData.pickup_address,
                          city: e.target.value,
                        },
                      })
                    }
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>
                <div>
                  <input
                    type="text"
                    maxLength={6}
                    placeholder="6-digit Pincode"
                    value={formData.pickup_address.pincode}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        pickup_address: {
                          ...formData.pickup_address,
                          pincode: e.target.value.replace(/\D/g, ''),
                        },
                      })
                    }
                    className="w-full font-mono rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Return Address */}
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.return_address.same_as_pickup}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    return_address: {
                      ...formData.return_address,
                      same_as_pickup: e.target.checked,
                    },
                  })
                }
                className="h-4 w-4 rounded border-slate-300 text-[#059669] focus:ring-[#059669]"
              />
              <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                Customer Return (RTO) address is identical to Pickup address
              </span>
            </label>
          </div>
        </div>

        {/* SECTION 8: SELLER AGREEMENT, COMMISSION TERMS & DPDP CONSENT */}
        <div className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-5">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-4 dark:border-slate-800">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-100 text-[#047857] dark:bg-emerald-950/60 dark:text-emerald-400 font-bold text-xs">
              8
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Legal Agreements & Data Protection Consent
              </h2>
              <p className="text-xs text-slate-500">
                Mandatory marketplace policies and statutory consent under DPDP Act 2023
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.agreement_accepted}
                onChange={(e) =>
                  setFormData({ ...formData, agreement_accepted: e.target.checked })
                }
                className="mt-0.5 h-4 w-4 rounded border-slate-300 text-[#059669] focus:ring-[#059669]"
              />
              <span className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                <strong>Seller Master Services Agreement:</strong> I agree to the Shop:Sell Merchant
                Terms of Service, Seller Code of Conduct, prohibited goods policy, and intellectual
                property guidelines.
              </span>
            </label>
            {errors.agreement_accepted && (
              <p className="text-xs text-rose-500 ml-7">{errors.agreement_accepted}</p>
            )}

            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.commission_accepted}
                onChange={(e) =>
                  setFormData({ ...formData, commission_accepted: e.target.checked })
                }
                className="mt-0.5 h-4 w-4 rounded border-slate-300 text-[#059669] focus:ring-[#059669]"
              />
              <span className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                <strong>Commission & Settlement Terms:</strong> I accept the Category Commission
                Schedule, payment settlement timelines (T+2 Days), and customer return / RTO freight
                recovery deductions.
              </span>
            </label>
            {errors.commission_accepted && (
              <p className="text-xs text-rose-500 ml-7">{errors.commission_accepted}</p>
            )}

            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.dpdp_consent_accepted}
                onChange={(e) =>
                  setFormData({ ...formData, dpdp_consent_accepted: e.target.checked })
                }
                className="mt-0.5 h-4 w-4 rounded border-slate-300 text-[#059669] focus:ring-[#059669]"
              />
              <span className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                <strong>DPDP Act 2023 Consent:</strong> I hereby give explicit consent for Shop:Sell
                to process, verify, and store my personal and entity KYC records (PAN, Aadhaar/ID,
                GSTIN, Bank Details) strictly for regulatory compliance, anti-fraud evaluation, and
                settlement processing.
              </span>
            </label>
            {errors.dpdp_consent_accepted && (
              <p className="text-xs text-rose-500 ml-7">{errors.dpdp_consent_accepted}</p>
            )}
          </div>
        </div>

        {/* Cloudflare Turnstile Verification */}
        <div className="flex justify-center my-4">
          <Turnstile
            siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || '1x00000000000000000000AA'}
            onSuccess={(token) => setTurnstileToken(token)}
            onError={() => setTurnstileToken('')}
            onExpire={() => setTurnstileToken('')}
          />
        </div>

        {/* SUBMIT BUTTON */}
        <div className="pt-2">
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#059669] py-4 text-sm font-bold text-white shadow-xl shadow-[#059669]/30 hover:bg-[#047857] transition disabled:opacity-60"
          >
            {isSubmitting ? (
              <LoadingThreeDotsJumping
                size={6}
                jumpHeight={8}
                gap={4}
                color="#FFFFFF"
                label="Verifying credentials & submitting"
              />
            ) : (
              <>
                <Store className="h-4 w-4" />
                <span>Submit Merchant Application</span>
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
