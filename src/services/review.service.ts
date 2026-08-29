import { ReviewStatus, Review } from '@prisma/client';
import prisma from '../config/prisma';

export const reviewService = {
  /**
   * Customer creates a review
   */
  async createReview(data: {
    productId: string;
    customerId: string;
    rating: number;
    title?: string;
    comment?: string;
    images?: string[];
  }): Promise<Review> {
    // Check if customer actually bought the product
    // A simplified check: look for an Order containing the product variant belonging to the product
    const orders = await prisma.order.findMany({
      where: {
        customerId: data.customerId,
        items: {
          some: {
            variant: {
              productId: data.productId
            }
          }
        },
        status: 'DELIVERED' // Or however we determine successful purchase
      }
    });

    const isVerifiedPurchase = orders.length > 0;

    return prisma.review.create({
      data: {
        ...data,
        isVerifiedPurchase,
        status: ReviewStatus.PENDING, // Default status
      }
    });
  },

  /**
   * Storefront fetches approved reviews for a product
   */
  async getReviewsForProduct(productId: string): Promise<Review[]> {
    return prisma.review.findMany({
      where: {
        productId,
        status: ReviewStatus.APPROVED
      },
      include: {
        customer: {
          select: {
            firstName: true,
            lastName: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
  },

  /**
   * Storefront fetches latest approved reviews for landing page
   */
  async getPublicReviews(): Promise<Review[]> {
    return prisma.review.findMany({
      where: {
        status: ReviewStatus.APPROVED
      },
      include: {
        customer: {
          select: {
            firstName: true,
            lastName: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 10
    });
  },

  /**
   * Customer fetches pending products to review
   */
  async getPendingReviews(customerId: string): Promise<any[]> {
    const orders = await prisma.order.findMany({
      where: { customerId, status: 'DELIVERED' },
      include: {
        items: {
          include: {
            variant: {
              include: { product: true }
            }
          }
        }
      }
    });

    const reviewedProducts = await prisma.review.findMany({
      where: { customerId },
      select: { productId: true }
    });
    const reviewedProductIds = new Set(reviewedProducts.map(r => r.productId));

    const pendingProductsMap = new Map();
    for (const order of orders) {
      for (const item of order.items) {
        const product = item.variant.product;
        if (!reviewedProductIds.has(product.id) && !pendingProductsMap.has(product.id)) {
          pendingProductsMap.set(product.id, {
            id: `pending-${product.id}`, // dummy id for React key
            productId: product.id,
            name: product.name,
            image: item.variant.featuredImage || '', // fallback
            orderId: order.orderNumber,
            purchasedDate: order.createdAt.toISOString().split('T')[0]
          });
        }
      }
    }

    return Array.from(pendingProductsMap.values());
  },

  /**
   * Customer fetches their own reviews
   */
  async getCustomerReviews(customerId: string): Promise<Review[]> {
    return prisma.review.findMany({
      where: {
        customerId
      },
      include: {
        product: {
          select: {
            name: true,
            slug: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
  },

  /**
   * Admin fetches all reviews (with filters)
   */
  async getAllReviews(
    status?: ReviewStatus,
    page: number = 1,
    limit: number = 20,
    search?: string
  ): Promise<{ data: Review[]; total: number; page: number; totalPages: number }> {
    const skip = (page - 1) * limit;

    const where: any = {};
    if (status) {
      where.status = status;
    }
    
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { comment: { contains: search, mode: 'insensitive' } },
        { product: { name: { contains: search, mode: 'insensitive' } } },
        { customer: { firstName: { contains: search, mode: 'insensitive' } } },
        { customer: { lastName: { contains: search, mode: 'insensitive' } } }
      ];
    }

    const [data, total] = await Promise.all([
      prisma.review.findMany({
        where,
        include: {
          product: { select: { name: true } },
          customer: { select: { firstName: true, lastName: true, email: true } }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit
      }),
      prisma.review.count({ where })
    ]);

    return {
      data,
      total,
      page,
      totalPages: Math.ceil(total / limit)
    };
  },

  /**
   * Admin fetches global review stats for KPI cards
   */
  async getReviewStats(): Promise<{ pending: number; approved: number; rejected: number; spam: number; averageRating: number }> {
    const counts = await prisma.review.groupBy({
      by: ['status'],
      _count: true
    });

    const ratingAgg = await prisma.review.aggregate({
      _avg: { rating: true }
    });

    let pending = 0;
    let approved = 0;
    let rejected = 0;
    let spam = 0;

    for (const c of counts) {
      if (c.status === 'PENDING') pending = c._count;
      else if (c.status === 'APPROVED') approved = c._count;
      else if (c.status === 'REJECTED') rejected = c._count;
      else if (c.status === 'SPAM') spam = c._count;
    }

    return {
      pending,
      approved,
      rejected,
      spam,
      averageRating: ratingAgg._avg.rating ? Number(ratingAgg._avg.rating.toFixed(1)) : 0
    };
  },

  /**
   * Admin updates review status
   */
  async updateReviewStatus(id: string, status: ReviewStatus): Promise<Review> {
    return prisma.review.update({
      where: { id },
      data: { status }
    });
  },

  /**
   * Admin adds a reply to a review
   */
  async addAdminReply(id: string, reply: string): Promise<Review> {
    return prisma.review.update({
      where: { id },
      data: { 
        adminReply: reply,
        adminReplyAt: new Date()
      }
    });
  },

  /**
   * Admin deletes a review
   */
  async deleteReview(id: string): Promise<void> {
    await prisma.review.delete({
      where: { id }
    });
  }
};
