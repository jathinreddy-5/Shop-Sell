'use client';

import React, { useState } from 'react';
import {
  Check,
  X,
  Building,
  CreditCard,
  Clock,
  Shield,
  Layers,
  ShoppingBag,
  TrendingUp,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  DollarSign,
  Plus,
  Eye,
  FileText,
  Download,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Maximize2,
  ZoomIn,
  ZoomOut,
  ShieldCheck,
  FileSearch,
  Building2,
  Lock,
  Printer,
  ChevronRight,
  Filter,
} from 'lucide-react';
import {
  ExpandingCardGrid,
  ExpandingCardItem,
} from '../../components/expanding-cards';
import { LoadingThreeDotsJumping } from '@/components/loading';

export interface VerificationDocument {
  id: string;
  category: 'government_id' | 'address_proof' | 'bank_proof' | 'tax_proof' | 'incorporation';
  categoryLabel: string;
  title: string;
  documentType: string;
  fileName: string;
  fileSize: string;
  fileFormat: 'PDF' | 'JPG' | 'PNG';
  uploadedAt: string;
  verificationBadge: string;
  status: 'verified' | 'pending' | 'flagged';
  details: {
    documentNumber?: string;
    issuer?: string;
    issueOrExpiryDate?: string;
    addressOrAccount?: string;
    confidenceScore?: string;
    verificationRegistry?: string;
  };
  previewContent: {
    badge: string;
    sealTitle: string;
    authorityName: string;
    referenceCode: string;
    checksumSha256: string;
    attributes: { label: string; value: string }[];
    summaryNote: string;
  };
}

export interface MockApp {
  id: string;
  applicant: string;
  applicantEmail: string;
  applicantPhone: string;
  businessName: string;
  businessType: string;
  taxId: string;
  submittedAt: string;
  bankName: string;
  accountNumber: string;
  ifsc: string;
  registeredAddress: string;
  status: 'pending' | 'approved' | 'rejected';
  rejectionReason?: string;
  documents: VerificationDocument[];
}

