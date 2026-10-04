import * as fs from 'fs';
import * as path from 'path';

// Seed generator for 20 categories, 5 sellers, and 200 sample products
const categories = [
  { id: '11111111-0000-0000-0000-000000000001', name: 'Electronics & Gadgets', slug: 'electronics-gadgets', schema: { brand: 'string', warranty_months: 'number' } },
  { id: '11111111-0000-0000-0000-000000000002', name: 'Laptops & Computers', slug: 'laptops-computers', schema: { ram_gb: 'number', storage_gb: 'number', processor: 'string' } },
  { id: '11111111-0000-0000-0000-000000000003', name: 'Smartphones & Accessories', slug: 'smartphones-accessories', schema: { screen_size_inches: 'number', battery_mah: 'number' } },
  { id: '11111111-0000-0000-0000-000000000004', name: 'Audio & Headphones', slug: 'audio-headphones', schema: { wireless: 'boolean', battery_life_hours: 'number' } },
  { id: '11111111-0000-0000-0000-000000000005', name: 'Cameras & Photography', slug: 'cameras-photography', schema: { megapixels: 'number', sensor_type: 'string' } },
  { id: '11111111-0000-0000-0000-000000000006', name: "Men's Fashion", slug: 'mens-fashion', schema: { size: 'string', material: 'string', fit: 'string' } },
  { id: '11111111-0000-0000-0000-000000000007', name: "Women's Fashion", slug: 'womens-fashion', schema: { size: 'string', pattern: 'string', fabric: 'string' } },
  { id: '11111111-0000-0000-0000-000000000008', name: 'Footwear & Shoes', slug: 'footwear-shoes', schema: { uk_size: 'number', sole_material: 'string' } },
  { id: '11111111-0000-0000-0000-000000000009', name: 'Watches & Wearables', slug: 'watches-wearables', schema: { water_resistant: 'boolean', movement: 'string' } },
  { id: '11111111-0000-0000-0000-000000000010', name: 'Home & Kitchen', slug: 'home-kitchen', schema: { capacity_liters: 'number', dishwasher_safe: 'boolean' } },
  { id: '11111111-0000-0000-0000-000000000011', name: 'Furniture & Living', slug: 'furniture-living', schema: { material: 'string', dimensions: 'string', assembly_required: 'boolean' } },
  { id: '11111111-0000-0000-0000-000000000012', name: 'Home Decor & Lighting', slug: 'home-decor-lighting', schema: { color_temp_k: 'number', style: 'string' } },
  { id: '11111111-0000-0000-0000-000000000013', name: 'Beauty & Skincare', slug: 'beauty-skincare', schema: { skin_type: 'string', organic: 'boolean', volume_ml: 'number' } },
  { id: '11111111-0000-0000-0000-000000000014', name: 'Haircare & Wellness', slug: 'haircare-wellness', schema: { sulphate_free: 'boolean', net_weight_g: 'number' } },
  { id: '11111111-0000-0000-0000-000000000015', name: 'Sports & Fitness', slug: 'sports-fitness', schema: { weight_kg: 'number', sport_type: 'string' } },
  { id: '11111111-0000-0000-0000-000000000016', name: 'Books & Stationery', slug: 'books-stationery', schema: { pages: 'number', language: 'string', author: 'string' } },
  { id: '11111111-0000-0000-0000-000000000017', name: 'Organic Foods & Gourmet', slug: 'organic-foods-gourmet', schema: { shelf_life_days: 'number', fssai_certified: 'boolean' } },
  { id: '11111111-0000-0000-0000-000000000018', name: 'Coffee & Artisan Teas', slug: 'coffee-artisan-teas', schema: { roast_level: 'string', grind: 'string', origin: 'string' } },
  { id: '11111111-0000-0000-0000-000000000019', name: 'Toys & Board Games', slug: 'toys-board-games', schema: { min_age_years: 'number', players: 'string' } },
  { id: '11111111-0000-0000-0000-000000000020', name: 'Handmade Crafts & Pottery', slug: 'handmade-crafts-pottery', schema: { artisan: 'string', handcrafted: 'boolean' } },
];

