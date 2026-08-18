import { Router } from 'express';
import { calculateCheckout, initiateCheckout } from '../controllers/checkout.controller';

const router = Router();

router.post('/calculate', calculateCheckout);
router.post('/initiate', initiateCheckout);

export default router;