const initialApplications: MockApp[] = [
  {
    id: 'app-001',
    applicant: 'Vikram Mehta (vikram@apextech.in)',
    applicantEmail: 'vikram@apextech.in',
    applicantPhone: '+91 98450 12345',
    businessName: 'Apex Tech Solutions',
    businessType: 'Pvt Ltd',
    taxId: '27AABCA1234F1Z5',
    submittedAt: '10 mins ago',
    bankName: 'HDFC Bank',
    accountNumber: '••••••••1234',
    ifsc: 'HDFC0001234',
    registeredAddress: 'Unit 402, 4th Floor, Prestige Tech Park, Outer Ring Road, Kadubeesanahalli, Bengaluru, Karnataka - 560103',
    status: 'pending',
    documents: [
      {
        id: 'doc-apex-01',
        category: 'government_id',
        categoryLabel: 'Govt ID (Aadhaar)',
        title: 'Aadhaar Identity Card (Front & Back)',
        documentType: 'UIDAI Electronic Aadhaar Verification',
        fileName: 'aadhaar_vikram_mehta_verified.pdf',
        fileSize: '1.8 MB',
        fileFormat: 'PDF',
        uploadedAt: '10 mins ago',
        verificationBadge: 'UIDAI DigiLocker Verified',
        status: 'verified',
        details: {
          documentNumber: '•••• •••• 4912',
          issuer: 'Unique Identification Authority of India (UIDAI)',
          issueOrExpiryDate: 'Issued: 14/08/2016',
          confidenceScore: '99.8% Biometric & Demographic Match',
          verificationRegistry: 'DigiLocker / Aadhaar e-KYC API v2.5',
        },
        previewContent: {
          badge: 'GOVERNMENT OF INDIA • UIDAI E-KYC SECURE',
          sealTitle: 'BHARAT SARKAR / UNIQUE IDENTIFICATION AUTHORITY',
          authorityName: 'Unique Identification Authority of India (UIDAI)',
          referenceCode: 'UIDAI-EK-2026-981249812',
          checksumSha256: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
          attributes: [
            { label: 'Cardholder Full Name', value: 'Vikram Mehta' },
            { label: 'Date of Birth / Gender', value: '18/06/1988 • Male' },
            { label: 'Masked Aadhaar Number', value: 'XXXX XXXX 4912' },
            { label: "Father's / Guardian's Name", value: 'Rajesh Mehta' },
            { label: 'Resident Address', value: 'Unit 402, Prestige Tech Park, ORR, Bengaluru, Karnataka - 560103' },
            { label: 'e-KYC Authenticated On', value: '04 Oct 2026, 11:24:18 IST' },
          ],
          summaryNote: 'UIDAI cryptographic signature validated successfully. Photo matches demographic registry.',
        },
      },
      {
        id: 'doc-apex-02',
        category: 'address_proof',
        categoryLabel: 'Address Proof (BESCOM)',
        title: 'Electricity Utility Bill (< 2 months)',
        documentType: 'BESCOM Commercial Power Supply Bill',
        fileName: 'bescom_electricity_bill_sept2026.pdf',
        fileSize: '940 KB',
        fileFormat: 'PDF',
        uploadedAt: '12 mins ago',
        verificationBadge: 'Address Matched 100%',
        status: 'verified',
        details: {
          documentNumber: 'BESCOM-LT2-88192039',
          issuer: 'Bangalore Electricity Supply Company (BESCOM)',
          issueOrExpiryDate: 'Bill Date: 12/09/2026 (Due: 28/09/2026)',
          addressOrAccount: 'Unit 402, Prestige Tech Park, Outer Ring Road, Bengaluru - 560103',
          confidenceScore: 'Address matched to registered entity',
          verificationRegistry: 'Karnataka Electricity Billing Portal',
        },
        previewContent: {
          badge: 'BESCOM OFFICIAL UTILITY BILL RECORD',
          sealTitle: 'BANGALORE ELECTRICITY SUPPLY CO. LTD.',
          authorityName: 'BESCOM Commercial Billing Division',
          referenceCode: 'BES-RR-88192039-26',
          checksumSha256: 'a89f9213812b189c748291039821903ba8123982193891028391823901823910',
          attributes: [
            { label: 'Consumer / Account Name', value: 'Apex Tech Solutions Pvt Ltd' },
            { label: 'Installation Address', value: 'Unit 402, 4th Floor, Prestige Tech Park, Kadubeesanahalli, Bengaluru - 560103' },
            { label: 'Tariff Category', value: 'LT-2 Commercial High-Density Power' },
            { label: 'Meter Serial Number', value: 'MTR-BES-9812440' },
            { label: 'Bill Period & Status', value: '01/08/2026 to 31/08/2026 • Paid in Full (₹14,820.00)' },
          ],
          summaryNote: 'Commercial utility billing matches business address and applicant entity within 60-day threshold.',
        },
      },
      {
        id: 'doc-apex-03',
        category: 'bank_proof',
        categoryLabel: 'Cancelled Cheque (HDFC)',
        title: 'Cancelled Cheque / Bank Account Proof',
        documentType: 'HDFC Bank CTS-2010 Cheque Leaf',
        fileName: 'hdfc_cancelled_cheque_apextech.jpg',
        fileSize: '2.4 MB',
        fileFormat: 'JPG',
        uploadedAt: '14 mins ago',
        verificationBadge: 'Penny-Drop Verified (IMPS ₹1)',
        status: 'verified',
        details: {
          documentNumber: 'CHQ-481920',
          issuer: 'HDFC Bank Ltd, Kadubeesanahalli Branch',
          addressOrAccount: 'A/C: ••••••••1234 • IFSC: HDFC0001234',
          confidenceScore: 'Beneficiary Name Match: 100%',
          verificationRegistry: 'NPCI IMPS Penny-Drop Verification Gateway',
        },
        previewContent: {
          badge: 'HDFC BANK • CTS-2010 COMPLIANT CHEQUE',
          sealTitle: 'HDFC BANK LTD. • A/C PAYEE ONLY (CANCELLED)',
          authorityName: 'HDFC Bank Business Banking Operations',
          referenceCode: 'IMPS-PENNY-DROP-OK-88491',
          checksumSha256: '481920a81b2c3d4e5f60718293a4b5c6d7e8f90123456789abcdef0123456789',
          attributes: [
            { label: 'Account Holder Name', value: 'Apex Tech Solutions Pvt Ltd' },
            { label: 'Bank Account Number', value: '••••••••1234' },
            { label: 'IFSC Code', value: 'HDFC0001234' },
            { label: 'MICR Code', value: '560240019' },
            { label: 'Branch Name & Address', value: 'Prestige Tech Park, Outer Ring Road, Bengaluru' },
            { label: 'Penny-Drop IMPS Status', value: '₹1.00 Credited • Name Match: "Apex Tech Solutions Pvt Ltd"' },
          ],
          summaryNote: 'Automated penny-drop returned 100% match. Cheque leaf has valid CTS-2010 watermark and authorized crossing.',
        },
      },
      {
        id: 'doc-apex-04',
        category: 'tax_proof',
        categoryLabel: 'GSTIN Reg-06',
        title: 'GST Registration Certificate (Form GST REG-06)',
        documentType: 'Government of India CBIC GST Registration',
        fileName: 'gst_certificate_reg06_27AABCA1234F1Z5.pdf',
        fileSize: '620 KB',
        fileFormat: 'PDF',
        uploadedAt: '15 mins ago',
        verificationBadge: 'Active on GSTN Portal',
        status: 'verified',
        details: {
          documentNumber: '27AABCA1234F1Z5',
          issuer: 'Goods and Services Tax Network (GSTN)',
          issueOrExpiryDate: 'Effective from: 18/04/2024',
          confidenceScore: 'Active Regular Taxpayer',
          verificationRegistry: 'GSTN API Service (Taxpayer Verification)',
        },
        previewContent: {
          badge: 'FORM GST REG-06 • TAX INVOICE ELIGIBLE',
          sealTitle: 'GOVERNMENT OF INDIA • GST COUNCIL',
          authorityName: 'Central Board of Indirect Taxes and Customs (CBIC)',
          referenceCode: 'GSTN-VER-27AABCA1234F1Z5',
          checksumSha256: 'f219082390182093810293810293810293810293810293810293810293810293',
          attributes: [
            { label: 'Registration Number (GSTIN)', value: '27AABCA1234F1Z5' },
            { label: 'Legal Name of Business', value: 'APEX TECH SOLUTIONS PRIVATE LIMITED' },
            { label: 'Trade Name', value: 'Apex Tech Solutions' },
            { label: 'Constitution of Business', value: 'Private Limited Company' },
            { label: 'Principal Place of Business', value: 'Unit 402, Prestige Tech Park, Outer Ring Road, Bengaluru, KA - 560103' },
            { label: 'Taxpayer Status & Type', value: 'Regular • Active (Zero defaults reported)' },
          ],
          summaryNote: 'Taxpayer status is Active on Indian Department of Revenue portal. Corporate PAN matches entity records.',
        },
      },
      {
        id: 'doc-apex-05',
        category: 'incorporation',
        categoryLabel: 'Incorporation (MCA)',
        title: 'Certificate of Incorporation (MCA / RoC)',
        documentType: 'Ministry of Corporate Affairs Government of India',
        fileName: 'certificate_of_incorporation_mca.pdf',
        fileSize: '3.2 MB',
        fileFormat: 'PDF',
        uploadedAt: '15 mins ago',
        verificationBadge: 'MCA Portal Verified',
        status: 'verified',
        details: {
          documentNumber: 'CIN: U72200KA2024PTC189012',
          issuer: 'Registrar of Companies, Karnataka',
          issueOrExpiryDate: 'Incorporation Date: 12/04/2024',
          confidenceScore: 'Verified Active Company',
          verificationRegistry: 'MCA21 V3 Portal',
        },
        previewContent: {
          badge: 'MINISTRY OF CORPORATE AFFAIRS • ROC',
          sealTitle: 'GOVERNMENT OF INDIA • REGISTRAR OF COMPANIES',
          authorityName: 'Ministry of Corporate Affairs, RoC Karnataka',
          referenceCode: 'MCA-CIN-U72200KA2024PTC189012',
          checksumSha256: '3819208390182093810293810293810293810293810293810293810293810293',
          attributes: [
            { label: 'Corporate Identity Number (CIN)', value: 'U72200KA2024PTC189012' },
            { label: 'Company Name', value: 'APEX TECH SOLUTIONS PRIVATE LIMITED' },
            { label: 'Date of Incorporation', value: '12th day of April Two Thousand Twenty Four' },
            { label: 'Company Category & Class', value: 'Company limited by Shares / Non-Govt Company' },
            { label: 'Authorized Share Capital', value: '₹10,00,000.00 • Paid Up: ₹5,00,000.00' },
            { label: 'Authorized Director', value: 'Vikram Mehta (DIN: 08912049)' },
          ],
          summaryNote: 'Certificate digitally signed by RoC Bangalore. Directorship and DIN match applicant credentials.',
        },
      },
    ],
  },
  {
    id: 'app-002',
    applicant: 'Meera Nambiar (meera@keralahandicrafts.org)',
    applicantEmail: 'meera@keralahandicrafts.org',
    applicantPhone: '+91 94470 98765',
    businessName: 'Kerala Heritage Clayworks',
    businessType: 'Sole Proprietorship',
    taxId: '32ABCDE5678G1Z1',
    submittedAt: '2 hours ago',
    bankName: 'State Bank of India',
    accountNumber: '••••••••8901',
    ifsc: 'SBIN0000456',
    registeredAddress: 'Door No. 14/220, Craft Guild Lane, Mattancherry, Kochi, Kerala - 682002',
    status: 'pending',
    documents: [
      {
        id: 'doc-meera-01',
        category: 'government_id',
        categoryLabel: 'Govt ID (Passport)',
        title: 'Passport Identity & Address Pages',
        documentType: 'Republic of India Passport (Regular 36-page)',
        fileName: 'passport_meera_nambiar.pdf',
        fileSize: '2.1 MB',
        fileFormat: 'PDF',
        uploadedAt: '2 hours ago',
        verificationBadge: 'Passport Seva Kendra Verified',
        status: 'verified',
        details: {
          documentNumber: 'Z•••••89',
          issuer: 'Ministry of External Affairs, India',
          issueOrExpiryDate: 'Issued: 21/02/2021 (Exp: 20/02/2031)',
          confidenceScore: '100% Machine-Readable Zone (MRZ) Valid',
          verificationRegistry: 'Passport Seva Verification Gateway',
        },
        previewContent: {
          badge: 'REPUBLIC OF INDIA • PASSPORT REGISTRY',
          sealTitle: 'BHARAT SARKAR / MINISTRY OF EXTERNAL AFFAIRS',
          authorityName: 'Regional Passport Office, Cochin',
          referenceCode: 'MEA-PS-2021-992014',
          checksumSha256: '9920148192083901820938102938102938102938102938102938102938102938',
          attributes: [
            { label: 'Passport Holder Full Name', value: 'Meera Nambiar' },
            { label: 'Date of Birth / Gender', value: '09/11/1992 • Female' },
            { label: 'Place of Birth', value: 'Ernakulam, Kerala, India' },
            { label: 'Nationality', value: 'Indian' },
            { label: 'Address Recorded', value: 'Door No. 14/220, Mattancherry, Kochi, Kerala - 682002' },
            { label: 'MRZ Checksum Validation', value: 'Verified Authentic • Check Digit Valid' },
          ],
          summaryNote: 'Optical and biometric MRZ lines match registered identity with no discrepancy.',
        },
      },
      {
        id: 'doc-meera-02',
        category: 'address_proof',
        categoryLabel: 'Address Proof (Lease)',
        title: 'Registered Commercial Workshop Lease Deed',
        documentType: 'Sub-Registrar Registered Lease Agreement',
        fileName: 'fort_kochi_workshop_lease.pdf',
        fileSize: '1.6 MB',
        fileFormat: 'PDF',
        uploadedAt: '2 hours ago',
        verificationBadge: 'Sub-Registrar Stamp Verified',
        status: 'verified',
        details: {
          documentNumber: 'SRO-FTK-3920-2025',
          issuer: 'Sub-Registrar Office Fort Kochi, Kerala Registration Dept',
          issueOrExpiryDate: 'Registered: 01/10/2025 (Validity: 3 Years)',
          addressOrAccount: 'Door No. 14/220, Craft Guild Lane, Mattancherry, Kochi - 682002',
          confidenceScore: 'Certified Copy Stamp Matched',
          verificationRegistry: 'Kerala Registration Dept e-Services',
        },
        previewContent: {
          badge: 'GOVERNMENT OF KERALA • REGISTRATION DEPT',
          sealTitle: 'SUB-REGISTRAR OFFICE • FORT KOCHI',
          authorityName: 'Department of Registration, Government of Kerala',
          referenceCode: 'KLD-REG-2025-3920',
          checksumSha256: '5910283901820938102938102938102938102938102938102938102938102938',
          attributes: [
            { label: 'Lessee / Merchant Name', value: 'Meera Nambiar (Proprietor)' },
            { label: 'Lessor / Property Owner', value: 'George K. Varghese' },
            { label: 'Demised Commercial Premises', value: 'Door No. 14/220, Craft Guild Lane, Mattancherry, Kochi - 682002' },
            { label: 'Permitted Use', value: 'Terracotta & Ceramic Pottery Workshop & Retail Depot' },
            { label: 'Term & Stamp Duty Paid', value: '3 Years (e-Stamp ID: IN-KL89218201948291)' },
          ],
          summaryNote: 'Valid commercial lease covering registered workshop and store dispatch address.',
        },
      },
      {
        id: 'doc-meera-03',
        category: 'bank_proof',
        categoryLabel: 'Cancelled Cheque (SBI)',
        title: 'State Bank of India Cancelled Cheque & Passbook',
        documentType: 'State Bank of India Current Account Leaf',
        fileName: 'sbi_cancelled_cheque_meera.jpg',
        fileSize: '1.9 MB',
        fileFormat: 'JPG',
        uploadedAt: '2 hours ago',
        verificationBadge: 'Penny-Drop Verified (IMPS ₹1)',
        status: 'verified',
        details: {
          documentNumber: 'CHQ-991204',
          issuer: 'State Bank of India, Mattancherry Branch',
          addressOrAccount: 'A/C: ••••••••8901 • IFSC: SBIN0000456',
          confidenceScore: 'Penny-Drop Name Matched: 100%',
          verificationRegistry: 'NPCI IMPS Realtime Verification',
        },
        previewContent: {
          badge: 'STATE BANK OF INDIA • CTS-2010 VERIFIED',
          sealTitle: 'STATE BANK OF INDIA • A/C PAYEE (CANCELLED)',
          authorityName: 'SBI Mattancherry Commercial Branch',
          referenceCode: 'IMPS-SBI-OK-77291',
          checksumSha256: '7729103901820938102938102938102938102938102938102938102938102938',
          attributes: [
            { label: 'Account Name', value: 'Kerala Heritage Clayworks / Meera Nambiar' },
            { label: 'Account Number', value: '••••••••8901' },
            { label: 'IFSC Code', value: 'SBIN0000456' },
            { label: 'Branch Code', value: '000456 (Mattancherry Commercial)' },
            { label: 'Penny-Drop Status', value: '₹1.00 Credited • Account Holder Match: SUCCESS' },
          ],
          summaryNote: 'Bank account confirmed active and linked to applicant proprietorship.',
        },
      },
      {
        id: 'doc-meera-04',
        category: 'tax_proof',
        categoryLabel: 'GSTIN Certificate',
        title: 'GST Registration Certificate (Form GST REG-06)',
        documentType: 'Government of India CBIC GST Registration',
        fileName: 'gst_reg06_32ABCDE5678G1Z1.pdf',
        fileSize: '580 KB',
        fileFormat: 'PDF',
        uploadedAt: '2 hours ago',
        verificationBadge: 'Active on GSTN Portal',
        status: 'verified',
        details: {
          documentNumber: '32ABCDE5678G1Z1',
          issuer: 'Goods and Services Tax Network (GSTN)',
          issueOrExpiryDate: 'Effective from: 01/06/2023',
          confidenceScore: 'Active Regular Taxpayer',
          verificationRegistry: 'GSTN API Service',
        },
        previewContent: {
          badge: 'FORM GST REG-06 • TAX INVOICE ELIGIBLE',
          sealTitle: 'GOVERNMENT OF INDIA • GST COUNCIL',
          authorityName: 'Central Board of Indirect Taxes and Customs (Kerala Ward)',
          referenceCode: 'GSTN-VER-32ABCDE5678G1Z1',
          checksumSha256: '8829103901820938102938102938102938102938102938102938102938102938',
          attributes: [
            { label: 'Registration Number (GSTIN)', value: '32ABCDE5678G1Z1' },
            { label: 'Legal Name', value: 'Meera Nambiar' },
            { label: 'Trade Name', value: 'Kerala Heritage Clayworks' },
            { label: 'Constitution of Business', value: 'Proprietorship' },
            { label: 'Principal Place of Business', value: 'Door No. 14/220, Craft Guild Lane, Mattancherry, Kochi, Kerala - 682002' },
          ],
          summaryNote: 'Zero tax arrears. Verified on national GST portal with active filing status.',
        },
      },
      {
        id: 'doc-meera-05',
        category: 'incorporation',
        categoryLabel: 'MSME Udyam Cert',
        title: 'Udyam Registration Certificate (Micro Enterprise)',
        documentType: 'Ministry of Micro, Small and Medium Enterprises',
        fileName: 'udyam_registration_meera.pdf',
        fileSize: '790 KB',
        fileFormat: 'PDF',
        uploadedAt: '2 hours ago',
        verificationBadge: 'Udyam MSME Verified',
        status: 'verified',
        details: {
          documentNumber: 'UDYAM-KL-07-0028491',
          issuer: 'Ministry of MSME, Government of India',
          issueOrExpiryDate: 'Registered: 15/09/2023',
          confidenceScore: 'Verified Active Micro Enterprise',
          verificationRegistry: 'Udyam Registration Portal',
        },
        previewContent: {
          badge: 'MINISTRY OF MSME • UDYAM REGISTRATION',
          sealTitle: 'GOVERNMENT OF INDIA • MINISTRY OF MSME',
          authorityName: 'Ministry of Micro, Small and Medium Enterprises',
          referenceCode: 'UDYAM-KL-07-0028491',
          checksumSha256: '1129103901820938102938102938102938102938102938102938102938102938',
          attributes: [
            { label: 'Udyam Registration Number', value: 'UDYAM-KL-07-0028491' },
            { label: 'Name of Enterprise', value: 'KERALA HERITAGE CLAYWORKS' },
            { label: 'Major Activity', value: 'Manufacturing of Handmade Terracotta & Ceramics' },
            { label: 'Enterprise Type', value: 'Micro Enterprise (Eligible for Craft Artisan Priority)' },
            { label: 'National Industry Classification (NIC)', value: '23931 - Manufacture of Ceramic tableware and pottery' },
          ],
          summaryNote: 'Authentic MSME registration with artisan heritage verification.',
        },
      },
    ],
  },
];

