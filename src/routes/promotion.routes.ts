import { Router } from 'express';
import * as promotionController from '../controllers/promotion.controller';
import { authenticateJWT, requirePermission } from '../middlewares/auth.middleware';
import { auditLog } from '../middlewares/audit.middleware';

const router = Router();

router.get('/coupons', authenticateJWT, requirePermission("promotions:view"), promotionController.getCoupons);
router.post('/coupons', authenticateJWT, requirePermission("promotions:create_coupon"), auditLog('Coupon', 'CREATE'), promotionController.createCoupon);
router.put('/coupons/:id', authenticateJWT, requirePermission("promotions:deactivate"), auditLog('Coupon', 'UPDATE'), promotionController.updateCoupon);
router.delete('/coupons/:id', authenticateJWT, requirePermission("promotions:deactivate"), auditLog('Coupon', 'DELETE'), promotionController.deleteCoupon);

router.get('/flash-sales', authenticateJWT, requirePermission("promotions:view"), promotionController.getFlashSales);
router.post('/flash-sales', authenticateJWT, requirePermission("promotions:create_campaign"), auditLog('FlashSale', 'CREATE'), promotionController.createFlashSale);
router.put('/flash-sales/:id', authenticateJWT, requirePermission("promotions:deactivate"), auditLog('FlashSale', 'UPDATE'), promotionController.updateFlashSale);
router.delete('/flash-sales/:id', authenticateJWT, requirePermission("promotions:deactivate"), auditLog('FlashSale', 'DELETE'), promotionController.deleteFlashSale);

export default router;
