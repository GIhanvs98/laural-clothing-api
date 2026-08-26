import prisma from '../config/prisma';
import { FardarService } from './fardar.service';
import { inventoryService } from './inventory.service';

export interface QuickDispatchPayload {
  customer: {
    phone: string;
    email?: string;
    firstName: string;
    lastName: string;
    addressLine1: string;
    addressLine2?: string;
    city: string;
    postalCode?: string;
  };
  branchId: string;
  items: {
    variantId: string;
    quantity: number;
    // Removed client-provided prices, we calculate server-side
  }[];
  paymentMethod: string; // 'COD', 'BANK_TRANSFER', 'CARD_MANUAL'
}

export const orderService = {
  async searchCustomerByPhone(phone: string) {
    const customer = await prisma.customer.findUnique({
      where: { phone },
      include: {
        addresses: {
          where: { type: 'SHIPPING' },
          orderBy: { isDefault: 'desc' },
          take: 1
        }
      }
    });
    return customer;
  },

  async createQuickDispatchOrder(data: QuickDispatchPayload) {
    return prisma.$transaction(async (tx) => {
      // 1. Find or create customer
      let customer = await tx.customer.findUnique({
        where: { phone: data.customer.phone }
      });

      if (!customer) {
        customer = await tx.customer.create({
          data: {
            phone: data.customer.phone,
            email: data.customer.email,
            firstName: data.customer.firstName,
            lastName: data.customer.lastName,
            isGuest: true
          }
        });
      } else {
        // Update name if missing
        if (!customer.firstName || !customer.lastName) {
          customer = await tx.customer.update({
            where: { id: customer.id },
            data: {
              firstName: customer.firstName || data.customer.firstName,
              lastName: customer.lastName || data.customer.lastName,
              email: customer.email || data.customer.email,
            }
          });
        }
      }

      // 2. Check and add address if needed
      const existingAddress = await tx.address.findFirst({
        where: {
          customerId: customer.id,
          addressLine1: data.customer.addressLine1,
          city: data.customer.city
        }
      });

      let addressId: string;
      if (!existingAddress) {
        const newAddress = await tx.address.create({
          data: {
            customerId: customer.id,
            type: 'SHIPPING',
            firstName: data.customer.firstName,
            lastName: data.customer.lastName,
            addressLine1: data.customer.addressLine1,
            addressLine2: data.customer.addressLine2,
            city: data.customer.city,
            postalCode: data.customer.postalCode,
            phone: data.customer.phone,
            isDefault: true
          }
        });
        addressId = newAddress.id;
      } else {
        addressId = existingAddress.id;
      }

      // 3. Inventory Validation & Deduction
      for (const item of data.items) {
        const inventory = await tx.inventoryItem.findUnique({
          where: {
            variantId_branchId: {
              variantId: item.variantId,
              branchId: data.branchId
            }
          }
        });

        if (!inventory || inventory.quantity < item.quantity) {
          throw new Error(`Insufficient stock for variant ${item.variantId} in the selected branch.`);
        }

        // Deduct stock
        await tx.inventoryItem.update({
          where: { id: inventory.id },
          data: { quantity: { decrement: item.quantity } }
        });

        // Record transaction
        await tx.inventoryTransaction.create({
          data: {
            variantId: item.variantId,
            branchId: data.branchId,
            type: 'SALE',
            quantityChange: -item.quantity,
            reason: 'Quick Dispatch Manual Order'
          }
        });
      }

      // 4. Generate Order Number (e.g. QD-12345)
      const orderCount = await tx.order.count();
      const orderNumber = `QD-${10000 + orderCount + 1}`;

      // 4.5 Server-side Price Recalculation
      let subtotal = 0;
      const orderItems = [];

      for (const item of data.items) {
        const variant = await tx.productVariant.findUnique({
          where: { id: item.variantId }
        });

        if (!variant) throw new Error(`Variant ${item.variantId} not found`);

        const price = variant.salePrice ?? variant.price;
        subtotal += price * item.quantity;

        orderItems.push({
          variantId: item.variantId,
          quantity: item.quantity,
          priceAtPurchase: price
        });
      }

      const shippingFee = 400; // Flat fee or calculate based on logic
      const tax = 0;
      const total = subtotal + shippingFee + tax;

      // 5. Create Order
      const paymentStatus = data.paymentMethod === 'COD' ? 'UNPAID' : 'PAID';

      const order = await tx.order.create({
        data: {
          orderNumber,
          type: 'ECOMMERCE', // It's an ecommerce order placed manually
          customerId: customer.id,
          branchId: data.branchId,
          status: 'PENDING',
          paymentMethod: data.paymentMethod,
          paymentStatus: paymentStatus,
          subtotal: subtotal,
          shippingFee: shippingFee,
          tax: tax,
          total: total,
          shippingAddress: data.customer,
          billingAddress: data.customer,
          items: {
            create: orderItems
          }
        },
        include: {
          items: true,
          customer: true
        }
      });

      return order;
    });
  },

  async getOrders(filters: any = {}, pagination: { skip?: number; take?: number } = {}) {
    const { search, status, paymentGateway, branchId, customerId } = filters;
    const { skip = 0, take = 20 } = pagination;

    const where: any = {};
    if (status) where.status = status;
    if (branchId) where.branchId = branchId;
    if (customerId) where.customerId = customerId;
    if (search) {
      where.OR = [
        { orderNumber: { contains: search, mode: 'insensitive' } },
        { customer: { phone: { contains: search, mode: 'insensitive' } } },
        { customer: { firstName: { contains: search, mode: 'insensitive' } } },
        { customer: { lastName: { contains: search, mode: 'insensitive' } } }
      ];
    }
    
    // Gateway filtering: COD, BANK_TRANSFER, CARD_MANUAL for manual methods
    // Online methods: Koko, Mintpay, etc.
    // If gateway matches paymentMethod, we can filter by that.
    if (paymentGateway) {
      if (['Koko', 'Mintpay', 'OnePay', 'Payzy'].includes(paymentGateway)) {
        where.paymentMethod = paymentGateway; // Adjust if payment gateway is stored differently
      } else if (paymentGateway === 'COD') {
        where.paymentMethod = 'COD';
      }
    }

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        skip,
        take,
        include: {
          customer: true,
          branch: true
        },
        orderBy: {
          createdAt: 'desc'
        }
      }),
      prisma.order.count({ where })
    ]);

    return { orders, total };
  },

  async getOrderById(id: string) {
    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        customer: true,
        branch: true,
        items: {
          include: {
            variant: {
              include: {
                product: true
              }
            }
          }
        }
      }
    });

    if (!order) {
      throw new Error("Order not found");
    }

    return order;
  },

  async updateOrderStatus(id: string, status: string) {
    // Validate valid status progression or general status updates
    const validStatuses = ['PENDING', 'PROCESSING', 'DISPATCHED', 'DELIVERED', 'CANCELLED'];
    if (!validStatuses.includes(status)) {
      throw new Error(`Invalid status: ${status}`);
    }

    let order = await prisma.order.findUnique({
      where: { id },
      include: { customer: true }
    });

    if (!order) {
      throw new Error("Order not found");
    }

    const dataToUpdate: any = { status };

    if (status === 'DISPATCHED' && order.status !== 'DISPATCHED') {
      const shippingAddress = order.shippingAddress as any;
      const details = {
        orderId: order.orderNumber,
        customerName: order.customer?.firstName ? `${order.customer.firstName} ${order.customer.lastName || ''}` : shippingAddress?.firstName + ' ' + (shippingAddress?.lastName || ''),
        customerPhone: order.customer?.phone || shippingAddress?.phone || 'Unknown',
        customerAddress: shippingAddress ? `${shippingAddress.addressLine1} ${shippingAddress.addressLine2 || ''}` : 'Unknown',
        city: shippingAddress?.city || 'Unknown',
        codAmount: order.paymentMethod === 'COD' ? order.total : 0
      };

      try {
        const shipment = await FardarService.createShipment(details);
        if (shipment.success) {
          dataToUpdate.trackingNumber = shipment.trackingNumber;
          dataToUpdate.labelUrl = shipment.labelUrl;
        }
      } catch (err) {
        console.error("Failed to create Fardar shipment:", err);
        // Continue updating status even if shipment creation fails or could throw depending on requirement
      }
    }

    order = await prisma.order.update({
      where: { id },
      data: dataToUpdate,
      include: {
        customer: true,
        items: true
      }
    });

    return order;
  },

  async refundOrder(id: string) {
    let order = await prisma.order.findUnique({
      where: { id },
      include: { items: true }
    });

    if (!order) throw new Error("Order not found");
    if (order.status === 'CANCELLED') throw new Error("Order already cancelled");

    // Revert status and payment
    order = await prisma.order.update({
      where: { id },
      data: {
        status: 'CANCELLED',
        paymentStatus: 'REFUNDED'
      },
      include: { items: true }
    });

    // Restore stock
    const branchId = order.branchId || (await prisma.branch.findFirst({ where: { OR: [{ name: 'Online' }, { code: 'ONLINE' }] } }))?.id;
    if (branchId) {
      for (const item of order.items) {
        await inventoryService.adjustStock({
          variantId: item.variantId,
          branchId,
          type: 'RECEIVE',
          quantity: item.quantity,
          reason: 'Order Refund Restock',
          reference: order.id
        });
      }
    }

    return order;
  },

  async trackOrder(orderNumber: string, phone: string) {
    const order = await prisma.order.findUnique({
      where: { orderNumber },
      include: { customer: true, items: { include: { variant: { include: { product: true } } } } }
    });

    if (!order) throw new Error("Order not found");
    
    const shippingAddress = order.shippingAddress as any;
    const orderPhone = order.customer?.phone || shippingAddress?.phone;

    if (orderPhone !== phone) {
      throw new Error("Phone number does not match order");
    }

    // Optionally update real-time status from Fardar here if it has a tracking number
    if (order.trackingNumber && order.status === 'DISPATCHED') {
      try {
        const trackingDetails = await FardarService.trackShipment(order.trackingNumber);
        // Map Fardar status back to our system if needed, or just return it as extra info
        return { ...order, courierStatus: trackingDetails.status, location: trackingDetails.location };
      } catch (err) {
        // Ignore fardar errors
      }
    }

    return order;
  },

  async cancelAbandonedOrders() {
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
    
    const abandonedOrders = await prisma.order.findMany({
      where: {
        status: 'PENDING',
        paymentStatus: 'UNPAID',
        createdAt: { lt: thirtyMinutesAgo }
      },
      include: { items: true }
    });

    if (abandonedOrders.length === 0) return 0;

    for (const order of abandonedOrders) {
      await prisma.$transaction(async (tx) => {
        await tx.order.update({
          where: { id: order.id },
          data: { status: 'CANCELLED' }
        });

        const branchId = order.branchId || (await tx.branch.findFirst({ where: { OR: [{ name: 'Online' }, { code: 'ONLINE' }] } }))?.id;
        if (branchId) {
          for (const item of order.items) {
            await inventoryService.adjustStock({
              variantId: item.variantId,
              branchId,
              type: 'RECEIVE',
              quantity: item.quantity,
              reason: 'Abandoned Order Restock',
              reference: order.id
            }, tx);
          }
        }
      });
    }
    return abandonedOrders.length;
  }
};
