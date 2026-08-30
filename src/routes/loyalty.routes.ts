import { Router } from 'express';
import { getMyLoyalty } from '../controllers/loyalty.controller';
import { authenticateJWT } from '../middlewares/auth.middleware';

const router = Router();

router.get('/me', authenticateJWT, getMyLoyalty);

export default router;
