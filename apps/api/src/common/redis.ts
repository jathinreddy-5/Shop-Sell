import Redis, { RedisOptions } from 'ioredis';

/**
 * Creates an Upstash-compatible Redis client.
 * Supports Upstash Redis URLs (rediss://...) with TLS as well as standard host/port.
 */
export function createRedisClient(customOptions?: Partial<RedisOptions>): Redis {
  const redisUrl = process.env.REDIS_URL;
  const options: RedisOptions = {
    lazyConnect: true,
    maxRetriesPerRequest: 1,
    retryStrategy: () => null,
    ...customOptions,
  };

  try {
    if (redisUrl && !redisUrl.includes('[YOUR-')) {
      if (redisUrl.startsWith('rediss://')) {
        options.tls = { rejectUnauthorized: false };
      }
      const client = new Redis(redisUrl, options);
      client.on('error', () => {});
      return client;
    }

    const host =
      process.env.REDIS_HOST && !process.env.REDIS_HOST.includes('[YOUR-')
        ? process.env.REDIS_HOST
        : 'localhost';
    const port = parseInt(process.env.REDIS_PORT || '6379', 10);
    const password = process.env.REDIS_PASSWORD || undefined;

    const client = new Redis({
      host,
      port,
      password,
      ...options,
    });
    client.on('error', () => {});
    return client;
  } catch {
    const fallback = new Redis({ host: 'localhost', port: 6379, ...options });
    fallback.on('error', () => {});
    return fallback;
  }
}
