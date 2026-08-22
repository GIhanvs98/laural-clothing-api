import prisma from '../config/prisma';
import { FardarService } from './fardar.service';

export const orderService = {
  /**
   * Admin fetches all orders
   */
  async getAllOrders() {
    return prisma.order.findMany({
      include: {
        customer: {
          select: { firstName: true, lastName: true, email: true, phone: true }
        },
        items: {
          include: {
            variant: {
              include: { product: true }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
  },

  /**
   * Admin dispatches an order via Fardar API
   */
  async dispatchOrder(orderId: string) {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { customer: true }
    });

    if (!order) {
      throw new Error('Order not found');
    }

    if (order.status === 'DISPATCHED' || order.status === 'DELIVERED') {
      throw new Error('Order is already dispatched or delivered');
    }

    let customerName = 'Guest Customer';
    let customerPhone = 'N/A';
    let city = 'Colombo';
    let address = 'N/A';

    if (order.customer) {
      customerName = `${order.customer.firstName || ''} ${order.customer.lastName || ''}`.trim() || customerName;
      customerPhone = order.customer.phone || customerPhone;
    }

    if (order.shippingAddress && typeof order.shippingAddress === 'object') {
      const addr = order.shippingAddress as any;
      if (addr.city) city = addr.city;
      address = `${addr.firstName || ''} ${addr.lastName || ''}, ${addr.street || ''}, ${addr.city || ''}`.trim();
      if (addr.phone) customerPhone = addr.phone;
    }

    // 1. Call Fardar API to create shipment
    const shipment = await FardarService.createShipment({
      orderId: order.orderNumber,
      customerName,
      customerPhone,
      customerAddress: address,
      city,
    });

    if (!shipment.success) {
      throw new Error(shipment.message || 'Failed to create Fardar shipment');
    }

    // 2. Update order in database
    return prisma.order.update({
      where: { id: orderId },
      data: {
        status: 'DISPATCHED',
        trackingNumber: shipment.trackingNumber,
        trackingUrl: shipment.labelUrl
      }
    });
  },

  /**
   * Storefront track order by phone number
   */
  async trackOrderByPhone(phone: string) {
    // Clean phone number (remove + or spaces if any) - just basic match for now
    
    // Find the latest order for this phone
    // We check either the customer's phone or the shipping address phone
    const order = await prisma.order.findFirst({
      where: {
        OR: [
          { customer: { phone: { contains: phone } } },
          { shippingAddress: { path: ['phone'], equals: phone } }
        ]
      },
      orderBy: { createdAt: 'desc' },
      include: {
        items: {
          include: { variant: { include: { product: true } } }
        }
      }
    });

    if (!order) {
      throw new Error('No order found for this phone number');
    }

    // If order has no tracking number (not dispatched yet)
    if (!order.trackingNumber) {
      return {
        orderNumber: order.orderNumber,
        status: order.status, // PENDING, PROCESSING, etc
        trackingInfo: null,
        items: order.items,
        total: order.total
      };
    }

    // Order has tracking number, call Fardar to get real-time tracking
    const trackingInfo = await FardarService.trackShipment(order.trackingNumber);

    return {
      orderNumber: order.orderNumber,
      status: order.status, 
      trackingInfo,
      items: order.items,
      total: order.total
    };
  }
};
