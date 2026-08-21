import prisma from '../config/prisma';

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
    price: number;
  }[];
  paymentMethod: string; // 'COD', 'BANK_TRANSFER', 'CARD_MANUAL'
  subtotal: number;
  shippingFee: number;
  tax: number;
  total: number;
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
          subtotal: data.subtotal,
          shippingFee: data.shippingFee,
          tax: data.tax,
          total: data.total,
          shippingAddress: data.customer,
          billingAddress: data.customer,
          items: {
            create: data.items.map(item => ({
              variantId: item.variantId,
              quantity: item.quantity,
              priceAtPurchase: item.price
            }))
          }
        },
        include: {
          items: true,
          customer: true
        }
      });

      return order;
    });
  }
};
