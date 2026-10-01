import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// Custom metrics
export const errorRate = new Rate('errors');
export const recCachedDuration = new Trend('rec_cached_duration', true);
export const recUncachedDuration = new Trend('rec_uncached_duration', true);
export const autocompleteDuration = new Trend('autocomplete_duration', true);
export const productPageDuration = new Trend('product_page_duration', true);
export const checkoutDuration = new Trend('checkout_duration', true);

// Select target virtual users: 100 (default), 500, or 1000 via VUS env var
const TARGET_VUS = parseInt(__ENV.VUS || '100', 10);

export const options = {
  scenarios: {
    marketplace_load: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '15s', target: Math.floor(TARGET_VUS * 0.3) }, // Ramp-up 30%
        { duration: '30s', target: TARGET_VUS },                   // Peak target (100, 500, or 1000 VUs)
        { duration: '30s', target: TARGET_VUS },                   // Sustained load
        { duration: '15s', target: 0 },                            // Cool-down
      ],
      gracefulRampDown: '5s',
    },
  },
  thresholds: {
    // Stage 5 Performance Targets
    rec_cached_duration: ['p(95)<200'],    // Recommendations p95 < 200ms (cached)
    rec_uncached_duration: ['p(95)<500'],  // Recommendations p95 < 500ms (uncached)
    autocomplete_duration: ['p(95)<100'],  // Autocomplete p95 < 100ms
    http_req_failed: ['rate<0.01'],        // Error rate < 1%
    errors: ['rate<0.01'],
  },
};

const BASE_URL = __ENV.API_URL || 'http://localhost:4000/api';

const sampleQueries = [
  'wireless earbuds',
  'running shoes',
  'ceramic mug',
  'linen shirt',
  'mechanical keyboard',
  'organic honey',
  'leather wallet',
  'pour over dripper',
];

const sampleProductSlugs = [
  'acousticpro-true-wireless-earbuds',
  'noise-isolating-anc-studio-buds',
  'organic-wildflower-forest-honey',
  'handcrafted-ceramic-dripper-set',
  'pure-khadi-linen-casual-shirt',
  'custom-walnut-mechanical-keyboard',
];

export default function () {
  const userId = `vu-user-${__VU}`;
  const anonId = `anon-cookie-${__VU}-${__ITER}`;
  const headers = {
    'Content-Type': 'application/json',
    'x-anonymous-id': anonId,
  };

  const rand = Math.random();

  // 1. Homepage & Personalized Recommendations (40% of traffic)
  if (rand < 0.40) {
    group('Homepage Recommendations', function () {
      const isUncached = Math.random() < 0.15; // 15% cache miss / personalized update
      const recHeaders = isUncached
        ? { ...headers, 'Cache-Control': 'no-cache', 'x-cache-bypass': '1' }
        : headers;

      const start = Date.now();
      const res = http.get(`${BASE_URL}/recommendations/home`, { headers: recHeaders });
      const duration = Date.now() - start;

      const success = check(res, {
        'recommendations status is 200': (r) => r.status === 200,
      });

      if (isUncached) {
        recUncachedDuration.add(duration);
      } else {
        recCachedDuration.add(duration);
      }
      errorRate.add(!success);
    });
  }
  // 2. Typesense Autocomplete & Search (30% of traffic)
  else if (rand < 0.70) {
    group('Search & Autocomplete', function () {
      const query = sampleQueries[Math.floor(Math.random() * sampleQueries.length)];
      const prefix = query.substring(0, Math.max(3, Math.floor(query.length / 2)));

      // Fast Autocomplete query
      const acStart = Date.now();
      const acRes = http.get(`${BASE_URL}/search/autocomplete?q=${encodeURIComponent(prefix)}`, { headers });
      const acDuration = Date.now() - acStart;

      autocompleteDuration.add(acDuration);
      const acOk = check(acRes, {
        'autocomplete status is 200': (r) => r.status === 200,
      });
      errorRate.add(!acOk);

      sleep(0.15); // User typing debounce

      // Full search
      const searchRes = http.get(`${BASE_URL}/search?q=${encodeURIComponent(query)}&inStock=true`, { headers });
      check(searchRes, {
        'search status is 200': (r) => r.status === 200,
      });
    });
  }
  // 3. Product Detail Page (15% of traffic)
  else if (rand < 0.85) {
    group('Product Page', function () {
      const slug = sampleProductSlugs[Math.floor(Math.random() * sampleProductSlugs.length)];
      const start = Date.now();
      const res = http.get(`${BASE_URL}/products/${slug}`, { headers });
      const duration = Date.now() - start;

      productPageDuration.add(duration);
      const success = check(res, {
        'product status is 200 or 404': (r) => r.status === 200 || r.status === 404,
      });
      errorRate.add(!success);
    });
  }
  // 4. Cart & Checkout Flow (15% of traffic)
  else {
    group('Cart & Checkout', function () {
      const start = Date.now();
      const cartRes = http.get(`${BASE_URL}/cart`, { headers });
      const duration = Date.now() - start;

      checkoutDuration.add(duration);
      const success = check(cartRes, {
        'cart status is 200': (r) => r.status === 200,
      });
      errorRate.add(!success);
    });
  }

  // Realistic human think time
  sleep(Math.random() * 1.5 + 0.5);
}
