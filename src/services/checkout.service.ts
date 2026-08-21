import prisma from '../config/prisma';
import { redisClient } from '../config/redis';
import { inventoryService } from './inventory.service';
import { paymentService } from './payment.service';

export const checkoutService = {
  /**
   * Calculates the checkout totals for a given cart and shipping address.
   */
  async calculateCheckout(cartId: string, address: any, isGuest: boolean = true) {
    let cart;

    if (isGuest) {
      const redisKey = `cart:${cartId}`; // cartId is sessionId for guests
      const cartStr = await redisClient.get(redisKey);
      if (!cartStr) throw new Error('Guest cart not found');
      cart = JSON.parse(cartStr);
    } else {
      cart = await prisma.cart.findUnique({
        where: { id: cartId },
        include: {
          items: {
            include: { variant: true },
          },
        },
      });
      if (!cart) throw new Error('Cart not found');
    }

    if (!cart || cart.items.length === 0) {
      throw new Error('Cart is empty or not found');
    }

    let subtotal = 0;
    cart.items.forEach((item: any) => {
      subtotal += item.quantity * (item.variant.salePrice ?? item.variant.price);
    });

    // Flat shipping rate for now
    const shippingFee = 400;
    const tax = 0;
    const total = subtotal + shippingFee + tax;

    return {
      subtotal,
      shippingFee,
      tax,
      total,
      itemCount: cart.items.length,
    };
  },

  /**
   * Initiates checkout, resolves identity, and creates an order.
   */
  async initiateCheckout(cartId: string, customerData: { phone: string; email?: string; firstName?: string; lastName?: string; isGuest?: boolean }, shippingAddress: any, paymentMethod?: string) {
    const isGuest = customerData.isGuest !== false;
    let cart;

    if (isGuest) {
      const redisKey = `cart:${cartId}`;
      const cartStr = await redisClient.get(redisKey);
      if (!cartStr) throw new Error('Guest cart not found');
      cart = JSON.parse(cartStr);
    } else {
      cart = await prisma.cart.findUnique({
        where: { id: cartId },
        include: {
          items: { include: { variant: true } },
        },
      });
      if (!cart) throw new Error('Cart not found');
    }

    if (!cart || cart.items.length === 0) {
      throw new Error('Cart is empty or not found');
    }

    // 1. Identity Resolution
    let customer = await prisma.customer.findUnique({
      where: { phone: customerData.phone },
    });

    if (!customer) {
      customer = await prisma.customer.create({
        data: {
          phone: customerData.phone,
          email: customerData.email,
          firstName: customerData.firstName,
          lastName: customerData.lastName,
          isGuest: isGuest,
        },
      });
    } else if (customerData.email && !customer.email) {
      customer = await prisma.customer.update({
        where: { id: customer.id },
        data: { email: customerData.email },
      });
    }

    // 2. Calculation
    const totals = await this.calculateCheckout(cartId, shippingAddress, isGuest);

    // 3. Create Order
    const orderNumber = `LC-${Date.now().toString().slice(-6)}`;
    
    const order = await prisma.order.create({
      data: {
        orderNumber,
        customerId: customer.id,
        status: 'PENDING',
        paymentMethod: paymentMethod || 'COD',
        paymentStatus: 'UNPAID',
        subtotal: totals.subtotal,
        shippingFee: totals.shippingFee,
        tax: totals.tax,
        total: totals.total,
        shippingAddress: shippingAddress,
        items: {
          create: cart.items.map((item: any) => ({
            variantId: item.variantId,
            quantity: item.quantity,
            priceAtPurchase: item.variant.salePrice ?? item.variant.price,
          })),
        },
      },
      include: {
        items: true,
      },
    });

    // 3.5 Deduct Inventory
    let onlineBranch = await prisma.branch.findFirst({
      where: { OR: [{ name: 'Online' }, { code: 'ONLINE' }] }
    });
    
    // Fallback if no online branch exists
    if (!onlineBranch) {
      onlineBranch = await prisma.branch.findFirst({ where: { isActive: true } });
    }

    if (onlineBranch) {
      for (const item of cart.items) {
        await inventoryService.adjustStock({
          variantId: item.variantId,
          branchId: onlineBranch.id,
          type: 'DEDUCT',
          quantity: item.quantity,
          reason: 'Online Order Checkout',
          reference: order.id
        });
      }
    }

    // 4. Clean up Cart
    if (isGuest) {
      await redisClient.del(`cart:${cartId}`);
    } else {
      await prisma.cart.update({
        where: { id: cartId },
        data: { status: 'CONVERTED' },
      });
    }

    // 5. Initiate Payment
    const paymentInfo = await paymentService.initiatePayment(order.id, paymentMethod || 'COD');

    return { order, payment: paymentInfo };
  },
};
