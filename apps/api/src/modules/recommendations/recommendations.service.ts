import { Injectable } from '@nestjs/common';
import Redis from 'ioredis';
import {
  DEFAULT_REC_LAMBDA,
  calculateDecayedWeight,
  Product,
  HomeRecommendationsResponse,
  RecommendationRail,
} from '@shop-sell/shared';
import { DatabaseService } from '../../database/database.service';
import { SearchService } from '../search/search.service';
import { createRedisClient } from '../../common/redis';

interface ScoredCandidate {
  product: any;
  queryRelevance: number;
  interestAffinity: number;
  vectorSimilarity: number;
  popularity: number;
  ratingQuality: number;
  freshness: number;
  stockPriceFit: number;
  finalScore: number;
  matchedQuery?: string;
}

@Injectable()
export class RecommendationsService {
  private redisClient: Redis;

  constructor(
    private readonly db: DatabaseService,
    private readonly searchService: SearchService
  ) {
    this.redisClient = createRedisClient();
  }

  async getHomeFeed(
    userId?: string | null,
    anonymousId?: string | null
  ): Promise<HomeRecommendationsResponse> {
    const identifier = userId || anonymousId;

    // 1. Check Redis cache `feed:{uid}`
    if (identifier) {
      try {
        if (this.redisClient.status === 'ready' || this.redisClient.status === 'connecting') {
          const cached = await this.redisClient.get(`feed:${identifier}`);
          if (cached) {
            return JSON.parse(cached);
          }
        }
      } catch {}
    }

    // 2. Fetch User History & Profile Signals
    let recentSearches: string[] = [];
    let userProfile: any = null;
    let userInterests: string[] = [];

    if (userId) {
      try {
        const profRes = await this.db.query(
          `SELECT shopping_for, gender, default_pincode, size_profile
           FROM public.profiles WHERE id = $1 LIMIT 1`,
          [userId]
        );
        if (profRes.rows.length > 0) {
          userProfile = profRes.rows[0];
        }

        const intRes = await this.db.query<{ slug: string }>(
          `SELECT ic.slug FROM public.profile_interests pi
           JOIN public.interest_categories ic ON pi.interest_id = ic.id
           WHERE pi.profile_id = $1`,
          [userId]
        );
        userInterests = intRes.rows.map((r) => r.slug.toLowerCase());
      } catch {}
    }

    if (identifier) {
      try {
        if (this.redisClient.status === 'ready' || this.redisClient.status === 'connecting') {
          recentSearches = await this.redisClient.zrevrange(
            `recent_searches:${identifier}`,
            0,
            4
          );
        }
      } catch {}
    }

    // Fallback: If Redis was empty or offline, query Postgres user_events
    if (recentSearches.length === 0 && identifier) {
      try {
        const eventsRes = await this.db.query<{ query: string }>(
          `SELECT DISTINCT query FROM public.user_events
           WHERE (user_id = $1 OR anonymous_id = $2)
             AND event_type = 'search' AND query IS NOT NULL
           ORDER BY query LIMIT 5`,
          [userId || null, anonymousId || null]
        );
        recentSearches = eventsRes.rows.map((r) => r.query);
      } catch {}
    }

    // 3. Candidate Generation
    const candidateMap = new Map<string, ScoredCandidate>();
    const queryRails: RecommendationRail[] = [];

    // (A) Top Recent Queries (up to 2 distinct queries form the top rails)
    for (let i = 0; i < Math.min(recentSearches.length, 2); i++) {
      const q = recentSearches[i];
      const searchRes = await this.searchService.search({
        query: q,
        limit: 8,
        inStockOnly: true,
      });

      if (searchRes.products && searchRes.products.length > 0) {
        queryRails.push({
          title: `Because you searched "${q}"`,
          reason: `Based on your recent search for "${q}"`,
          products: searchRes.products.slice(0, 4),
        });

        // Add to candidate pool with high query relevance
        for (const p of searchRes.products) {
          candidateMap.set(p.id, {
            product: p,
            queryRelevance: 0.95 - i * 0.1,
            interestAffinity: 0.8,
            vectorSimilarity: 0.7,
            popularity: Math.min((p.sales_count || 10) / 100, 1.0),
            ratingQuality: (p.rating_avg || 4.0) / 5.0,
            freshness: 0.8,
            stockPriceFit: (p.stock || 10) > 0 ? 1.0 : 0.0,
            finalScore: 0,
            matchedQuery: q,
          });
        }
      }
    }

    // (B) Trending Products (Popularity & Sales Velocity)
    let trendingProducts: any[] = [];
    try {
      const trendingRes = await this.db.query(
        `SELECT p.id, p.store_id, p.name, p.slug, p.price, p.compare_at_price, p.stock,
                p.category_id, p.images, p.rating_avg, p.rating_count, p.sales_count, p.view_count,
                p.status, s.store_name, c.name as category_name
         FROM public.products p
         JOIN public.stores s ON p.store_id = s.id
         JOIN public.categories c ON p.category_id = c.id
         WHERE p.status = 'active' AND p.stock > 0
         ORDER BY p.sales_count DESC, p.view_count DESC
         LIMIT 12`
      );

      trendingProducts = trendingRes.rows.map((p) => ({
        ...p,
        image: p.images?.[0] || 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500',
      }));
    } catch {
      // Fallback: If DB query encounters connection issue, try search index or fallback curated products
      try {
        const searchFallback = await this.searchService.search({ limit: 12, inStockOnly: true });
        if (searchFallback.products && searchFallback.products.length > 0) {
          trendingProducts = searchFallback.products;
        }
      } catch {}

      if (trendingProducts.length === 0) {
        trendingProducts = this.getFallbackTrendingProducts();
      }
    }

    // Always seed candidate pool with all curated products so personalized preferences match
    const allCatalogProducts = this.getFallbackTrendingProducts();
    for (const p of allCatalogProducts) {
      if (!candidateMap.has(p.id)) {
        candidateMap.set(p.id, {
          product: p,
          queryRelevance: 0.1,
          interestAffinity: 0.2,
          vectorSimilarity: 0.4,
          popularity: Math.min((p.sales_count || 50) / 150, 1.0),
          ratingQuality: (p.rating_avg || 4.5) / 5.0,
          freshness: 0.7,
          stockPriceFit: 1.0,
          finalScore: 0,
        });
      }
    }

    // Add trending to candidates
    for (const p of trendingProducts) {
      if (!candidateMap.has(p.id)) {
        candidateMap.set(p.id, {
          product: p,
          queryRelevance: 0.2,
          interestAffinity: 0.3,
          vectorSimilarity: 0.5,
          popularity: Math.min(p.sales_count / 150, 1.0),
          ratingQuality: p.rating_avg / 5.0,
          freshness: 0.7,
          stockPriceFit: 1.0,
          finalScore: 0,
        });
      }
    }

    // (C) Personalized Preference Rails
    if (userProfile?.shopping_for && userProfile.shopping_for !== 'prefer_not_to_say') {
      const sf = userProfile.shopping_for;
      const sfLabel =
        sf === 'womens'
          ? "Women's Collection"
          : sf === 'mens'
          ? "Men's Collection"
          : sf === 'kids'
          ? "Kids' Picks"
          : 'Curated Styles';

      const sfMatches = Array.from(candidateMap.values())
        .map((c) => c.product)
        .filter((p) => {
          const pCat = (p.category_name || '').toLowerCase();
          const pName = (p.name || '').toLowerCase();
          if (sf === 'womens')
            return (
              pCat.includes('women') ||
              pName.includes('women') ||
              pName.includes('dress') ||
              pName.includes('kurta') ||
              pCat.includes('couture')
            );
          if (sf === 'mens')
            return (
              pCat.includes('men') ||
              pName.includes('men') ||
              pName.includes('shirt') ||
              pName.includes('loafer') ||
              pCat.includes('accessories')
            );
          if (sf === 'kids')
            return (
              pCat.includes('kid') ||
              pName.includes('kid') ||
              pName.includes('toddler') ||
              pName.includes('child')
            );
          return true;
        });

      if (sfMatches.length > 0) {
        queryRails.unshift({
          title: `Selected for You: ${sfLabel}`,
          reason: `Personalized for your ${sfLabel} preference`,
          products: sfMatches.slice(0, 4),
        });
      }
    }

    if (userInterests.length > 0) {
      const intMatches = Array.from(candidateMap.values())
        .map((c) => c.product)
        .filter((p) => {
          const pCat = (p.category_name || '').toLowerCase();
          const pName = (p.name || '').toLowerCase();
          return userInterests.some((intSlug) => {
            const cleanSlug = intSlug
              .replace('apparel-', '')
              .replace('-living', '')
              .replace('-shoes', '')
              .replace('footwear-', 'footwear');
            return pCat.includes(cleanSlug) || pName.includes(cleanSlug);
          });
        });

      if (intMatches.length > 0) {
        queryRails.push({
          title: 'Matches Your Category Interests',
          reason: 'Curated based on your selected personal preferences',
          products: intMatches.slice(0, 4),
        });
      }
    }

    // 4. Compute Blended Ranking Scores
    const isColdStart = recentSearches.length === 0;

    const wQuery = isColdStart ? 0.05 : 0.35;
    const wInterest = isColdStart ? 0.25 : 0.20;
    const wVector = isColdStart ? 0.10 : 0.20;
    const wPop = isColdStart ? 0.20 : 0.10;
    const wRating = 0.15;
    const wFresh = 0.05;
    const wStock = 0.10;

    const scoredCandidates = Array.from(candidateMap.values()).map((c) => {
      let score =
        wQuery * c.queryRelevance +
        wInterest * c.interestAffinity +
        wVector * c.vectorSimilarity +
        wPop * c.popularity +
        wRating * c.ratingQuality +
        wFresh * c.freshness +
        wStock * c.stockPriceFit;

      // Personalization BOOSTS (Never hard filters)
      const pCat = (c.product.category_name || '').toLowerCase();
      const pName = (c.product.name || '').toLowerCase();

      // Interest categories boost (+0.35)
      if (userInterests.length > 0) {
        const matchesInterest = userInterests.some((intSlug) => {
          const cleanSlug = intSlug
            .replace('apparel-', '')
            .replace('-living', '')
            .replace('-shoes', '')
            .replace('footwear-', 'footwear');
          return pCat.includes(cleanSlug) || pName.includes(cleanSlug);
        });
        if (matchesInterest) {
          score += 0.35;
        }
      }

      // "Shopping for" preference boost (+0.30)
      if (userProfile?.shopping_for && userProfile.shopping_for !== 'prefer_not_to_say') {
        const sf = userProfile.shopping_for;
        if (
          sf === 'mens' &&
          (pCat.includes('men') || pName.includes('men') || pCat.includes('male') || pName.includes('shirt'))
        ) {
          score += 0.30;
        } else if (
          sf === 'womens' &&
          (pCat.includes('women') || pName.includes('women') || pCat.includes('couture') || pName.includes('dress') || pName.includes('kurta'))
        ) {
          score += 0.30;
        } else if (
          sf === 'kids' &&
          (pCat.includes('kid') || pName.includes('kid') || pName.includes('toddler') || pName.includes('child'))
        ) {
          score += 0.30;
        }
      }

      // Size profile boost (+0.15) if size matches apparel/shoe product
      if (userProfile?.size_profile) {
        const { topSize, shoeSize } = userProfile.size_profile;
        if (topSize && (pCat.includes('apparel') || pCat.includes('clothing'))) {
          score += 0.15;
        }
        if (shoeSize && (pCat.includes('footwear') || pCat.includes('shoe'))) {
          score += 0.15;
        }
      }

      // Penalties: Out of stock exclusion
      if (c.product.stock <= 0) {
        score = 0;
      }

      return {
        ...c,
        finalScore: Math.round(score * 1000) / 1000,
      };
    });

    // 5. Diversity Re-ranking: Cap at max 3 items per store and 4 items per category
    const storeCounts = new Map<string, number>();
    const categoryCounts = new Map<string, number>();
    const diverseRecommended: any[] = [];

    scoredCandidates.sort((a, b) => b.finalScore - a.finalScore);

    for (const c of scoredCandidates) {
      if (c.finalScore <= 0) continue;
      const sId = c.product.store_id || c.product.store_name;
      const cId = c.product.category_id || c.product.category_name;

      const currentStoreCount = storeCounts.get(sId) || 0;
      const currentCatCount = categoryCounts.get(cId) || 0;

      if (currentStoreCount < 3 && currentCatCount < 4) {
        diverseRecommended.push(c.product);
        storeCounts.set(sId, currentStoreCount + 1);
        categoryCounts.set(cId, currentCatCount + 1);
      }

      if (diverseRecommended.length >= 10) break;
    }

    const response: HomeRecommendationsResponse = {
      recentSearches,
      rails: queryRails,
      recommended:
        diverseRecommended.length > 0 ? diverseRecommended : trendingProducts.slice(0, 6),
      trending: trendingProducts.slice(0, 8),
    };

    // Cache in Redis for 300s (5 min)
    if (identifier) {
      try {
        if (this.redisClient.status === 'ready' || this.redisClient.status === 'connecting') {
          await this.redisClient.set(
            `feed:${identifier}`,
            JSON.stringify(response),
            'EX',
            300
          );
        }
      } catch {}
    }

    return response;
  }

