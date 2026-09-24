import { redisClient } from './src/config/redis';
(async () => {
  try {
    const keys = await redisClient.keys('cart:*');
    console.log("Redis cart keys:", keys);
    process.exit(0);
  } catch (err) {
    console.error("Redis error:", err);
    process.exit(1);
  }
})();
