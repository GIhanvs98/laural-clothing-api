import { Router } from 'express';
import * as orderController from '../controllers/order.controller';
import { authenticateJWT, requirePermission } from '../middlewares/auth.middleware';

const router = Router();

router.get('/customers/search', authenticateJWT, requirePermission("orders:view"), orderController.searchCustomer);
router.post('/quick-dispatch', authenticateJWT, requirePermission("orders:create"), orderController.createQuickDispatch);
router.get('/', authenticateJWT, requirePermission("orders:view"), orderController.getOrders);
router.get('/track', orderController.trackOrder);
router.get('/:id', authenticateJWT, requirePermission("orders:view"), orderController.getOrderById);
router.patch('/:id/status', authenticateJWT, requirePermission("orders:edit_status"), orderController.updateOrderStatus);
router.post('/:id/refund', authenticateJWT, requirePermission("orders:cancel_refund"), orderController.refundOrder);

export default router;
