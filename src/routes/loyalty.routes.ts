import { Router } from 'express';
import { getMyLoyalty, getLoyaltyMembers, getLoyaltyKpis } from '../controllers/loyalty.controller';
import { authenticateJWT, requireRole } from '../middlewares/auth.middleware';

const router = Router();

router.get('/me', authenticateJWT, getMyLoyalty);

// Admin routes
router.get('/members', authenticateJWT, requireRole('SUPER_ADMIN', 'ADMIN', 'MANAGER'), getLoyaltyMembers);
router.get('/kpis', authenticateJWT, requireRole('SUPER_ADMIN', 'ADMIN', 'MANAGER'), getLoyaltyKpis);

export default router;