const mockProductsForModeration = [
  {
    id: 'p-mod-1',
    name: 'Herbal Immune Booster Tonic 500ml',
    store: 'Himalayan Organics',
    category: 'Health & Wellness',
    price: 899,
    status: 'active',
    reports: 0,
  },
  {
    id: 'p-mod-2',
    name: 'Replica Designer Leather Wallet',
    store: 'Heritage Leathers Co',
    category: 'Handmade Crafts',
    price: 499,
    status: 'active',
    reports: 3,
  },
  {
    id: 'p-mod-3',
    name: 'Wireless Bluetooth Bone-Conduction Earphone',
    store: 'Apex Tech Solutions',
    category: 'Electronics',
    price: 2999,
    status: 'active',
    reports: 0,
  },
];

const mockOrders = [
  {
    id: 'ord-8101',
    customer: 'Rahul Sharma',
    total: 3499,
    paymentStatus: 'captured',
    orderStatus: 'delivered',
    disputed: true,
    disputeReason: 'Wrong item size received, seller unresponsive',
    createdAt: 'Yesterday, 4:15 PM',
  },
  {
    id: 'ord-8102',
    customer: 'Priya Iyer',
    total: 1299,
    paymentStatus: 'captured',
    orderStatus: 'shipped',
    disputed: false,
    createdAt: 'Today, 11:30 AM',
  },
];

