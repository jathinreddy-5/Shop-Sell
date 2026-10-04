/**
 * Curated, high-resolution Unsplash image mappings categorized by product keywords & departments.
 * Replaces the generic default headphone placeholder with realistic, high-fidelity photos.
 */

interface ProductLike {
  id?: string;
  name?: string;
  slug?: string;
  category_name?: string;
  category_id?: string;
  images?: string[] | string;
  image?: string;
}

// Known placeholder image IDs that were erroneously assigned to all products in early seeds
const PLACEHOLDER_PATTERNS = [
  'photo-1505740420928-5e560c06d30e', // yellow background black headphones
  'photo-1523275335684-37898b6baf30', // white watch
];

// Keyword-specific image dictionary for precise item matching
const KEYWORD_IMAGES: Array<{ keywords: string[]; images: string[] }> = [
  // Laptops, PCs, Computing
  {
    keywords: ['touchscreen 2-in-1', 'convertible tablet', 'tablet pc', '2-in-1'],
    images: ['https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=800&q=80'],
  },
  {
    keywords: ['laptop', 'ultrabook', 'creator laptop', 'workstation', 'macbook'],
    images: [
      'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=800&q=80',
      'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=800&q=80',
    ],
  },
  {
    keywords: ['desktop', 'mini pc', 'gaming rig', 'tower'],
    images: ['https://images.unsplash.com/photo-1587202372775-e229f172b9d7?w=800&q=80'],
  },

  // Cameras & Tripods
  {
    keywords: ['tripod', 'carbon fiber tripod', 'gimbal', 'stabilizer'],
    images: ['https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=800&q=80'],
  },
  {
    keywords: ['camera', 'lens', 'speedlite', 'portrait lens'],
    images: [
      'https://images.unsplash.com/photo-1512790182412-b19e6d62bc39?w=800&q=80',
      'https://images.unsplash.com/photo-1617005082133-548c4dd27f35?w=800&q=80',
      'https://images.unsplash.com/photo-1502982720700-bfff97f2ecac?w=800&q=80',
    ],
  },

  // Audio & Speakers
  {
    keywords: ['soundbar', 'speaker', 'subwoofer', 'bluetooth speaker'],
    images: [
      'https://images.unsplash.com/photo-1545454675-3531b543be5d?w=800&q=80',
      'https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=800&q=80',
    ],
  },
  {
    keywords: ['earbuds', 'wireless earbuds', 'earphones'],
    images: ['https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=800&q=80'],
  },
  {
    keywords: ['turntable', 'vinyl', 'podcast mic', 'iem'],
    images: [
      'https://images.unsplash.com/photo-1539185441755-769473a23570?w=800&q=80',
      'https://images.unsplash.com/photo-1583394838336-acd977736f90?w=800&q=80',
    ],
  },

  // Men's Fashion
  {
    keywords: ['silk tie', 'tie', 'formal silk'],
    images: ['https://images.unsplash.com/photo-1598033129183-c4f50c736f10?w=800&q=80'],
  },
  {
    keywords: ['oxford shirt', 'polo shirt', 'casual shirt', 'linen casual'],
    images: ['https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=800&q=80'],
  },
  {
    keywords: ['jeans', 'raw denim', 'trousers', 'cargo'],
    images: ['https://images.unsplash.com/photo-1541099649105-f69ad21f3246?w=800&q=80'],
  },
  {
    keywords: ['blazer', 'coat', 'trench coat', 'suit', 'sweater'],
    images: ['https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=800&q=80'],
  },

  // Watches & Wearables
  {
    keywords: ['sapphire crystal', 'chronograph', 'diver steel', 'skeleton dial', 'watch'],
    images: [
      'https://images.unsplash.com/photo-1524805444758-089113d48a6d?w=800&q=80',
      'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=800&q=80',
      'https://images.unsplash.com/photo-1533139502658-0198f920d8e8?w=800&q=80',
    ],
  },
  {
    keywords: ['smartwatch', 'fitness tracker', 'hybrid smartwatch'],
    images: ['https://images.unsplash.com/photo-1508685096489-7aacd43bd3b1?w=800&q=80'],
  },

  // Home Decor & Wall Hangings
  {
    keywords: ['macrame', 'wall hanging', 'tapestry'],
    images: ['https://images.unsplash.com/photo-1582582621959-48d27397dc69?w=800&q=80'],
  },
  {
    keywords: ['table lamp', 'lamp', 'floor lamp', 'lighting'],
    images: [
      'https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=800&q=80',
      'https://images.unsplash.com/photo-1513506003901-1e6a229e2d15?w=800&q=80',
    ],
  },
  {
    keywords: ['candle', 'scented soy', 'diffuser'],
    images: ['https://images.unsplash.com/photo-1603006905003-be475563bc59?w=800&q=80'],
  },
  {
    keywords: ['cushion', 'pillow', 'art print', 'coasters', 'mirror'],
    images: ['https://images.unsplash.com/photo-1584100936595-c0654b55a2e2?w=800&q=80'],
  },

  // Furniture & Living
  {
    keywords: ['bookshelf', 'floating bookshelf', 'shelf'],
    images: ['https://images.unsplash.com/photo-1594980596870-8aa52a78d8cd?w=800&q=80'],
  },
  {
    keywords: ['chair', 'office chair', 'armchair'],
    images: ['https://images.unsplash.com/photo-1592078615290-033ee584e267?w=800&q=80'],
  },
  {
    keywords: ['coffee table', 'dining table', 'desk', 'standing desk'],
    images: [
      'https://images.unsplash.com/photo-1533090161767-e6ffed986c88?w=800&q=80',
      'https://images.unsplash.com/photo-1518455027359-f3f8164ba6bd?w=800&q=80',
    ],
  },
  {
    keywords: ['sofa', 'couch', 'bench'],
    images: ['https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=800&q=80'],
  },

  // Beauty & Skincare
  {
    keywords: ['jojoba oil', 'oil', 'treatment oil', 'cold-pressed'],
    images: ['https://images.unsplash.com/photo-1608248543803-ba4f8c70ae0b?w=800&q=80'],
  },
  {
    keywords: ['serum', 'vitamin c', 'hyaluronic', 'retinol', 'elixir'],
    images: ['https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=800&q=80'],
  },
  {
    keywords: ['cream', 'gel cream', 'cleanser', 'mask', 'sunscreen'],
    images: [
      'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=800&q=80',
      'https://images.unsplash.com/photo-1571781926291-c477ebfd024b?w=800&q=80',
    ],
  },

  // Haircare & Wellness
  {
    keywords: ['shampoo', 'conditioner', 'hair mask', 'keratin'],
    images: ['https://images.unsplash.com/photo-1535585209827-a15fcdbc4c2d?w=800&q=80'],
  },
  {
    keywords: ['hair comb', 'comb', 'neem'],
    images: ['https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=800&q=80'],
  },

  // Women's Fashion
  {
    keywords: ['dress', 'midi dress', 'chiffon', 'kurti', 'jumpsuit'],
    images: ['https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?w=800&q=80'],
  },
  {
    keywords: ['blouse', 'cardigan', 'knit', 'skirt'],
    images: [
      'https://images.unsplash.com/photo-1551163943-3f6a855d1153?w=800&q=80',
      'https://images.unsplash.com/photo-1434389677669-e08b4cac3105?w=800&q=80',
      'https://images.unsplash.com/photo-1584273143981-41c073dfe8f8?w=800&q=80',
    ],
  },

  // Footwear & Shoes
  {
    keywords: ['oxford shoes', 'loafers', 'boots', 'chelsea'],
    images: [
      'https://images.unsplash.com/photo-1614252235316-8c857d38b5f4?w=800&q=80',
      'https://images.unsplash.com/photo-1608256246200-53e635b5b65f?w=800&q=80',
    ],
  },
  {
    keywords: ['sneakers', 'trainers', 'running', 'court shoes'],
    images: [
      'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&q=80',
      'https://images.unsplash.com/photo-1525966222134-fcfa99b8ae77?w=800&q=80',
    ],
  },

  // Smartphones & Tech Gadgets
  {
    keywords: ['smartphone', 'phone', '5g', 'oled phone'],
    images: ['https://images.unsplash.com/photo-1592899677977-9c10ca588bbd?w=800&q=80'],
  },
  {
    keywords: ['phone mount', 'magsafe', 'phone case', 'charger', 'power bank'],
    images: [
      'https://images.unsplash.com/photo-1601784551446-20c9e07cdbdb?w=800&q=80',
      'https://images.unsplash.com/photo-1609091839311-d5365f9ff1c5?w=800&q=80',
    ],
  },
  {
    keywords: ['keyboard', 'mechanical keyboard', 'rgb desk mat'],
    images: ['https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=800&q=80'],
  },
  {
    keywords: ['mouse', 'gaming mouse'],
    images: ['https://images.unsplash.com/photo-1615663245857-ac93bb7c39e7?w=800&q=80'],
  },
  {
    keywords: ['vr headset', 'virtual reality'],
    images: ['https://images.unsplash.com/photo-1593508512255-86ab42a8e620?w=800&q=80'],
  },

  // Home & Kitchen Cookware
  {
    keywords: ['dutch oven', 'cast iron', 'pan', 'blender', 'kettle'],
    images: ['https://images.unsplash.com/photo-1585515320310-259814833e62?w=800&q=80'],
  },
  {
    keywords: ['knife', 'damascus', 'chef knife'],
    images: ['https://images.unsplash.com/photo-1593618998160-e34014e67546?w=800&q=80'],
  },
  {
    keywords: ['cutting board', 'bamboo board'],
    images: ['https://images.unsplash.com/photo-1590794056226-79ef3a8147e1?w=800&q=80'],
  },

  // Sports & Fitness
  {
    keywords: ['yoga mat', 'yoga'],
    images: ['https://images.unsplash.com/photo-1601925260368-ae2f83cf8b7f?w=800&q=80'],
  },
  {
    keywords: ['dumbbell', 'kettlebell', 'weights', 'gym'],
    images: [
      'https://images.unsplash.com/photo-1584735935682-2f2b69dff9d2?w=800&q=80',
      'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?w=800&q=80',
    ],
  },

  // Books & Stationery
  {
    keywords: ['fountain pen', 'journal', 'notebook', 'planner', 'pen'],
    images: [
      'https://images.unsplash.com/photo-1585776245991-cf89dd7fc73a?w=800&q=80',
      'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=800&q=80',
      'https://images.unsplash.com/photo-1586075010923-2dd4570fb338?w=800&q=80',
    ],
  },

  // Organic Foods & Gourmet
  {
    keywords: ['honey', 'forest honey', 'wildflower'],
    images: ['https://images.unsplash.com/photo-1587049352846-4a222e784d38?w=800&q=80'],
  },
  {
    keywords: ['almonds', 'walnuts', 'dates', 'nuts'],
    images: ['https://images.unsplash.com/photo-1508061253366-f7da158b6d46?w=800&q=80'],
  },
  {
    keywords: ['saffron', 'spices', 'ghee', 'rock salt', 'mustard oil'],
    images: ['https://images.unsplash.com/photo-1596040033229-a9821ebd058d?w=800&q=80'],
  },
  {
    keywords: ['chia seeds', 'atta', 'superfood'],
    images: ['https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800&q=80'],
  },

  // Coffee & Artisan Teas
  {
    keywords: ['coffee', 'arabica', 'beans', 'roast', 'espresso'],
    images: ['https://images.unsplash.com/photo-1559056199-641a0ac8b55e?w=800&q=80'],
  },
  {
    keywords: ['matcha', 'ceremonial'],
    images: ['https://images.unsplash.com/photo-1576092768241-dec231879fc3?w=800&q=80'],
  },
  {
    keywords: ['tea', 'darjeeling', 'assam', 'chai', 'silver needle'],
    images: [
      'https://images.unsplash.com/photo-1597481499750-3e6b22637e12?w=800&q=80',
      'https://images.unsplash.com/photo-1544787219-7f47ccb76574?w=800&q=80',
    ],
  },

  // Toys & Board Games
  {
    keywords: ['chess', 'wooden chess'],
    images: ['https://images.unsplash.com/photo-1529699211952-734e80c4d42b?w=800&q=80'],
  },
  {
    keywords: ['board game', 'card game', 'trivia', 'marble run', 'blocks'],
    images: [
      'https://images.unsplash.com/photo-1610890716171-6b1bb98ffd09?w=800&q=80',
      'https://images.unsplash.com/photo-1587654780291-39c9404d746b?w=800&q=80',
    ],
  },

  // Handmade Crafts & Pottery
  {
    keywords: ['ceramic mug', 'coffee mug', 'cups'],
    images: ['https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=800&q=80'],
  },
  {
    keywords: ['ramen bowl', 'bowl', 'dinner set', 'pottery plate'],
    images: ['https://images.unsplash.com/photo-1578749556568-bc2c40e68b61?w=800&q=80'],
  },
  {
    keywords: ['planter pot', 'clay pot', 'vase', 'terracotta'],
    images: [
      'https://images.unsplash.com/photo-1485955900006-10f4d324d411?w=800&q=80',
      'https://images.unsplash.com/photo-1612196808214-b8e1d6145a8c?w=800&q=80',
    ],
  },
];

