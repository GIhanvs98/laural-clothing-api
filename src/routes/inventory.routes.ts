import { Router } from 'express';
import {
  getInventory,
  getStats,
  getTransactions,
  adjustStock,
  getTransfers,
  createTransfer,
  updateTransferStatus,
} from '../controllers/inventory.controller';

const router = Router();

router.get('/', getInventory);
router.get('/stats', getStats);
router.get('/transactions', getTransactions);
router.post('/adjust', adjustStock);
router.get('/transfers', getTransfers);
router.post('/transfers', createTransfer);
router.put('/transfers/:id/status', updateTransferStatus);

export default router;
