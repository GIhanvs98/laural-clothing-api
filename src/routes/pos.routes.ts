import { Router } from 'express';
import * as posController from '../controllers/pos.controller';

const router = Router();

// Sessions
router.post('/sessions/open', posController.openSession);
router.post('/sessions/close', posController.closeSession);
router.get('/sessions/current', posController.getCurrentSession);

// Vouchers
router.post('/vouchers/generate', posController.generateVoucher);
router.get('/vouchers/:code', posController.validateVoucher);

// Orders
router.post('/orders', posController.processPosOrder);

export default router;
