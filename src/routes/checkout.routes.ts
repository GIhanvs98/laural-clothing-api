import { Router } from 'express';
import { calculateCheckout, initiateCheckout } from '../controllers/checkout.controller';
import { checkoutRateLimiter } from '../middlewares/rateLimiter.middleware';
import { checkHoneypot } from '../middlewares/honeypot.middleware';
import { verifyTurnstile } from '../middlewares/turnstile.middleware';

const router = Router();

router.post('/calculate', checkHoneypot, checkoutRateLimiter, calculateCheckout);
router.post('/initiate', checkHoneypot, verifyTurnstile, checkoutRateLimiter, initiateCheckout);

export default router;
