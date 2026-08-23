import { Request, Response, NextFunction } from 'express';
import { redisClient } from '../config/redis';

/**
 * Redis-backed rate limiter for login attempts
 * Limits to 5 attempts per 15 minutes per IP
 */
export const loginRateLimiter = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  // Try multiple ways to get the real IP if behind proxies
  let ip = req.ip || req.socket.remoteAddress || 'unknown';
  
  // If behind a proxy, extract the first IP from X-Forwarded-For
  const xForwardedFor = req.headers['x-forwarded-for'];
  if (typeof xForwardedFor === 'string') {
    ip = xForwardedFor.split(',')[0]?.trim() || ip;
  } else if (Array.isArray(xForwardedFor)) {
    ip = xForwardedFor[0]?.trim() || ip;
  }

  const key = `ratelimit:login:${ip}`;

  try {
    const current = await redisClient.incr(key);
    
    // If this is the first attempt, set expiry to 15 minutes (900 seconds)
    if (current === 1) {
      await redisClient.expire(key, 900);
    }
    
    if (current > 5) {
      res.status(429).json({ 
        message: "Too many login attempts. Please try again after 15 minutes." 
      });
      return;
    }
    
    next();
  } catch (error) {
    console.error("Rate limiter error:", error);
    // Fail open: if Redis is down, we still want users to be able to log in
    next();
  }
};
