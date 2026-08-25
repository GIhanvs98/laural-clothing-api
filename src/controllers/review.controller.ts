import { Request, Response } from 'express';
import { reviewService } from '../services/review.service';
import { ReviewStatus } from '@prisma/client';

export const createReview = async (req: Request, res: Response) => {
  try {
    const review = await reviewService.createReview(req.body);
    res.status(201).json(review);
  } catch (error: any) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
};

export const getReviewsForProduct = async (req: Request, res: Response) => {
  try {
    const { productId } = req.params;
    const reviews = await reviewService.getReviewsForProduct(productId as string);
    res.json(reviews);
  } catch (error: any) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
};

export const getPublicReviews = async (req: Request, res: Response) => {
  try {
    const reviews = await reviewService.getPublicReviews();
    res.json(reviews);
  } catch (error: any) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
};

export const getPendingReviews = async (req: Request, res: Response) => {
  try {
    const { customerId } = req.params;
    const pending = await reviewService.getPendingReviews(customerId as string);
    res.json(pending);
  } catch (error: any) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
};

export const getCustomerReviews = async (req: Request, res: Response) => {
  try {
    const { customerId } = req.params;
    const reviews = await reviewService.getCustomerReviews(customerId as string);
    res.json(reviews);
  } catch (error: any) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
};

export const getAllReviews = async (req: Request, res: Response) => {
  try {
    const { status } = req.query;
    const reviews = await reviewService.getAllReviews(status as ReviewStatus);
    res.json(reviews);
  } catch (error: any) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
};

export const updateReviewStatus = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    if (!Object.values(ReviewStatus).includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }
    const review = await reviewService.updateReviewStatus(id as string, status);
    res.json(review);
  } catch (error: any) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
};

export const deleteReview = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await reviewService.deleteReview(id as string);
    res.status(204).send();
  } catch (error: any) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
};
