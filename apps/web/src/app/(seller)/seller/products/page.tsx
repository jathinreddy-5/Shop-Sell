'use client';

import React, { useState } from 'react';
import {
  Plus,
  Search,
  Filter,
  Upload,
  Archive,
  Edit2,
  Check,
  X,
  Package,
  Eye,
  Info,
  FileText,
  Sparkles,
  ShieldCheck,
  Tag,
  Sliders,
  Layers,
  Trash2,
  ExternalLink,
  ChevronRight,
  Boxes,
} from 'lucide-react';
import { LoadingThreeDotsJumping } from '@/components/loading';

export interface ProductSpecifications {
  brandName: string;
  modelSeries: string;
  modelYear: string;
  countryOfOrigin: string;
  boxContents: string;
  warrantyDescription: string;
  manufacturer: string;
  packerContactInfo: string;
  itemTypeName: string;
  specificUses: string;
  unitCount: string;
  asin: string;
  customAttributes?: { key: string; value: string }[];
}

export interface MockProduct {
  id: string;
  name: string;
  category: string;
  price: number;
  compareAtPrice?: number;
  stock: number;
  salesCount: number;
  status: 'active' | 'draft' | 'archived';
  image: string;
  description: string;
  keyFeatures?: string[];
  specifications: ProductSpecifications;
}

const initialProducts: MockProduct[] = [
  {
    id: 'prod-001',
    name: 'Infinix Hot 70 Pro 5G (Titanium Shadow, 256GB)',
    category: 'Electronics & Mobiles',
    price: 18999,
    compareAtPrice: 24999,
    stock: 45,
    salesCount: 312,
    status: 'active',
    image: 'https://images.unsplash.com/photo-1598327105666-5b89351aff97?w=600&q=80',
    description:
      'The Infinix Hot 70 Pro 5G delivers flagship computing and optical brilliance. Featuring a 120Hz curved AMOLED eye-care display, a 108MP OIS-stabilized AI triple camera, and 68W HyperCharge for quick day-long endurance. Built with an aerospace-grade cooling chamber and MediaTek Dimensity 5G chipset for lag-free gaming and creator workflows.',
    keyFeatures: [
      '108MP OIS Ultra-Clear Triple Camera with Nightscape 4.0',
      '6.78-inch FHD+ 120Hz True-Color AMOLED Curved Display',
      '5000 mAh All-Day Battery with 68W Fast Super Charge',
      'MediaTek Dimensity 5G Octa-Core Processor with 12GB RAM Expansion',
      'Dual Stereo Speakers with Hi-Res Audio Certification & DTS',
    ],
    specifications: {
      brandName: 'Infinix',
      modelYear: '2026',
      countryOfOrigin: 'India',
      boxContents: 'Smartphone, 68W Fast Charger, Type-C Cable, SIM Ejector, Protective Case, User Manual',
      warrantyDescription: '1 Year Manufacturer domestic warranty on handset, 6 months on inbox accessories',
      manufacturer: 'Infinix Mobility Limited',
      modelSeries: 'Infinix Hot 70 Pro Series',
      specificUsesForProduct: 'Photography, High Performance Gaming, Multimedia Streaming',
      unitCount: '1 Count',
      itemTypeName: 'Smartphone',
      packerContactInformation: 'Infinix Mobility Limited, Plot No. 24, Sector 60, Noida, UP - 201301',
      asin: 'B0HJ4PNVSM',
      customAttributes: [
        { key: 'Color', value: 'Titanium Shadow' },
        { key: 'Internal Storage', value: '256GB UFS 3.1' },
        { key: 'Operating System', value: 'Android 15 with XOS 14' },
        { key: 'RAM', value: '12GB (8GB + 4GB Virtual)' },
      ],
    } as any,
  },
  {
    id: 'prod-002',
    name: 'AcousticPro True Wireless Earbuds (ANC 42dB)',
    category: 'Audio & Headphones',
    price: 3499,
    compareAtPrice: 4999,
    stock: 28,
    salesCount: 142,
    status: 'active',
    image: 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=600&q=80',
    description:
      'Engineered for discerning audiophiles, the AcousticPro True Wireless Earbuds combine 11mm custom beryllium diaphragm drivers with 42dB hybrid Active Noise Cancellation. Enjoy 36 hours of playtime with the ultra-compact USB-C fast-charging case and quad-mic beamforming for crystal-clear conference calls.',
    keyFeatures: [
      'Hybrid 42dB ANC with Transparency Ambient Mode',
      'Custom-tuned 11mm Beryllium Diaphragm Drivers',
      '36-Hour Battery Life with Fast Qi Wireless Charging',
      'Quad-Mic ENC Beamforming for Crystal-Clear Calling',
      'IPX5 Sweat & Water Resistance Rating',
    ],
    specifications: {
      brandName: 'AcousticPro',
      modelYear: '2026',
      countryOfOrigin: 'India',
      boxContents: '1 Pair TWS Earbuds, 1x Wireless Charging Case, 3x Silicone Ear Tip Pairs (S/M/L), 1x Type-C Cable, Guide',
      warrantyDescription: '1 Year Comprehensive Brand Replacement Warranty',
      manufacturer: 'AcousticPro Audio Labs India Pvt Ltd',
      modelSeries: 'AcousticPro Studio TWS Series',
      specificUsesForProduct: 'Hi-Fi Music Listening, Noise Isolation, Video Conferencing, Sports',
      unitCount: '1 Count',
      itemTypeName: 'True Wireless In-Ear Headphones',
      packerContactInformation: 'AcousticPro Logistics Hub, Sector 18, Gurugram, Haryana - 122015',
      asin: 'B09AUDIO01',
      customAttributes: [
        { key: 'Bluetooth Version', value: 'Bluetooth 5.4 Low Latency' },
        { key: 'Audio Codecs', value: 'LDAC, AAC, SBC' },
        { key: 'Fast Charge', value: '10 min charge = 3 hours playback' },
      ],
    } as any,
  },
  {
    id: 'prod-003',
    name: 'Noise Isolating ANC Studio Buds Pro',
    category: 'Audio & Headphones',
    price: 4299,
    compareAtPrice: 5999,
    stock: 14,
    salesCount: 89,
    status: 'active',
    image: 'https://images.unsplash.com/photo-1606220588913-b3aacb4d2f46?w=600&q=80',
    description:
      'Precision studio monitors engineered for lossless playback and adaptive noise suppression in busy metropolitan environments.',
    keyFeatures: [
      'Dual Balanced Armature + Dynamic Hybrid Acoustics',
      'Multipoint Bluetooth Pairing for Laptop & Phone',
      'Ergonomic Zero-Fatigue Memory Foam Tips',
    ],
    specifications: {
      brandName: 'SoundWave',
      modelYear: '2026',
      countryOfOrigin: 'India',
      boxContents: 'Earbuds, Charging Case, USB-C Cable, Warranty Card',
      warrantyDescription: '1 Year Manufacturer Domestic Warranty',
      manufacturer: 'SoundWave Technologies India Pvt Ltd',
      modelSeries: 'Studio ANC Series',
      specificUsesForProduct: 'Audio Editing, Studio Monitoring, Gaming',
      unitCount: '1 Count',
      itemTypeName: 'In-Ear Monitors',
      packerContactInformation: 'SoundWave Logistics, Whitefield, Bengaluru - 560066',
      asin: 'B0ANCSTUDIO',
      customAttributes: [{ key: 'Battery', value: '38 Hours Total' }],
    } as any,
  },
  {
    id: 'prod-004',
    name: 'Handcrafted Terracotta Clay Teapot (850ml)',
    category: 'Home & Kitchen',
    price: 1299,
    compareAtPrice: 1799,
    stock: 25,
    salesCount: 64,
    status: 'active',
    image: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=600&q=80',
    description:
      'Naturally cooled, 100% organic terracotta clay teapot individually wheel-thrown and wood-fired by master artisans in West Bengal. Free from lead, chemical glazes, and heavy metals, enhancing every brew with subtle earthy mineral notes.',
    keyFeatures: [
      '100% Natural Riverbed Clay — Lead & Cadmium Free',
      'Naturally Retains Heat & Enhances Tea Aromatics',
      'Artisanal Wood-Fired Matte Earth Finish',
    ],
    specifications: {
      brandName: 'Mitti Shilp',
      modelYear: '2026',
      countryOfOrigin: 'India',
      boxContents: '1x Terracotta Teapot with Lid, 2x Clay Kulhad Cups, Care Card',
      warrantyDescription: '30-Day Craftsmanship & Transit Safe Guarantee',
      manufacturer: 'Mitti Shilp Gramin Udyog, Bankura, West Bengal',
      modelSeries: 'Heritage Earth Series',
      specificUsesForProduct: 'Brewing Black, Green & Herbal Teas',
      unitCount: '1 Count (850ml)',
      itemTypeName: 'Earthenware Teapot',
      packerContactInformation: 'Shop:Sell Rural Artisan Cluster, Kolkata - 700091',
      asin: 'B0CLAYPOT01',
      customAttributes: [{ key: 'Material', value: 'Organic Earthenware Clay' }],
    } as any,
  },
];