const sellers = [
  {
    userId: '22222222-0000-0000-0000-000000000001',
    email: 'apextech@shopsell.test',
    fullName: 'Vikram Mehta',
    storeId: '33333333-0000-0000-0000-000000000001',
    storeName: 'Apex Tech India',
    slug: 'apex-tech-india',
    description: 'Leading provider of high performance laptops, audio gear, and cutting-edge electronics.',
    categoryIndices: [0, 1, 2, 3, 4],
  },
  {
    userId: '22222222-0000-0000-0000-000000000002',
    email: 'aura.artisan@shopsell.test',
    fullName: 'Ananya Deshmukh',
    storeId: '33333333-0000-0000-0000-000000000002',
    storeName: 'Aura Artisanal Living',
    slug: 'aura-artisanal-living',
    description: 'Handcrafted stoneware, ceramic tableware, bohemian home decor, and organic living essentials.',
    categoryIndices: [9, 10, 11, 19],
  },
  {
    userId: '22222222-0000-0000-0000-000000000003',
    email: 'urbanstitch@shopsell.test',
    fullName: 'Karan Singhania',
    storeId: '33333333-0000-0000-0000-000000000003',
    storeName: 'Urban Stitch Fashion',
    slug: 'urban-stitch-fashion',
    description: 'Contemporary streetwear, premium cotton apparel, artisanal leather footwear, and stylish timepieces.',
    categoryIndices: [5, 6, 7, 8],
  },
  {
    userId: '22222222-0000-0000-0000-000000000004',
    email: 'greenroots@shopsell.test',
    fullName: 'Sunita Rao',
    storeId: '33333333-0000-0000-0000-000000000004',
    storeName: 'Green Roots Organics',
    slug: 'green-roots-organics',
    description: 'Single-estate Himalayan green teas, cold-pressed skincare oils, and organic gourmet harvests.',
    categoryIndices: [12, 13, 16, 17],
  },
  {
    userId: '22222222-0000-0000-0000-000000000005',
    email: 'velocitysports@shopsell.test',
    fullName: 'Arjun Verma',
    storeId: '33333333-0000-0000-0000-000000000005',
    storeName: 'Velocity Play & Sports',
    slug: 'velocity-play-sports',
    description: 'Professional gym equipment, fitness trackers, strategy board games, and mind puzzles.',
    categoryIndices: [8, 14, 15, 18],
  },
];

// Helper to generate a 384-dimensional unit vector
function generateEmbedding(seed: number): string {
  const dim = 384;
  const values: number[] = [];
  let sumSq = 0;
  for (let i = 0; i < dim; i++) {
    const val = Math.sin(seed * (i + 1)) * Math.cos((seed + i) * 0.7);
    values.push(val);
    sumSq += val * val;
  }
  const norm = Math.sqrt(sumSq) || 1;
  const normalized = values.map(v => (v / norm).toFixed(5));
  return `[${normalized.join(',')}]`;
}

// Generate 200 products across the 20 categories (10 products per category)
const productTemplates: Array<{ name: string; price: number; desc: string; attrs: any }> = [];

