import { Prisma } from '@prisma/client';
import prisma from '../config/prisma';
import { signImageUrl } from './product.service';
import { categoryWithPreviewSelect } from '../dto/category.dto';
import { withCache, invalidateCache } from '../utils/cache.util';

const CACHE_TTL = 3600; // 1 hour

export const categoryService = {
  async getCategories() {
    return withCache('categories:all', CACHE_TTL, async () => {
      const categories = await prisma.category.findMany({
        select: categoryWithPreviewSelect,
        orderBy: { createdAt: 'desc' },
      });

      return Promise.all(categories.map(async (category) => {
        let imageUrl = null;
        try {
          const products = category.products || [];
          const variants = products.length > 0 ? products[0].variants || [] : [];
          const featuredImage = variants.length > 0 ? variants[0].featuredImage : null;
          
          if (featuredImage) {
            imageUrl = await signImageUrl(featuredImage);
          }
        } catch (error) {
          console.error(`Failed to sign image URL for category ${category.name}:`, error);
          // Gracefully fallback to null instead of failing the entire API response
          imageUrl = null;
        }
        
        const { products, ...rest } = category;
        return { ...rest, imageUrl };
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

      let imageUrl = null;
      try {
        const products = category.products || [];
        const variants = products.length > 0 ? products[0].variants || [] : [];
        const featuredImage = variants.length > 0 ? variants[0].featuredImage : null;
        
        if (featuredImage) {
          imageUrl = await signImageUrl(featuredImage);
        }
      } catch (error) {
        console.error(`Failed to sign image URL for category ${category.name}:`, error);
        imageUrl = null;
      }
      const { products, ...rest } = category;
      return { ...rest, imageUrl };
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
