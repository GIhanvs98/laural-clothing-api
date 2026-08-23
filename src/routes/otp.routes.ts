import { Router } from 'express';
import { sendOtp, verifyOtp } from '../controllers/otp.controller';
import { otpRateLimiter } from '../middlewares/rateLimiter.middleware';

const router = Router();

router.post('/send', otpRateLimiter, sendOtp);
router.post('/verify', otpRateLimiter, verifyOtp);

export default router;