const adjectives = ['Premium', 'Ultra', 'Handcrafted', 'Minimalist', 'Ergonomic', 'Artisan', 'Wireless', 'Organic', 'Compact', 'Vintage'];
const nounBases = [
  ['Noise-Cancelling Headphones', 'Mechanical Keyboard', '4K Action Camera', 'Gaming Mouse', 'USB-C Hub', 'Fast Charging Pad', 'Portable Monitor', 'Smart Speaker', 'VR Headset', 'RGB Desk Mat'],
  ['Creator Laptop 16-inch', 'Ultrabook Carbon Edition', 'Mini PC Ryzen 7', 'Mechanical Gaming Rig', 'Travel Laptop 13-inch', 'Workstation Pro 32GB', 'Touchscreen 2-in-1', 'Linux Developer Laptop', 'Convertible Tablet PC', 'Silent Desktop Tower'],
  ['Flagship Smartphone 5G', 'Compact OLED Phone', 'MagSafe Wallet Case', 'Tempered Glass Shield', 'Power Bank 20000mAh', 'Car Phone Mount', 'Fast GaN Charger 65W', 'Camera Lens Protector', 'Silicone Bumper Case', 'Retractable Charging Cable'],
  ['True Wireless Earbuds', 'Over-Ear Studio Monitor', 'Portable Bluetooth Speaker', 'Soundbar with Subwoofer', 'Condenser Podcast Mic', 'Noise Isolating IEMs', 'DAC Headphone Amp', 'Waterproof Shower Speaker', 'Retro Vinyl Turntable', 'Boom Mic Gaming Headset'],
  ['Mirrorless 4K Camera', 'Prime Portrait Lens 50mm', 'Carbon Fiber Tripod', 'Gimbal Camera Stabilizer', 'Speedlite Flash Unit', 'Camera Sling Backpack', 'Variable ND Filter', 'Macro Extension Tube', 'Ring Light Studio Kit', 'Dual Battery Charger'],
  ['Slim Fit Oxford Shirt', 'Raw Denim Jeans', 'Merino Wool Sweater', 'Waterproof Trench Coat', 'Organic Cotton Crewneck', 'Tailored Linen Trousers', 'Classic Polo Shirt', 'Utility Cargo Pants', 'Fleece Zip Hoodie', 'Formal Silk Tie'],
  ['Floral Chiffon Midi Dress', 'Cashmere Knit Cardigan', 'High-Rise Wide Leg Trousers', 'Silk Evening Blouse', 'Oversized Cotton Blazer', 'Pleated Wrap Skirt', 'Denim Trucker Jacket', 'Linen Summer Jumpsuit', 'Boho Embroidered Kurti', 'Wool Trench Coat'],
  ['Leather Oxford Shoes', 'Running Trainers Lightweight', 'Canvas High-Top Sneakers', 'Chelsea Ankle Boots', 'Memory Foam Loafers', 'Trail Hiking Boots', 'Classic White Court Shoes', 'Slip-on Espadrilles', 'Handmade Kolhapuri Chappals', 'Waterproof Trekking Shoes'],
  ['Automatic Chronograph Watch', 'Hybrid Smartwatch Sport', 'Minimalist Leather Watch', 'Diver Steel Watch 200m', 'Fitness Tracker Band', 'Sapphire Crystal Classic', 'Solar Powered Field Watch', 'Skeleton Dial Luxury Watch', 'Titanium Military Watch', 'Ceramic Smart Watch'],
  ['Cast Iron Dutch Oven', 'Chef Damascus Knife 8-inch', 'Non-Stick Ceramic Pan', 'Stainless Steel Blender', 'French Press Coffee Maker', 'Bamboo Cutting Board', 'AeroPress Coffee Brewer', 'Electric Kettle Variable Temp', 'Silicone Utensil Set 10pc', 'Cold Brew Pitcher'],
  ['Ergonomic Office Chair', 'Solid Oak Coffee Table', 'Floating Bookshelf Unit', 'Velvet Accent Armchair', 'Minimalist Standing Desk', 'Rattan Bedside Table', 'Modular 3-Seater Sofa', 'Hardwood Dining Table', 'Shoe Storage Bench', 'Adjustable Laptop Stand'],
  ['Nordic Ceramic Table Lamp', 'Handwoven Macrame Wall Hanging', 'Aromatherapy Diffuser Light', 'Brass Floor Standing Lamp', 'Linen Textured Cushion Cover', 'Abstract Canvas Art Print', 'Scented Soy Candle Set', 'Minimalist Wall Clock', 'Handmade Rattan Mirror', 'Marble Coasters Set of 4'],
  ['Vitamin C Brightening Serum', 'Hyaluronic Acid Gel Cream', 'Mineral SPF 50 Sunscreen', 'Rosewater Hydrating Mist', 'Retinol Night Repair Elixir', 'Gentle Foaming Cleanser', 'Green Tea Clay Face Mask', 'Peptide Eye Rescue Cream', 'Cold-Pressed Jojoba Oil', 'Niacinamide Pore Toner'],
  ['Argan Oil Hair Mask', 'Sulphate-Free Keratin Shampoo', 'Biotin Scalp Serum', 'Wooden Neem Hair Comb', 'Rosemary Scalp Treatment Oil', 'Deep Moisture Conditioner', 'Natural Herbal Hair Clay', 'Anti-Frizz Hair Serum', 'Ayurvedic Bhringraj Oil', 'Leave-In Conditioning Mist'],
  ['High Density Yoga Mat 6mm', 'Adjustable Dumbbell Pair 20kg', 'Resistance Bands Loop Set', 'Kettlebell Cast Iron 16kg', 'Deep Tissue Foam Roller', 'Skipping Rope High Speed', 'Suspension Trainer Straps', 'Stainless Gym Shaker 750ml', 'Push-Up Grip Stands', 'Wrist Support Gym Straps'],
  ['Hardcover Dot Grid Journal', 'Brass Fountain Pen Fine Nib', 'Japanese Archival Ink Set', 'Leather Refillable Notebook', 'Minimalist Desk Organizer', 'Architect Metal Ruler Scale', 'Mechanical Drafting Pencil', 'Calligraphy Brush Pen Set', 'Recycled Sticky Note Pad', 'Wax Seal Stamp Kit'],
  ['Raw Organic Forest Honey', 'Kashmiri Almonds Extra Bold', 'Himalayan Pink Rock Salt', 'Cold Pressed Mustard Oil', 'A2 Desi Cow Ghee 500ml', 'Handpicked Jumbo Walnuts', 'Organic Chia Seeds 500g', 'Stoneground Whole Wheat Atta', 'Pure Kashmiri Saffron 1g', 'Sun-Dried Medjool Dates'],
  ['Single Origin Arabica Beans', 'Darjeeling First Flush Black Tea', 'Organic Ceremonial Matcha', 'Assam Orthodox CTC Tea', 'Whole Bean Dark Roast 1kg', 'Masala Chai Artisan Blend', 'Cascara Coffee Berry Infusion', 'Nilgiri Silver Needle White Tea', 'Filter Coffee Chicory Blend', 'Decaf Columbian Medium Roast'],
  ['Strategy Settlers Board Game', 'Handcrafted Wooden Chess Set', 'Cooperative Space Adventure', 'Fast Word Party Card Game', 'Modular Marble Run 120pc', 'Wooden Balance Building Blocks', 'Mystery Detective Board Game', 'Pocket Travel Trivia Game', 'Classic Mahjong Tile Set', 'Engine Building Card Game'],
  ['Terracotta Water Pitcher', 'Handthrown Ceramic Coffee Mug', 'Stoneware Ramen Noodle Bowl', 'Handmade Clay Planter Pot', 'Blue Pottery Decorative Plate', 'Glazed Ceramic Dinner Set', 'Artisan Clay Tea Cups Set of 4', 'Hand-Painted Floral Ceramic Vase', 'Matte Black Ceramic Oil Dispenser', 'Textured Clay Incense Holder'],
];

