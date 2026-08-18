import { Router } from 'express';
import {
  getBranches,
  getInventory,
  getStats,
  getTransactions,
  adjustStock,
  getTransfers,
  createTransfer,
  updateTransferStatus,
  createShipment,
  trackShipment,
  fardarWebhook,
  reserveStock,
  releaseStock
} from '../controllers/inventory.controller';

const router = Router();

router.get('/branches', getBranches);
router.get('/', getInventory);
router.get('/stats', getStats);
router.get('/transactions', getTransactions);
router.post('/adjust', adjustStock);
router.post('/reserve', reserveStock);
router.post('/release', releaseStock);
router.get('/transfers', getTransfers);
router.post('/transfers', createTransfer);
router.put('/transfers/:id/status', updateTransferStatus);

// Fardar Shipping integration
router.post('/shipping/create', createShipment);
router.get('/shipping/:trackingNumber', trackShipment);
router.post('/shipping/webhook', fardarWebhook);

export default router;