// Fallback images grouped by standard category name / slug
const CATEGORY_DEFAULT_IMAGES: Record<string, string[]> = {
  'electronics-gadgets': [
    'https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=800&q=80',
    'https://images.unsplash.com/photo-1615663245857-ac93bb7c39e7?w=800&q=80',
  ],
  'laptops-computers': [
    'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=800&q=80',
    'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=800&q=80',
  ],
  'smartphones-accessories': [
    'https://images.unsplash.com/photo-1592899677977-9c10ca588bbd?w=800&q=80',
    'https://images.unsplash.com/photo-1601784551446-20c9e07cdbdb?w=800&q=80',
  ],
  'audio-headphones': [
    'https://images.unsplash.com/photo-1545454675-3531b543be5d?w=800&q=80',
    'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=800&q=80',
  ],
  'cameras-photography': [
    'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=800&q=80',
    'https://images.unsplash.com/photo-1512790182412-b19e6d62bc39?w=800&q=80',
  ],
  'mens-fashion': [
    'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=800&q=80',
    'https://images.unsplash.com/photo-1541099649105-f69ad21f3246?w=800&q=80',
  ],
  'womens-fashion': [
    'https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?w=800&q=80',
    'https://images.unsplash.com/photo-1551163943-3f6a855d1153?w=800&q=80',
  ],
  'footwear-shoes': [
    'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&q=80',
    'https://images.unsplash.com/photo-1614252235316-8c857d38b5f4?w=800&q=80',
  ],
  'watches-wearables': [
    'https://images.unsplash.com/photo-1524805444758-089113d48a6d?w=800&q=80',
    'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=800&q=80',
  ],
  'home-kitchen': [
    'https://images.unsplash.com/photo-1585515320310-259814833e62?w=800&q=80',
    'https://images.unsplash.com/photo-1593618998160-e34014e67546?w=800&q=80',
  ],
  'furniture-living': [
    'https://images.unsplash.com/photo-1594980596870-8aa52a78d8cd?w=800&q=80',
    'https://images.unsplash.com/photo-1533090161767-e6ffed986c88?w=800&q=80',
  ],
  'home-decor-lighting': [
    'https://images.unsplash.com/photo-1582582621959-48d27397dc69?w=800&q=80',
    'https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=800&q=80',
  ],
  'beauty-skincare': [
    'https://images.unsplash.com/photo-1608248543803-ba4f8c70ae0b?w=800&q=80',
    'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=800&q=80',
  ],
  'haircare-wellness': [
    'https://images.unsplash.com/photo-1535585209827-a15fcdbc4c2d?w=800&q=80',
    'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=800&q=80',
  ],
  'sports-fitness': [
    'https://images.unsplash.com/photo-1601925260368-ae2f83cf8b7f?w=800&q=80',
    'https://images.unsplash.com/photo-1584735935682-2f2b69dff9d2?w=800&q=80',
  ],
  'books-stationery': [
    'https://images.unsplash.com/photo-1585776245991-cf89dd7fc73a?w=800&q=80',
    'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=800&q=80',
  ],
  'organic-foods-gourmet': [
    'https://images.unsplash.com/photo-1587049352846-4a222e784d38?w=800&q=80',
    'https://images.unsplash.com/photo-1508061253366-f7da158b6d46?w=800&q=80',
  ],
  'coffee-artisan-teas': [
    'https://images.unsplash.com/photo-1559056199-641a0ac8b55e?w=800&q=80',
    'https://images.unsplash.com/photo-1576092768241-dec231879fc3?w=800&q=80',
  ],
  'toys-board-games': [
    'https://images.unsplash.com/photo-1529699211952-734e80c4d42b?w=800&q=80',
    'https://images.unsplash.com/photo-1610890716171-6b1bb98ffd09?w=800&q=80',
  ],
  'handmade-crafts-pottery': [
    'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=800&q=80',
    'https://images.unsplash.com/photo-1578749556568-bc2c40e68b61?w=800&q=80',
  ],
};

