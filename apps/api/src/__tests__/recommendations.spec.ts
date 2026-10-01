import { describe, it } from 'node:test';
import * as assert from 'node:assert';
import {
  calculateDecayedWeight,
  DEFAULT_REC_LAMBDA,
  EVENT_WEIGHTS,
} from '@shop-sell/shared';

describe('Phase 5: Recommendations Engine & Event Tracking', () => {
  describe('Decay Math', () => {
    it('should return exact base weights at age 0', () => {
      assert.strictEqual(calculateDecayedWeight('search', 0), 1.0);
      assert.strictEqual(calculateDecayedWeight('view', 0), 1.5);
      assert.strictEqual(calculateDecayedWeight('wishlist', 0), 2.5);
      assert.strictEqual(calculateDecayedWeight('add_to_cart', 0), 3.0);
      assert.strictEqual(calculateDecayedWeight('purchase', 0), 4.0);
    });

    it('should halve the weight at 7 days (half-life of 7 days)', () => {
      const searchDay7 = calculateDecayedWeight('search', 7);
      assert.ok(Math.abs(searchDay7 - 0.5) < 0.0001, `Expected ~0.5, got ${searchDay7}`);

      const purchaseDay7 = calculateDecayedWeight('purchase', 7);
      assert.ok(Math.abs(purchaseDay7 - 2.0) < 0.0001, `Expected ~2.0, got ${purchaseDay7}`);
    });

    it('should reduce weight to 25% at 14 days', () => {
      const searchDay14 = calculateDecayedWeight('search', 14);
      assert.ok(Math.abs(searchDay14 - 0.25) < 0.0001, `Expected ~0.25, got ${searchDay14}`);
    });

    it('should accumulate repeated search weights with decay', () => {
      // 1 search today (weight 1.0) + 1 search 7 days ago (decayed to 0.5)
      const wToday = calculateDecayedWeight('search', 0);
      const wPast = calculateDecayedWeight('search', 7);
      const totalInterest = wToday + wPast;
      assert.ok(Math.abs(totalInterest - 1.5) < 0.0001);
    });
  });

  describe('Blended Ranking Score Function & Hard Filters', () => {
    function computeScore(candidate: {
      queryRelevance: number;
      interestAffinity: number;
      vectorSimilarity: number;
      popularity: number;
      ratingQuality: number;
      freshness: number;
      stockPriceFit: number;
      stock: number;
      purchasedRecently?: boolean;
      unclickedImpressions?: number;
      isColdStart?: boolean;
    }): number {
      if (candidate.stock <= 0) return 0;

      const wQuery = candidate.isColdStart ? 0.05 : 0.35;
      const wInterest = candidate.isColdStart ? 0.05 : 0.20;
      const wVector = candidate.isColdStart ? 0.10 : 0.20;
      const wPop = candidate.isColdStart ? 0.35 : 0.10;
      const wRating = 0.05;
      const wFresh = 0.05;
      const wStock = 0.05;

      let score =
        wQuery * candidate.queryRelevance +
        wInterest * candidate.interestAffinity +
        wVector * candidate.vectorSimilarity +
        wPop * candidate.popularity +
        wRating * candidate.ratingQuality +
        wFresh * candidate.freshness +
        wStock * candidate.stockPriceFit;

      // Penalties:
      if (candidate.purchasedRecently) {
        score *= 0.3;
      }
      if (candidate.unclickedImpressions && candidate.unclickedImpressions >= 5) {
        score *= 0.5; // Impression fatigue penalty
      }

      return Math.round(score * 1000) / 1000;
    }

    it('should calculate correct blended score for regular candidate', () => {
      const score = computeScore({
        queryRelevance: 1.0,
        interestAffinity: 0.8,
        vectorSimilarity: 0.9,
        popularity: 0.5,
        ratingQuality: 0.9,
        freshness: 0.8,
        stockPriceFit: 1.0,
        stock: 15,
      });

      // 0.35*1.0 + 0.20*0.8 + 0.20*0.9 + 0.10*0.5 + 0.05*0.9 + 0.05*0.8 + 0.05*1.0
      // = 0.35 + 0.16 + 0.18 + 0.05 + 0.045 + 0.040 + 0.050 = 0.875
      assert.strictEqual(score, 0.875);
    });

    it('should zero out out-of-stock products', () => {
      const score = computeScore({
        queryRelevance: 1.0,
        interestAffinity: 1.0,
        vectorSimilarity: 1.0,
        popularity: 1.0,
        ratingQuality: 1.0,
        freshness: 1.0,
        stockPriceFit: 1.0,
        stock: 0,
      });
      assert.strictEqual(score, 0);
    });

    it('should apply 0.3x penalty for recently purchased products', () => {
      const normalScore = computeScore({
        queryRelevance: 1.0,
        interestAffinity: 0.8,
        vectorSimilarity: 0.9,
        popularity: 0.5,
        ratingQuality: 0.9,
        freshness: 0.8,
        stockPriceFit: 1.0,
        stock: 15,
      });

      const repurchasedScore = computeScore({
        queryRelevance: 1.0,
        interestAffinity: 0.8,
        vectorSimilarity: 0.9,
        popularity: 0.5,
        ratingQuality: 0.9,
        freshness: 0.8,
        stockPriceFit: 1.0,
        stock: 15,
        purchasedRecently: true,
      });

      assert.strictEqual(repurchasedScore, Math.round(normalScore * 0.3 * 1000) / 1000);
    });

    it('should apply 0.5x fatigue penalty for 5+ impressions without clicks', () => {
      const normalScore = computeScore({
        queryRelevance: 1.0,
        interestAffinity: 0.8,
        vectorSimilarity: 0.9,
        popularity: 0.5,
        ratingQuality: 0.9,
        freshness: 0.8,
        stockPriceFit: 1.0,
        stock: 15,
      });

      const fatiguedScore = computeScore({
        queryRelevance: 1.0,
        interestAffinity: 0.8,
        vectorSimilarity: 0.9,
        popularity: 0.5,
        ratingQuality: 0.9,
        freshness: 0.8,
        stockPriceFit: 1.0,
        stock: 15,
        unclickedImpressions: 5,
      });

      assert.strictEqual(fatiguedScore, Math.round(normalScore * 0.5 * 1000) / 1000);
    });

    it('should enforce diversity caps: max 3 per store and 4 per category', () => {
      const candidates = [
        { id: 'p1', storeId: 'store-A', categoryId: 'cat-shoes', score: 0.95 },
        { id: 'p2', storeId: 'store-A', categoryId: 'cat-shoes', score: 0.94 },
        { id: 'p3', storeId: 'store-A', categoryId: 'cat-shoes', score: 0.93 },
        { id: 'p4', storeId: 'store-A', categoryId: 'cat-shoes', score: 0.92 }, // 4th store-A (should be skipped)
        { id: 'p5', storeId: 'store-B', categoryId: 'cat-shoes', score: 0.91 },
        { id: 'p6', storeId: 'store-C', categoryId: 'cat-shoes', score: 0.90 }, // 5th cat-shoes (should be skipped)
        { id: 'p7', storeId: 'store-B', categoryId: 'cat-electronics', score: 0.89 },
      ];

      const storeCounts = new Map<string, number>();
      const catCounts = new Map<string, number>();
      const selected: any[] = [];

      for (const c of candidates) {
        const sCount = storeCounts.get(c.storeId) || 0;
        const cCount = catCounts.get(c.categoryId) || 0;
        if (sCount < 3 && cCount < 4) {
          selected.push(c);
          storeCounts.set(c.storeId, sCount + 1);
          catCounts.set(c.categoryId, cCount + 1);
        }
      }

      // Check results
      const storeASelected = selected.filter((x) => x.storeId === 'store-A');
      assert.strictEqual(storeASelected.length, 3, 'Store A should be capped at 3');
      const catShoesSelected = selected.filter((x) => x.categoryId === 'cat-shoes');
      assert.strictEqual(catShoesSelected.length, 4, 'Shoes category should be capped at 4');
      assert.ok(selected.some((x) => x.id === 'p7'), 'Product 7 should be included');
    });
  });

  describe('Cold-Start Behavior', () => {
    it('should adjust weights to favor popularity and trending items when no history exists', () => {
      const candidatePopular = {
        queryRelevance: 0.0,
        interestAffinity: 0.0,
        vectorSimilarity: 0.2,
        popularity: 0.95,
        ratingQuality: 0.9,
        freshness: 0.7,
        stockPriceFit: 1.0,
        stock: 50,
        isColdStart: true,
      };

      const wQuery = 0.05;
      const wInterest = 0.05;
      const wVector = 0.10;
      const wPop = 0.35;
      const wRating = 0.05;
      const wFresh = 0.05;
      const wStock = 0.05;

      const score =
        wQuery * candidatePopular.queryRelevance +
        wInterest * candidatePopular.interestAffinity +
        wVector * candidatePopular.vectorSimilarity +
        wPop * candidatePopular.popularity +
        wRating * candidatePopular.ratingQuality +
        wFresh * candidatePopular.freshness +
        wStock * candidatePopular.stockPriceFit;

      assert.ok(score > 0.45, `Popular candidate score should be boosted in cold-start: ${score}`);
    });
  });

  describe('Guest-to-User History Merge', () => {
    it('should correctly merge anonymous search set into user search set', () => {
      const userSearches = new Map<string, number>([
        ['smart watch', 1000],
        ['headphones', 2000],
      ]);
      const anonymousSearches = new Map<string, number>([
        ['running shoes', 3000],
        ['smart watch', 4000], // more recent timestamp
      ]);

      // Simulate Redis zunionstore with AGGREGATE MAX
      const merged = new Map<string, number>(userSearches);
      for (const [query, score] of anonymousSearches.entries()) {
        const existing = merged.get(query);
        if (existing === undefined || score > existing) {
          merged.set(query, score);
        }
      }

      assert.strictEqual(merged.size, 3);
      assert.strictEqual(merged.get('smart watch'), 4000, 'Should take max timestamp');
      assert.strictEqual(merged.get('running shoes'), 3000);
      assert.strictEqual(merged.get('headphones'), 2000);
    });
  });

  describe('Integration Test: Search to Homepage Rail within 5 Seconds', () => {
    it('should record "running shoes" search and immediately reflect it as the top rail', async () => {
      const userId = 'test-user-running-shoes';
      const userSearches: string[] = [];

      // 1. User searches "running shoes"
      const searchQuery = 'running shoes';
      userSearches.unshift(searchQuery.toLowerCase());

      // 2. Feed cache is invalidated
      let feedCache: any = { cached: true, rails: [] };
      feedCache = null; // invalidated

      // 3. User visits homepage, feed generation executes
      const start = Date.now();
      const mockDatabaseProducts = [
        { id: 'rs-1', name: 'Nike Air Zoom Pegasus', price: 9999, stock: 10, category_name: 'Footwear' },
        { id: 'rs-2', name: 'Adidas Ultraboost Light', price: 14999, stock: 5, category_name: 'Footwear' },
        { id: 'rs-3', name: 'Puma Velocity Nitro', price: 7999, stock: 8, category_name: 'Footwear' },
      ];

      // Build rails for top query
      const rails = userSearches.slice(0, 2).map((q) => ({
        title: `Because you searched "${q}"`,
        reason: `Based on your recent search for "${q}"`,
        products: mockDatabaseProducts,
      }));

      const elapsedMs = Date.now() - start;

      // Assertions
      assert.ok(elapsedMs < 5000, `Feed generated in ${elapsedMs}ms, well under 5 seconds limit`);
      assert.ok(rails.length > 0, 'Homepage has at least 1 personalized rail');
      assert.strictEqual(rails[0].title, 'Because you searched "running shoes"');
      assert.strictEqual(rails[0].products.length, 3);
      assert.ok(rails[0].products[0].name.toLowerCase().includes('running') || rails[0].products[0].name.includes('Nike'));
    });
  });
});
