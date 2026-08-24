import prisma from '../config/prisma';
import { redisClient } from '../config/redis';
import crypto from 'crypto';
import { cartSelect, cartItemSelect } from '../dto/cart.dto';

const GUEST_CART_TTL = 7 * 24 * 60 * 60; // 7 days

// Helper to get fully hydrated variant data for Redis cache
async function getVariantWithProduct(variantId: string) {
  return prisma.productVariant.findUnique({
    where: { id: variantId },
    include: { product: { select: { id: true, name: true, slug: true, variants: { select: { id: true, name: true, sku: true, price: true, salePrice: true, stockStatus: true, quantity: true, color: true, size: true, featuredImage: true, gallery: true } } } } },
  });
}

export const cartService = {
  /**
   * Retrieves a cart by sessionId (Redis) or customerId (DB)
   */
  async getOrCreateCart(sessionId?: string, customerId?: string) {
    if (customerId) {
      // Authenticated Cart -> DB
      let cart = await prisma.cart.findFirst({
        where: { customerId, status: 'ACTIVE' },
        select: cartSelect,
      });

      if (!cart) {
        cart = await prisma.cart.create({
          data: { customerId, status: 'ACTIVE' },
          select: cartSelect,
        });
      }
      return cart;
    }

    if (sessionId) {
      // Guest Cart -> Redis
      const redisKey = `cart:${sessionId}`;
      const cartData = await redisClient.get(redisKey);
      
      if (cartData) {
        return JSON.parse(cartData);
      }

      // Create new Redis Cart structure
      const newCart = {
        id: sessionId,
        sessionId,
        status: 'ACTIVE',
        items: [],
        createdAt: new Date().toISOString(),
      };
      await redisClient.setex(redisKey, GUEST_CART_TTL, JSON.stringify(newCart));
      return newCart;
    }

    throw new Error('Either sessionId or customerId must be provided');
  },

  /**
   * Add an item to the cart. If the item already exists, updates the quantity.
   */
  async addItem(cartId: string, variantId: string, quantity: number, isGuest: boolean = false) {
    if (quantity <= 0) throw new Error('Quantity must be greater than zero');
    
    const variantData = await getVariantWithProduct(variantId);
    if (!variantData) throw new Error('Variant not found');

    if (!isGuest) {
      // Authenticated Cart -> DB
      const existingItem = await prisma.cartItem.findUnique({
        where: { cartId_variantId: { cartId, variantId } },
      });

      if (existingItem) {
        return prisma.cartItem.update({
          where: { id: existingItem.id },
          data: { quantity: existingItem.quantity + quantity },
          select: cartItemSelect,
        });
      }

      return prisma.cartItem.create({
        data: { cartId, variantId, quantity },
        select: cartItemSelect,
      });
    }

    // Guest Cart -> Redis
    const redisKey = `cart:${cartId}`; // cartId is sessionId for guests
    const cartStr = await redisClient.get(redisKey);
    if (!cartStr) throw new Error('Guest cart not found');
    
    const cart = JSON.parse(cartStr);
    const existingIndex = cart.items.findIndex((i: any) => i.variantId === variantId);
    
    let updatedItem;
    if (existingIndex >= 0) {
      cart.items[existingIndex].quantity += quantity;
      updatedItem = cart.items[existingIndex];
    } else {
      updatedItem = {
        id: crypto.randomUUID(),
        cartId,
        variantId,
        quantity,
        variant: variantData,
      };
      cart.items.push(updatedItem);
    }

    await redisClient.setex(redisKey, GUEST_CART_TTL, JSON.stringify(cart));
    return updatedItem;
  },

  /**
   * Updates the quantity of a specific cart item.
   */
  async updateItemQuantity(cartId: string, itemId: string, quantity: number, isGuest: boolean = false) {
    if (!isGuest) {
      // Authenticated Cart -> DB
      if (quantity <= 0) {
        return prisma.cartItem.delete({ where: { id: itemId } });
      }
      return prisma.cartItem.update({
        where: { id: itemId },
        data: { quantity },
        select: cartItemSelect,
      });
    }

    // Guest Cart -> Redis
    const redisKey = `cart:${cartId}`;
    const cartStr = await redisClient.get(redisKey);
    if (!cartStr) throw new Error('Guest cart not found');

    const cart = JSON.parse(cartStr);
    if (quantity <= 0) {
      cart.items = cart.items.filter((i: any) => i.id !== itemId);
    } else {
      const item = cart.items.find((i: any) => i.id === itemId);
      if (item) item.quantity = quantity;
    }

    await redisClient.setex(redisKey, GUEST_CART_TTL, JSON.stringify(cart));
    return true;
  },

  /**
   * Removes an item from the cart.
   */
  async removeItem(cartId: string, itemId: string, isGuest: boolean = false) {
    return this.updateItemQuantity(cartId, itemId, 0, isGuest);
  },

  /**
   * Merges a guest cart (Redis) into a registered user cart (DB).
   */
  async mergeCarts(sessionId: string, customerId: string) {
    const redisKey = `cart:${sessionId}`;
    const guestCartStr = await redisClient.get(redisKey);
    
    if (!guestCartStr) {
      return this.getOrCreateCart(undefined, customerId);
    }

    const guestCart = JSON.parse(guestCartStr);
    const userCart = await this.getOrCreateCart(undefined, customerId);

    // Merge items
    for (const item of guestCart.items) {
      await this.addItem(userCart.id, item.variantId, item.quantity, false);
    }

    // Delete guest cart from Redis
    await redisClient.del(redisKey);

    return this.getOrCreateCart(undefined, customerId);
  },
};
