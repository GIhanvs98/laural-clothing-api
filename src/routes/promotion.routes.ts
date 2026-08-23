import { Router } from 'express';
import * as promotionController from '../controllers/promotion.controller';
import { authenticateJWT, requirePermission } from '../middlewares/auth.middleware';

const router = Router();

router.get('/coupons', authenticateJWT, requirePermission("promotions:view"), promotionController.getCoupons);
router.post('/coupons', authenticateJWT, requirePermission("promotions:create_coupon"), promotionController.createCoupon);
router.put('/coupons/:id', authenticateJWT, requirePermission("promotions:deactivate"), promotionController.updateCoupon);
router.delete('/coupons/:id', authenticateJWT, requirePermission("promotions:deactivate"), promotionController.deleteCoupon);

router.get('/flash-sales', authenticateJWT, requirePermission("promotions:view"), promotionController.getFlashSales);
router.post('/flash-sales', authenticateJWT, requirePermission("promotions:create_campaign"), promotionController.createFlashSale);
router.put('/flash-sales/:id', authenticateJWT, requirePermission("promotions:deactivate"), promotionController.updateFlashSale);
router.delete('/flash-sales/:id', authenticateJWT, requirePermission("promotions:deactivate"), promotionController.deleteFlashSale);

export default router;
