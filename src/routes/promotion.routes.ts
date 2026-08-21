import { Router } from 'express';
import * as promotionController from '../controllers/promotion.controller';

const router = Router();

router.get('/coupons', promotionController.getCoupons);
router.post('/coupons', promotionController.createCoupon);
router.put('/coupons/:id', promotionController.updateCoupon);
router.delete('/coupons/:id', promotionController.deleteCoupon);

router.get('/flash-sales', promotionController.getFlashSales);
router.post('/flash-sales', promotionController.createFlashSale);
router.put('/flash-sales/:id', promotionController.updateFlashSale);
router.delete('/flash-sales/:id', promotionController.deleteFlashSale);

export default router;
