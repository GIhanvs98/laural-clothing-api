import { Router } from 'express';
import { getAddresses, addAddress, updateAddress, deleteAddress, setDefault } from '../controllers/address.controller';

const router = Router();

router.get('/', getAddresses);
router.post('/', addAddress);
router.put('/:id', updateAddress);
router.delete('/:id', deleteAddress);
router.patch('/:id/default', setDefault);

export default router;
