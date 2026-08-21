import { Router } from 'express';
import * as orderController from '../controllers/order.controller';

const router = Router();

router.get('/customers/search', orderController.searchCustomer);
router.post('/quick-dispatch', orderController.createQuickDispatch);

export default router;
