import { Prisma } from '@prisma/client';

export const categoryWithPreviewSelect = {
  id: true,
  name: true,
  slug: true,
  description: true,
  imageUrl: true,
  createdAt: true,
  updatedAt: true,
  _count: {
    select: { products: true, legacyProducts: true }
  },
  products: {
    where: { variants: { some: { featuredImage: { not: null } } } },
    take: 1,
    select: {
      variants: {
        where: { featuredImage: { not: null } },
        take: 1,
        select: {
          featuredImage: true
        }
      }
    }
  }
} satisfies Prisma.CategorySelect;
