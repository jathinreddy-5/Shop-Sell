'use client';

import React from 'react';
import Link from 'next/link';
import {
  FileText,
  ShieldCheck,
  RotateCcw,
  Truck,
  Scale,
  Mail,
  MapPin,
  ArrowLeft,
  ChevronRight,
} from 'lucide-react';

export default function TermsAndPoliciesPage() {
  return (
    <div className="min-h-screen bg-slate-50 py-10 dark:bg-slate-950">
      <div className="container mx-auto max-w-4xl px-4 sm:px-6">
        {/* Navigation Breadcrumb */}
        <div className="mb-6 flex items-center gap-2 text-xs font-semibold text-slate-500">
          <Link href="/" className="inline-flex items-center gap-1 hover:text-[#059669] transition">
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Back to Marketplace</span>
          </Link>
          <ChevronRight className="h-3 w-3 text-slate-400" />
          <span className="text-slate-800 dark:text-slate-200">Legal & Terms</span>
        </div>

        {/* Page Header */}
        <div className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-10 shadow-sm dark:border-slate-800 dark:bg-slate-900 mb-8">
          <div className="flex items-center gap-3 mb-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-50 text-[#059669]">
              <Scale className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">
                Terms and Conditions & Policies
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Effective Date: October 2026 | Compliant with IT Act 2000, DPDP Act 2023 & Consumer Protection (E-Commerce) Rules 2020
              </p>
            </div>
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed mt-4">
            Welcome to <span className="font-bold text-slate-900 dark:text-white">Shop:Sell</span>. By accessing, browsing, or purchasing through our marketplace, you agree to be bound by the terms, conditions, and operational policies detailed below.
          </p>

          {/* Quick Anchor Navigation */}
          <div className="mt-6 flex flex-wrap gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
            <a
              href="#terms"
              className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-[#059669] hover:text-white transition dark:bg-slate-800 dark:text-slate-300"
            >
              <FileText className="h-3.5 w-3.5" />
              <span>Terms of Use</span>
            </a>
            <a
              href="#privacy"
              className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-[#059669] hover:text-white transition dark:bg-slate-800 dark:text-slate-300"
            >
              <ShieldCheck className="h-3.5 w-3.5" />
              <span>Privacy Policy</span>
            </a>
            <a
              href="#refunds"
              className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-[#059669] hover:text-white transition dark:bg-slate-800 dark:text-slate-300"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>Returns & Refunds</span>
            </a>
            <a
              href="#shipping"
              className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-[#059669] hover:text-white transition dark:bg-slate-800 dark:text-slate-300"
            >
              <Truck className="h-3.5 w-3.5" />
              <span>Shipping Policy</span>
            </a>
            <a
              href="#grievance"
              className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-[#059669] hover:text-white transition dark:bg-slate-800 dark:text-slate-300"
            >
              <Mail className="h-3.5 w-3.5" />
              <span>Grievance Officer</span>
            </a>
          </div>
        </div>

        {/* Content Sections */}
        <div className="space-y-8">
          {/* 1. Terms of Use */}
          <section id="terms" className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm dark:border-slate-800 dark:bg-slate-900 scroll-mt-24">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-4">
              <FileText className="h-5 w-5 text-[#059669]" />
              <span>1. Terms and Conditions of Use</span>
            </h2>
            <div className="space-y-4 text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              <p>
                <strong>1.1 Marketplace Intermediary Status:</strong> Shop:Sell provides an online marketplace platform facilitating commercial transactions between independent sellers and verified buyers. Under <strong>Section 79 of the Information Technology Act, 2000</strong>, Shop:Sell operates as an electronic intermediary and is not liable for third-party seller content or fulfillment delays beyond our platform SLA enforcement.
              </p>
              <p>
                <strong>1.2 User Identity & Account Security:</strong> You agree to provide true, accurate, and current information when registering, verifying your mobile number via OTP, and placing orders. You are responsible for maintaining the confidentiality of your authentication credentials.
              </p>
              <p>
                <strong>1.3 Orders & Pricing:</strong> All prices are displayed in Indian Rupees (INR) and inclusive of applicable GST unless explicitly stated otherwise. Sellers reserve the right to cancel orders with full customer refund in the event of unforeseen pricing inaccuracies or stock discrepancies.
              </p>
              <p>
                <strong>1.4 Payment Processing:</strong> Payments are processed securely via PCI-DSS certified payment gateways (Razorpay). Shop:Sell does not store your full card number, CVV, or net banking passwords.
              </p>
            </div>
          </section>

          {/* 2. Privacy Policy */}
          <section id="privacy" className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm dark:border-slate-800 dark:bg-slate-900 scroll-mt-24">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-4">
              <ShieldCheck className="h-5 w-5 text-[#059669]" />
              <span>2. Privacy Policy & DPDP Act 2023 Compliance</span>
            </h2>
            <div className="space-y-4 text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              <p>
                <strong>2.1 Purpose Limitation:</strong> We collect essential data (Full Name, Phone Number, Delivery Address, PIN Code) strictly to process orders, verify serviceability, calculate delivery times, and deliver shipments.
              </p>
              <p>
                <strong>2.2 Consent Architecture:</strong> In accordance with India’s <strong>Digital Personal Data Protection (DPDP) Act, 2023</strong>, all marketing notifications and demographic profiling require affirmative consent. Each consent action is logged immutably in our audit system.
              </p>
              <p>
                <strong>2.3 Data Rights:</strong> You retain the full legal right to export all personal records in structured JSON format or execute permanent account erasure via your <Link href="/account" className="text-[#059669] font-semibold hover:underline">Account Settings</Link>.
              </p>
            </div>
          </section>

          {/* 3. Return & Refund Policy */}
          <section id="refunds" className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm dark:border-slate-800 dark:bg-slate-900 scroll-mt-24">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-4">
              <RotateCcw className="h-5 w-5 text-[#059669]" />
              <span>3. Return, Replacement & Refund Policy</span>
            </h2>
            <div className="space-y-4 text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              <p>
                <strong>3.1 7-Day Return Window:</strong> Most physical goods purchased on Shop:Sell are eligible for return or replacement within 7 calendar days of confirmed delivery if defective, damaged in transit, or significantly different from the seller catalog listing.
              </p>
              <p>
                <strong>3.2 Refund Turnaround:</strong> Once the returned item is inspected and accepted by the seller, refunds are initiated via Razorpay back to your original payment instrument within <strong>5–7 business days</strong>.
              </p>
              <p>
                <strong>3.3 Non-Returnable Items:</strong> Perishable goods, personal hygiene apparel, custom customized crafts, and digital goods cannot be returned unless received in a damaged state.
              </p>
            </div>
          </section>

          {/* 4. Shipping Policy */}
          <section id="shipping" className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm dark:border-slate-800 dark:bg-slate-900 scroll-mt-24">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-4">
              <Truck className="h-5 w-5 text-[#059669]" />
              <span>4. Shipping and Delivery Policy</span>
            </h2>
            <div className="space-y-4 text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              <p>
                <strong>4.1 Delivery Timelines:</strong> Standard domestic delivery takes <strong>2 to 5 business days</strong> depending on delivery PIN code serviceability and dispatch origin. Accurate timelines are calculated based on your saved address.
              </p>
              <p>
                <strong>4.2 Tracking & Courier Partners:</strong> Real-time tracking numbers and updates are dispatched via SMS / WhatsApp once your order is picked up by our certified courier network (Delhivery, BlueDart, Xpressbees).
              </p>
            </div>
          </section>

          {/* 5. Grievance Officer */}
          <section id="grievance" className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm dark:border-slate-800 dark:bg-slate-900 scroll-mt-24">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-4">
              <Mail className="h-5 w-5 text-[#059669]" />
              <span>5. Grievance Redressal & Nodal Officer</span>
            </h2>
            <div className="space-y-4 text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              <p>
                In compliance with the <strong>Consumer Protection (E-Commerce) Rules, 2020</strong>, the details of the designated Grievance Officer for consumer disputes are as follows:
              </p>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800 space-y-1.5 font-medium">
                <p><strong className="text-slate-900 dark:text-white">Designation:</strong> Grievance Redressal Officer</p>
                <p><strong className="text-slate-900 dark:text-white">Company:</strong> Shop:Sell Marketplace Private Limited</p>
                <p><strong className="text-slate-900 dark:text-white">Email:</strong> grievance@shopsell.example.com</p>
                <p><strong className="text-slate-900 dark:text-white">Response SLA:</strong> Acknowledgment within 48 hours; resolution within 30 days.</p>
                <p className="flex items-center gap-1.5 pt-1 text-slate-500">
                  <MapPin className="h-4 w-4 shrink-0" />
                  <span>Sector 4, HSR Layout, Bengaluru, Karnataka 560102, India</span>
                </p>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
