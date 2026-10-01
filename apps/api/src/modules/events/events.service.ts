import { Injectable } from '@nestjs/common';
import Redis from 'ioredis';
import { calculateDecayedWeight, UserEventType } from '@shop-sell/shared';
import { DatabaseService } from '../../database/database.service';
import { createRedisClient } from '../../common/redis';

@Injectable()
export class EventsService {
  private redisClient: Redis;

  constructor(private readonly db: DatabaseService) {
    this.redisClient = createRedisClient();
  }

  async trackEvent(data: {
    userId?: string | null;
    anonymousId?: string | null;
    eventType: UserEventType;
    query?: string | null;
    productId?: string | null;
    categoryId?: string | null;
  }) {
    const identifier = data.userId || data.anonymousId;
    const now = Date.now();

    // 1. Update Redis data structures in real-time
    if (identifier) {
      try {
        if (this.redisClient.status === 'ready' || this.redisClient.status === 'connecting') {
          // (a) Recent searches sorted set
          if (data.eventType === 'search' && data.query?.trim()) {
            const cleanQuery = data.query.trim().toLowerCase();
            const key = `recent_searches:${identifier}`;
            await this.redisClient.zadd(key, now, cleanQuery);
            await this.redisClient.zremrangebyrank(key, 0, -51);
            await this.redisClient.expire(key, 90 * 86400);
          }

          // (b) Recent views sorted set
          if (data.eventType === 'view' && data.productId) {
            const key = `recent_views:${identifier}`;
            await this.redisClient.zadd(key, now, data.productId);
            await this.redisClient.zremrangebyrank(key, 0, -101);
            await this.redisClient.expire(key, 30 * 86400);
          }

          // (c) User Interest Hash
          const weight = calculateDecayedWeight(data.eventType, 0);
          const interestKey = `interest:${identifier}`;
          if (data.categoryId) {
            await this.redisClient.hincrbyfloat(interestKey, `cat:${data.categoryId}`, weight);
          }
          if (data.query) {
            await this.redisClient.hincrbyfloat(interestKey, `term:${data.query.toLowerCase()}`, weight);
          }
          await this.redisClient.expire(interestKey, 30 * 86400);

          // (d) Invalidate computed feed cache so next homepage view is fresh
          await this.redisClient.del(`feed:${identifier}`);
        }
      } catch {
        // Redis optional fallback
      }
    }

    // 2. Async write to PostgreSQL partitioned user_events table
    try {
      await this.db.query(
        `INSERT INTO public.user_events (
          user_id, anonymous_id, event_type, query, product_id, category_id
        ) VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          data.userId || null,
          data.anonymousId || null,
          data.eventType,
          data.query || null,
          data.productId || null,
          data.categoryId || null,
        ]
      );
    } catch {
      // Async failure handling
    }

    return { success: true };
  }

  async mergeAnonymousEvents(userId: string, anonymousId: string) {
    if (!userId || !anonymousId || userId === anonymousId) return;

    // 1. Merge Redis keys
    try {
      if (this.redisClient.status === 'ready' || this.redisClient.status === 'connecting') {
        // Merge recent searches
        await this.redisClient.zunionstore(
          `recent_searches:${userId}`,
          2,
          `recent_searches:${userId}`,
          `recent_searches:${anonymousId}`,
          'AGGREGATE',
          'MAX'
        );
        await this.redisClient.del(`recent_searches:${anonymousId}`);

        // Merge recent views
        await this.redisClient.zunionstore(
          `recent_views:${userId}`,
          2,
          `recent_views:${userId}`,
          `recent_views:${anonymousId}`,
          'AGGREGATE',
          'MAX'
        );
        await this.redisClient.del(`recent_views:${anonymousId}`);

        // Invalidate feed
        await this.redisClient.del(`feed:${userId}`);
        await this.redisClient.del(`feed:${anonymousId}`);
      }
    } catch {
      // Redis optional fallback
    }

    // 2. Update Postgres user_events rows
    try {
      await this.db.query(
        `UPDATE public.user_events
         SET user_id = $1
         WHERE anonymous_id = $2 AND user_id IS NULL`,
        [userId, anonymousId]
      );
    } catch {
      // Database optional fallback
    }
  }

  async clearUserHistory(userId: string) {
    try {
      if (this.redisClient.status === 'ready' || this.redisClient.status === 'connecting') {
        await this.redisClient.del(`recent_searches:${userId}`);
        await this.redisClient.del(`recent_views:${userId}`);
        await this.redisClient.del(`interest:${userId}`);
        await this.redisClient.del(`feed:${userId}`);
      }
    } catch {}

    try {
      await this.db.query(
        `DELETE FROM public.user_events WHERE user_id = $1`,
        [userId]
      );
    } catch {}
  }
}
