import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';
import { createRedisClient } from '../../../common/redis';

@Injectable()
export class AdminRedisService implements OnModuleDestroy {
  private readonly logger = new Logger(AdminRedisService.name);
  private client: Redis | null = null;
  private readonly fallbackMemory = new Map<string, { value: string; expiresAt?: number }>();

  constructor() {
    try {
      this.client = createRedisClient();
    } catch (err) {
      this.logger.warn(`Failed to initialize Redis client, falling back to memory: ${err}`);
      this.client = null;
    }
  }

  async get(key: string): Promise<string | null> {
    if (this.client) {
      try {
        return await this.client.get(key);
      } catch (err) {
        this.logger.debug(`Redis get failed, checking memory fallback: ${err}`);
      }
    }

    const item = this.fallbackMemory.get(key);
    if (!item) return null;
    if (item.expiresAt && item.expiresAt <= Date.now()) {
      this.fallbackMemory.delete(key);
      return null;
    }
    return item.value;
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    if (this.client) {
      try {
        if (ttlSeconds && ttlSeconds > 0) {
          await this.client.set(key, value, 'EX', ttlSeconds);
        } else {
          await this.client.set(key, value);
        }
        return;
      } catch (err) {
        this.logger.debug(`Redis set failed, saving to memory fallback: ${err}`);
      }
    }

    this.fallbackMemory.set(key, {
      value,
      expiresAt: ttlSeconds ? Date.now() + ttlSeconds * 1000 : undefined,
    });
  }

  async del(key: string): Promise<void> {
    if (this.client) {
      try {
        await this.client.del(key);
      } catch (err) {
        this.logger.debug(`Redis del failed: ${err}`);
      }
    }
    this.fallbackMemory.delete(key);
  }

  async incr(key: string): Promise<number> {
    if (this.client) {
      try {
        return await this.client.incr(key);
      } catch (err) {
        this.logger.debug(`Redis incr failed, using memory fallback: ${err}`);
      }
    }

    const currentStr = await this.get(key);
    const count = (parseInt(currentStr || '0', 10) || 0) + 1;
    await this.set(key, count.toString());
    return count;
  }

  async expire(key: string, seconds: number): Promise<void> {
    if (this.client) {
      try {
        await this.client.expire(key, seconds);
        return;
      } catch (err) {
        this.logger.debug(`Redis expire failed: ${err}`);
      }
    }

    const item = this.fallbackMemory.get(key);
    if (item) {
      item.expiresAt = Date.now() + seconds * 1000;
    }
  }

  onModuleDestroy() {
    if (this.client) {
      try {
        this.client.disconnect();
      } catch {}
    }
  }
}
