import { Prisma } from '@prisma/client';
import prisma from '../config/prisma';
import { signImageUrl } from './product.service';
import { categoryWithPreviewSelect } from '../dto/category.dto';

export const categoryService = {
  async getCategories() {
    const categories = await prisma.category.findMany({
      select: categoryWithPreviewSelect,
      orderBy: { createdAt: 'desc' },
    });

    return Promise.all(categories.map(async (category) => {
      let imageUrl = null;
      const featuredImage = category.products?.[0]?.variants?.[0]?.featuredImage;
      if (featuredImage) {
        imageUrl = await signImageUrl(featuredImage);
      }
      const { products, ...rest } = category;
      return { ...rest, imageUrl };
    }));
  },

  async getCategoryById(id: string) {
    const category = await prisma.category.findUnique({
      where: { id },
      select: categoryWithPreviewSelect,
    });

    if (!category) return null;

    let imageUrl = null;
    const featuredImage = category.products?.[0]?.variants?.[0]?.featuredImage;
    if (featuredImage) {
      imageUrl = await signImageUrl(featuredImage);
    }
    const { products, ...rest } = category;
    return { ...rest, imageUrl };
  },

  async createCategory(data: Prisma.CategoryCreateInput) {
    if (!data.slug) {
      data.slug = data.name.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + Date.now();
    }
    return prisma.category.create({
      data,
    });
  },

  async updateCategory(id: string, data: Prisma.CategoryUpdateInput) {
    return prisma.category.update({
      where: { id },
      data,
    });
  },

  async deleteCategory(id: string) {
    return prisma.category.delete({
      where: { id },
    });
  },
};
