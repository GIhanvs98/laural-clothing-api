import { Router } from 'express';
import {
  getBranches,
  createBranch,
  updateBranch,
  deleteBranch,
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
import { authenticateJWT, requirePermission } from '../middlewares/auth.middleware';

const router = Router();

router.get('/branches', getBranches);
router.post('/branches', authenticateJWT, requirePermission("branches:create"), createBranch);
router.put('/branches/:id', authenticateJWT, requirePermission("branches:edit"), updateBranch);
router.delete('/branches/:id', authenticateJWT, requirePermission("branches:delete"), deleteBranch);

router.get('/', authenticateJWT, requirePermission("inventory:view_stock"), getInventory);
router.get('/stats', authenticateJWT, requirePermission("inventory:view_stock"), getStats);
router.get('/transactions', authenticateJWT, requirePermission("inventory:view_stock"), getTransactions);
router.post('/adjust', authenticateJWT, requirePermission("inventory:adjust_stock"), adjustStock);
router.post('/reserve', reserveStock);
router.post('/release', releaseStock);
router.get('/transfers', authenticateJWT, requirePermission("inventory:view_stock"), getTransfers);
router.post('/transfers', authenticateJWT, requirePermission("inventory:stock_transfers"), createTransfer);
router.put('/transfers/:id/status', authenticateJWT, requirePermission("inventory:stock_transfers"), updateTransferStatus);

// Fardar Shipping integration
router.post('/shipping/create', authenticateJWT, requirePermission("shipping:dispatch_fardar"), createShipment);
router.get('/shipping/:trackingNumber', authenticateJWT, requirePermission("shipping:view_queue"), trackShipment);
router.post('/shipping/webhook', fardarWebhook);

export default router;
