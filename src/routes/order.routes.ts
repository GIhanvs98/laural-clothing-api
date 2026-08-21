import { Router } from 'express';
import * as orderController from '../controllers/order.controller';

const router = Router();

router.get('/customers/search', orderController.searchCustomer);
router.post('/quick-dispatch', orderController.createQuickDispatch);
router.get('/', orderController.getOrders);
router.get('/:id', orderController.getOrderById);
router.patch('/:id/status', orderController.updateOrderStatus);

export default router;
