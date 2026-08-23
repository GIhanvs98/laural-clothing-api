import { Router } from 'express';
import { getReturns, getReturnById, updateReturnStatus, verifyOrderForReturn, createReturn } from '../controllers/return.controller';
import { authenticateJWT, requirePermission } from '../middlewares/auth.middleware';

const router = Router();

router.get('/verify', authenticateJWT, verifyOrderForReturn);
router.post('/', authenticateJWT, createReturn);
router.get('/', authenticateJWT, requirePermission("returns:view"), getReturns);
router.get('/:id', authenticateJWT, requirePermission("returns:view"), getReturnById);
router.put('/:id/status', authenticateJWT, requirePermission("returns:approve_reject"), updateReturnStatus);

export default router;
