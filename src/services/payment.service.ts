import prisma from '../config/prisma';
import { onepayService } from './gateways/onepay.service';

export const paymentService = {
  async initiatePayment(orderId: string, method: string) {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { customer: true }
    });
    if (!order) throw new Error('Order not found');

    const normalizedMethod = method.toUpperCase();

    if (normalizedMethod === 'COD') {
      return {
        success: true,
        method: 'COD',
        redirectUrl: null, // No redirect needed for COD
        message: 'Order placed successfully'
      };
    }

    if (normalizedMethod === 'ONEPAY' || normalizedMethod === 'CARD' || normalizedMethod === 'BANK_CARD') {
      return onepayService.createPaymentSession(order, order.customer);
    }

    // Generate a mock redirect URL for other gateways
    const redirectUrl = `https://mock-gateway.com/pay/${method.toLowerCase()}?order=${order.orderNumber}&amount=${order.total}`;

    return {
      success: true,
      method: normalizedMethod,
      redirectUrl,
      message: 'Please complete your payment'
    };
  },

  async handleWebhook(provider: string, payload: any) {
    const normalizedProvider = provider.toLowerCase();

    if (normalizedProvider === 'onepay') {
      return onepayService.processWebhook(payload);
    }

    const orderNumber = payload.orderNumber || payload.reference;
    if (!orderNumber) throw new Error('Invalid webhook payload: missing orderNumber');

    const order = await prisma.order.findUnique({ where: { orderNumber } });
    if (!order) throw new Error('Order not found from webhook');

    const isSuccess = payload.status === 'SUCCESS' || payload.status === 'PAID';

    if (isSuccess) {
      await prisma.order.update({
        where: { id: order.id },
        data: {
          paymentStatus: 'PAID',
          status: 'PROCESSING'
        }
      });
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