let sql = `-- =============================================================================
-- SEED SCRIPT: 20 Categories, 5 Sellers & Stores, 200 Products
-- =============================================================================

-- Clean existing data
TRUNCATE TABLE public.user_events CASCADE;
TRUNCATE TABLE public.reviews CASCADE;
TRUNCATE TABLE public.order_items CASCADE;
TRUNCATE TABLE public.orders CASCADE;
TRUNCATE TABLE public.cart_items CASCADE;
TRUNCATE TABLE public.carts CASCADE;
TRUNCATE TABLE public.wishlists CASCADE;
TRUNCATE TABLE public.product_variants CASCADE;
TRUNCATE TABLE public.products CASCADE;
TRUNCATE TABLE public.categories CASCADE;
TRUNCATE TABLE public.stores CASCADE;
TRUNCATE TABLE public.owner_applications CASCADE;
TRUNCATE TABLE public.profiles CASCADE;

-- 1. Insert Categories (20 categories)
INSERT INTO public.categories (id, parent_id, name, slug, attribute_schema) VALUES
`;

const catRows = categories.map(c => `  ('${c.id}', NULL, '${c.name.replace("'", "''")}', '${c.slug}', '${JSON.stringify(c.schema)}'::jsonb)`);
sql += catRows.join(',\n') + ';\n\n';

