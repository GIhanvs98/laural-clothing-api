import { Router } from 'express';
import { NotificationController } from '../controllers/notification.controller';
import { authenticateJWT, requirePermission } from '../middlewares/auth.middleware';

const router = Router();

// Public routes for frontend clients
router.post('/push/subscribe', authenticateJWT, NotificationController.subscribePush);
router.get('/push/vapid-key', NotificationController.getVapidKey);

// Protected Admin Routes
router.post('/sms/bulk', authenticateJWT, requirePermission('manage_promotions'), NotificationController.sendBulkSms);
router.post('/push/broadcast', authenticateJWT, requirePermission('manage_promotions'), NotificationController.broadcastPush);

export default router;
