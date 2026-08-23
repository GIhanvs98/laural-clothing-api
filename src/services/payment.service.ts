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

    // Generate a mock redirect URL for other gateways
    const redirectUrl = `https://mock-gateway.com/pay/${method.toLowerCase()}?order=${order.orderNumber}&amount=${order.total}`;

    return {
      success: true,
      method: method.toUpperCase(),
      redirectUrl,
      message: 'Please complete your payment'
    };
  },

  async handleWebhook(provider: string, payload: any) {
    // In a real scenario, we would verify the webhook signature here
    // Verify idempotency using payload.transactionId

    const orderNumber = payload.orderNumber;
    if (!orderNumber) throw new Error('Invalid webhook payload: missing orderNumber');

    const order = await prisma.order.findUnique({ where: { orderNumber } });
    if (!order) throw new Error('Order not found from webhook');

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

    return { success: true };
  }
};