const mockRailAnalytics = [
  {
    rail: 'Pick up where you left off (Recent Searches)',
    impressions: 4820,
    clicks: 1832,
    ctr: '38.0%',
    addToCarts: 824,
    purchases: 362,
    conversion: '19.8%',
  },
  {
    rail: 'Recommended for You (Blended Scoring)',
    impressions: 4015,
    clicks: 1084,
    ctr: '27.0%',
    addToCarts: 432,
    purchases: 184,
    conversion: '17.0%',
  },
  {
    rail: 'Trending Near You',
    impressions: 2640,
    clicks: 580,
    ctr: '22.0%',
    addToCarts: 210,
    purchases: 92,
    conversion: '15.9%',
  },
];

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState<
    'sellers' | 'moderation' | 'disputes' | 'analytics' | 'categories' | 'payouts'
  >('sellers');
  const [apps, setApps] = useState<MockApp[]>(initialApplications);
  const [products, setProducts] = useState(mockProductsForModeration);
  const [orders, setOrders] = useState(mockOrders);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  // Document Inspection Modal State
  const [selectedAppForDocs, setSelectedAppForDocs] = useState<MockApp | null>(null);
  const [activeDocId, setActiveDocId] = useState<string | null>(null);
  const [previewZoom, setPreviewZoom] = useState<number>(100);
  const [docFilter, setDocFilter] = useState<'all' | 'verified' | 'flagged'>('all');
  const [docVerificationStatus, setDocVerificationStatus] = useState<Record<string, 'verified' | 'flagged'>>({});
  const [rejectModalApp, setRejectModalApp] = useState<MockApp | null>(null);
  const [rejectReasonInput, setRejectReasonInput] = useState('');

  // New Category Form
  const [newCatName, setNewCatName] = useState('');
  const [newCatSlug, setNewCatSlug] = useState('');
  const [categoriesList, setCategoriesList] = useState([
    { name: 'Electronics & Audio', slug: 'electronics-gadgets', attr: '{"brand": "string", "wireless": "boolean"}' },
    { name: 'Home & Ceramics', slug: 'home-kitchen', attr: '{"material": "string", "capacity": "string"}' },
    { name: 'Khadi & Apparel', slug: 'mens-fashion', attr: '{"fabric": "string", "fit": "string"}' },
  ]);

  const handleOpenDocViewer = (app: MockApp, targetDocId?: string) => {
    setSelectedAppForDocs(app);
    setActiveDocId(targetDocId || app.documents[0]?.id || null);
    setPreviewZoom(100);
  };

  const handleCloseDocViewer = () => {
    setSelectedAppForDocs(null);
    setActiveDocId(null);
  };

  const handleDownloadDoc = (doc: VerificationDocument) => {
    const content = `================================================================================
SHOP:SELL COMPLIANCE GATEWAY - VERIFIED KYC RECORD
================================================================================
Document ID          : ${doc.id}
Category             : ${doc.categoryLabel}
Document Title       : ${doc.title}
Document Type        : ${doc.documentType}
File Name            : ${doc.fileName}
File Size            : ${doc.fileSize}
File Format          : ${doc.fileFormat}
Uploaded At          : ${doc.uploadedAt}
Verification Status  : ${doc.status.toUpperCase()} (${doc.verificationBadge})
SHA-256 Checksum     : ${doc.previewContent.checksumSha256}
Issuing Authority    : ${doc.previewContent.authorityName}
Reference Code       : ${doc.previewContent.referenceCode}

METADATA ATTRIBUTES:
${doc.previewContent.attributes.map((a) => ` - ${a.label.padEnd(30, ' ')}: ${a.value}`).join('\n')}

COMPLIANCE & AUDIT NOTES:
${doc.previewContent.summaryNote}

SECURITY & STORAGE:
 - Stored under AES-256-GCM encryption with immutable SHA-256 audit ledger.
 - Verified compliant with Digital Personal Data Protection (DPDP) Act 2023.
 - Timestamp: ${new Date().toISOString()}
================================================================================`;

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = doc.fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleDownloadAllDocs = (app: MockApp) => {
    const manifest = `================================================================================
SHOP:SELL SELLER VERIFICATION DOSSIER & DOCUMENT ARCHIVE
================================================================================
Application ID       : ${app.id}
Business Legal Name  : ${app.businessName}
Applicant Name       : ${app.applicant}
Email                : ${app.applicantEmail}
Phone                : ${app.applicantPhone}
Business Structure   : ${app.businessType}
Tax ID (GSTIN/PAN)   : ${app.taxId}
Bank Account         : ${app.bankName} (IFSC: ${app.ifsc}, A/C: ${app.accountNumber})
Registered Address   : ${app.registeredAddress}
Submitted At         : ${app.submittedAt}
Application Status   : ${app.status.toUpperCase()}
Total Files Attached : ${app.documents.length}

DOCUMENT INVENTORY:
${app.documents
  .map(
    (d, i) =>
      `[${i + 1}] ${d.categoryLabel.padEnd(26, ' ')} | ${d.fileName.padEnd(38, ' ')} | ${d.fileSize.padEnd(8, ' ')} | SHA256: ${d.previewContent.checksumSha256.slice(0, 16)}...`
  )
  .join('\n')}

AUDIT RECORD:
 - All customer files verified against government portals and statutory records.
 - Generated by Shop:Sell Directorate on ${new Date().toISOString()}
================================================================================`;

    const blob = new Blob([manifest], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${app.businessName.toLowerCase().replace(/[^a-z0-9]/g, '_')}_kyc_dossier_manifest.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setActionMessage(`Downloaded complete KYC dossier package for "${app.businessName}".`);
  };

  const handleToggleDocStatus = (docId: string) => {
    setDocVerificationStatus((prev) => {
      const current = prev[docId] || 'verified';
      const updated = current === 'verified' ? 'flagged' : 'verified';
      return { ...prev, [docId]: updated };
    });
  };

  const handleApproveSeller = (id: string, name: string) => {
    setApps((prev) =>
      prev.map((a) => (a.id === id ? { ...a, status: 'approved' } : a))
    );
    if (selectedAppForDocs?.id === id) {
      setSelectedAppForDocs((prev) => (prev ? { ...prev, status: 'approved' } : null));
    }
    setActionMessage(`Approved seller "${name}". Dual role 'owner' granted and store provisioned.`);
  };

  const handleRejectSeller = (id: string, name: string, reason?: string) => {
    setApps((prev) =>
      prev.map((a) => (a.id === id ? { ...a, status: 'rejected', rejectionReason: reason } : a))
    );
    if (selectedAppForDocs?.id === id) {
      setSelectedAppForDocs((prev) => (prev ? { ...prev, status: 'rejected', rejectionReason: reason } : null));
    }
    setActionMessage(`Application for "${name}" rejected.${reason ? ` Reason: ${reason}` : ''}`);
  };

  const handleArchiveProduct = (id: string, name: string) => {
    setProducts((prev) =>
      prev.map((p) => (p.id === id ? { ...p, status: 'archived' } : p))
    );
    setActionMessage(`Product "${name}" has been archived and removed from search index.`);
  };

  const handleRefundOrder = (id: string) => {
    setOrders((prev) =>
      prev.map((o) =>
        o.id === id ? { ...o, paymentStatus: 'refunded', orderStatus: 'refunded', disputed: false } : o
      )
    );
    setActionMessage(`Refund initiated for Order #${id} via Razorpay. Order updated to refunded.`);
  };

  const handleAddCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName || !newCatSlug) return;
    setCategoriesList((prev) => [
      ...prev,
      { name: newCatName, slug: newCatSlug, attr: '{"custom": "string"}' },
    ]);
    setNewCatName('');
    setNewCatSlug('');
    setActionMessage(`Category "${newCatName}" created successfully.`);
  };

  return (
    <div className="container mx-auto space-y-6 px-4 py-8">
      {/* Top Banner */}
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-white">
              <Shield className="h-4 w-4" />
            </span>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              Admin Control Center
            </h1>
          </div>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Platform governance, seller approvals, product moderation, dispute mediation & analytics.
          </p>
        </div>
      </div>

      {actionMessage && (
        <div className="flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-xs font-medium text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/60 dark:text-emerald-300">
          <span>{actionMessage}</span>
          <button onClick={() => setActionMessage(null)} className="text-emerald-600 hover:text-emerald-900">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-2 dark:border-slate-800">
        {[
          { id: 'sellers', label: 'Seller Onboarding', icon: Building },
          { id: 'moderation', label: 'Product Moderation', icon: Layers },
          { id: 'disputes', label: 'Orders & Disputes', icon: AlertTriangle },
          { id: 'analytics', label: 'Recommendation Analytics', icon: TrendingUp },
          { id: 'categories', label: 'Category Schema', icon: ShoppingBag },
          { id: 'payouts', label: 'Store Payouts', icon: DollarSign },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-semibold transition ${
                isActive
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-white text-slate-600 hover:bg-slate-100 dark:bg-slate-900 dark:text-slate-400 dark:hover:bg-slate-800'
              }`}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* TAB 1: Seller Onboarding */}
      {activeTab === 'sellers' && (
        <div className="space-y-8">
          {/* Expanding KYC Review Cards */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Interactive KYC Application Cards
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Click any applicant card to expand the full legal KYC review sheet and make an approval decision.
                </p>
              </div>
              <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                {apps.filter((a) => a.status === 'pending').length} pending review
              </span>
            </div>

            <ExpandingCardGrid
              items={apps.map((app) => ({
                id: `admin-app-${app.id}`,
                image:
                  app.businessType === 'Pvt Ltd'
                    ? 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=800&q=80'
                    : 'https://images.unsplash.com/photo-1513519245088-0e12902e5a38?w=800&q=80',
                category: `KYC • ${app.businessType}`,
                title: app.businessName,
                subtitle: `${app.applicant} • Tax ID: ${app.taxId} • Submitted ${app.submittedAt}`,
                badge: app.status.toUpperCase(),
                metadata: app,
              }))}
              layoutGroupId="admin-kyc-group"
              className="grid-cols-1 md:grid-cols-2 gap-6"
              cardAspect="aspect-[16/10]"
              renderDetail={(item, onClose) => {
                const app = item.metadata as MockApp;
                return (
                  <div className="space-y-6">
                    <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-4 dark:border-slate-800">
                      <div>
                        <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                          KYC Review: {app.businessName}
                        </h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                          Submitted {app.submittedAt} • Status: {app.status.toUpperCase()} • {app.documents.length} Verification Files
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleOpenDocViewer(app)}
                          className="inline-flex items-center gap-1.5 rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs font-bold text-indigo-700 hover:bg-indigo-100 dark:border-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300"
                        >
                          <FileText className="h-4 w-4" />
                          <span>Open Document Dossier</span>
                        </button>
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-bold ${
                            app.status === 'pending'
                              ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                              : app.status === 'approved'
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                              : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                          }`}
                        >
                          {app.status.toUpperCase()}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-800/40">
                        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                          Applicant &amp; Entity
                        </p>
                        <p className="text-sm font-bold text-slate-900 dark:text-white">{app.applicant}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                          Entity Structure: <span className="font-semibold text-slate-700 dark:text-slate-200">{app.businessType}</span>
                        </p>
                        <p className="text-xs font-mono text-indigo-600 dark:text-indigo-400 mt-1">
                          GSTIN/PAN: {app.taxId}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                          Registered Address: {app.registeredAddress}
                        </p>
                      </div>

                      <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-800/40">
                        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                          Payout Bank Account
                        </p>
                        <p className="text-sm font-bold text-slate-900 dark:text-white">{app.bankName}</p>
                        <p className="text-xs font-mono text-slate-600 dark:text-slate-300 mt-1">
                          Account: {app.accountNumber} • IFSC: {app.ifsc}
                        </p>
                        <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1 font-semibold flex items-center gap-1">
                          <CheckCircle2 className="h-3.5 w-3.5" /> Penny-drop verification: Success (₹1.00 credit matched)
                        </p>
                      </div>
                    </div>

                    {/* Customer Verification Files & Documents Section */}
                    <div className="rounded-2xl border border-indigo-100 bg-indigo-50/40 p-4.5 dark:border-indigo-950/60 dark:bg-slate-800/40 space-y-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-600 text-white shadow-xs">
                            <FileText className="h-4 w-4" />
                          </div>
                          <div>
                            <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                              Customer Verification Files &amp; Documents ({app.documents.length})
                            </h4>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                              Official government records and proof files uploaded by customer for verification.
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleDownloadAllDocs(app)}
                            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 transition"
                          >
                            <Download className="h-3.5 w-3.5" />
                            <span>Download All (ZIP)</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenDocViewer(app)}
                            className="inline-flex items-center gap-1 rounded-lg bg-indigo-600 px-3 py-1 text-xs font-bold text-white shadow-sm hover:bg-indigo-500 transition"
                          >
                            <Eye className="h-3.5 w-3.5" />
                            <span>Inspect All in Viewer</span>
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
                        {app.documents.map((doc) => (
                          <div
                            key={doc.id}
                            className="group relative flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-3 shadow-xs hover:border-indigo-400 dark:border-slate-700 dark:bg-slate-900 transition"
                          >
                            <div className="space-y-1.5">
                              <div className="flex items-center justify-between gap-1">
                                <span className="inline-flex items-center gap-1 rounded bg-indigo-50 px-2 py-0.5 text-[10px] font-bold text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                                  {doc.categoryLabel}
                                </span>
                                <span className="rounded bg-slate-100 px-1.5 py-0.2 text-[10px] font-mono text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                                  {doc.fileFormat} • {doc.fileSize}
                                </span>
                              </div>
                              <p className="text-xs font-bold text-slate-900 dark:text-white line-clamp-1" title={doc.title}>
                                {doc.title}
                              </p>
                              <p className="text-[11px] font-mono text-slate-500 truncate" title={doc.fileName}>
                                {doc.fileName}
                              </p>
                              <div className="flex items-center gap-1 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                                <CheckCircle2 className="h-3 w-3 shrink-0" />
                                <span className="truncate">{doc.verificationBadge}</span>
                              </div>
                            </div>

                            <div className="mt-3 flex items-center gap-2 border-t border-slate-100 pt-2 dark:border-slate-800">
                              <button
                                type="button"
                                onClick={() => handleOpenDocViewer(app, doc.id)}
                                className="flex-1 inline-flex items-center justify-center gap-1 rounded-lg bg-indigo-50 py-1.5 text-xs font-bold text-indigo-700 hover:bg-indigo-100 dark:bg-indigo-950/70 dark:text-indigo-300 transition"
                              >
                                <Eye className="h-3 w-3" />
                                <span>Preview</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDownloadDoc(doc)}
                                title={`Download ${doc.fileName}`}
                                className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white p-1.5 text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 transition"
                              >
                                <Download className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-4 dark:border-slate-800 dark:bg-slate-800/20 text-xs text-slate-600 dark:text-slate-400 space-y-1">
                      <p className="font-semibold text-slate-800 dark:text-slate-200">Compliance Summary:</p>
                      <p>• GST portal active registration verified against Indian Department of Revenue.</p>
                      <p>• Zero dispute records across connected payment processors.</p>
                      <p>• All {app.documents.length} required statutory proof documents submitted and match entity profile.</p>
                      <p>• Default seller store commission will be set to 10% (1,000 bps).</p>
                    </div>

                    <div className="flex items-center gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
                      {app.status === 'pending' ? (
                        <>
                          <button
                            type="button"
                            onClick={() => {
                              handleApproveSeller(app.id, app.businessName);
                              onClose();
                            }}
                            className="flex-1 inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-6 py-3.5 text-base font-bold text-white shadow-lg shadow-emerald-600/30 transition hover:bg-emerald-500"
                          >
                            <Check className="h-5 w-5" />
                            <span>Approve Seller &amp; Store</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setRejectModalApp(app);
                              setRejectReasonInput('');
                            }}
                            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-rose-200 bg-white px-5 py-3.5 text-sm font-bold text-rose-600 hover:bg-rose-50 dark:border-rose-900 dark:bg-slate-800 dark:text-rose-400"
                          >
                            <X className="h-4 w-4" />
                            <span>Reject</span>
                          </button>
                        </>
                      ) : (
                        <div className="flex-1 text-center py-2 text-sm font-semibold text-slate-400">
                          Application has been {app.status}.
                        </div>
                      )}
                      <button
                        type="button"
                        onClick={onClose}
                        className="rounded-2xl border border-slate-200 bg-white px-5 py-3.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                      >
                        Close
                      </button>
                    </div>
                  </div>
                );
              }}
            />
          </div>

          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-800 dark:bg-slate-800/50 dark:text-slate-400">
                <tr>
                  <th className="p-4 font-semibold">Business &amp; Applicant</th>
                  <th className="p-4 font-semibold">Type &amp; Tax ID</th>
                  <th className="p-4 font-semibold">Bank / Payout</th>
                  <th className="p-4 font-semibold">Verification Documents</th>
                  <th className="p-4 font-semibold">Status</th>
                  <th className="p-4 text-right font-semibold">Decision</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {apps.map((app) => (
                  <tr key={app.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                    <td className="p-4">
                      <div className="font-bold text-slate-900 dark:text-white">{app.businessName}</div>
                      <div className="text-[11px] text-slate-500">{app.applicant}</div>
                      <div className="mt-1 flex items-center gap-1 text-[10px] text-slate-400">
                        <Clock className="h-3 w-3" /> {app.submittedAt}
                      </div>
                    </td>
                    <td className="p-4">
                      <span className="inline-flex rounded bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                        {app.businessType}
                      </span>
                      <div className="mt-1 font-mono text-[11px] text-slate-500">{app.taxId}</div>
                    </td>
                    <td className="p-4">
                      <div className="font-medium text-slate-800 dark:text-slate-200">{app.bankName}</div>
                      <div className="font-mono text-[11px] text-slate-500">IFSC: {app.ifsc}</div>
                    </td>
                    <td className="p-4">
                      <div className="space-y-1.5">
                        <button
                          type="button"
                          onClick={() => handleOpenDocViewer(app)}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-200 bg-indigo-50/80 px-2.5 py-1 text-xs font-bold text-indigo-700 hover:bg-indigo-100 dark:border-indigo-900/60 dark:bg-indigo-950/60 dark:text-indigo-300 transition"
                        >
                          <FileText className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
                          <span>View Documents ({app.documents.length})</span>
                        </button>
                        <div className="flex flex-wrap gap-1 max-w-[280px]">
                          {app.documents.map((doc) => (
                            <button
                              key={doc.id}
                              type="button"
                              onClick={() => handleOpenDocViewer(app, doc.id)}
                              title={`Click to preview ${doc.title} (${doc.fileName})`}
                              className="inline-flex items-center gap-1 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 transition"
                            >
                              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                              <span className="truncate max-w-[110px]">{doc.categoryLabel}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                          app.status === 'pending'
                            ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                            : app.status === 'approved'
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                            : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                        }`}
                      >
                        {app.status.toUpperCase()}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      {app.status === 'pending' ? (
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => handleOpenDocViewer(app)}
                            title="Inspect verification documents & KYC dossier"
                            className="inline-flex items-center gap-1 rounded-lg border border-indigo-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-50 dark:border-indigo-800 dark:bg-slate-800 dark:text-indigo-300"
                          >
                            <Eye className="h-3.5 w-3.5" /> Review Docs
                          </button>
                          <button
                            onClick={() => handleApproveSeller(app.id, app.businessName)}
                            className="flex items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-emerald-500"
                          >
                            <Check className="h-3.5 w-3.5" /> Approve
                          </button>
                          <button
                            onClick={() => {
                              setRejectModalApp(app);
                              setRejectReasonInput('');
                            }}
                            className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-rose-50 hover:text-rose-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                          >
                            <X className="h-3.5 w-3.5" /> Reject
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => handleOpenDocViewer(app)}
                            className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-600 hover:underline dark:text-indigo-400"
                          >
                            <Eye className="h-3 w-3" /> View Archive
                          </button>
                          <span className="text-[11px] text-slate-400">• {app.status}</span>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: Product Moderation */}
      {activeTab === 'moderation' && (
        <div className="space-y-4">
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-800 dark:bg-slate-800/50 dark:text-slate-400">
                <tr>
                  <th className="p-4 font-semibold">Product & Store</th>
                  <th className="p-4 font-semibold">Category</th>
                  <th className="p-4 font-semibold">Price</th>
                  <th className="p-4 font-semibold">Reports</th>
                  <th className="p-4 font-semibold">Status</th>
                  <th className="p-4 text-right font-semibold">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {products.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                    <td className="p-4">
                      <div className="font-bold text-slate-900 dark:text-white">{p.name}</div>
                      <div className="text-[11px] text-slate-500">{p.store}</div>
                    </td>
                    <td className="p-4 text-slate-600 dark:text-slate-400">{p.category}</td>
                    <td className="p-4 font-bold text-slate-900 dark:text-white">₹{p.price}</td>
                    <td className="p-4">
                      {p.reports > 0 ? (
                        <span className="inline-flex items-center gap-1 rounded bg-rose-100 px-2 py-0.5 text-[11px] font-semibold text-rose-800 dark:bg-rose-950 dark:text-rose-300">
                          <AlertTriangle className="h-3 w-3" /> {p.reports} reports
                        </span>
                      ) : (
                        <span className="text-slate-400">Clean</span>
                      )}
                    </td>
                    <td className="p-4">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                          p.status === 'active'
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                            : 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-400'
                        }`}
                      >
                        {p.status.toUpperCase()}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      {p.status === 'active' ? (
                        <button
                          onClick={() => handleArchiveProduct(p.id, p.name)}
                          className="rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-100 dark:border-rose-900 dark:bg-rose-950/60 dark:text-rose-300"
                        >
                          Archive & Hide
                        </button>
                      ) : (
                        <span className="text-[11px] text-slate-400">Archived</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: Orders & Disputes */}
      {activeTab === 'disputes' && (
        <div className="space-y-4">
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-800 dark:bg-slate-800/50 dark:text-slate-400">
                <tr>
                  <th className="p-4 font-semibold">Order ID & Date</th>
                  <th className="p-4 font-semibold">Customer</th>
                  <th className="p-4 font-semibold">Total & Status</th>
                  <th className="p-4 font-semibold">Dispute Details</th>
                  <th className="p-4 text-right font-semibold">Mediation Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {orders.map((o) => (
                  <tr key={o.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                    <td className="p-4">
                      <div className="font-mono font-bold text-slate-900 dark:text-white">{o.id}</div>
                      <div className="text-[11px] text-slate-500">{o.createdAt}</div>
                    </td>
                    <td className="p-4 font-medium text-slate-900 dark:text-white">{o.customer}</td>
                    <td className="p-4">
                      <div className="font-bold text-slate-900 dark:text-white">₹{o.total}</div>
                      <span className="text-[11px] text-slate-500">{o.paymentStatus}</span>
                    </td>
                    <td className="p-4">
                      {o.disputed ? (
                        <div className="rounded bg-amber-50 p-2 text-[11px] text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
                          {o.disputeReason}
                        </div>
                      ) : (
                        <span className="text-slate-400">No active dispute</span>
                      )}
                    </td>
                    <td className="p-4 text-right">
                      {o.disputed && o.paymentStatus !== 'refunded' ? (
                        <button
                          onClick={() => handleRefundOrder(o.id)}
                          className="inline-flex items-center gap-1 rounded-lg bg-rose-600 px-2.5 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-rose-500"
                        >
                          <RotateCcw className="h-3.5 w-3.5" /> Issue Refund
                        </button>
                      ) : (
                        <span className="text-[11px] text-slate-400">
                          {o.paymentStatus === 'refunded' ? 'Refunded' : 'Normal'}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: Recommendation Analytics */}
      {activeTab === 'analytics' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                Top Rail CTR
              </span>
              <div className="mt-2 text-2xl font-bold text-indigo-600">38.0%</div>
              <p className="mt-1 text-[11px] text-slate-500">
                &quot;Pick up where you left off&quot; delivers 1.7x higher CTR than generic feeds
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                Rec-Driven Add to Carts
              </span>
              <div className="mt-2 text-2xl font-bold text-emerald-600">1,466 items</div>
              <p className="mt-1 text-[11px] text-slate-500">
                Decayed search & view history directly drove 42% of all cart additions
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                Average Feed Generation Latency
              </span>
              <div className="mt-2 text-2xl font-bold text-amber-600">42ms</div>
              <p className="mt-1 text-[11px] text-slate-500">
                p95 &lt; 85ms with Redis feed caching & Typesense candidate generation
              </p>
            </div>
          </div>

          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="border-b border-slate-200 p-4 font-semibold text-slate-900 dark:border-slate-800 dark:text-white">
              Rail Performance & Conversion Attribution
            </div>
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-800 dark:bg-slate-800/50 dark:text-slate-400">
                <tr>
                  <th className="p-4 font-semibold">Rail Segment</th>
                  <th className="p-4 font-semibold">Impressions</th>
                  <th className="p-4 font-semibold">Clicks</th>
                  <th className="p-4 font-semibold">CTR</th>
                  <th className="p-4 font-semibold">Add to Carts</th>
                  <th className="p-4 font-semibold">Purchases</th>
                  <th className="p-4 text-right font-semibold">Conversion</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {mockRailAnalytics.map((r, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                    <td className="p-4 font-semibold text-slate-900 dark:text-white">{r.rail}</td>
                    <td className="p-4 text-slate-600 dark:text-slate-400">{r.impressions}</td>
                    <td className="p-4 text-slate-600 dark:text-slate-400">{r.clicks}</td>
                    <td className="p-4 font-bold text-indigo-600">{r.ctr}</td>
                    <td className="p-4 text-slate-600 dark:text-slate-400">{r.addToCarts}</td>
                    <td className="p-4 text-slate-600 dark:text-slate-400">{r.purchases}</td>
                    <td className="p-4 text-right font-bold text-emerald-600">{r.conversion}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 5: Category Management */}
      {activeTab === 'categories' && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="lg:col-span-1 rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Create New Department</h3>
            <p className="mt-1 text-xs text-slate-500">Define name, URL slug, and schema validation.</p>
            <form onSubmit={handleAddCategory} className="mt-4 space-y-3">
              <div>
                <label className="text-xs font-medium text-slate-700 dark:text-slate-300">Name</label>
                <input
                  type="text"
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  placeholder="e.g. Organic Herbal Teas"
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-xs focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-800"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-700 dark:text-slate-300">Slug</label>
                <input
                  type="text"
                  value={newCatSlug}
                  onChange={(e) => setNewCatSlug(e.target.value)}
                  placeholder="e.g. organic-herbal-teas"
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-xs focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-800"
                />
              </div>
              <button
                type="submit"
                className="flex w-full items-center justify-center gap-1 rounded-lg bg-indigo-600 py-2 text-xs font-semibold text-white hover:bg-indigo-500"
              >
                <Plus className="h-4 w-4" /> Add Category
              </button>
            </form>
          </div>

          <div className="lg:col-span-2 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-800 dark:bg-slate-800/50 dark:text-slate-400">
                <tr>
                  <th className="p-4 font-semibold">Category</th>
                  <th className="p-4 font-semibold">Slug</th>
                  <th className="p-4 font-semibold">Attribute Schema (JSONB)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {categoriesList.map((c, i) => (
                  <tr key={i} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                    <td className="p-4 font-bold text-slate-900 dark:text-white">{c.name}</td>
                    <td className="p-4 font-mono text-[11px] text-slate-500">{c.slug}</td>
                    <td className="p-4 font-mono text-[11px] text-indigo-600 dark:text-indigo-400">
                      {c.attr}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 6: Store Payouts */}
      {activeTab === 'payouts' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between rounded-xl border border-indigo-100 bg-indigo-50/60 p-5 dark:border-indigo-950 dark:bg-slate-900">
            <div>
              <h4 className="text-sm font-bold text-slate-900 dark:text-white">Batch Payout Generation</h4>
              <p className="text-xs text-slate-500">
                Trigger automated settlement for all stores with eligible fulfilled order balance &gt;= ₹1,000.
              </p>
            </div>
            <button
              onClick={() => setActionMessage('Payout batch triggered! 5 stores settled for a total of ₹1,48,200.')}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-indigo-500"
            >
              Generate Settlement Batch
            </button>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {[
              { store: 'SoundWave Audio Lab', balance: '₹42,500', status: 'Eligible', orders: 18 },
              { store: 'Apex Tech Solutions', balance: '₹68,200', status: 'Eligible', orders: 27 },
              { store: 'Clay & Kiln Studio', balance: '₹14,900', status: 'Eligible', orders: 12 },
            ].map((s, idx) => (
              <div
                key={idx}
                className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900"
              >
                <div className="flex items-center justify-between">
                  <h5 className="font-bold text-slate-900 dark:text-white">{s.store}</h5>
                  <span className="rounded bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                    {s.status}
                  </span>
                </div>
                <div className="mt-3 text-xl font-bold text-slate-900 dark:text-white">{s.balance}</div>
                <p className="mt-1 text-xs text-slate-500">{s.orders} fulfilled orders awaiting payout</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* FULL-SCREEN INTERACTIVE DOCUMENT VIEWER & KYC DOSSIER MODAL               */}
      {/* ========================================================================= */}
      {selectedAppForDocs && (() => {
        const currentDoc =
          selectedAppForDocs.documents.find((d) => d.id === activeDocId) ||
          selectedAppForDocs.documents[0];
        const isCurrentFlagged =
          docVerificationStatus[currentDoc?.id] === 'flagged';

        const filteredDocs = selectedAppForDocs.documents.filter((d) => {
          if (docFilter === 'all') return true;
          const status = docVerificationStatus[d.id] || 'verified';
          return status === docFilter;
        });

        return (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/75 backdrop-blur-md animate-in fade-in duration-200"
            onClick={(e) => {
              if (e.target === e.currentTarget) handleCloseDocViewer();
            }}
          >
            <div className="relative flex flex-col w-full max-w-6xl h-[92vh] rounded-3xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900 overflow-hidden">
              {/* Modal Header */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-slate-50/90 px-6 py-4 dark:border-slate-800 dark:bg-slate-900/90">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-md shadow-indigo-600/20">
                    <ShieldCheck className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="rounded bg-indigo-100 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300">
                        KYC Verification Dossier
                      </span>
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                          selectedAppForDocs.status === 'pending'
                            ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                            : selectedAppForDocs.status === 'approved'
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                            : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                        }`}
                      >
                        {selectedAppForDocs.status.toUpperCase()}
                      </span>
                    </div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                      {selectedAppForDocs.businessName}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Applicant: <span className="font-semibold text-slate-700 dark:text-slate-300">{selectedAppForDocs.applicant}</span> • Structure: {selectedAppForDocs.businessType} • Tax ID: {selectedAppForDocs.taxId}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleDownloadAllDocs(selectedAppForDocs)}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 transition shadow-xs"
                  >
                    <Download className="h-4 w-4" />
                    <span>Download All Files (ZIP)</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleCloseDocViewer}
                    className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700 transition"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>

              {/* Modal Body (Split: Sidebar + Document Canvas) */}
              <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
                {/* Left Document List Sidebar */}
                <div className="w-full md:w-80 lg:w-96 border-b md:border-b-0 md:border-r border-slate-200 bg-slate-50/60 dark:border-slate-800 dark:bg-slate-900/60 flex flex-col">
                  {/* Sidebar Header & Filters */}
                  <div className="p-3.5 border-b border-slate-200 dark:border-slate-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                        Customer Files ({selectedAppForDocs.documents.length})
                      </span>
                      <span className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400">
                        {selectedAppForDocs.documents.length} of {selectedAppForDocs.documents.length} Uploaded
                      </span>
                    </div>

                    <div className="flex rounded-lg bg-slate-200/80 p-0.5 text-[11px] font-semibold dark:bg-slate-800">
                      {(['all', 'verified', 'flagged'] as const).map((filter) => (
                        <button
                          key={filter}
                          type="button"
                          onClick={() => setDocFilter(filter)}
                          className={`flex-1 rounded-md py-1 capitalize transition ${
                            docFilter === filter
                              ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-700 dark:text-white'
                              : 'text-slate-600 hover:text-slate-900 dark:text-slate-400'
                          }`}
                        >
                          {filter}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Document List Items */}
                  <div className="flex-1 overflow-y-auto p-3 space-y-2">
                    {filteredDocs.map((doc, idx) => {
                      const isSelected = doc.id === currentDoc?.id;
                      const isFlagged = docVerificationStatus[doc.id] === 'flagged';

                      return (
                        <button
                          key={doc.id}
                          type="button"
                          onClick={() => {
                            setActiveDocId(doc.id);
                            setPreviewZoom(100);
                          }}
                          className={`w-full text-left rounded-2xl p-3 border transition flex flex-col gap-1.5 ${
                            isSelected
                              ? 'border-indigo-600 bg-indigo-50/80 dark:border-indigo-500 dark:bg-indigo-950/50 shadow-sm ring-1 ring-indigo-500'
                              : 'border-slate-200 bg-white hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-1">
                            <span className="inline-flex items-center gap-1 rounded bg-indigo-100/80 px-2 py-0.5 text-[10px] font-bold text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300">
                              #{idx + 1} {doc.categoryLabel}
                            </span>
                            <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-mono text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                              {doc.fileFormat} • {doc.fileSize}
                            </span>
                          </div>

                          <p className="text-xs font-bold text-slate-900 dark:text-white line-clamp-1">
                            {doc.title}
                          </p>
                          <p className="text-[11px] font-mono text-slate-500 truncate">
                            {doc.fileName}
                          </p>

                          <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-800/80 text-[10px]">
                            {isFlagged ? (
                              <span className="flex items-center gap-1 font-bold text-rose-600 dark:text-rose-400">
                                <AlertCircle className="h-3 w-3" /> Flagged for Re-upload
                              </span>
                            ) : (
                              <span className="flex items-center gap-1 font-semibold text-emerald-600 dark:text-emerald-400">
                                <CheckCircle2 className="h-3 w-3" /> {doc.verificationBadge}
                              </span>
                            )}
                            <span className="text-slate-400">{doc.uploadedAt}</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Right Document Visualizer Canvas */}
                {currentDoc && (
                  <div className="flex-1 flex flex-col overflow-hidden bg-slate-100/70 dark:bg-slate-950/70">
                    {/* Canvas Toolbar */}
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white px-5 py-3 dark:border-slate-800 dark:bg-slate-900 shadow-xs">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                            {currentDoc.documentType}
                          </span>
                          <span className="text-xs font-mono text-slate-500">
                            {currentDoc.fileName} ({currentDoc.fileSize})
                          </span>
                        </div>
                        <h4 className="text-sm font-bold text-slate-900 dark:text-white mt-0.5">
                          {currentDoc.title}
                        </h4>
                      </div>

                      <div className="flex items-center gap-2">
                        {/* Zoom Controls */}
                        <div className="flex items-center rounded-xl border border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800">
                          <button
                            type="button"
                            onClick={() => setPreviewZoom((z) => Math.max(75, z - 15))}
                            title="Zoom Out"
                            className="p-1.5 text-slate-600 hover:text-slate-900 dark:text-slate-300"
                          >
                            <ZoomOut className="h-3.5 w-3.5" />
                          </button>
                          <span className="px-2 font-mono text-xs text-slate-600 dark:text-slate-300">
                            {previewZoom}%
                          </span>
                          <button
                            type="button"
                            onClick={() => setPreviewZoom((z) => Math.min(150, z + 15))}
                            title="Zoom In"
                            className="p-1.5 text-slate-600 hover:text-slate-900 dark:text-slate-300"
                          >
                            <ZoomIn className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setPreviewZoom(100)}
                            title="Reset Zoom"
                            className="border-l border-slate-200 px-2 text-[10px] font-semibold text-slate-500 hover:text-slate-900 dark:border-slate-700 dark:text-slate-400"
                          >
                            Reset
                          </button>
                        </div>

                        {/* Download Document Button */}
                        <button
                          type="button"
                          onClick={() => handleDownloadDoc(currentDoc)}
                          className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 transition"
                        >
                          <Download className="h-3.5 w-3.5" />
                          <span>Download</span>
                        </button>

                        {/* Flag / Mark Verified Toggle */}
                        <button
                          type="button"
                          onClick={() => handleToggleDocStatus(currentDoc.id)}
                          className={`inline-flex items-center gap-1 rounded-xl px-3 py-1.5 text-xs font-bold transition shadow-xs ${
                            isCurrentFlagged
                              ? 'bg-rose-600 text-white hover:bg-rose-500'
                              : 'border border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 dark:border-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300'
                          }`}
                        >
                          {isCurrentFlagged ? (
                            <>
                              <AlertCircle className="h-3.5 w-3.5" />
                              <span>Flagged (Click to Clear)</span>
                            </>
                          ) : (
                            <>
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              <span>Verified Authentic</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Canvas Scroll Area */}
                    <div className="flex-1 overflow-y-auto p-6 flex justify-center">
                      <div
                        style={{
                          transform: `scale(${previewZoom / 100})`,
                          transformOrigin: 'top center',
                          transition: 'transform 0.15s ease-out',
                        }}
                        className="w-full max-w-3xl space-y-4"
                      >
                        {/* High-Fidelity Realistic Rendered Document */}
                        <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-xl dark:border-slate-800 dark:bg-slate-900 space-y-6">
                          {/* Top Authority Header */}
                          <div className="border-b-2 border-slate-900 pb-4 dark:border-white flex items-center justify-between">
                            <div>
                              <span className="inline-block font-mono text-[10px] font-bold tracking-widest uppercase text-slate-500">
                                {currentDoc.previewContent.badge}
                              </span>
                              <h2 className="text-lg font-black uppercase tracking-tight text-slate-900 dark:text-white">
                                {currentDoc.previewContent.sealTitle}
                              </h2>
                              <p className="text-xs text-slate-600 dark:text-slate-400">
                                {currentDoc.previewContent.authorityName}
                              </p>
                            </div>
                            <div className="text-right">
                              <span className="rounded bg-emerald-100 px-2 py-0.5 text-[10px] font-black uppercase text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                                Official Record
                              </span>
                              <p className="mt-1 font-mono text-[10px] text-slate-400">
                                Ref: {currentDoc.previewContent.referenceCode}
                              </p>
                            </div>
                          </div>

                          {/* Specific Visual Layout based on Document Category */}
                          {currentDoc.category === 'government_id' && (
                            <div className="rounded-2xl border-2 border-indigo-200 bg-indigo-50/20 p-5 dark:border-indigo-900/60 dark:bg-slate-800/40 space-y-4">
                              <div className="flex items-center justify-between border-b border-indigo-100 pb-3 dark:border-indigo-900">
                                <div className="flex items-center gap-2.5">
                                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-900 text-white font-bold text-xs uppercase shadow-sm">
                                    Photo ID
                                  </div>
                                  <div>
                                    <p className="text-xs font-bold text-slate-900 dark:text-white">
                                      {currentDoc.title}
                                    </p>
                                    <p className="font-mono text-xs text-indigo-700 dark:text-indigo-400 font-bold">
                                      {currentDoc.details.documentNumber}
                                    </p>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-bold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                                    <CheckCircle2 className="h-3 w-3" /> {currentDoc.verificationBadge}
                                  </span>
                                  <p className="text-[10px] text-slate-400 mt-0.5">
                                    {currentDoc.details.confidenceScore}
                                  </p>
                                </div>
                              </div>
                            </div>
                          )}

                          {currentDoc.category === 'address_proof' && (
                            <div className="rounded-2xl border-2 border-sky-200 bg-sky-50/20 p-5 dark:border-sky-900/60 dark:bg-slate-800/40 space-y-4">
                              <div className="flex items-center justify-between border-b border-sky-100 pb-3 dark:border-sky-900">
                                <div className="flex items-center gap-2.5">
                                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-sky-600 text-white font-bold text-xs uppercase shadow-sm">
                                    Address
                                  </div>
                                  <div>
                                    <p className="text-xs font-bold text-slate-900 dark:text-white">
                                      {currentDoc.title}
                                    </p>
                                    <p className="font-mono text-xs text-sky-700 dark:text-sky-400 font-bold">
                                      {currentDoc.details.documentNumber || 'Registered Proof of Premises'}
                                    </p>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-bold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                                    <CheckCircle2 className="h-3 w-3" /> {currentDoc.verificationBadge}
                                  </span>
                                  <p className="text-[10px] text-slate-400 mt-0.5">
                                    {currentDoc.details.confidenceScore}
                                  </p>
                                </div>
                              </div>
                            </div>
                          )}

                          {currentDoc.category === 'bank_proof' && (
                            <div className="rounded-2xl border-2 border-emerald-200 bg-emerald-50/30 p-5 dark:border-emerald-900/60 dark:bg-slate-800/40 space-y-4 relative overflow-hidden">
                              <div className="absolute -right-8 -top-8 rotate-12 bg-rose-600/10 border-2 border-rose-600 text-rose-700 px-10 py-1 text-xs font-black tracking-widest uppercase">
                                CANCELLED • A/C PAYEE
                              </div>
                              <div className="flex items-center justify-between border-b border-emerald-100 pb-3 dark:border-emerald-900">
                                <div>
                                  <p className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">
                                    {selectedAppForDocs.bankName}
                                  </p>
                                  <p className="font-mono text-xs text-slate-600 dark:text-slate-300">
                                    IFSC: {selectedAppForDocs.ifsc} • Cheque Leaf CTS-2010
                                  </p>
                                </div>
                                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-bold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                                  <CheckCircle2 className="h-3 w-3" /> {currentDoc.verificationBadge}
                                </span>
                              </div>
                            </div>
                          )}

                          {currentDoc.category === 'tax_proof' && (
                            <div className="rounded-2xl border-2 border-amber-200 bg-amber-50/20 p-5 dark:border-amber-900/60 dark:bg-slate-800/40 space-y-4">
                              <div className="flex items-center justify-between border-b border-amber-100 pb-3 dark:border-amber-900">
                                <div>
                                  <p className="text-sm font-black text-slate-900 dark:text-white uppercase">
                                    {currentDoc.title}
                                  </p>
                                  <p className="font-mono text-xs text-indigo-700 dark:text-indigo-400 font-bold">
                                    Tax ID: {selectedAppForDocs.taxId}
                                  </p>
                                </div>
                                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-bold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                                  <CheckCircle2 className="h-3 w-3" /> {currentDoc.verificationBadge}
                                </span>
                              </div>
                            </div>
                          )}

                          {currentDoc.category === 'incorporation' && (
                            <div className="rounded-2xl border-2 border-purple-200 bg-purple-50/20 p-5 dark:border-purple-900/60 dark:bg-slate-800/40 space-y-4">
                              <div className="flex items-center justify-between border-b border-purple-100 pb-3 dark:border-purple-900">
                                <div>
                                  <p className="text-sm font-black text-slate-900 dark:text-white uppercase">
                                    {currentDoc.title}
                                  </p>
                                  <p className="font-mono text-xs text-purple-700 dark:text-purple-400 font-bold">
                                    {currentDoc.details.documentNumber}
                                  </p>
                                </div>
                                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-bold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                                  <CheckCircle2 className="h-3 w-3" /> {currentDoc.verificationBadge}
                                </span>
                              </div>
                            </div>
                          )}

                          {/* Render Attributes Table */}
                          <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-800/40">
                            <h5 className="text-xs font-bold text-slate-900 dark:text-white mb-3 uppercase tracking-wider">
                              Verified Registry Attributes
                            </h5>
                            <dl className="grid grid-cols-1 gap-x-4 gap-y-2.5 sm:grid-cols-2 text-xs">
                              {currentDoc.previewContent.attributes.map((attr, i) => (
                                <div key={i} className="flex flex-col">
                                  <dt className="text-slate-400 text-[11px] font-medium">{attr.label}</dt>
                                  <dd className="font-semibold text-slate-900 dark:text-white mt-0.5">
                                    {attr.value}
                                  </dd>
                                </div>
                              ))}
                            </dl>
                          </div>

                          {/* Compliance Note */}
                          <div className="rounded-2xl border border-slate-100 bg-slate-50/50 p-4 text-xs text-slate-600 dark:border-slate-800 dark:bg-slate-800/20 dark:text-slate-400 space-y-1">
                            <p className="font-bold text-slate-800 dark:text-slate-200">
                              Verification &amp; Integrity Analysis:
                            </p>
                            <p>{currentDoc.previewContent.summaryNote}</p>
                          </div>

                          {/* Cryptographic SHA-256 Ledger Stamp */}
                          <div className="border-t border-slate-200 pt-4 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[10px] font-mono text-slate-400">
                            <div>
                              <span>SHA-256: </span>
                              <span className="text-indigo-600 dark:text-indigo-400 font-bold">
                                {currentDoc.previewContent.checksumSha256}
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-semibold">
                              <Lock className="h-3 w-3" />
                              <span>Encrypted AES-256 (DPDP 2023 Compliant)</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Modal Footer (Admin Decision & Navigation Bar) */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 bg-slate-50 px-6 py-4 dark:border-slate-800 dark:bg-slate-900">
                <div className="flex flex-wrap items-center gap-3 text-xs">
                  <span className="font-semibold text-slate-700 dark:text-slate-300">
                    Compliance Verification:
                  </span>
                  <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold">
                    <CheckCircle2 className="h-3.5 w-3.5" /> ID Matched
                  </span>
                  <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Address Valid
                  </span>
                  <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Penny Drop ₹1 OK
                  </span>
                  <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold">
                    <CheckCircle2 className="h-3.5 w-3.5" /> GSTN Active
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  {selectedAppForDocs.status === 'pending' ? (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          handleApproveSeller(selectedAppForDocs.id, selectedAppForDocs.businessName);
                          handleCloseDocViewer();
                        }}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-5 py-2 text-xs font-bold text-white shadow-md shadow-emerald-600/20 hover:bg-emerald-500 transition"
                      >
                        <Check className="h-4 w-4" />
                        <span>Approve Application</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setRejectModalApp(selectedAppForDocs);
                          setRejectReasonInput('');
                        }}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 bg-white px-4 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 dark:border-rose-900 dark:bg-slate-800 dark:text-rose-400 transition"
                      >
                        <X className="h-4 w-4" />
                        <span>Reject</span>
                      </button>
                    </>
                  ) : (
                    <span className="text-xs font-semibold text-slate-500">
                      Application status: <strong className="uppercase">{selectedAppForDocs.status}</strong>
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={handleCloseDocViewer}
                    className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 transition"
                  >
                    Close Dossier
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ========================================================================= */}
      {/* REJECTION REASON PROMPT MODAL                                             */}
      {/* ========================================================================= */}
      {rejectModalApp && (
        <div
          className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-150"
          onClick={(e) => {
            if (e.target === e.currentTarget) setRejectModalApp(null);
          }}
        >
          <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900 space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-rose-100 text-rose-600 dark:bg-rose-950 dark:text-rose-400">
                <AlertCircle className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Reject Seller Application
                </h3>
                <p className="text-xs text-slate-500">
                  {rejectModalApp.businessName} ({rejectModalApp.applicant})
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300">
              Please specify the compliance reason for rejecting this applicant. The customer will receive this feedback to rectify and re-submit:
            </p>

            <div className="space-y-1.5">
              {[
                'Address proof document illegible or older than 60 days',
                'Bank account name does not match legal applicant name',
                'GSTIN registration inactive or invalid on tax portal',
                'Government identity card copy blurry or expired',
              ].map((reason, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setRejectReasonInput(reason)}
                  className="w-full text-left rounded-xl border border-slate-200 bg-slate-50 p-2 text-xs text-slate-700 hover:border-indigo-300 hover:bg-indigo-50/50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 transition"
                >
                  • {reason}
                </button>
              ))}
            </div>

            <textarea
              rows={3}
              value={rejectReasonInput}
              onChange={(e) => setRejectReasonInput(e.target.value)}
              placeholder="Enter custom rejection reason or notes for the customer..."
              className="w-full rounded-2xl border border-slate-200 p-3 text-xs outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setRejectModalApp(null)}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  handleRejectSeller(
                    rejectModalApp.id,
                    rejectModalApp.businessName,
                    rejectReasonInput || 'Documents failed statutory compliance verification.'
                  );
                  setRejectModalApp(null);
                }}
                className="rounded-xl bg-rose-600 px-5 py-2 text-xs font-bold text-white hover:bg-rose-500 transition shadow-sm"
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
