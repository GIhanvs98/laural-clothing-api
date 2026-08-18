import prisma from '../config/prisma';

export const cartService = {
  /**
   * Retrieves a cart by sessionId or customerId, or creates a new one if it doesn't exist.
   */
  async getOrCreateCart(sessionId?: string, customerId?: string) {
    if (!sessionId && !customerId) {
      throw new Error('Either sessionId or customerId must be provided');
    }

    const whereClause: any = { status: 'ACTIVE' };
    if (customerId) {
      whereClause.customerId = customerId;
    } else {
      whereClause.sessionId = sessionId;
    }

    let cart = await prisma.cart.findFirst({
      where: whereClause,
      include: {
        items: {
          include: {
            variant: {
              include: {
                product: true,
              },
            },
          },
        },
      },
    });

    if (!cart) {
      const data: any = { status: 'ACTIVE' };
      if (customerId) data.customerId = customerId;
      if (sessionId) data.sessionId = sessionId;

      cart = await prisma.cart.create({
        data,
        include: {
          items: {
            include: {
              variant: {
                include: { product: true },
              },
            },
          },
        },
      });
    }

    return cart;
  },

  /**
   * Add an item to the cart. If the item already exists, updates the quantity.
   */
  async addItem(cartId: string, variantId: string, quantity: number) {
    if (quantity <= 0) throw new Error('Quantity must be greater than zero');

    const existingItem = await prisma.cartItem.findUnique({
      where: {
        cartId_variantId: { cartId, variantId },
      },
    });

    if (existingItem) {
      return prisma.cartItem.update({
        where: { id: existingItem.id },
        data: { quantity: existingItem.quantity + quantity },
        include: { variant: { include: { product: true } } },
      });
    }

    return prisma.cartItem.create({
      data: { cartId, variantId, quantity },
      include: { variant: { include: { product: true } } },
    });
  },

  /**
   * Updates the quantity of a specific cart item.
   */
  async updateItemQuantity(itemId: string, quantity: number) {
    if (quantity <= 0) {
      return prisma.cartItem.delete({ where: { id: itemId } });
    }

    return prisma.cartItem.update({
      where: { id: itemId },
      data: { quantity },
      include: { variant: { include: { product: true } } },
    });
  },

  /**
   * Removes an item from the cart.
   */
  async removeItem(itemId: string) {
    return prisma.cartItem.delete({
      where: { id: itemId },
    });
  },

  /**
   * Merges a guest cart (sessionId) into a registered user cart (customerId).
   */
  async mergeCarts(sessionId: string, customerId: string) {
    const guestCart = await prisma.cart.findFirst({
      where: { sessionId, status: 'ACTIVE' },
      include: { items: true },
    });

    if (!guestCart || guestCart.items.length === 0) {
      return this.getOrCreateCart(undefined, customerId);
    }

    const userCart = await this.getOrCreateCart(undefined, customerId);

    // Merge items
    for (const item of guestCart.items) {
      await this.addItem(userCart.id, item.variantId, item.quantity);
    }

    // Mark guest cart as converted
    await prisma.cart.update({
      where: { id: guestCart.id },
      data: { status: 'CONVERTED' },
    });

    return this.getOrCreateCart(undefined, customerId);
  },
};
