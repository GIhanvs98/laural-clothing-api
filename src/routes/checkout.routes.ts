import { Router } from 'express';
import { calculateCheckout, initiateCheckout } from '../controllers/checkout.controller';
import { checkoutRateLimiter } from '../middlewares/rateLimiter.middleware';

const router = Router();

router.post('/calculate', checkoutRateLimiter, calculateCheckout);
router.post('/initiate', checkoutRateLimiter, initiateCheckout);

export default router;
