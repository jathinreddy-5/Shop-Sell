'use client';

import React, { useState } from 'react';
import { Store, CheckCircle2, AlertCircle } from 'lucide-react';
import { OwnerApplicationSchema } from '@shop-sell/shared';
import { useAuth } from '@/lib/auth/auth-context';
import { LoadingThreeDotsJumping } from '@/components/loading';

export default function BecomeASellerPage() {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    business_name: '',
    business_type: 'sole_proprietorship',
    tax_id: '',
    payout_details: {
      account_holder_name: '',
      account_number: '',
      ifsc_code: '',
      bank_name: '',
      upi_id: '',
    },
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const result = OwnerApplicationSchema.safeParse(formData);
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of result.error.issues) {
        fieldErrors[issue.path.join('.')] = issue.message;
      }
      setErrors(fieldErrors);
      return;
    }

    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      setSubmitted(true);
    }, 400);
  };

  if (submitted) {
    return (
      <div className="container mx-auto max-w-xl px-4 py-16 text-center">
        <div className="rounded-2xl border border-emerald-200 bg-white p-8 shadow-sm dark:border-emerald-900 dark:bg-slate-900">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400">
            <CheckCircle2 className="h-8 w-8" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
            Application Submitted!
          </h2>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
            Thank you for applying to sell on Shop:Sell. Your application for{' '}
            <strong className="text-slate-900 dark:text-white">{formData.business_name}</strong> is currently{' '}
            <span className="font-semibold text-amber-600">Pending Review</span> by our administration team.
          </p>
          <div className="mt-6 rounded-lg bg-slate-50 p-4 text-xs text-slate-500 dark:bg-slate-800">
            Once approved, your account will receive the <strong>Owner</strong> role and your store will become active.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-2xl px-4 py-12">
      <div className="mb-8 text-center">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-100 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-400">
          <Store className="h-6 w-6" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl dark:text-white">
          Become a Seller on Shop:Sell
        </h1>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
          Reach millions of buyers across India with automated inventory management, fast payouts, and advanced analytics.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="space-y-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900"
      >
        {/* Business Info */}
        <div className="space-y-4">
          <h3 className="text-base font-semibold text-slate-900 dark:text-white">
            1. Business Information
          </h3>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
              Business Name *
            </label>
            <input
              type="text"
              required
              value={formData.business_name}
              onChange={(e) =>
                setFormData({ ...formData, business_name: e.target.value })
              }
              placeholder="e.g. Apex Artisanal Handicrafts"
              className="mt-1 w-full rounded-lg border border-slate-300 px-3.5 py-2 text-sm outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 dark:border-slate-700 dark:bg-slate-800"
            />
            {errors['business_name'] && (
              <p className="mt-1 text-xs text-rose-500">{errors['business_name']}</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
              Business Type *
            </label>
            <select
              value={formData.business_type}
              onChange={(e) =>
                setFormData({ ...formData, business_type: e.target.value })
              }
              className="mt-1 w-full rounded-lg border border-slate-300 px-3.5 py-2 text-sm outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 dark:border-slate-700 dark:bg-slate-800"
            >
              <option value="sole_proprietorship">Sole Proprietorship</option>
              <option value="individual">Individual / Artisan</option>
              <option value="llp">Limited Liability Partnership (LLP)</option>
              <option value="pvt_ltd">Private Limited Company</option>
              <option value="partnership">Partnership Firm</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
              GST / Tax ID (Optional)
            </label>
            <input
              type="text"
              value={formData.tax_id}
              onChange={(e) =>
                setFormData({ ...formData, tax_id: e.target.value })
              }
              placeholder="27AAAAA0000A1Z5"
              className="mt-1 w-full rounded-lg border border-slate-300 px-3.5 py-2 text-sm outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 dark:border-slate-700 dark:bg-slate-800"
            />
          </div>
        </div>

        {/* Payout & Banking Details */}
        <div className="space-y-4 border-t border-slate-200 pt-6 dark:border-slate-800">
          <h3 className="text-base font-semibold text-slate-900 dark:text-white">
            2. Payout & Bank Details (for Razorpay automated transfers)
          </h3>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Account Holder Name *
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
                    },
                  })
                }
                className="mt-1 w-full rounded-lg border border-slate-300 px-3.5 py-2 text-sm outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 dark:border-slate-700 dark:bg-slate-800"
              />
              {errors['payout_details.account_holder_name'] && (
                <p className="mt-1 text-xs text-rose-500">
                  {errors['payout_details.account_holder_name']}
                </p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
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
                placeholder="e.g. HDFC Bank, ICICI Bank"
                className="mt-1 w-full rounded-lg border border-slate-300 px-3.5 py-2 text-sm outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 dark:border-slate-700 dark:bg-slate-800"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Account Number *
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
                      account_number: e.target.value,
                    },
                  })
                }
                className="mt-1 w-full rounded-lg border border-slate-300 px-3.5 py-2 text-sm outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 dark:border-slate-700 dark:bg-slate-800"
              />
              {errors['payout_details.account_number'] && (
                <p className="mt-1 text-xs text-rose-500">
                  {errors['payout_details.account_number']}
                </p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                IFSC Code *
              </label>
              <input
                type="text"
                required
                value={formData.payout_details.ifsc_code}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    payout_details: {
                      ...formData.payout_details,
                      ifsc_code: e.target.value.toUpperCase(),
                    },
                  })
                }
                placeholder="HDFC0001234"
                className="mt-1 w-full rounded-lg border border-slate-300 px-3.5 py-2 text-sm uppercase outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 dark:border-slate-700 dark:bg-slate-800"
              />
              {errors['payout_details.ifsc_code'] && (
                <p className="mt-1 text-xs text-rose-500">
                  {errors['payout_details.ifsc_code']}
                </p>
              )}
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="flex w-full items-center justify-center rounded-xl bg-indigo-600 py-3 text-sm font-semibold text-white shadow-md shadow-indigo-600/20 transition hover:bg-indigo-700 disabled:opacity-50"
        >
          {isSubmitting ? (
            <LoadingThreeDotsJumping size={6} jumpHeight={8} gap={4} color="#FFFFFF" label="Submitting application" />
          ) : (
            'Submit Seller Application'
          )}
        </button>
      </form>
    </div>
  );
}
