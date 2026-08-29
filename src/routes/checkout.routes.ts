import { Router } from 'express';
import { calculateCheckout, initiateCheckout, getLoyaltyPoints } from '../controllers/checkout.controller';
import { checkoutRateLimiter } from '../middlewares/rateLimiter.middleware';
import { checkHoneypot } from '../middlewares/honeypot.middleware';
import { verifyTurnstile } from '../middlewares/turnstile.middleware';

const router = Router();

router.get('/loyalty/:phone', getLoyaltyPoints);
router.post('/calculate', checkHoneypot, checkoutRateLimiter, calculateCheckout);
router.post('/initiate', checkHoneypot, verifyTurnstile, checkoutRateLimiter, initiateCheckout);

export default router;
