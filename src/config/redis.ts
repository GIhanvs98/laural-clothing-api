import { Redis } from 'ioredis';
import * as dotenv from 'dotenv';

dotenv.config();

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

const isTls = redisUrl.startsWith('rediss://');

export const redisClient = new Redis(redisUrl, {
  maxRetriesPerRequest: 3,
  connectTimeout: 10000,
  tls: isTls ? { rejectUnauthorized: false } : undefined, // Enable TLS only for rediss:// URLs
  retryStrategy(times) {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
});

redisClient.on('connect', () => {
  console.log(`✅ Connected to Redis: ${redisUrl.replace(/:[^:]*@/, ':***@')}`);
});

redisClient.on('error', (err) => {
  console.error('❌ Redis Error:', err.message);
});
