import { UserEventType, UserRole } from '../types';

export const USER_ROLES: Record<string, UserRole> = {
  CUSTOMER: 'customer',
  OWNER: 'owner',
  ADMIN: 'admin',
} as const;

export const DEFAULT_CURRENCY = 'INR';

export const EVENT_WEIGHTS: Record<UserEventType, number> = {
  search: 1.0,
  view: 1.5,
  wishlist: 2.5,
  add_to_cart: 3.0,
  purchase: 4.0,
  click: 1.2,
  impression: 0.1,
};

// Default half-life of 7 days: λ = ln(2) / 7
export const DEFAULT_REC_HALF_LIFE_DAYS = 7;
export const DEFAULT_REC_LAMBDA = Math.LN2 / DEFAULT_REC_HALF_LIFE_DAYS;

export function calculateDecayedWeight(
  eventType: UserEventType,
  ageInDays: number,
  lambda: number = DEFAULT_REC_LAMBDA
): number {
  const baseWeight = EVENT_WEIGHTS[eventType] || 1.0;
  return baseWeight * Math.exp(-lambda * ageInDays);
}

export const REDIS_KEYS = {
  recentSearches: (uid: string) => `recent_searches:${uid}`,
  recentViews: (uid: string) => `recent_views:${uid}`,
  interest: (uid: string) => `interest:${uid}`,
  feed: (uid: string) => `feed:${uid}`,
  cart: (id: string) => `cart:${id}`,
  idempotency: (key: string) => `idempotency:${key}`,
  rateLimit: (prefix: string, identifier: string) => `ratelimit:${prefix}:${identifier}`,
};

export const REC_CONFIG = {
  FEED_CACHE_TTL_SECONDS: 300, // 5 min
  RECENT_SEARCHES_CAP: 50,
  RECENT_SEARCHES_TTL_DAYS: 90,
  RECENT_VIEWS_CAP: 100,
  VECTOR_DIMENSION: 384,
  TOP_RECENT_QUERIES_COUNT: 5,
  TOP_CATEGORIES_COUNT: 3,
};
