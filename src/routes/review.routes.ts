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

const router = Router();

router.post('/', createReview);
router.get('/product/:productId', getReviewsForProduct);
router.get('/customer/:customerId', getCustomerReviews);
router.get('/pending/:customerId', getPendingReviews);
router.get('/', getAllReviews);
router.patch('/:id/status', updateReviewStatus);
router.delete('/:id', deleteReview);

export default router;
