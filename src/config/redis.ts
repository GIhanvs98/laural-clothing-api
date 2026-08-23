import { Redis } from 'ioredis';
import * as dotenv from 'dotenv';

dotenv.config();

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

const isProduction = process.env.NODE_ENV === 'production';

export const redisClient = new Redis(redisUrl, {
  maxRetriesPerRequest: 3,
  connectTimeout: 10000,
  tls: isProduction ? { rejectUnauthorized: false } : undefined, // Enable TLS in production
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
