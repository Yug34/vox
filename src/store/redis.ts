import Redis from 'ioredis';
import config from '../../config';

let redis: Redis | null = null;

export function getRedis(): Redis | null {
  if (!config.redisUrl) return null;
  if (!redis) {
    redis = new Redis(config.redisUrl, {
      maxRetriesPerRequest: 3,
      retryStrategy(times) {
        const delay = Math.min(times * 100, 3000);
        return delay;
      },
    });
    redis.on('error', (err) => {
      console.error('[Redis] Connection error:', err);
    });
  }
  return redis;
}

export function closeRedis(): Promise<void> {
  if (redis) {
    const r = redis;
    redis = null;
    return r.quit().then(() => undefined);
  }
  return Promise.resolve();
}
