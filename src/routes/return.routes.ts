import { Router } from 'express';
import { getReturns, getReturnById, updateReturnStatus, verifyOrderForReturn, createReturn } from '../controllers/return.controller';

const router = Router();

router.get('/verify', verifyOrderForReturn);
router.post('/', createReturn);
router.get('/', getReturns);
router.get('/:id', getReturnById);
router.put('/:id/status', updateReturnStatus);

export default router;