// 2. Insert Users, Profiles, and Stores
sql += `-- 2. Insert Sellers & Stores\n`;
for (const s of sellers) {
  sql += `
-- Seller: ${s.storeName}
INSERT INTO auth.users (id, email, raw_user_meta_data)
VALUES ('${s.userId}', '${s.email}', '{"full_name": "${s.fullName}"}'::jsonb)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.profiles (id, full_name, roles)
VALUES ('${s.userId}', '${s.fullName}', ARRAY['customer', 'owner']::text[])
ON CONFLICT (id) DO UPDATE SET roles = ARRAY['customer', 'owner']::text[];

INSERT INTO public.stores (id, owner_id, store_name, slug, description, payout_details, status, rating_avg)
VALUES (
  '${s.storeId}',
  '${s.userId}',
  '${s.storeName.replace("'", "''")}',
  '${s.slug}',
  '${s.description.replace("'", "''")}',
  '{"account_holder_name": "${s.fullName}", "bank_name": "HDFC Bank", "account_number": "987654321012", "ifsc_code": "HDFC0001234"}'::jsonb,
  'active',
  4.85
) ON CONFLICT (id) DO NOTHING;
`;
}

// 3. Insert 200 Products
sql += `\n-- 3. Insert 200 Sample Products (10 per category)\n`;

let productCount = 0;
const productInserts: string[] = [];

