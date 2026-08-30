import prisma from '../config/prisma';

export const paymentService = {
  async initiatePayment(orderId: string, method: string) {
    const order = await prisma.order.findUnique({ where: { id: orderId } });
    if (!order) throw new Error('Order not found');

    if (method.toUpperCase() === 'COD') {
      return {
        success: true,
        method: 'COD',
        redirectUrl: null, // No redirect needed for COD
        message: 'Order placed successfully'
      };
    }

    // Generate a mock redirect URL for our internal mock gateway
    const redirectUrl = `/mock-gateway?method=${method.toLowerCase()}&orderNumber=${order.orderNumber}&amount=${order.total}`;

    return {
      success: true,
      method: method.toUpperCase(),
      redirectUrl,
      message: 'Please complete your payment'
    };
  },

  async handleWebhook(provider: string, payload: any, signature?: string) {
    if (!signature) {
      throw new Error('Missing webhook signature');
    }

    const secret = process.env.PAYMENT_WEBHOOK_SECRET || 'laural-clothing-mock-secret';
    const crypto = require('crypto');
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(JSON.stringify(payload))
      .digest('hex');

    if (signature !== expectedSignature) {
      throw new Error('Invalid webhook signature');
    }

    const eventId = payload.eventId;
    if (!eventId) throw new Error('Invalid webhook payload: missing eventId');

    // Check idempotency
    const existingKey = await prisma.idempotencyKey.findUnique({ where: { key: eventId } });
    if (existingKey) {
      console.log(`[Webhook] Duplicate event ${eventId} ignored.`);
      return { success: true, duplicate: true };
    }

    const orderNumber = payload.orderNumber;
    if (!orderNumber) throw new Error('Invalid webhook payload: missing orderNumber');

    const order = await prisma.order.findUnique({ where: { orderNumber } });
    if (!order) throw new Error('Order not found from webhook');

    const statusMap: Record<string, string> = {
      SUCCESS: 'Paid',
      FAILED: 'Failed',
      PENDING: 'Pending'
    };
    
    const dbStatus = statusMap[payload.status] || 'Pending';

    // Log the transaction
    await prisma.paymentTransaction.create({
      data: {
        orderId: order.id,
        customerId: order.customerId,
        gateway: provider,
        method: provider,
        amount: order.total,
        status: dbStatus
      }
    });

    if (payload.status === 'SUCCESS') {
      await prisma.order.update({
        where: { id: order.id },
        data: {
          paymentStatus: 'PAID',
          status: 'PROCESSING'
        }
      });
      // Additional logic here: notify user, etc.
    } else if (payload.status === 'FAILED') {
      await prisma.order.update({
        where: { id: order.id },
        data: {
          paymentStatus: 'FAILED',
        }
      });
    }

    // Save idempotency key
    await prisma.idempotencyKey.create({ data: { key: eventId } });

    return { success: true };
  }
};
