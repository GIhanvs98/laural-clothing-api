import { Router } from 'express';
import {
  createReview,
  getReviewsForProduct,
  getCustomerReviews,
  getPendingReviews,
  getAllReviews,
  getReviewStats,
  exportReviewsCsv,
  updateReviewStatus,
  deleteReview,
  getPublicReviews,
  addAdminReply
} from '../controllers/review.controller';
import { authenticateJWT, requirePermission } from '../middlewares/auth.middleware';
import { checkHoneypot } from '../middlewares/honeypot.middleware';
import { verifyTurnstile } from '../middlewares/turnstile.middleware';

const router = Router();

router.post('/', authenticateJWT, checkHoneypot, verifyTurnstile, createReview);
router.get('/product/:productId', getReviewsForProduct);
router.get('/public', getPublicReviews);
router.get('/customer/:customerId', authenticateJWT, getCustomerReviews);
router.get('/pending/:customerId', authenticateJWT, getPendingReviews);

router.get('/stats', authenticateJWT, requirePermission("reviews:view"), getReviewStats);
router.get('/export', authenticateJWT, requirePermission("reviews:view"), exportReviewsCsv);
router.get('/', authenticateJWT, requirePermission("reviews:view"), getAllReviews);
router.patch('/:id/status', authenticateJWT, requirePermission("reviews:approve"), updateReviewStatus);
router.post('/:id/reply', authenticateJWT, requirePermission("reviews:approve"), addAdminReply);
router.delete('/:id', authenticateJWT, requirePermission("reviews:reject"), deleteReview);

export default router;
