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
  async getAllReviews(status?: ReviewStatus): Promise<Review[]> {
    const where = status ? { status } : {};
    return prisma.review.findMany({
      where,
      include: {
        product: {
          select: { name: true }
        },
        customer: {
          select: { firstName: true, lastName: true, email: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
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
   * Admin deletes a review
   */
  async deleteReview(id: string): Promise<void> {
    await prisma.review.delete({
      where: { id }
    });
  }
};
