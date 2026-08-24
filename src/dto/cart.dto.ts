import { Prisma } from '@prisma/client';
import { productBasicSelect, variantBasicSelect } from './product.dto';

export const cartItemSelect = {
  id: true,
  cartId: true,
  variantId: true,
  quantity: true,
  createdAt: true,
  updatedAt: true,
  variant: {
    select: {
      ...variantBasicSelect,
      product: {
        select: productBasicSelect
      }
    }
  }
} satisfies Prisma.CartItemSelect;

export const cartSelect = {
  id: true,
  sessionId: true,
  customerId: true,
  status: true,
  createdAt: true,
  updatedAt: true,
  items: {
    select: cartItemSelect
  }
} satisfies Prisma.CartSelect;
