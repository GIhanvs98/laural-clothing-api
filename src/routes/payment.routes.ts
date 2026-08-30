import { Router } from 'express';
import { handleWebhook, getPaymentTransactions, getPaymentKpis, retryPayment, getPaymentMethods } from '../controllers/payment.controller';

const router = Router();

// Endpoint for payment gateway webhooks
router.post('/webhook/:provider', handleWebhook);

// Endpoint for retrying a failed payment
router.post('/retry/:orderNumber', retryPayment);

router.get('/transactions', getPaymentTransactions);
router.get('/kpis', getPaymentKpis);
router.get('/methods', getPaymentMethods);

export default router;
