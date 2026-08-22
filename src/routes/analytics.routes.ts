import { Router } from 'express';
import { getBusinessOverview } from '../controllers/analytics.controller';

const router = Router();

router.get('/overview', getBusinessOverview);

export default router;
