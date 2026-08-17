import prisma from '../config/prisma';
import { Prisma } from '@prisma/client';

export class ProductService {
  async getAllProducts(params: {
    skip?: number;
    take?: number;
    search?: string;
  }) {
    const { skip = 0, take = 50, search } = params;

    const where: Prisma.ProductWhereInput = search
      ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { description: { contains: search, mode: 'insensitive' } },
            { sku: { contains: search, mode: 'insensitive' } },
          ],
        }
      : {};

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.product.count({ where }),
    ]);

    return {
      data: products,
      meta: {
        total,
        skip,
        take,
      },
    };
  }

  async getProductById(id: string) {
    return prisma.product.findUnique({
      where: { id },
    });
  }

  async getProductBySlug(slug: string) {
    return prisma.product.findUnique({
      where: { slug },
    });
  }

  async createProduct(data: Prisma.ProductCreateInput) {
    // Generate a slug if not provided, or ensure unique
    if (!data.slug) {
      data.slug = data.name.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + Date.now();
    }
    
    return prisma.product.create({
      data,
    });
  }

  async updateProduct(id: string, data: Prisma.ProductUpdateInput) {
    return prisma.product.update({
      where: { id },
      data,
    });
  }

  async deleteProduct(id: string) {
    return prisma.product.delete({
      where: { id },
    });
  }
}

export const productService = new ProductService();
