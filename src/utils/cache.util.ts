import { redisClient } from '../config/redis';
import { logger } from './logger';

export async function withCache<T>(
  key: string,
  ttlSeconds: number,
  fetcher: () => Promise<T>
): Promise<T> {
  try {
    const cachedData = await redisClient.get(key);
    if (cachedData) {
      return JSON.parse(cachedData) as T;
    }
  } catch (error) {
    logger.error(`Redis get error for key ${key}:`, error);
  }

  const freshData = await fetcher();

  if (freshData !== null && freshData !== undefined) {
    try {
      await redisClient.setex(key, ttlSeconds, JSON.stringify(freshData));
    } catch (error) {
      logger.error(`Redis setex error for key ${key}:`, error);
    }
  }

  return freshData;
}

export async function invalidateCache(pattern: string): Promise<void> {
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
    logger.error(`Redis invalidateCache error for pattern ${pattern}:`, error);
  }
}
