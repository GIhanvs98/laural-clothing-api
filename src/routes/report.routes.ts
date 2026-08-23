import { Router } from 'express';
import { getSalesReport, getBranchReport, getPaymentReport, getInventoryValuationReport } from '../controllers/report.controller';
import { authenticateJWT, requirePermission } from '../middlewares/auth.middleware';

const router = Router();

router.get('/sales', authenticateJWT, requirePermission("reports:view_dashboard"), getSalesReport);
router.get('/branches', authenticateJWT, requirePermission("reports:view_dashboard"), getBranchReport);
router.get('/payments', authenticateJWT, requirePermission("reports:view_dashboard"), getPaymentReport);
router.get('/inventory', authenticateJWT, requirePermission("reports:view_dashboard"), getInventoryValuationReport);

export default router;
