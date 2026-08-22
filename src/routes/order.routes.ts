import { Router } from 'express';
import { getAllOrders, dispatchOrder, trackOrderByPhone } from '../controllers/order.controller';

const router = Router();

router.get('/', getAllOrders);
router.post('/:id/dispatch', dispatchOrder);
router.get('/track/phone/:phone', trackOrderByPhone);

export default router;
