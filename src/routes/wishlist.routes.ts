import { Router } from 'express';
import { getWishlist, addItem, removeItem } from '../controllers/wishlist.controller';
import { authenticateJWT, optionalAuth } from '../middlewares/auth.middleware';

const router = Router();

router.get('/', optionalAuth, getWishlist);
router.post('/', optionalAuth, addItem);
router.delete('/:wishlistId/:productId', optionalAuth, removeItem);

export default router;
