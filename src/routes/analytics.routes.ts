import { Router } from 'express';
import { getBusinessOverview } from '../controllers/analytics.controller';
import { authenticateJWT, requirePermission } from '../middlewares/auth.middleware';

const router = Router();

router.get('/overview', authenticateJWT, requirePermission("reports:view_dashboard", "reports:view_financial"), getBusinessOverview);

export default router;
