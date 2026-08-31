import { Prisma } from '@prisma/client';

export const categoryWithPreviewSelect = {
  id: true,
  name: true,
  slug: true,
  description: true,
  status: true,
  imageUrl: true,
  createdAt: true,
  updatedAt: true,
  _count: {
    select: { products: true, legacyProducts: true }
  }
} satisfies Prisma.CategorySelect;
