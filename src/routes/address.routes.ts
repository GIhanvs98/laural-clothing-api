import { Router } from 'express';
import { getAddresses, addAddress, updateAddress, deleteAddress, setDefault } from '../controllers/address.controller';
import { authenticateJWT } from '../middlewares/auth.middleware';

const router = Router();

router.get('/', authenticateJWT, getAddresses);
router.post('/', authenticateJWT, addAddress);
router.put('/:id', authenticateJWT, updateAddress);
router.delete('/:id', authenticateJWT, deleteAddress);
router.patch('/:id/default', authenticateJWT, setDefault);

export default router;
