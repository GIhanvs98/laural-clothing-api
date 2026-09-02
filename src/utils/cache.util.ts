import { redisClient } from '../config/redis';
import { logger } from './logger';

export async function withCache<T>(
  key: string,
  ttlSeconds: number,
  fetcher: () => Promise<T>
): Promise<T> {
  if (redisClient.status === 'ready') {
    try {
      const cachedData = await redisClient.get(key);
      if (cachedData) {
        return JSON.parse(cachedData) as T;
      }
    } catch (error) {
      // Fail open
    }
  }

  const freshData = await fetcher();

  if (freshData !== null && freshData !== undefined && redisClient.status === 'ready') {
    // Prevent caching empty arrays to avoid poisoning the cache with false negatives
    if (Array.isArray(freshData) && freshData.length === 0) {
      logger.warn(`Bypassing cache for key ${key} because fetcher returned an empty array`);
    } else {
      try {
        await redisClient.setex(key, ttlSeconds, JSON.stringify(freshData));
      } catch (error) {
        // Fail open
      }
    }
  }

  return freshData;
}

export async function invalidateCache(pattern: string): Promise<void> {
  if (redisClient.status !== 'ready') return;
  try {
    let cursor = '0';
    do {
      const [nextCursor, keys] = await redisClient.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
      cursor = nextCursor;
      if (keys.length > 0) {
        await redisClient.del(...keys);
      }
    } while (cursor !== '0');
  } catch (error) {
    // Fail open
  }
}