  private getFallbackTrendingProducts() {
    return [
      {
        id: 'prod-fallback-womens-1',
        name: 'Silk Chanderi Hand-Block Printed Kurta Set',
        slug: 'silk-chanderi-hand-block-kurta-set',
        price: 2899,
        compare_at_price: 3699,
        stock: 22,
        rating_avg: 4.9,
        rating_count: 64,
        sales_count: 140,
        store_name: 'Zari Couture',
        category_name: 'Womenswear & Couture',
        images: ['https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=500'],
        image: 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=500',
      },
      {
        id: 'prod-fallback-womens-2',
        name: 'Contemporary Floral Tiered Midi Dress',
        slug: 'contemporary-floral-tiered-midi-dress',
        price: 2199,
        compare_at_price: 2799,
        stock: 28,
        rating_avg: 4.8,
        rating_count: 52,
        sales_count: 110,
        store_name: 'Mira Floral Studio',
        category_name: 'Womenswear & Couture',
        images: ['https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?w=500'],
        image: 'https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?w=500',
      },
      {
        id: 'prod-fallback-mens-1',
        name: 'Pure Khadi Linen Casual Relaxed Shirt',
        slug: 'pure-khadi-linen-casual-relaxed-shirt',
        price: 2499,
        compare_at_price: 3299,
        stock: 30,
        rating_avg: 4.75,
        rating_count: 112,
        sales_count: 180,
        store_name: 'Vedic Loom Collective',
        category_name: 'Menswear & Accessories',
        images: ['https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=500'],
        image: 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=500',
      },
      {
        id: 'prod-fallback-mens-2',
        name: 'Full Grain Leather Weekender Duffel',
        slug: 'full-grain-leather-weekender-duffel',
        price: 6899,
        compare_at_price: 8999,
        stock: 18,
        rating_avg: 4.91,
        rating_count: 150,
        sales_count: 220,
        store_name: 'Heritage Leathers Co',
        category_name: 'Menswear & Accessories',
        images: ['https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=500'],
        image: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=500',
      },
      {
        id: 'prod-fallback-kids-1',
        name: 'Organic Cotton Breathable Toddler Playwear Set',
        slug: 'organic-cotton-toddler-playwear-set',
        price: 999,
        compare_at_price: 1399,
        stock: 35,
        rating_avg: 4.85,
        rating_count: 48,
        sales_count: 95,
        store_name: 'TinySprout Essentials',
        category_name: "Kids' Apparel",
        images: ['https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?w=500'],
        image: 'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?w=500',
      },
      {
        id: 'prod-fallback-gadgets-1',
        name: 'Custom Walnut Mechanical Keyboard',
        slug: 'custom-walnut-mechanical-keyboard',
        price: 7499,
        compare_at_price: 9999,
        stock: 14,
        rating_avg: 4.96,
        rating_count: 65,
        sales_count: 165,
        store_name: 'Apex Tech India',
        category_name: 'Smart Gadgets & Electronics',
        images: ['https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=500'],
        image: 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=500',
      },
      {
        id: 'prod-fallback-gadgets-2',
        name: 'Minimalist Magnetic Wireless Charging Pad',
        slug: 'minimalist-magnetic-wireless-charging-pad',
        price: 999,
        compare_at_price: 1499,
        stock: 40,
        rating_avg: 4.7,
        rating_count: 89,
        sales_count: 210,
        store_name: 'TechGear Labs',
        category_name: 'Smart Gadgets & Electronics',
        images: ['https://images.unsplash.com/photo-1586816879360-004f5b0c51e5?w=500'],
        image: 'https://images.unsplash.com/photo-1586816879360-004f5b0c51e5?w=500',
      },
      {
        id: 'prod-fallback-crafts-1',
        name: 'Handcrafted Wooden Desk Organizer',
        slug: 'handcrafted-wooden-desk-organizer',
        price: 1499,
        compare_at_price: 1999,
        stock: 25,
        rating_avg: 4.8,
        rating_count: 42,
        sales_count: 120,
        store_name: 'Artisan Works',
        category_name: 'Artisanal Crafts',
        images: ['https://images.unsplash.com/photo-1544816155-12df9643f363?w=500'],
        image: 'https://images.unsplash.com/photo-1544816155-12df9643f363?w=500',
      },
      {
        id: 'prod-fallback-crafts-2',
        name: 'Handcrafted Ceramic Pour-Over Dripper Set',
        slug: 'handcrafted-ceramic-dripper-set',
        price: 1899,
        compare_at_price: 2200,
        stock: 18,
        rating_avg: 4.85,
        rating_count: 76,
        sales_count: 90,
        store_name: 'Clay & Kiln Studio',
        category_name: 'Artisanal Crafts',
        images: ['https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=500'],
        image: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=500',
      },
      {
        id: 'prod-fallback-sustainable-1',
        name: 'Bamboo Fiber Reusable Travel Flask & Cutlery',
        slug: 'bamboo-fiber-reusable-travel-flask',
        price: 899,
        compare_at_price: 1199,
        stock: 45,
        rating_avg: 4.8,
        rating_count: 70,
        sales_count: 130,
        store_name: 'GreenLiving India',
        category_name: 'Sustainable & Eco Living',
        images: ['https://images.unsplash.com/photo-1544816155-12df9643f363?w=500'],
        image: 'https://images.unsplash.com/photo-1544816155-12df9643f363?w=500',
      },
      {
        id: 'prod-fallback-foods-1',
        name: 'Organic Wildflower Forest Honey 500g',
        slug: 'organic-wildflower-forest-honey',
        price: 649,
        compare_at_price: 799,
        stock: 50,
        rating_avg: 4.9,
        rating_count: 320,
        sales_count: 350,
        store_name: 'Himalayan Organics',
        category_name: 'Gourmet & Organic Foods',
        images: ['https://images.unsplash.com/photo-1587049352847-4a222e784d38?w=500'],
        image: 'https://images.unsplash.com/photo-1587049352847-4a222e784d38?w=500',
      },
      {
        id: 'prod-fallback-beauty-1',
        name: 'Cold-Pressed Virgin Coconut & Argan Hair Elixir',
        slug: 'cold-pressed-virgin-coconut-oil',
        price: 499,
        compare_at_price: 599,
        stock: 60,
        rating_avg: 4.92,
        rating_count: 410,
        sales_count: 420,
        store_name: 'Himalayan Organics',
        category_name: 'Clean Beauty & Wellness',
        images: ['https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=500'],
        image: 'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=500',
      },
      {
        id: 'prod-fallback-footwear-1',
        name: 'Hand-Stitched Genuine Leather Penny Loafers',
        slug: 'hand-stitched-leather-penny-loafers',
        price: 4299,
        compare_at_price: 5499,
        stock: 20,
        rating_avg: 4.88,
        rating_count: 95,
        sales_count: 145,
        store_name: 'Heritage Leathers Co',
        category_name: 'Designer Footwear',
        images: ['https://images.unsplash.com/photo-1533867617858-e7b97e060509?w=500'],
        image: 'https://images.unsplash.com/photo-1533867617858-e7b97e060509?w=500',
      },
    ];
  }
}

