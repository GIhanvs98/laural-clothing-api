import { Router } from 'express';
import { getReturns, getReturnById, updateReturnStatus } from '../controllers/return.controller';

const router = Router();

router.get('/', getReturns);
router.get('/:id', getReturnById);
router.put('/:id/status', updateReturnStatus);

export default router;
