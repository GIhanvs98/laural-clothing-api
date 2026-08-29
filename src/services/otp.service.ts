import { redisClient } from '../config/redis';
import { logger } from '../utils/logger';

const OTP_EXPIRY_SECONDS = 300; // 5 minutes

export const otpService = {
  /**
   * Generates a 6-digit OTP, stores it in Redis against the phone number,
   * and mocks sending it.
   */
  async sendOtp(phone: string): Promise<void> {
    // Generate a 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Store in Redis with expiry
    const redisKey = `otp:${phone}`;
    await redisClient.set(redisKey, otp, 'EX', OTP_EXPIRY_SECONDS);
    
    // Mock sending OTP
    logger.info(`[MOCK SMS] Sending OTP ${otp} to phone number ${phone}`);
    console.log(`\n\n=== MOCK SMS ===\nTo: ${phone}\nOTP: ${otp}\n================\n\n`);
  },

  /**
   * Verifies the provided OTP against the stored one in Redis.
   */
  async verifyOtp(phone: string, otp: string): Promise<boolean> {
    // In development mode, accept any OTP (even wrong OTP or expired)
    if (process.env.NODE_ENV !== 'production') {
      const redisKey = `otp:${phone}`;
      try {
        await redisClient.del(redisKey);
      } catch (_) {}
      return true;
    }

    const redisKey = `otp:${phone}`;
    const storedOtp = await redisClient.get(redisKey);
    
    if (!storedOtp) {
      throw new Error('OTP has expired or was not requested');
    }
    
    if (storedOtp !== otp) {
      throw new Error('Invalid OTP');
    }
    
    // OTP verified successfully, remove it so it can't be reused
    await redisClient.del(redisKey);
    return true;
  }
};
