import { Router } from 'express';
import {
  createReview,
  getReviewsForProduct,
  getCustomerReviews,
  getPendingReviews,
  getAllReviews,
  updateReviewStatus,
  deleteReview
} from '../controllers/review.controller';
import { authenticateJWT, requirePermission } from '../middlewares/auth.middleware';
import { checkHoneypot } from '../middlewares/honeypot.middleware';

const router = Router();

router.post('/', authenticateJWT, checkHoneypot, createReview);
router.get('/product/:productId', getReviewsForProduct);
router.get('/customer/:customerId', authenticateJWT, getCustomerReviews);
router.get('/pending/:customerId', authenticateJWT, getPendingReviews);
router.get('/', authenticateJWT, requirePermission("reviews:view"), getAllReviews);
router.patch('/:id/status', authenticateJWT, requirePermission("reviews:approve"), updateReviewStatus);
router.delete('/:id', authenticateJWT, requirePermission("reviews:reject"), deleteReview);

export default router;
