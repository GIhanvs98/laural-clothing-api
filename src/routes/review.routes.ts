import { Router } from 'express';
import {
  createReview,
  getReviewsForProduct,
  getCustomerReviews,
  getPendingReviews,
  getAllReviews,
  getPublicReviews,
  updateReviewStatus,
  deleteReview,
  adminReplyToReview,
  flagReviewAsSpam
} from '../controllers/review.controller';
import { authenticateJWT, requirePermission } from '../middlewares/auth.middleware';
import { checkHoneypot } from '../middlewares/honeypot.middleware';
import { verifyTurnstile } from '../middlewares/turnstile.middleware';
import { auditLog } from '../middlewares/audit.middleware';

const router = Router();

router.get('/public', getPublicReviews);
router.post('/', authenticateJWT, checkHoneypot, verifyTurnstile, createReview);
router.get('/product/:productId', getReviewsForProduct);
router.get('/customer/:customerId', authenticateJWT, getCustomerReviews);
router.get('/pending/:customerId', authenticateJWT, getPendingReviews);
router.get('/', authenticateJWT, requirePermission("reviews:view"), getAllReviews);
router.patch('/:id/status', authenticateJWT, requirePermission("reviews:approve"), auditLog('Review', 'UPDATE'), updateReviewStatus);
router.delete('/:id', authenticateJWT, requirePermission("reviews:reject"), auditLog('Review', 'DELETE'), deleteReview);
router.patch('/:id/reply', authenticateJWT, requirePermission("reviews:approve"), auditLog('Review', 'UPDATE'), adminReplyToReview);
router.patch('/:id/spam', authenticateJWT, requirePermission("reviews:approve"), auditLog('Review', 'UPDATE'), flagReviewAsSpam);

export default router;
