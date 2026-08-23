import { Router } from 'express';
import { getWishlist, addItem, removeItem } from '../controllers/wishlist.controller';
import { authenticateJWT } from '../middlewares/auth.middleware';

const router = Router();

router.get('/', authenticateJWT, getWishlist);
router.post('/', authenticateJWT, addItem);
router.delete('/:wishlistId/:productId', authenticateJWT, removeItem);

export default router;
