import prisma from '../config/prisma';
import { redisClient } from '../config/redis';
import { inventoryService } from './inventory.service';
import { paymentService } from './payment.service';
import { fraudService } from './fraud.service';
import { alertService } from './alert.service';

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
  async initiateCheckout(cartId: string, customerData: { phone: string; email?: string; firstName?: string; lastName?: string; isGuest?: boolean; deviceFingerprint?: string }, shippingAddress: any, paymentMethod?: string) {
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

    // 2.5 Evaluate Fraud Risk
    // deviceFingerprint is not explicitly passed to initiateCheckout, so we'll optionally pass it.
    // Wait, the signature of initiateCheckout doesn't have deviceFingerprint. Let's update the signature to accept it.
    const fraudEvaluation = await fraudService.evaluateCheckoutRisk(
      cart,
      customerData,
      shippingAddress,
      totals,
      customerData.deviceFingerprint // I will pass this from controller
    );

    if (fraudEvaluation.riskLevel === 'BLOCKED') {
      await alertService.sendFraudAlert(cartId, fraudEvaluation.fraudScore, fraudEvaluation.riskLevel, fraudEvaluation.fraudSignals, cartId);
      throw new Error('Checkout blocked due to high fraud risk.');
    }

    // 3. Create Order & Deduct Inventory in Transaction
    const orderNumber = `LC-${Date.now().toString().slice(-6)}`;
    
    const order = await prisma.$transaction(async (tx) => {
      const createdOrder = await tx.order.create({
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
          fraudScore: fraudEvaluation.fraudScore,
          riskLevel: fraudEvaluation.riskLevel,
          fraudSignals: fraudEvaluation.fraudSignals,
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
      let onlineBranch = await tx.branch.findFirst({
        where: { OR: [{ name: 'Online' }, { code: 'ONLINE' }] }
      });
      
      // Fallback if no online branch exists
      if (!onlineBranch) {
        onlineBranch = await tx.branch.findFirst({ where: { isActive: true } });
      }

      if (onlineBranch) {
        for (const item of cart.items) {
          await inventoryService.adjustStock({
            variantId: item.variantId,
            branchId: onlineBranch.id,
            type: 'DEDUCT',
            quantity: item.quantity,
            reason: 'Online Order Checkout',
            reference: createdOrder.id
          }, tx); // Pass the transaction client
        }
      }

      // 4. Clean up Cart (DB)
      if (!isGuest) {
        await tx.cart.update({
          where: { id: cartId },
          data: { status: 'CONVERTED' },
        });
      }

      return createdOrder;
    });

    if (fraudEvaluation.riskLevel === 'HIGH') {
      await alertService.sendFraudAlert(order.orderNumber, fraudEvaluation.fraudScore, fraudEvaluation.riskLevel, fraudEvaluation.fraudSignals, cartId);
    }

    // 4. Clean up Cart (Redis for guests)
    if (isGuest) {
      await redisClient.del(`cart:${cartId}`);
    }

    // 5. Initiate Payment
    const paymentInfo = await paymentService.initiatePayment(order.id, paymentMethod || 'COD');

    return { order, payment: paymentInfo };
  },
};
