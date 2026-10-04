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

    // 4. Compute Blended Ranking Scores
    // Weights:
    // score = 0.35 * query_relevance + 0.20 * interest_affinity + 0.20 * vector_similarity
    //       + 0.10 * popularity + 0.05 * rating_quality + 0.05 * freshness + 0.05 * in_stock_and_price_fit
    const isColdStart = recentSearches.length === 0;

    const wQuery = isColdStart ? 0.05 : 0.35;
    const wInterest = isColdStart ? 0.05 : 0.20;
    const wVector = isColdStart ? 0.10 : 0.20;
    const wPop = isColdStart ? 0.35 : 0.10;
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

      // Interest categories boost
      if (userInterests.length > 0) {
        const matchesInterest = userInterests.some((intSlug) =>
          pCat.includes(intSlug.replace('apparel-', '').replace('-living', '')) ||
          pName.includes(intSlug.replace('apparel-', '').replace('-living', ''))
        );
        if (matchesInterest) {
          score += 0.25;
        }
      }

      // "Shopping for" preference boost
      if (userProfile?.shopping_for && userProfile.shopping_for !== 'prefer_not_to_say') {
        const sf = userProfile.shopping_for;
        if (sf === 'mens' && (pCat.includes('men') || pName.includes('men') || pCat.includes('male'))) {
          score += 0.20;
        } else if (sf === 'womens' && (pCat.includes('women') || pName.includes('women') || pCat.includes('couture'))) {
          score += 0.20;
        } else if (sf === 'kids' && (pCat.includes('kid') || pName.includes('kid') || pName.includes('child'))) {
          score += 0.20;
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
        id: 'prod-fallback-1',
        name: 'Handcrafted Wooden Desk Organizer',
        slug: 'handcrafted-wooden-desk-organizer',
        price: 1499,
        compare_at_price: 1999,
        stock: 25,
        rating_avg: 4.8,
        rating_count: 42,
        sales_count: 120,
        store_name: 'Artisan Works',
        category_name: 'Home & Living',
        images: ['https://images.unsplash.com/photo-1544816155-12df9643f363?w=500'],
        image: 'https://images.unsplash.com/photo-1544816155-12df9643f363?w=500',
      },
      {
        id: 'prod-fallback-2',
        name: 'Organic Cotton Casual Oversized Shirt',
        slug: 'organic-cotton-casual-oversized-shirt',
        price: 1299,
        compare_at_price: 1899,
        stock: 30,
        rating_avg: 4.6,
        rating_count: 58,
        sales_count: 95,
        store_name: 'EcoWear Co.',
        category_name: 'Apparel',
        images: ['https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=500'],
        image: 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=500',
      },
      {
        id: 'prod-fallback-3',
        name: 'Minimalist Wireless Charging Pad',
        slug: 'minimalist-wireless-charging-pad',
        price: 999,
        compare_at_price: 1499,
        stock: 40,
        rating_avg: 4.7,
        rating_count: 89,
        sales_count: 210,
        store_name: 'TechGear Labs',
        category_name: 'Electronics',
        images: ['https://images.unsplash.com/photo-1586816879360-004f5b0c51e5?w=500'],
        image: 'https://images.unsplash.com/photo-1586816879360-004f5b0c51e5?w=500',
      },
      {
        id: 'prod-fallback-4',
        name: 'Handmade Ceramic Coffee Mug Set',
        slug: 'handmade-ceramic-coffee-mug-set',
        price: 799,
        compare_at_price: 1199,
        stock: 15,
        rating_avg: 4.9,
        rating_count: 34,
        sales_count: 75,
        store_name: 'Clay & Co',
        category_name: 'Home & Living',
        images: ['https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=500'],
        image: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=500',
      },
    ];
  }
}
