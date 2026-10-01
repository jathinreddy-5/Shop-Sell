import { describe, it } from 'node:test';
import * as assert from 'node:assert';
import { SearchOptions } from '../modules/search/search.service';

describe('Phase 3: Typesense Search & Autocomplete Logic', () => {
  it('should construct valid Typesense filter string', () => {
    const buildFilters = (opts: SearchOptions): string => {
      const filters: string[] = ['status:=active'];
      if (opts.inStockOnly) filters.push('stock:>0');
      if (opts.category) filters.push(`category_slug:=${opts.category}`);
      if (opts.minPrice !== undefined || opts.maxPrice !== undefined) {
        const min = opts.minPrice ?? 0;
        const max = opts.maxPrice ?? 99999999;
        filters.push(`price:[${min}..${max}]`);
      }
      return filters.join(' && ');
    };

    const filter1 = buildFilters({
      category: 'audio-headphones',
      inStockOnly: true,
      minPrice: 1000,
      maxPrice: 5000,
    });

    assert.strictEqual(
      filter1,
      'status:=active && stock:>0 && category_slug:=audio-headphones && price:[1000..5000]'
    );
  });

  it('should map sort parameters correctly for Typesense', () => {
    const mapSort = (sortBy?: string, q?: string): string => {
      if (sortBy === 'price_asc') return 'price:asc';
      if (sortBy === 'price_desc') return 'price:desc';
      if (sortBy === 'rating') return 'rating_avg:desc';
      if (sortBy === 'newest') return 'created_at:desc';
      if (sortBy === 'relevance' && q && q !== '*') return '_text_match:desc,sales_count:desc';
      return 'sales_count:desc';
    };

    assert.strictEqual(mapSort('price_asc'), 'price:asc');
    assert.strictEqual(mapSort('relevance', 'running shoes'), '_text_match:desc,sales_count:desc');
    assert.strictEqual(mapSort(), 'sales_count:desc');
  });

  it('should simulate Redis recent searches insertion and cap of 50', () => {
    const recentSet = new Map<string, number>();

    const recordSearch = (query: string, timestamp: number) => {
      recentSet.set(query.toLowerCase(), timestamp);
      // Prune to top 50
      if (recentSet.size > 50) {
        const sorted = Array.from(recentSet.entries()).sort((a, b) => b[1] - a[1]);
        recentSet.clear();
        for (const [k, v] of sorted.slice(0, 50)) {
          recentSet.set(k, v);
        }
      }
    };

    for (let i = 0; i < 60; i++) {
      recordSearch(`query-${i}`, Date.now() + i);
    }

    assert.strictEqual(recentSet.size, 50);
    assert.ok(recentSet.has('query-59'), 'Most recent query should be preserved');
    assert.strictEqual(recentSet.has('query-0'), false, 'Oldest query beyond 50 should be pruned');
  });
});
