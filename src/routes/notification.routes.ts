import { Router } from 'express';
import { getNotifications, markAsRead, markAllAsRead } from '../controllers/notification.controller';
import { authenticateJWT, requireRole } from '../middlewares/auth.middleware';

const router = Router();

// Only admin/manager can access these routes
router.use(authenticateJWT);
router.use(requireRole('SUPER_ADMIN', 'ADMIN', 'MANAGER'));

router.get('/', getNotifications);
router.put('/read-all', markAllAsRead);
router.put('/:id/read', markAsRead);

export default router;
