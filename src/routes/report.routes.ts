import { Router } from 'express';
import { getSalesReport, getBranchReport, getPaymentReport, getInventoryValuationReport } from '../controllers/report.controller';

const router = Router();

router.get('/sales', getSalesReport);
router.get('/branches', getBranchReport);
router.get('/payments', getPaymentReport);
router.get('/inventory', getInventoryValuationReport);

export default router;
