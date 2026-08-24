import { Router } from 'express';
import { handleWebhook } from '../controllers/payment.controller';

const router = Router();

// Endpoint for payment gateway webhooks
router.post('/webhook/:provider', handleWebhook);

export default router;
