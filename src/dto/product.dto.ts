import { Prisma } from '@prisma/client';

export const variantBasicSelect = {
  id: true,
  productId: true,
  name: true,
  sku: true,
  price: true,
  salePrice: true,
  stockStatus: true,
  quantity: true,
  color: true,
  size: true,
  featuredImage: true,
  gallery: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.ProductVariantSelect;

export const productBasicSelect = {
  id: true,
  name: true,
  slug: true,
  description: true,
  excerpt: true,
  categoryId: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.ProductSelect;

export const productWithVariantsSelect = {
  ...productBasicSelect,
  variants: {
    select: variantBasicSelect
  },
  category: {
    select: {
      id: true,
      name: true,
      slug: true,
    }
  }
} satisfies Prisma.ProductSelect;
