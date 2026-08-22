import { Router } from 'express';
import { getWishlist, addItem, removeItem } from '../controllers/wishlist.controller';

const router = Router();

router.get('/', getWishlist);
router.post('/', addItem);
router.delete('/:wishlistId/:productId', removeItem);

export default router;