function normalizeSlug(str: string): string {
  return (str || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

/**
 * Returns a distinct, category- and name-accurate image for any product.
 */
export function getProductImage(product: ProductLike | null | undefined, fallbackIndex = 0): string {
  if (!product) {
    return 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=800&q=80';
  }

  // 1. Inspect existing images array / field
  let rawUrl: string | undefined;
  if (Array.isArray(product.images) && product.images.length > 0) {
    rawUrl = product.images[0];
  } else if (typeof product.images === 'string' && product.images.startsWith('http')) {
    rawUrl = product.images;
  } else if (product.image && typeof product.image === 'string' && product.image.startsWith('http')) {
    rawUrl = product.image;
  }

  // If the provided image is NOT one of the obsolete global placeholder headphones, honor it!
  const isGenericHeadphones = rawUrl
    ? PLACEHOLDER_PATTERNS.some((pat) => rawUrl!.includes(pat))
    : true;

  if (rawUrl && !isGenericHeadphones) {
    return rawUrl;
  }

  const nameLower = (product.name || '').toLowerCase();
  const catLower = (product.category_name || '').toLowerCase();
  const slugLower = (product.slug || '').toLowerCase();
  const searchableText = `${nameLower} ${catLower} ${slugLower}`;

  // 2. Keyword Match (specific items take priority)
  for (const entry of KEYWORD_IMAGES) {
    for (const kw of entry.keywords) {
      if (searchableText.includes(kw)) {
        const idx = Math.abs(hashString(product.id || product.slug || product.name || '') + fallbackIndex) % entry.images.length;
        return entry.images[idx];
      }
    }
  }

  // 3. Category Fallback Match
  const catSlug = normalizeSlug(product.category_name || '');
  for (const [key, list] of Object.entries(CATEGORY_DEFAULT_IMAGES)) {
    if (catSlug.includes(key) || key.includes(catSlug) || searchableText.includes(key.replace('-', ' '))) {
      const idx = Math.abs(hashString(product.id || product.slug || product.name || '') + fallbackIndex) % list.length;
      return list[idx];
    }
  }

  // 4. Ultimate fallback: sleek modern tech & living
  const defaults = [
    'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=800&q=80',
    'https://images.unsplash.com/photo-1524805444758-089113d48a6d?w=800&q=80',
    'https://images.unsplash.com/photo-1587049352846-4a222e784d38?w=800&q=80',
    'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=800&q=80',
  ];
  return defaults[fallbackIndex % defaults.length];
}

/**
 * Returns multiple distinct images for product gallery views.
 */
export function getProductGallery(product: ProductLike | null | undefined): string[] {
  const primary = getProductImage(product, 0);
  const secondary = getProductImage(product, 1);
  const tertiary = getProductImage(product, 2);

  // If user provided multiple non-placeholder images, use them
  if (Array.isArray(product?.images) && product.images.length > 1) {
    const valid = product.images.filter((img) => !PLACEHOLDER_PATTERNS.some((pat) => img.includes(pat)));
    if (valid.length > 0) return valid;
  }

  return Array.from(new Set([primary, secondary, tertiary]));
}

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return hash;
}
