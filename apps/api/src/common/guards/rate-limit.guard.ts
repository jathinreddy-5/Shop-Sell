import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import Redis from 'ioredis';
import { createRedisClient } from '../redis';

export const RATE_LIMIT_KEY = 'rate_limit_policy';

export interface RateLimitPolicy {
  points: number; // max requests
  duration: number; // in seconds
  prefix: string;
}

export const RateLimit = (policy: RateLimitPolicy) =>
  SetMetadata(RATE_LIMIT_KEY, policy);

// In-memory sliding window fallback when Redis is offline
const memoryBucket = new Map<string, { count: number; resetAt: number }>();

@Injectable()
export class RateLimitGuard implements CanActivate {
  private redisClient: Redis;

  constructor(private readonly reflector: Reflector) {
    this.redisClient = createRedisClient();
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const policy = this.reflector.get<RateLimitPolicy>(
      RATE_LIMIT_KEY,
      context.getHandler()
    );

    if (!policy) {
      return true; // No rate limit set on this route
    }

    const req = context.switchToHttp().getRequest();
    const identifier =
      req.user?.id ||
      req.headers['x-forwarded-for'] ||
      req.socket.remoteAddress ||
      'anonymous';

    const key = `ratelimit:${policy.prefix}:${identifier}`;
    const now = Date.now();

    // 1. Try Redis sliding window
    try {
      if (this.redisClient.status === 'ready' || this.redisClient.status === 'connecting') {
        const current = await this.redisClient.incr(key);
        if (current === 1) {
          await this.redisClient.expire(key, policy.duration);
        }

        if (current > policy.points) {
          const ttl = await this.redisClient.ttl(key);
          const res = context.switchToHttp().getResponse();
          res.header('Retry-After', String(Math.max(1, ttl)));
          throw new HttpException(
            {
              statusCode: HttpStatus.TOO_MANY_REQUESTS,
              message: `Rate limit exceeded. Try again in ${ttl}s`,
              retryAfter: ttl,
            },
            HttpStatus.TOO_MANY_REQUESTS
          );
        }
        return true;
      }
    } catch (err) {
      if (err instanceof HttpException) throw err;
      // Redis offline -> Fallback to in-memory store
    }

    // 2. Memory Fallback
    const entry = memoryBucket.get(key);
    if (!entry || now > entry.resetAt) {
      memoryBucket.set(key, { count: 1, resetAt: now + policy.duration * 1000 });
      return true;
    }

    entry.count += 1;
    if (entry.count > policy.points) {
      const waitSec = Math.ceil((entry.resetAt - now) / 1000);
      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          message: `Rate limit exceeded. Try again in ${waitSec}s`,
          retryAfter: waitSec,
        },
        HttpStatus.TOO_MANY_REQUESTS
      );
    }

    return true;
  }
}