const categoryImages: string[][] = [
  // 0: Electronics & Gadgets
  ['https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=800&q=80', 'https://images.unsplash.com/photo-1615663245857-ac93bb7c39e7?w=800&q=80'],
  // 1: Laptops & Computers
  ['https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=800&q=80', 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=800&q=80'],
  // 2: Smartphones & Accessories
  ['https://images.unsplash.com/photo-1592899677977-9c10ca588bbd?w=800&q=80', 'https://images.unsplash.com/photo-1601784551446-20c9e07cdbdb?w=800&q=80'],
  // 3: Audio & Headphones
  ['https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=800&q=80', 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=800&q=80'],
  // 4: Cameras & Photography
  ['https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=800&q=80', 'https://images.unsplash.com/photo-1512790182412-b19e6d62bc39?w=800&q=80'],
  // 5: Men's Fashion
  ['https://images.unsplash.com/photo-1598033129183-c4f50c736f10?w=800&q=80', 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=800&q=80'],
  // 6: Women's Fashion
  ['https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?w=800&q=80', 'https://images.unsplash.com/photo-1551163943-3f6a855d1153?w=800&q=80'],
  // 7: Footwear & Shoes
  ['https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&q=80', 'https://images.unsplash.com/photo-1614252235316-8c857d38b5f4?w=800&q=80'],
  // 8: Watches & Wearables
  ['https://images.unsplash.com/photo-1533139502658-0198f920d8e8?w=800&q=80', 'https://images.unsplash.com/photo-1524805444758-089113d48a6d?w=800&q=80'],
  // 9: Home & Kitchen
  ['https://images.unsplash.com/photo-1585515320310-259814833e62?w=800&q=80', 'https://images.unsplash.com/photo-1593618998160-e34014e67546?w=800&q=80'],
  // 10: Furniture & Living
  ['https://images.unsplash.com/photo-1594980596870-8aa52a78d8cd?w=800&q=80', 'https://images.unsplash.com/photo-1533090161767-e6ffed986c88?w=800&q=80'],
  // 11: Home Decor & Lighting
  ['https://images.unsplash.com/photo-1582582621959-48d27397dc69?w=800&q=80', 'https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=800&q=80'],
  // 12: Beauty & Skincare
  ['https://images.unsplash.com/photo-1608248543803-ba4f8c70ae0b?w=800&q=80', 'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=800&q=80'],
  // 13: Haircare & Wellness
  ['https://images.unsplash.com/photo-1535585209827-a15fcdbc4c2d?w=800&q=80', 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=800&q=80'],
  // 14: Sports & Fitness
  ['https://images.unsplash.com/photo-1601925260368-ae2f83cf8b7f?w=800&q=80', 'https://images.unsplash.com/photo-1584735935682-2f2b69dff9d2?w=800&q=80'],
  // 15: Books & Stationery
  ['https://images.unsplash.com/photo-1585776245991-cf89dd7fc73a?w=800&q=80', 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=800&q=80'],
  // 16: Organic Foods & Gourmet
  ['https://images.unsplash.com/photo-1587049352846-4a222e784d38?w=800&q=80', 'https://images.unsplash.com/photo-1508061253366-f7da158b6d46?w=800&q=80'],
  // 17: Coffee & Artisan Teas
  ['https://images.unsplash.com/photo-1559056199-641a0ac8b55e?w=800&q=80', 'https://images.unsplash.com/photo-1576092768241-dec231879fc3?w=800&q=80'],
  // 18: Toys & Board Games
  ['https://images.unsplash.com/photo-1610890716171-6b1bb98ffd09?w=800&q=80', 'https://images.unsplash.com/photo-1529699211952-734e80c4d42b?w=800&q=80'],
  // 19: Handmade Crafts & Pottery
  ['https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=800&q=80', 'https://images.unsplash.com/photo-1578749556568-bc2c40e68b61?w=800&q=80'],
];

for (let catIndex = 0; catIndex < 20; catIndex++) {
  const category = categories[catIndex];
  // Assign store based on category
  let store = sellers[0];
  for (const s of sellers) {
    if (s.categoryIndices.includes(catIndex)) {
      store = s;
      break;
    }
  }

  const items = nounBases[catIndex];
  for (let itemIndex = 0; itemIndex < 10; itemIndex++) {
    productCount++;
    const prodId = `44444444-${String(productCount).padStart(4, '0')}-0000-0000-000000000000`;
    const adj = adjectives[(productCount * 7) % adjectives.length];
    const baseName = items[itemIndex];
    const name = `${adj} ${baseName}`;
    const slug = `${name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')}-${productCount}`;
    const price = Math.round((299 + (productCount * 173) % 9500) * 100) / 100;
    const compareAt = Math.round(price * 1.25 * 100) / 100;
    const stock = 15 + ((productCount * 13) % 150);
    const salesCount = 5 + ((productCount * 29) % 250);
    const viewCount = salesCount * 4 + ((productCount * 47) % 500);
    const ratingAvg = Number((4.1 + ((productCount % 9) * 0.1)).toFixed(2));
    const ratingCount = 10 + ((productCount * 11) % 180);
    const desc = `Experience peak performance with the all-new ${name}. Designed with meticulous attention to detail, premium materials, and unparalleled craftsmanship. Perfect for modern Indian consumers seeking uncompromised quality.`;

    const catImgs = categoryImages[catIndex] || categoryImages[0];
    const primaryImg = catImgs[itemIndex % catImgs.length];
    const secondaryImg = catImgs[(itemIndex + 1) % catImgs.length];
    const images = `ARRAY['${primaryImg}', '${secondaryImg}']::text[]`;
    const attrs = JSON.stringify({
      category: category.name,
      origin: 'India',
      warranty: '1 Year Manufacturer Warranty',
      sku_code: `SKU-${1000 + productCount}`,
    });
    const embedding = generateEmbedding(productCount);

    productInserts.push(`(
  '${prodId}',
  '${store.storeId}',
  '${name.replace("'", "''")}',
  '${slug}',
  '${desc.replace("'", "''")}',
  ${price},
  ${compareAt},
  'INR',
  ${stock},
  '${category.id}',
  ${images},
  '${attrs}'::jsonb,
  '${embedding}'::vector(384),
  ${ratingAvg},
  ${ratingCount},
  ${salesCount},
  ${viewCount},
  'active'
)`);
  }
}

sql += `INSERT INTO public.products (
  id, store_id, name, slug, description, price, compare_at_price,
  currency, stock, category_id, images, attributes, embedding,
  rating_avg, rating_count, sales_count, view_count, status
) VALUES\n` + productInserts.join(',\n') + ';\n';

// Write to seed.sql
const outputPath = path.resolve(__dirname, '../../../../supabase/seeds/seed.sql');
fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, sql, 'utf8');

console.log(`Generated ${productCount} sample products, 20 categories, 5 sellers into ${outputPath}`);
