import { Router } from 'express';
import {
  getCart,
  addItemToCart,
  updateCartItem,
  removeCartItem,
  mergeCarts,
} from '../controllers/cart.controller';

const router = Router();

router.get('/', getCart);
router.post('/items', addItemToCart);
router.put('/items/:id', updateCartItem);
router.delete('/items/:id', removeCartItem);
router.post('/merge', mergeCarts);

export default router;
