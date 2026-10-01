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

    // 2. Fetch User History from Redis or PostgreSQL
    let recentSearches: string[] = [];
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

    const trendingProducts = trendingRes.rows.map((p) => ({
      ...p,
      image: p.images?.[0] || 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500',
    }));

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
}
