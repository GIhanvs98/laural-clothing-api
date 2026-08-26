import { Router } from 'express';
import {
  getCart,
  addItemToCart,
  updateCartItem,
  removeCartItem,
  clearCart,
  mergeCarts,
} from '../controllers/cart.controller';
import { optionalAuth } from '../middlewares/auth.middleware';

const router = Router();

// Allow optional auth to identify logged in users seamlessly
router.use(optionalAuth);

router.get('/', getCart);
router.post('/items', addItemToCart);
router.put('/items/:id', updateCartItem);
router.delete('/items/:id', removeCartItem);
router.delete('/', clearCart);
router.post('/merge', mergeCarts);

export default router;