const emptyProdForm = {
  id: '',
  name: '',
  category: 'Electronics & Mobiles',
  price: '',
  compareAtPrice: '',
  stock: '',
  image: '',
  description: '',
  keyFeaturesText: '',
  specifications: {
    brandName: '',
    modelSeries: '',
    modelYear: '2026',
    countryOfOrigin: 'India',
    boxContents: '',
    warrantyDescription: '1 Year Manufacturer domestic warranty',
    manufacturer: '',
    packerContactInfo: '',
    itemTypeName: '',
    specificUses: '',
    unitCount: '1 Count',
    asin: '',
    customAttributes: [] as { key: string; value: string }[],
  },
};

export default function SellerProductsPage() {
  const [products, setProducts] = useState<MockProduct[]>(initialProducts);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showCsvModal, setShowCsvModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  // Active tab in Add/Edit modal: 'basic' | 'description' | 'specs' | 'custom'
  const [modalTab, setModalTab] = useState<'basic' | 'description' | 'specs' | 'custom'>('basic');

  // Viewing single product specifications dossier
  const [selectedProductForView, setSelectedProductForView] = useState<MockProduct | null>(null);

  // Editing state
  const [isEditing, setIsEditing] = useState(false);
  const [formState, setFormState] = useState(emptyProdForm);

  // CSV text state
  const [csvText, setCsvText] = useState(
    'Name,Price,Stock,Category\nVintage Analog Headphones,5499,20,Audio & Headphones\nBraided 3.5mm Aux Cable,399,100,Audio & Headphones'
  );

  // Template autofill handler
  const handleApplyTemplate = (type: 'infinix' | 'audio' | 'terracotta') => {
    if (type === 'infinix') {
      setFormState({
        id: formState.id || '',
        name: 'Infinix Hot 70 Pro 5G (Titanium Shadow, 256GB)',
        category: 'Electronics & Mobiles',
        price: '18999',
        compareAtPrice: '24999',
        stock: '50',
        image: 'https://images.unsplash.com/photo-1598327105666-5b89351aff97?w=600&q=80',
        description:
          'Flagship power packed into an ultra-slim design. Features a 120Hz curved AMOLED panel, 108MP OIS AI camera, 68W fast charging, and MediaTek Dimensity 5G processing for demanding power users and mobile photographers.',
        keyFeaturesText:
          '108MP OIS Ultra-Clear Triple Camera\n6.78-inch FHD+ 120Hz AMOLED Curved Display\n5000 mAh Battery with 68W Fast Super Charge\nMediaTek Dimensity 5G Octa-Core Processor\nDual Stereo Speakers with Hi-Res Audio Certification',
        specifications: {
          brandName: 'Infinix',
          modelSeries: 'Infinix Hot 70 Pro Series',
          modelYear: '2026',
          countryOfOrigin: 'India',
          boxContents: 'Smartphone, 68W Adapter, USB-C Cable, SIM Ejector, TPU Case, User Manual',
          warrantyDescription: '1 Year Manufacturer domestic warranty',
          manufacturer: 'Infinix Mobility Limited',
          packerContactInfo: 'Infinix Mobility Limited, Shenzhen, China / Plot 24, Noida, UP',
          itemTypeName: 'Smartphone',
          specificUses: 'Photography, Gaming, Everyday Communication',
          unitCount: '1 Count',
          asin: 'B0HJ4PNVSM',
          customAttributes: [
            { key: 'Color', value: 'Titanium Shadow' },
            { key: 'Internal Storage', value: '256GB' },
            { key: 'RAM', value: '12GB' },
          ],
        },
      });
    } else if (type === 'audio') {
      setFormState({
        id: formState.id || '',
        name: 'AcousticPro Studio True Wireless Earbuds',
        category: 'Audio & Headphones',
        price: '3499',
        compareAtPrice: '4999',
        stock: '30',
        image: 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=600&q=80',
        description:
          'High-fidelity studio in-ear earbuds with 42dB hybrid Active Noise Cancellation, custom 11mm beryllium drivers, and 36-hour total playback with Qi wireless charging.',
        keyFeaturesText:
          'Hybrid 42dB ANC with Transparency Mode\n11mm Beryllium Acoustic Diaphragm\n36-Hour Extended Battery Life with Fast Qi Wireless Charge\nQuad-Mic ENC Beamforming for Crystal-Clear Calls',
        specifications: {
          brandName: 'AcousticPro',
          modelSeries: 'Studio ANC Series',
          modelYear: '2026',
          countryOfOrigin: 'India',
          boxContents: '1 Pair TWS Earbuds, 1x Charging Case, 3x Ear Tips, 1x Type-C Cable, Manual',
          warrantyDescription: '1 Year Comprehensive Brand Replacement Warranty',
          manufacturer: 'AcousticPro Audio Labs India Pvt Ltd',
          packerContactInfo: 'AcousticPro Logistics Hub, Sector 18, Gurugram, Haryana',
          itemTypeName: 'True Wireless In-Ear Headphones',
          specificUses: 'Hi-Fi Music Listening, Noise Isolation, Video Conferencing',
          unitCount: '1 Count',
          asin: 'B09AUDIO01',
          customAttributes: [
            { key: 'Bluetooth', value: 'Bluetooth 5.4' },
            { key: 'Water Resistance', value: 'IPX5' },
          ],
        },
      });
    } else {
      setFormState({
        id: formState.id || '',
        name: 'Handcrafted Terracotta Clay Teapot (850ml)',
        category: 'Home & Kitchen',
        price: '1299',
        compareAtPrice: '1799',
        stock: '25',
        image: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=600&q=80',
        description:
          'Naturally cooling, 100% organic terracotta clay teapot wheel-thrown and wood-fired by master artisans in West Bengal. 100% lead and cadmium free.',
        keyFeaturesText:
          '100% Natural Riverbed Clay\nLead & Cadmium Free Certified\nArtisanal Wood-Fired Matte Earth Finish\nRetains Heat Naturally & Enhances Tea Flavor',
        specifications: {
          brandName: 'Mitti Shilp',
          modelSeries: 'Heritage Earth Series',
          modelYear: '2026',
          countryOfOrigin: 'India',
          boxContents: '1x Terracotta Teapot with Lid, 2x Clay Kulhad Cups',
          warrantyDescription: '30-Day Craftsmanship & Transit Safe Guarantee',
          manufacturer: 'Mitti Shilp Gramin Udyog, Bankura, West Bengal',
          packerContactInfo: 'Shop:Sell Rural Artisan Cluster, Kolkata - 700091',
          itemTypeName: 'Earthenware Teapot',
          specificUses: 'Brewing Black, Green & Herbal Teas',
          unitCount: '1 Count (850ml)',
          asin: 'B0CLAYPOT01',
          customAttributes: [{ key: 'Material', value: 'Organic Earthenware Clay' }],
        },
      });
    }
  };

  // Open modal for editing
  const handleOpenEdit = (p: MockProduct) => {
    setIsEditing(true);
    setFormState({
      id: p.id,
      name: p.name,
      category: p.category,
      price: String(p.price),
      compareAtPrice: p.compareAtPrice ? String(p.compareAtPrice) : '',
      stock: String(p.stock),
      image: p.image,
      description: p.description || '',
      keyFeaturesText: p.keyFeatures ? p.keyFeatures.join('\n') : '',
      specifications: {
        brandName: p.specifications?.brandName || '',
        modelSeries: p.specifications?.modelSeries || '',
        modelYear: p.specifications?.modelYear || '2026',
        countryOfOrigin: p.specifications?.countryOfOrigin || 'India',
        boxContents: p.specifications?.boxContents || '',
        warrantyDescription: p.specifications?.warrantyDescription || '1 Year Manufacturer domestic warranty',
        manufacturer: p.specifications?.manufacturer || '',
        packerContactInfo: p.specifications?.packerContactInfo || (p.specifications as any)?.packerContactInformation || '',
        itemTypeName: p.specifications?.itemTypeName || '',
        specificUses: p.specifications?.specificUses || (p.specifications as any)?.specificUsesForProduct || '',
        unitCount: p.specifications?.unitCount || '1 Count',
        asin: p.specifications?.asin || '',
        customAttributes: p.specifications?.customAttributes || [],
      },
    });
    setModalTab('basic');
    setShowAddModal(true);
  };

  // Open modal for new product
  const handleOpenAdd = () => {
    setIsEditing(false);
    setFormState(emptyProdForm);
    setModalTab('basic');
    setShowAddModal(true);
  };

  // Save (Create or Update)
  const handleSaveProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formState.name || !formState.price || !formState.stock) {
      setModalTab('basic');
      return;
    }

    setIsSaving(true);
    setTimeout(() => {
      const keyFeatures = formState.keyFeaturesText
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean);

      const productPayload: MockProduct = {
        id: isEditing && formState.id ? formState.id : `prod-${Date.now()}`,
        name: formState.name,
        category: formState.category,
        price: parseFloat(formState.price) || 0,
        compareAtPrice: formState.compareAtPrice ? parseFloat(formState.compareAtPrice) : undefined,
        stock: parseInt(formState.stock, 10) || 0,
        salesCount: isEditing ? (products.find((x) => x.id === formState.id)?.salesCount || 0) : 0,
        status: 'active',
        image:
          formState.image ||
          'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600&q=80',
        description:
          formState.description ||
          `${formState.name} — Verified by Shop:Sell quality assurance and packaged securely for insured express transit across India.`,
        keyFeatures: keyFeatures.length > 0 ? keyFeatures : undefined,
        specifications: {
          brandName: formState.specifications.brandName || 'Verified Merchant',
          modelSeries: formState.specifications.modelSeries || formState.name,
          modelYear: formState.specifications.modelYear || '2026',
          countryOfOrigin: formState.specifications.countryOfOrigin || 'India',
          boxContents: formState.specifications.boxContents || 'Product, Standard Accessories, Documentation',
          warrantyDescription:
            formState.specifications.warrantyDescription || '1 Year Manufacturer domestic warranty',
          manufacturer: formState.specifications.manufacturer || 'Apex Tech India / Partner Facility',
          packerContactInfo:
            formState.specifications.packerContactInfo || 'Shop:Sell Express Fulfilment Network, Mumbai - 400001',
          itemTypeName: formState.specifications.itemTypeName || formState.category,
          specificUses: formState.specifications.specificUses || 'Daily General Use',
          unitCount: formState.specifications.unitCount || '1 Count',
          asin: formState.specifications.asin || `SS-${Math.random().toString(36).substring(2, 10).toUpperCase()}`,
          customAttributes: formState.specifications.customAttributes || [],
        },
      };

      if (isEditing) {
        setProducts(products.map((p) => (p.id === formState.id ? productPayload : p)));
      } else {
        setProducts([productPayload, ...products]);
      }

      setIsSaving(false);
      setShowAddModal(false);
      setFormState(emptyProdForm);
    }, 450);
  };

  const handleArchive = (id: string) => {
    setProducts(
      products.map((p) =>
        p.id === id ? { ...p, status: p.status === 'archived' ? 'active' : 'archived' } : p
      )
    );
  };

  const handleCsvImport = () => {
    setIsImporting(true);
    setTimeout(() => {
      const lines = csvText.trim().split('\n').slice(1);
      const imported: MockProduct[] = lines.flatMap((line, idx) => {
        const parts = line.split(',');
        if (parts.length >= 3) {
          return [
            {
              id: `prod-csv-${Date.now()}-${idx}`,
              name: parts[0].trim(),
              price: parseFloat(parts[1].trim()) || 999,
              stock: parseInt(parts[2].trim(), 10) || 10,
              category: parts[3]?.trim() || 'General',
              salesCount: 0,
              status: 'active' as const,
              image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=200&q=80',
              description: `${parts[0].trim()} listed via bulk CSV import.`,
              specifications: {
                brandName: 'Generic Merchant',
                modelSeries: parts[0].trim(),
                modelYear: '2026',
                countryOfOrigin: 'India',
                boxContents: 'Standard Packaging',
                warrantyDescription: '1 Year Manufacturer domestic warranty',
                manufacturer: 'Verified Merchant Hub',
                packerContactInfo: 'Shop:Sell Hub, India',
                itemTypeName: parts[3]?.trim() || 'General',
                specificUses: 'General Use',
                unitCount: '1 Count',
                asin: `CSV-${idx}`,
              },
            },
          ];
        }
        return [];
      });

      setProducts([...imported, ...products]);
      setIsImporting(false);
      setShowCsvModal(false);
    }, 500);
  };

  // Add / remove custom attribute in form
  const handleAddCustomAttr = () => {
    setFormState({
      ...formState,
      specifications: {
        ...formState.specifications,
        customAttributes: [
          ...(formState.specifications.customAttributes || []),
          { key: '', value: '' },
        ],
      },
    });
  };

  const handleUpdateCustomAttr = (idx: number, field: 'key' | 'value', val: string) => {
    const list = [...(formState.specifications.customAttributes || [])];
    if (list[idx]) {
      list[idx][field] = val;
      setFormState({
        ...formState,
        specifications: {
          ...formState.specifications,
          customAttributes: list,
        },
      });
    }
  };

  const handleRemoveCustomAttr = (idx: number) => {
    const list = [...(formState.specifications.customAttributes || [])];
    list.splice(idx, 1);
    setFormState({
      ...formState,
      specifications: {
        ...formState.specifications,
        customAttributes: list,
      },
    });
  };

  const filtered = products.filter((p) => {
    const matchSearch =
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.id.toLowerCase().includes(search.toLowerCase()) ||
      p.category.toLowerCase().includes(search.toLowerCase()) ||
      p.specifications?.brandName?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'all' || p.status === statusFilter;
    return matchSearch && matchStatus;
  });

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
            Product Catalog & Listings
          </h1>
          <p className="text-xs text-slate-500">
            Manage your store inventory, rich descriptions, and statutory technical specifications
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setShowCsvModal(true)}
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"
          >
            <Upload className="h-3.5 w-3.5" />
            <span>CSV Import</span>
          </button>
          <button
            onClick={handleOpenAdd}
            className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-md shadow-emerald-600/20 hover:bg-emerald-500 transition"
          >
            <Plus className="h-4 w-4" />
            <span>Add New Product Listing</span>
          </button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="relative max-w-sm flex-1">
          <input
            type="text"
            placeholder="Search products by name, brand, SKU..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-4 text-xs outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 dark:border-slate-800 dark:bg-slate-900 dark:text-white"
          />
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-slate-400" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-700 outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"
          >
            <option value="all">All Statuses ({products.length})</option>
            <option value="active">Active Only</option>
            <option value="draft">Drafts</option>
            <option value="archived">Archived</option>
          </select>
        </div>
      </div>

      {/* Products Table */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-800 dark:bg-slate-800/50 dark:text-slate-400">
              <tr>
                <th className="p-4 font-semibold">Product & Details</th>
                <th className="p-4 font-semibold">Brand & Specs</th>
                <th className="p-4 font-semibold">Price (INR)</th>
                <th className="p-4 font-semibold">Stock</th>
                <th className="p-4 font-semibold">Sales</th>
                <th className="p-4 font-semibold">Status</th>
                <th className="p-4 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filtered.map((p) => {
                const brand = p.specifications?.brandName || 'Brand N/A';
                const model = p.specifications?.modelSeries || p.name;
                const asin = p.specifications?.asin || p.id;
                return (
                  <tr key={p.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <img
                          src={p.image}
                          alt={p.name}
                          className="h-12 w-12 rounded-xl object-cover border border-slate-200 dark:border-slate-800 shrink-0"
                        />
                        <div className="max-w-xs sm:max-w-sm">
                          <div className="font-bold text-slate-900 dark:text-white line-clamp-1">
                            {p.name}
                          </div>
                          <div className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">
                            {p.category}
                          </div>
                          <div className="font-mono text-[10px] text-slate-400 mt-0.5">
                            ID: {p.id}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="space-y-1">
                        <div className="inline-flex items-center gap-1 rounded bg-slate-100 px-2 py-0.5 font-bold text-[11px] text-slate-800 dark:bg-slate-800 dark:text-slate-200">
                          {brand}
                        </div>
                        <div className="text-[10px] text-slate-500 line-clamp-1">
                          Model: {model}
                        </div>
                        <div className="font-mono text-[10px] text-[#059669] dark:text-emerald-400">
                          ASIN: {asin}
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="font-bold text-slate-900 dark:text-white text-sm">
                        ₹{p.price.toLocaleString('en-IN')}
                      </div>
                      {p.compareAtPrice && p.compareAtPrice > p.price && (
                        <div className="text-[10px] text-slate-400 line-through">
                          ₹{p.compareAtPrice.toLocaleString('en-IN')}
                        </div>
                      )}
                    </td>
                    <td className="p-4">
                      <span
                        className={`font-semibold ${
                          p.stock === 0
                            ? 'text-rose-600'
                            : p.stock <= 5
                            ? 'text-amber-600'
                            : 'text-slate-800 dark:text-slate-200'
                        }`}
                      >
                        {p.stock} units
                      </span>
                      {p.stock <= 5 && p.stock > 0 && (
                        <span className="ml-1.5 rounded bg-amber-100 px-1 py-0.5 text-[9px] font-bold text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                          Low Stock
                        </span>
                      )}
                    </td>
                    <td className="p-4 text-slate-600 dark:text-slate-300">{p.salesCount}</td>
                    <td className="p-4">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                          p.status === 'active'
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                            : p.status === 'draft'
                            ? 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                            : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                        }`}
                      >
                        {p.status}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => setSelectedProductForView(p)}
                          className="flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 transition"
                          title="View Complete Specifications & Description"
                        >
                          <Eye className="h-3.5 w-3.5 text-[#059669] dark:text-emerald-400" />
                          <span>Specs</span>
                        </button>
                        <button
                          onClick={() => handleOpenEdit(p)}
                          className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-white transition"
                          title="Edit Product & Description"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => handleArchive(p.id)}
                          className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40 transition"
                          title="Archive Product"
                        >
                          <Archive className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 1. ADD / EDIT PRODUCT MODAL WITH COMPLETE DESCRIPTION & SPECIFICATIONS    */}
      {/* ========================================================================= */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 p-4 backdrop-blur-sm overflow-y-auto">
          <div className="w-full max-w-3xl my-8 rounded-3xl bg-white shadow-2xl dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400">
                  <Package className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                    {isEditing ? 'Edit Product & Specifications' : 'Add New Product Listing'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Provide complete commercial descriptions, Legal Metrology, and statutory specs
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Quick Prefill Templates Banner */}
            <div className="bg-slate-50 px-6 py-2.5 border-b border-slate-100 dark:bg-slate-850 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2 shrink-0">
              <span className="text-[11px] font-semibold text-slate-500 flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                Prefill Reference Template:
              </span>
              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => handleApplyTemplate('infinix')}
                  className="rounded-lg bg-white px-2.5 py-1 text-[11px] font-bold text-slate-800 border border-slate-200 shadow-xs hover:border-emerald-500 hover:text-emerald-600 dark:bg-slate-800 dark:text-white dark:border-slate-700 transition"
                >
                  📱 Infinix Smartphone (Reference)
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyTemplate('audio')}
                  className="rounded-lg bg-white px-2.5 py-1 text-[11px] font-bold text-slate-800 border border-slate-200 shadow-xs hover:border-emerald-500 hover:text-emerald-600 dark:bg-slate-800 dark:text-white dark:border-slate-700 transition"
                >
                  🎧 AcousticPro Audio
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyTemplate('terracotta')}
                  className="rounded-lg bg-white px-2.5 py-1 text-[11px] font-bold text-slate-800 border border-slate-200 shadow-xs hover:border-emerald-500 hover:text-emerald-600 dark:bg-slate-800 dark:text-white dark:border-slate-700 transition"
                >
                  🏺 Terracotta Artisan
                </button>
              </div>
            </div>

            {/* Modal Tabs Navigation */}
            <div className="flex border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-6 shrink-0">
              <button
                type="button"
                onClick={() => setModalTab('basic')}
                className={`py-3 px-4 text-xs font-bold border-b-2 transition ${
                  modalTab === 'basic'
                    ? 'border-emerald-600 text-emerald-600 dark:border-emerald-400 dark:text-emerald-400'
                    : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400'
                }`}
              >
                1. Basic Info & Pricing
              </button>
              <button
                type="button"
                onClick={() => setModalTab('description')}
                className={`py-3 px-4 text-xs font-bold border-b-2 transition ${
                  modalTab === 'description'
                    ? 'border-emerald-600 text-emerald-600 dark:border-emerald-400 dark:text-emerald-400'
                    : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400'
                }`}
              >
                2. Complete Description
              </button>
              <button
                type="button"
                onClick={() => setModalTab('specs')}
                className={`py-3 px-4 text-xs font-bold border-b-2 transition ${
                  modalTab === 'specs'
                    ? 'border-emerald-600 text-emerald-600 dark:border-emerald-400 dark:text-emerald-400'
                    : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400'
                }`}
              >
                3. Technical & Statutory Specs
              </button>
              <button
                type="button"
                onClick={() => setModalTab('custom')}
                className={`py-3 px-4 text-xs font-bold border-b-2 transition ${
                  modalTab === 'custom'
                    ? 'border-emerald-600 text-emerald-600 dark:border-emerald-400 dark:text-emerald-400'
                    : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400'
                }`}
              >
                4. Custom Attributes ({formState.specifications.customAttributes?.length || 0})
              </button>
            </div>

            {/* Modal Body Form */}
            <form onSubmit={handleSaveProduct} className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* TAB 1: BASIC INFO & PRICING */}
              {modalTab === 'basic' && (
                <div className="space-y-4 text-xs">
                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-200 mb-1">
                      Product Name *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Infinix Hot 70 Pro 5G / Handmade Terracotta Teapot"
                      value={formState.name}
                      onChange={(e) => setFormState({ ...formState, name: e.target.value })}
                      className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-xs outline-none focus:border-emerald-600 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block font-bold text-slate-700 dark:text-slate-200 mb-1">
                        Category *
                      </label>
                      <select
                        value={formState.category}
                        onChange={(e) => setFormState({ ...formState, category: e.target.value })}
                        className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-xs outline-none focus:border-emerald-600 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                      >
                        <option value="Electronics & Mobiles">Electronics & Mobiles</option>
                        <option value="Audio & Headphones">Audio & Headphones</option>
                        <option value="Home & Kitchen">Home & Kitchen</option>
                        <option value="Fashion & Apparel">Fashion & Apparel</option>
                        <option value="Beauty & Personal Care">Beauty & Personal Care</option>
                        <option value="Artisanal Handicrafts">Artisanal Handicrafts</option>
                      </select>
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 dark:text-slate-200 mb-1">
                        Inventory Stock (Units) *
                      </label>
                      <input
                        type="number"
                        required
                        min="0"
                        placeholder="25"
                        value={formState.stock}
                        onChange={(e) => setFormState({ ...formState, stock: e.target.value })}
                        className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-xs outline-none focus:border-emerald-600 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block font-bold text-slate-700 dark:text-slate-200 mb-1">
                        Selling Price (INR ₹) *
                      </label>
                      <input
                        type="number"
                        required
                        min="1"
                        placeholder="18999"
                        value={formState.price}
                        onChange={(e) => setFormState({ ...formState, price: e.target.value })}
                        className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-xs outline-none focus:border-emerald-600 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 dark:text-slate-200 mb-1">
                        Compare-at MRP Price (INR ₹) (Optional)
                      </label>
                      <input
                        type="number"
                        placeholder="24999"
                        value={formState.compareAtPrice}
                        onChange={(e) => setFormState({ ...formState, compareAtPrice: e.target.value })}
                        className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-xs outline-none focus:border-emerald-600 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-200 mb-1">
                      Product Image URL (Cloudflare R2 / Public CDN)
                    </label>
                    <input
                      type="url"
                      placeholder="https://images.unsplash.com/..."
                      value={formState.image}
                      onChange={(e) => setFormState({ ...formState, image: e.target.value })}
                      className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-xs outline-none focus:border-emerald-600 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    />
                    {formState.image && (
                      <div className="mt-2 flex items-center gap-3">
                        <img
                          src={formState.image}
                          alt="Preview"
                          className="h-14 w-14 rounded-xl object-cover border border-slate-200"
                        />
                        <span className="text-[11px] text-emerald-600 font-semibold">
                          Image preview active
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 2: COMPLETE DESCRIPTION & BULLET HIGHLIGHTS */}
              {modalTab === 'description' && (
                <div className="space-y-4 text-xs">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="font-bold text-slate-700 dark:text-slate-200">
                        Complete Product Description *
                      </label>
                      <span className="text-[11px] text-slate-400">
                        Detailed overview shown to customers
                      </span>
                    </div>
                    <textarea
                      rows={6}
                      placeholder="Provide comprehensive details about the product, architecture, key materials, craftsmanship, benefits, usage, and compatibility..."
                      value={formState.description}
                      onChange={(e) => setFormState({ ...formState, description: e.target.value })}
                      className="w-full rounded-xl border border-slate-300 p-3.5 text-xs leading-relaxed outline-none focus:border-emerald-600 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="font-bold text-slate-700 dark:text-slate-200">
                        Key Features & Highlights (One per line)
                      </label>
                      <span className="text-[11px] text-slate-400">Shown as bulleted checkmarks</span>
                    </div>
                    <textarea
                      rows={5}
                      placeholder="e.g.&#10;108MP OIS Ultra-Clear Triple Camera&#10;6.78-inch FHD+ 120Hz Curved AMOLED Display&#10;5000 mAh Battery with 68W Fast Super Charge"
                      value={formState.keyFeaturesText}
                      onChange={(e) => setFormState({ ...formState, keyFeaturesText: e.target.value })}
                      className="w-full rounded-xl border border-slate-300 p-3.5 text-xs font-mono outline-none focus:border-emerald-600 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    />
                  </div>
                </div>
              )}

              {/* TAB 3: TECHNICAL & STATUTORY SPECIFICATIONS (FROM USER REFERENCE IMAGE) */}
              {modalTab === 'specs' && (
                <div className="space-y-5 text-xs">
                  <div className="rounded-2xl bg-emerald-50/70 p-3.5 border border-emerald-100 dark:bg-emerald-950/40 dark:border-emerald-900/50 flex items-start gap-3">
                    <ShieldCheck className="h-5 w-5 text-[#059669] dark:text-emerald-400 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-bold text-emerald-950 dark:text-emerald-200">
                        Statutory Technical & Legal Metrology Details
                      </h4>
                      <p className="text-[11px] text-emerald-700 dark:text-emerald-300 mt-0.5">
                        These fields power the mandatory two-column specifications table (e.g. Brand Name, Model Year, Country of Origin, Box Contents, Warranty, Manufacturer, ASIN) shown to shoppers under Indian e-commerce compliance.
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Brand Name */}
                    <div>
                      <label className="block font-bold text-slate-700 dark:text-slate-200 mb-1">
                        Brand Name
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Infinix / AcousticPro"
                        value={formState.specifications.brandName}
                        onChange={(e) =>
                          setFormState({
                            ...formState,
                            specifications: { ...formState.specifications, brandName: e.target.value },
                          })
                        }
                        className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-xs outline-none focus:border-emerald-600 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                      />
                    </div>

                    {/* Model Series */}
                    <div>
                      <label className="block font-bold text-slate-700 dark:text-slate-200 mb-1">
                        Model Series
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Infinix Hot 70 Pro Series"
                        value={formState.specifications.modelSeries}
                        onChange={(e) =>
                          setFormState({
                            ...formState,
                            specifications: { ...formState.specifications, modelSeries: e.target.value },
                          })
                        }
                        className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-xs outline-none focus:border-emerald-600 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                      />
                    </div>

                    {/* Model Year */}
                    <div>
                      <label className="block font-bold text-slate-700 dark:text-slate-200 mb-1">
                        Model Year
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. 2026"
                        value={formState.specifications.modelYear}
                        onChange={(e) =>
                          setFormState({
                            ...formState,
                            specifications: { ...formState.specifications, modelYear: e.target.value },
                          })
                        }
                        className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-xs outline-none focus:border-emerald-600 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                      />
                    </div>

                    {/* Country of Origin */}
                    <div>
                      <label className="block font-bold text-slate-700 dark:text-slate-200 mb-1">
                        Country of Origin
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. India"
                        value={formState.specifications.countryOfOrigin}
                        onChange={(e) =>
                          setFormState({
                            ...formState,
                            specifications: { ...formState.specifications, countryOfOrigin: e.target.value },
                          })
                        }
                        className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-xs outline-none focus:border-emerald-600 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                      />
                    </div>

                    {/* Item Type Name */}
                    <div>
                      <label className="block font-bold text-slate-700 dark:text-slate-200 mb-1">
                        Item Type Name
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Smartphone / True Wireless Earbuds"
                        value={formState.specifications.itemTypeName}
                        onChange={(e) =>
                          setFormState({
                            ...formState,
                            specifications: { ...formState.specifications, itemTypeName: e.target.value },
                          })
                        }
                        className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-xs outline-none focus:border-emerald-600 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                      />
                    </div>

                    {/* Unit Count */}
                    <div>
                      <label className="block font-bold text-slate-700 dark:text-slate-200 mb-1">
                        Unit Count
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. 1 Count / 500 grams"
                        value={formState.specifications.unitCount}
                        onChange={(e) =>
                          setFormState({
                            ...formState,
                            specifications: { ...formState.specifications, unitCount: e.target.value },
                          })
                        }
                        className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-xs outline-none focus:border-emerald-600 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                      />
                    </div>

                    {/* ASIN / SKU */}
                    <div>
                      <label className="block font-bold text-slate-700 dark:text-slate-200 mb-1">
                        ASIN / SKU Identifier
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. B0HJ4PNVSM"
                        value={formState.specifications.asin}
                        onChange={(e) =>
                          setFormState({
                            ...formState,
                            specifications: { ...formState.specifications, asin: e.target.value },
                          })
                        }
                        className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-xs outline-none focus:border-emerald-600 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                      />
                    </div>

                    {/* Specific Uses For Product */}
                    <div>
                      <label className="block font-bold text-slate-700 dark:text-slate-200 mb-1">
                        Specific Uses For Product
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Photography, High Performance Gaming"
                        value={formState.specifications.specificUses}
                        onChange={(e) =>
                          setFormState({
                            ...formState,
                            specifications: { ...formState.specifications, specificUses: e.target.value },
                          })
                        }
                        className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-xs outline-none focus:border-emerald-600 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                      />
                    </div>
                  </div>

                  {/* Box Contents */}
                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-200 mb-1">
                      Box Contents (What is in the box?)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Smartphone, 68W Adapter, Type-C Cable, SIM Eject Tool, Protective Case, User Manual"
                      value={formState.specifications.boxContents}
                      onChange={(e) =>
                        setFormState({
                          ...formState,
                          specifications: { ...formState.specifications, boxContents: e.target.value },
                        })
                      }
                      className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-xs outline-none focus:border-emerald-600 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    />
                  </div>

                  {/* Warranty Description */}
                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-200 mb-1">
                      Warranty Description
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 1 Year Manufacturer domestic warranty"
                      value={formState.specifications.warrantyDescription}
                      onChange={(e) =>
                        setFormState({
                          ...formState,
                          specifications: {
                            ...formState.specifications,
                            warrantyDescription: e.target.value,
                          },
                        })
                      }
                      className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-xs outline-none focus:border-emerald-600 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Manufacturer */}
                    <div>
                      <label className="block font-bold text-slate-700 dark:text-slate-200 mb-1">
                        Manufacturer
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Infinix Mobility Limited"
                        value={formState.specifications.manufacturer}
                        onChange={(e) =>
                          setFormState({
                            ...formState,
                            specifications: { ...formState.specifications, manufacturer: e.target.value },
                          })
                        }
                        className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-xs outline-none focus:border-emerald-600 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                      />
                    </div>

                    {/* Packer Contact Information */}
                    <div>
                      <label className="block font-bold text-slate-700 dark:text-slate-200 mb-1">
                        Packer Contact Information
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Infinix Mobility Limited, Shenzhen, China / Plot 24, Noida, UP"
                        value={formState.specifications.packerContactInfo}
                        onChange={(e) =>
                          setFormState({
                            ...formState,
                            specifications: { ...formState.specifications, packerContactInfo: e.target.value },
                          })
                        }
                        className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-xs outline-none focus:border-emerald-600 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 4: CUSTOM KEY-VALUE ATTRIBUTES */}
              {modalTab === 'custom' && (
                <div className="space-y-4 text-xs">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-bold text-slate-900 dark:text-white">
                        Custom Product Specifications
                      </h4>
                      <p className="text-[11px] text-slate-500">
                        Add tailored key-value pairs (e.g. Battery, Screen, RAM, Material, Color, Dimensions)
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleAddCustomAttr}
                      className="flex items-center gap-1 rounded-xl bg-slate-100 px-3 py-1.5 font-bold text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      <span>Add Attribute</span>
                    </button>
                  </div>

                  {(!formState.specifications.customAttributes ||
                    formState.specifications.customAttributes.length === 0) && (
                    <div className="rounded-2xl border border-dashed border-slate-200 p-8 text-center dark:border-slate-800">
                      <Sliders className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                      <p className="text-xs text-slate-500">No custom attributes added yet.</p>
                      <button
                        type="button"
                        onClick={handleAddCustomAttr}
                        className="mt-2 text-xs font-bold text-emerald-600 hover:underline"
                      >
                        + Add your first custom specification
                      </button>
                    </div>
                  )}

                  <div className="space-y-2.5">
                    {formState.specifications.customAttributes?.map((attr, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <input
                          type="text"
                          placeholder="Attribute Name (e.g. Battery Capacity)"
                          value={attr.key}
                          onChange={(e) => handleUpdateCustomAttr(idx, 'key', e.target.value)}
                          className="flex-1 rounded-xl border border-slate-300 px-3 py-2 text-xs outline-none focus:border-emerald-600 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                        />
                        <input
                          type="text"
                          placeholder="Value (e.g. 5000 mAh Li-Polymer)"
                          value={attr.value}
                          onChange={(e) => handleUpdateCustomAttr(idx, 'value', e.target.value)}
                          className="flex-1 rounded-xl border border-slate-300 px-3 py-2 text-xs outline-none focus:border-emerald-600 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                        />
                        <button
                          type="button"
                          onClick={() => handleRemoveCustomAttr(idx)}
                          className="rounded-xl p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40"
                          title="Remove row"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Modal Footer */}
              <div className="flex items-center justify-between border-t border-slate-100 pt-4 dark:border-slate-800 shrink-0">
                <div className="text-[11px] text-slate-400">
                  {modalTab === 'basic' && 'Step 1 of 4 • Basic Information'}
                  {modalTab === 'description' && 'Step 2 of 4 • Description & Highlights'}
                  {modalTab === 'specs' && 'Step 3 of 4 • Technical Specifications'}
                  {modalTab === 'custom' && 'Step 4 of 4 • Custom Attributes'}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="rounded-xl border border-slate-200 px-4 py-2.5 font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 font-bold text-white shadow-md shadow-emerald-600/20 hover:bg-emerald-500 disabled:opacity-50 transition"
                  >
                    {isSaving ? (
                      <LoadingThreeDotsJumping
                        size={6}
                        jumpHeight={8}
                        gap={4}
                        color="#FFFFFF"
                        label="Saving listing"
                      />
                    ) : (
                      <>
                        <Check className="h-4 w-4" />
                        <span>{isEditing ? 'Save Changes' : 'Save & Publish Listing'}</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. PRODUCT SPECIFICATIONS & DESCRIPTION DOSSIER MODAL (LIKE REFERENCE)    */}
      {/* ========================================================================= */}
      {selectedProductForView && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 p-4 backdrop-blur-sm overflow-y-auto">
          <div className="w-full max-w-3xl my-8 rounded-3xl bg-white shadow-2xl dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <img
                  src={selectedProductForView.image}
                  alt={selectedProductForView.name}
                  className="h-12 w-12 rounded-xl object-cover border border-slate-200 shrink-0"
                />
                <div>
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                      Active Listing
                    </span>
                    <span className="text-[11px] text-slate-400 font-mono">
                      ID: {selectedProductForView.id}
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white line-clamp-1 mt-0.5">
                    {selectedProductForView.name}
                  </h3>
                </div>
              </div>
              <button
                onClick={() => setSelectedProductForView(null)}
                className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Dossier Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 text-xs">
              {/* Price & Commercial summary */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-3.5 dark:border-slate-800 dark:bg-slate-800/40">
                  <div className="text-[11px] text-slate-500 font-semibold">Selling Price</div>
                  <div className="text-base font-black text-slate-900 dark:text-white mt-1">
                    ₹{selectedProductForView.price.toLocaleString('en-IN')}
                  </div>
                </div>
                <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-3.5 dark:border-slate-800 dark:bg-slate-800/40">
                  <div className="text-[11px] text-slate-500 font-semibold">Inventory</div>
                  <div className="text-base font-black text-slate-900 dark:text-white mt-1">
                    {selectedProductForView.stock} Units
                  </div>
                </div>
                <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-3.5 dark:border-slate-800 dark:bg-slate-800/40">
                  <div className="text-[11px] text-slate-500 font-semibold">Category</div>
                  <div className="text-xs font-bold text-slate-900 dark:text-white mt-1 line-clamp-1">
                    {selectedProductForView.category}
                  </div>
                </div>
                <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-3.5 dark:border-slate-800 dark:bg-slate-800/40">
                  <div className="text-[11px] text-slate-500 font-semibold">Total Sales</div>
                  <div className="text-base font-black text-emerald-600 mt-1">
                    {selectedProductForView.salesCount} Orders
                  </div>
                </div>
              </div>

              {/* Complete Description Section */}
              <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-800/40 space-y-3">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-emerald-600" />
                  <h4 className="font-bold text-slate-900 dark:text-white text-xs">
                    Complete Product Description
                  </h4>
                </div>
                <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-300">
                  {selectedProductForView.description}
                </p>
                {selectedProductForView.keyFeatures && selectedProductForView.keyFeatures.length > 0 && (
                  <div className="pt-2 border-t border-slate-100 dark:border-slate-700/60">
                    <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                      Key Highlights:
                    </span>
                    <ul className="mt-2 space-y-1.5">
                      {selectedProductForView.keyFeatures.map((feat, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-slate-600 dark:text-slate-300">
                          <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0 mt-0.5" />
                          <span>{feat}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* Complete Specifications Table (EXACT FORMAT AS REFERENCE IMAGE) */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-[#059669]" />
                    <h4 className="font-bold text-slate-900 dark:text-white text-xs">
                      Technical & Statutory Specifications
                    </h4>
                  </div>
                  <span className="text-[11px] text-slate-400">
                    Legal Metrology & E-Commerce Compliance
                  </span>
                </div>

                <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs dark:border-slate-800 dark:bg-slate-900">
                  <table className="w-full text-left text-xs">
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                        <td className="w-1/3 py-3 px-4 font-bold text-slate-900 dark:text-slate-200">
                          Brand Name
                        </td>
                        <td className="w-2/3 py-3 px-4 text-slate-700 dark:text-slate-300">
                          {selectedProductForView.specifications?.brandName || 'Infinix'}
                        </td>
                      </tr>
                      <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                        <td className="py-3 px-4 font-bold text-slate-900 dark:text-slate-200">
                          Model Year
                        </td>
                        <td className="py-3 px-4 text-slate-700 dark:text-slate-300">
                          {selectedProductForView.specifications?.modelYear || '2026'}
                        </td>
                      </tr>
                      <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                        <td className="py-3 px-4 font-bold text-slate-900 dark:text-slate-200">
                          Country of Origin
                        </td>
                        <td className="py-3 px-4 text-slate-700 dark:text-slate-300">
                          {selectedProductForView.specifications?.countryOfOrigin || 'India'}
                        </td>
                      </tr>
                      <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                        <td className="py-3 px-4 font-bold text-slate-900 dark:text-slate-200">
                          Box Contents
                        </td>
                        <td className="py-3 px-4 text-slate-700 dark:text-slate-300">
                          {selectedProductForView.specifications?.boxContents || 'Smartphone, Adapter, Cable, Guide'}
                        </td>
                      </tr>
                      <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                        <td className="py-3 px-4 font-bold text-slate-900 dark:text-slate-200">
                          Warranty Description
                        </td>
                        <td className="py-3 px-4 text-slate-700 dark:text-slate-300">
                          {selectedProductForView.specifications?.warrantyDescription ||
                            '1 Year Manufacturer domestic warranty'}
                        </td>
                      </tr>
                      <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                        <td className="py-3 px-4 font-bold text-slate-900 dark:text-slate-200">
                          Manufacturer
                        </td>
                        <td className="py-3 px-4 text-slate-700 dark:text-slate-300">
                          {selectedProductForView.specifications?.manufacturer || 'Infinix Mobility Limited'}
                        </td>
                      </tr>
                      <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                        <td className="py-3 px-4 font-bold text-slate-900 dark:text-slate-200">
                          Model Series
                        </td>
                        <td className="py-3 px-4 text-slate-700 dark:text-slate-300">
                          {selectedProductForView.specifications?.modelSeries ||
                            'Infinix Hot 70 Pro Series'}
                        </td>
                      </tr>
                      <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                        <td className="py-3 px-4 font-bold text-slate-900 dark:text-slate-200">
                          Specific Uses For Product
                        </td>
                        <td className="py-3 px-4 text-slate-700 dark:text-slate-300">
                          {selectedProductForView.specifications?.specificUses ||
                            (selectedProductForView.specifications as any)?.specificUsesForProduct ||
                            'Photography, Gaming'}
                        </td>
                      </tr>
                      <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                        <td className="py-3 px-4 font-bold text-slate-900 dark:text-slate-200">
                          Unit Count
                        </td>
                        <td className="py-3 px-4 text-slate-700 dark:text-slate-300">
                          {selectedProductForView.specifications?.unitCount || '1 Count'}
                        </td>
                      </tr>
                      <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                        <td className="py-3 px-4 font-bold text-slate-900 dark:text-slate-200">
                          Item Type Name
                        </td>
                        <td className="py-3 px-4 text-slate-700 dark:text-slate-300">
                          {selectedProductForView.specifications?.itemTypeName || 'Smartphone'}
                        </td>
                      </tr>
                      <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                        <td className="py-3 px-4 font-bold text-slate-900 dark:text-slate-200">
                          Packer Contact Information
                        </td>
                        <td className="py-3 px-4 text-slate-700 dark:text-slate-300">
                          {selectedProductForView.specifications?.packerContactInfo ||
                            (selectedProductForView.specifications as any)?.packerContactInformation ||
                            'Infinix Mobility Limited, Shenzhen, China'}
                        </td>
                      </tr>
                      <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                        <td className="py-3 px-4 font-bold text-slate-900 dark:text-slate-200">
                          ASIN
                        </td>
                        <td className="py-3 px-4 font-mono font-bold text-[#059669] dark:text-emerald-400">
                          {selectedProductForView.specifications?.asin || 'B0HJ4PNVSM'}
                        </td>
                      </tr>

                      {/* Custom attributes rendered seamlessly in the same table */}
                      {selectedProductForView.specifications?.customAttributes?.map((cat, i) => (
                        <tr key={i} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                          <td className="py-3 px-4 font-bold text-slate-900 dark:text-slate-200">
                            {cat.key}
                          </td>
                          <td className="py-3 px-4 text-slate-700 dark:text-slate-300">
                            {cat.value}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0">
              <button
                type="button"
                onClick={() => {
                  const p = selectedProductForView;
                  setSelectedProductForView(null);
                  handleOpenEdit(p);
                }}
                className="flex items-center gap-1.5 rounded-xl bg-slate-100 px-4 py-2 font-bold text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 transition"
              >
                <Edit2 className="h-3.5 w-3.5" />
                <span>Edit This Product Listing</span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedProductForView(null)}
                className="rounded-xl bg-slate-900 px-5 py-2 font-bold text-white shadow-sm hover:bg-slate-800 dark:bg-white dark:text-slate-900 transition"
              >
                Close Dossier
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CSV Import Modal */}
      {showCsvModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl dark:bg-slate-900">
            <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Bulk CSV Product Import
              </h3>
              <button
                onClick={() => setShowCsvModal(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="mb-2 text-xs text-slate-500">
              Paste CSV rows in the format: <code>Name,Price,Stock,Category</code>
            </p>
            <textarea
              rows={6}
              value={csvText}
              onChange={(e) => setCsvText(e.target.value)}
              className="w-full rounded-lg border border-slate-300 p-3 font-mono text-xs outline-none focus:border-emerald-600 dark:border-slate-700 dark:bg-slate-800"
            />
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowCsvModal(false)}
                className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isImporting}
                onClick={handleCsvImport}
                className="flex items-center justify-center rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-emerald-500 disabled:opacity-50"
              >
                {isImporting ? (
                  <LoadingThreeDotsJumping
                    size={6}
                    jumpHeight={8}
                    gap={4}
                    color="#FFFFFF"
                    label="Importing listings"
                  />
                ) : (
                  'Process & Import Listings'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
