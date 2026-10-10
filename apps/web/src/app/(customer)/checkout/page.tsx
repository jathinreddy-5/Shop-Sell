'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  ShieldCheck,
  CheckCircle2,
  ArrowRight,
  Package,
  MapPin,
  QrCode,
  Copy,
  Check,
  Clock,
  AlertCircle,
  Smartphone,
  ChevronRight,
} from 'lucide-react';
import { useAuth } from '@/lib/auth/auth-context';
import { useCart } from '@/lib/cart/cart-context';
import { LoadingThreeDotsJumping } from '@/components/loading';

const MERCHANT_UPI_ID = 'shopsell.merchant@icici';
const MERCHANT_NAME = 'Shop:Sell Marketplace';

export default function CheckoutPage() {
  const { user, token } = useAuth();
  const { items, subtotal, clearCart } = useCart();

  const deliveryCharge = subtotal > 999 || items.length === 0 ? 0 : 99;
  const grandTotal = subtotal > 0 ? subtotal + deliveryCharge : 4897;

  const [shippingAddress, setShippingAddress] = useState({
    full_name: 'Priya Sharma',
    phone: '9876543210',
    street: 'Flat 402, Green Glen Layout, Bellandur',
    city: 'Bengaluru',
    state: 'Karnataka',
    postal_code: '560103',
    country: 'India',
  });

  const [customerUpiId, setCustomerUpiId] = useState('');
  const [utrNumber, setUtrNumber] = useState('');
  const [copiedUpi, setCopiedUpi] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [completedOrder, setCompletedOrder] = useState<{
    orderId: string;
    total: number;
    utrNumber: string;
    utrStatus: string;
    upiId: string;
  } | null>(null);

  const upiIntentUrl = `upi://pay?pa=${MERCHANT_UPI_ID}&pn=${encodeURIComponent(MERCHANT_NAME)}&am=${grandTotal}&cu=INR&tn=ShopSell%20Order`;
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&margin=8&data=${encodeURIComponent(upiIntentUrl)}`;

  const handleCopyUpi = () => {
    navigator.clipboard.writeText(MERCHANT_UPI_ID);
    setCopiedUpi(true);
    setTimeout(() => setCopiedUpi(false), 2500);
  };

  const handlePlaceOrderWithUpi = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    // Validation
    const cleanUpi = customerUpiId.trim();
    if (!cleanUpi || !cleanUpi.includes('@')) {
      setFormError('Please enter a valid UPI ID (e.g. yourname@okhdfcbank or 9876543210@paytm).');
      return;
    }

    const cleanUtr = utrNumber.trim();
    if (!/^\d{12}$/.test(cleanUtr)) {
      setFormError('Please enter the exact 12-digit numeric UTR / UPI Reference ID from your payment receipt.');
      return;
    }

    setIsProcessing(true);

    try {
      const idempotencyKey = `idemp_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      const payload = {
        shipping_address: shippingAddress,
        idempotency_key: idempotencyKey,
        payment_method: 'upi',
        upi_id: cleanUpi,
        utr_number: cleanUtr,
        items: items.length > 0 ? items.map((i) => ({ productId: i.id, qty: i.qty })) : undefined,
      };

      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || data.error || 'Failed to place order');
      }

      clearCart();
      setCompletedOrder({
        orderId: data.orderId || `ORD-${Math.random().toString(36).substring(2, 8).toUpperCase()}-IN`,
        total: data.total || grandTotal,
        utrNumber: cleanUtr,
        utrStatus: data.utrStatus || 'pending_verification',
        upiId: cleanUpi,
      });
    } catch (err: any) {
      setFormError(err.message || 'An unexpected error occurred while placing your order.');
    } finally {
      setIsProcessing(false);
    }
  };

  if (!user) {
    return (
      <div className="container mx-auto max-w-lg px-4 py-20 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-50 text-[#059669] dark:bg-slate-800">
          <ShieldCheck className="h-8 w-8" />
        </div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">
          Sign In Required to Checkout
        </h2>
        <p className="mt-2 text-xs sm:text-sm text-slate-500">
          Please log in to your account to securely complete your payment and order dispatch.
        </p>
        <div className="mt-6 flex flex-col gap-3 max-w-xs mx-auto">
          <Link
            href="/login?redirect=/checkout"
            className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#059669] px-6 py-3 text-xs font-bold text-white shadow-sm hover:bg-[#047857]"
          >
            Sign In to Continue <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href="/cart"
            className="text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
          >
            Return to Cart
          </Link>
        </div>
      </div>
    );
  }

  // Awaiting Seller Verification / Completed Screen
  if (completedOrder) {
    return (
      <div className="container mx-auto max-w-xl px-4 py-16 text-center">
        <div className="rounded-3xl border border-amber-200 bg-white p-8 shadow-xl dark:border-amber-900/40 dark:bg-slate-900">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400">
            <Clock className="h-10 w-10 animate-pulse" />
          </div>

          <div className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
            <span className="h-2 w-2 rounded-full bg-amber-500 animate-ping" />
            Order Placed — Awaiting Seller UTR Verification
          </div>

          <h1 className="mt-3 text-2xl font-black tracking-tight text-slate-900 dark:text-white">
            Payment Submitted Successfully!
          </h1>
          <p className="mt-2 text-xs text-slate-500">
            Order Reference: <strong className="font-mono text-slate-800 dark:text-slate-200">{completedOrder.orderId}</strong>
          </p>

          {/* Details Card */}
          <div className="mt-6 rounded-2xl bg-slate-50 p-5 text-left text-xs space-y-3 dark:bg-slate-800/80 border border-slate-100 dark:border-slate-800">
            <div className="flex justify-between items-center">
              <span className="text-slate-500">Total Payable:</span>
              <span className="text-base font-black text-slate-900 dark:text-white">
                ₹{completedOrder.total.toLocaleString('en-IN')}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-500">Submitted UTR ID:</span>
              <span className="font-mono font-bold text-amber-800 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/50 px-2 py-0.5 rounded border border-amber-200 dark:border-amber-900/50">
                {completedOrder.utrNumber}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-500">Your UPI ID:</span>
              <span className="font-mono font-medium text-slate-700 dark:text-slate-300">
                {completedOrder.upiId}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-500">Merchant UPI:</span>
              <span className="font-mono font-medium text-[#059669]">
                {MERCHANT_UPI_ID}
              </span>
            </div>
            <div className="flex justify-between items-center border-t border-slate-200 dark:border-slate-700 pt-2">
              <span className="text-slate-500">Payment Status:</span>
              <span className="font-bold text-amber-700 dark:text-amber-400">
                Pending Seller Verification
              </span>
            </div>
          </div>

          {/* Verification Notice */}
          <div className="mt-4 rounded-xl bg-blue-50/70 p-3.5 text-left text-[11px] text-blue-800 dark:bg-blue-950/40 dark:text-blue-300 border border-blue-100 dark:border-blue-900/50 flex gap-2.5 items-start">
            <ShieldCheck className="h-4 w-4 shrink-0 text-blue-600 dark:text-blue-400 mt-0.5" />
            <div>
              <strong>What happens next?</strong> The seller verifies the submitted UTR ID against their bank feed. Once accepted, your payment will be marked as <strong>Completed</strong> and the order will immediately move to <strong>Confirmed & Dispatch</strong>.
            </div>
          </div>

          <div className="mt-6 flex flex-col gap-2.5">
            <Link
              href="/orders"
              className="flex items-center justify-center gap-1.5 rounded-xl bg-[#059669] py-3.5 text-xs font-bold text-white shadow-md shadow-emerald-950/20 hover:bg-[#047857]"
            >
              Track Order Status <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/"
              className="rounded-xl border border-slate-200 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300"
            >
              Back to Marketplace
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-5xl px-4 py-8">
      <div className="flex items-center gap-2 text-xs text-slate-500 mb-2">
        <Link href="/cart" className="hover:text-[#059669]">Cart</Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="text-slate-800 dark:text-slate-200 font-semibold">Checkout & UPI Payment</span>
      </div>

      <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
        Checkout & UPI Payment
      </h1>

      {formError && (
        <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs font-medium text-rose-800 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-300 flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
          <span>{formError}</span>
        </div>
      )}

      <form onSubmit={handlePlaceOrderWithUpi} className="mt-6 grid grid-cols-1 gap-8 lg:grid-cols-12">
        {/* Shipping Address Column */}
        <div className="space-y-6 lg:col-span-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="mb-4 flex items-center gap-2 text-base font-bold text-slate-900 dark:text-white">
              <MapPin className="h-5 w-5 text-[#059669]" />
              <span>1. Delivery Address</span>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={shippingAddress.full_name}
                  onChange={(e) =>
                    setShippingAddress({ ...shippingAddress, full_name: e.target.value })
                  }
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-xs outline-none focus:border-[#059669] focus:ring-1 focus:ring-[#059669]/20 dark:border-slate-700 dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300">
                  Phone Number *
                </label>
                <input
                  type="tel"
                  required
                  value={shippingAddress.phone}
                  onChange={(e) =>
                    setShippingAddress({ ...shippingAddress, phone: e.target.value })
                  }
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-xs outline-none focus:border-[#059669] focus:ring-1 focus:ring-[#059669]/20 dark:border-slate-700 dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block font-semibold text-slate-700 dark:text-slate-300">
                  Street Address & Flat / House *
                </label>
                <input
                  type="text"
                  required
                  value={shippingAddress.street}
                  onChange={(e) =>
                    setShippingAddress({ ...shippingAddress, street: e.target.value })
                  }
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-xs outline-none focus:border-[#059669] focus:ring-1 focus:ring-[#059669]/20 dark:border-slate-700 dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300">
                  City *
                </label>
                <input
                  type="text"
                  required
                  value={shippingAddress.city}
                  onChange={(e) =>
                    setShippingAddress({ ...shippingAddress, city: e.target.value })
                  }
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-xs outline-none focus:border-[#059669] focus:ring-1 focus:ring-[#059669]/20 dark:border-slate-700 dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300">
                  State *
                </label>
                <input
                  type="text"
                  required
                  value={shippingAddress.state}
                  onChange={(e) =>
                    setShippingAddress({ ...shippingAddress, state: e.target.value })
                  }
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-xs outline-none focus:border-[#059669] focus:ring-1 focus:ring-[#059669]/20 dark:border-slate-700 dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300">
                  PIN Code *
                </label>
                <input
                  type="text"
                  required
                  value={shippingAddress.postal_code}
                  onChange={(e) =>
                    setShippingAddress({
                      ...shippingAddress,
                      postal_code: e.target.value,
                    })
                  }
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-xs outline-none focus:border-[#059669] focus:ring-1 focus:ring-[#059669]/20 dark:border-slate-700 dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300">
                  Country
                </label>
                <input
                  type="text"
                  disabled
                  value="India"
                  className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-500 dark:border-slate-800 dark:bg-slate-800"
                />
              </div>
            </div>
          </div>

          {/* Cart Summary */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between mb-3">
              <span className="font-bold text-slate-900 dark:text-white text-sm">
                Order Items ({items.reduce((acc, i) => acc + i.qty, 0)} items)
              </span>
              <Link href="/cart" className="text-xs text-[#059669] hover:underline font-medium">
                Edit Cart
              </Link>
            </div>
            <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
              {items.map((item) => (
                <div key={item.id} className="py-2.5 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <img src={item.image} alt={item.name} className="h-10 w-10 rounded-lg object-cover" />
                    <div>
                      <div className="font-semibold text-slate-900 dark:text-white line-clamp-1">{item.name}</div>
                      <div className="text-[11px] text-slate-400">Qty: {item.qty}</div>
                    </div>
                  </div>
                  <div className="font-bold text-slate-900 dark:text-white">
                    ₹{(item.price * item.qty).toLocaleString('en-IN')}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 border-t border-slate-100 pt-3 space-y-1.5 text-xs dark:border-slate-800">
              <div className="flex justify-between text-slate-600 dark:text-slate-300">
                <span>Subtotal</span>
                <span>₹{subtotal.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between text-slate-600 dark:text-slate-300">
                <span>Delivery</span>
                <span className={deliveryCharge === 0 ? 'text-emerald-600 font-bold' : ''}>
                  {deliveryCharge === 0 ? 'FREE' : `₹${deliveryCharge}`}
                </span>
              </div>
              <div className="flex justify-between text-sm font-bold text-slate-900 dark:text-white border-t border-slate-100 dark:border-slate-800 pt-2">
                <span>Total Payable</span>
                <span className="text-[#059669] text-base">₹{grandTotal.toLocaleString('en-IN')}</span>
              </div>
            </div>
          </div>
        </div>

        {/* UPI Payment & Scanner Column */}
        <div className="space-y-6 lg:col-span-6">
          <div className="rounded-2xl border border-emerald-200 bg-white p-6 shadow-md dark:border-slate-800 dark:bg-slate-900">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2 text-base font-bold text-slate-900 dark:text-white">
                <QrCode className="h-5 w-5 text-[#059669]" />
                <span>2. Scan QR & UPI Payment</span>
              </div>
              <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-bold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">
                Instant UPI Transfer
              </span>
            </div>

            {/* QR Scanner Display */}
            <div className="rounded-2xl bg-gradient-to-b from-slate-50 to-emerald-50/30 p-5 text-center border border-slate-200/80 dark:from-slate-800/60 dark:to-slate-800/30 dark:border-slate-700">
              <div className="mx-auto w-fit p-3 bg-white rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700">
                <img
                  src={qrCodeUrl}
                  alt="UPI Payment QR Scanner"
                  className="h-44 w-44 rounded-lg object-contain mx-auto"
                />
              </div>

              <div className="mt-3">
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                  Scan with any UPI App to pay exact ₹{grandTotal.toLocaleString('en-IN')}
                </span>
                <span className="text-[11px] text-slate-500 mt-0.5 block">
                  Google Pay • PhonePe • Paytm • BHIM • Cred UPI
                </span>
              </div>

              {/* Merchant VPA & Copy Button */}
              <div className="mt-4 flex items-center justify-center gap-2 bg-white dark:bg-slate-900 py-2 px-3 rounded-xl border border-slate-200 dark:border-slate-700 max-w-xs mx-auto">
                <Smartphone className="h-4 w-4 text-[#059669]" />
                <span className="font-mono text-xs font-semibold text-slate-800 dark:text-slate-200">
                  {MERCHANT_UPI_ID}
                </span>
                <button
                  type="button"
                  onClick={handleCopyUpi}
                  className="ml-auto inline-flex items-center gap-1 text-[11px] font-bold text-[#059669] hover:text-[#047857]"
                >
                  {copiedUpi ? (
                    <>
                      <Check className="h-3.5 w-3.5 text-emerald-600" /> Copied
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5" /> Copy
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Step 2A: Customer UPI ID */}
            <div className="mt-6 space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300">
                  Your UPI ID (used to make the payment) *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. yourname@okhdfcbank or 9876543210@paytm"
                  value={customerUpiId}
                  onChange={(e) => setCustomerUpiId(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-xs outline-none focus:border-[#059669] focus:ring-1 focus:ring-[#059669]/20 dark:border-slate-700 dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
                />
                <span className="mt-1 block text-[11px] text-slate-400">
                  Enter the UPI ID of the bank account or app you used to pay.
                </span>
              </div>

              {/* Step 2B: 12-digit UTR ID */}
              <div>
                <div className="flex items-center justify-between">
                  <label className="block font-bold text-slate-900 dark:text-white">
                    12-Digit UTR ID / UPI Reference Number *
                  </label>
                  <span className="text-[10px] font-mono text-slate-400">
                    {utrNumber.length}/12 digits
                  </span>
                </div>
                <input
                  type="text"
                  required
                  maxLength={12}
                  pattern="\d{12}"
                  placeholder="e.g. 428912345678"
                  value={utrNumber}
                  onChange={(e) => {
                    const digits = e.target.value.replace(/\D/g, '');
                    setUtrNumber(digits);
                  }}
                  className="mt-1 w-full rounded-lg border-2 border-amber-300 bg-amber-50/30 px-3 py-2.5 text-sm font-mono tracking-widest font-bold outline-none focus:border-[#059669] focus:ring-2 focus:ring-[#059669]/20 dark:border-amber-700 dark:bg-slate-800 text-slate-900 dark:text-white"
                />
                <div className="mt-1.5 flex items-start gap-1.5 text-[11px] text-slate-500">
                  <Clock className="h-3.5 w-3.5 text-amber-600 shrink-0 mt-0.5" />
                  <span>
                    The UTR number is the 12-digit transaction reference shown in your UPI app receipt after payment. The seller will verify this number to complete and confirm your order.
                  </span>
                </div>
              </div>
            </div>

            {/* Submit Order Button */}
            <button
              type="submit"
              disabled={isProcessing || utrNumber.length !== 12 || !customerUpiId.includes('@')}
              className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-[#059669] py-3.5 text-xs font-bold text-white shadow-md shadow-emerald-950/20 transition hover:bg-[#047857] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isProcessing ? (
                <LoadingThreeDotsJumping size={6} jumpHeight={8} gap={4} color="#FFFFFF" label="Verifying & Placing Order" />
              ) : (
                `Submit Order with UTR (₹${grandTotal.toLocaleString('en-IN')})`
              )}
            </button>

            <div className="mt-4 flex items-center justify-center gap-1.5 text-[10px] text-slate-400">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
              <span>Seller Manual Verification • Escrow Protected Marketplace</span>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
