import { Prisma } from '@prisma/client';
import prisma from '../config/prisma';
import { signImageUrl } from './product.service';
import { categoryWithPreviewSelect } from '../dto/category.dto';
import { withCache, invalidateCache } from '../utils/cache.util';

const CACHE_TTL = 3600; // 1 hour

export const categoryService = {
  async getCategories(search?: string) {
    const cacheKey = search ? `categories:search:${search}` : 'categories:all';
    return withCache(cacheKey, CACHE_TTL, async () => {
      const categories = await prisma.category.findMany({
        where: search ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { description: { contains: search, mode: 'insensitive' } },
          ],
        } : undefined,
        select: categoryWithPreviewSelect,
        orderBy: { createdAt: 'desc' },
      });

      return Promise.all(categories.map(async (category) => {
        let derivedImageUrl = category.imageUrl;
        const featuredImage = category.products?.[0]?.variants?.[0]?.featuredImage;
        if (!derivedImageUrl && featuredImage) {
          derivedImageUrl = await signImageUrl(featuredImage);
        }
        const { products, ...rest } = category;
        return { ...rest, imageUrl: derivedImageUrl };
      }));
    });
  },

  async getCategoryById(id: string) {
    return withCache(`category:id:${id}`, CACHE_TTL, async () => {
      const category = await prisma.category.findUnique({
        where: { id },
        select: categoryWithPreviewSelect,
      });

      if (!category) return null;

      let derivedImageUrl = category.imageUrl;
      const featuredImage = category.products?.[0]?.variants?.[0]?.featuredImage;
      if (!derivedImageUrl && featuredImage) {
        derivedImageUrl = await signImageUrl(featuredImage);
      }
      const { products, ...rest } = category;
      return { ...rest, imageUrl: derivedImageUrl };
    });
  },

  async createCategory(data: Prisma.CategoryCreateInput) {
    if (!data.slug) {
      data.slug = data.name.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + Date.now();
    }
    const result = await prisma.category.create({
      data,
    });
    await invalidateCache('categor*');
    return result;
  },

  async updateCategory(id: string, data: Prisma.CategoryUpdateInput) {
    const result = await prisma.category.update({
      where: { id },
      data,
    });
    await invalidateCache('categor*');
    return result;
  },

  async deleteCategory(id: string) {
    const result = await prisma.category.delete({
      where: { id },
    });
    await invalidateCache('categor*');
    return result;
  },
};
