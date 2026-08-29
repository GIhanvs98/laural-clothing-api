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
    const { status, page, limit, search } = req.query;
    const pageNum = page ? parseInt(page as string, 10) : 1;
    const limitNum = limit ? parseInt(limit as string, 10) : 20;

    const reviews = await reviewService.getAllReviews(
      status as ReviewStatus,
      pageNum,
      limitNum,
      search as string
    );
    res.json(reviews);
  } catch (error: any) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
};

export const getReviewStats = async (req: Request, res: Response) => {
  try {
    const stats = await reviewService.getReviewStats();
    res.json(stats);
  } catch (error: any) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
};

export const exportReviewsCsv = async (req: Request, res: Response) => {
  try {
    const { status, search } = req.query;
    
    // Fetch all matching reviews (limit 10000 for safety)
    const result = await reviewService.getAllReviews(
      status as ReviewStatus,
      1,
      10000,
      search as string
    );

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=reviews_export_${new Date().getTime()}.csv`);

    // Write CSV Header
    res.write('ID,Customer,Product,Rating,Title,Comment,Status,Verified,Date\n');

    // Write Rows
    for (const r of result.data) {
      const customer = `${(r as any).customer?.firstName || ''} ${(r as any).customer?.lastName || ''}`.trim().replace(/"/g, '""');
      const product = (r as any).product?.name?.replace(/"/g, '""') || '';
      const title = (r.title || '').replace(/"/g, '""');
      const comment = (r.comment || '').replace(/"/g, '""');
      const date = new Date(r.createdAt).toISOString().split('T')[0];

      res.write(`"${r.id}","${customer}","${product}",${r.rating},"${title}","${comment}","${r.status}",${r.isVerifiedPurchase},"${date}"\n`);
    }

    res.end();
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

export const addAdminReply = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { reply } = req.body;
    if (!reply || typeof reply !== 'string') {
      return res.status(400).json({ error: 'Reply content is required' });
    }
    const review = await reviewService.addAdminReply(id as string, reply);
    res.json(review);
  } catch (error: any) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
};
