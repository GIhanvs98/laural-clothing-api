import prisma from '../config/prisma';

export const checkoutService = {
  /**
   * Calculates the checkout totals for a given cart and shipping address.
   */
  async calculateCheckout(cartId: string, address: any) {
    const cart = await prisma.cart.findUnique({
      where: { id: cartId },
      include: {
        items: {
          include: { variant: true },
        },
      },
    });

    if (!cart || cart.items.length === 0) {
      throw new Error('Cart is empty or not found');
    }

    let subtotal = 0;
    cart.items.forEach((item: any) => {
      subtotal += item.quantity * (item.variant.salePrice ?? item.variant.price);
    });

    // TODO: Implement complex shipping logic based on address.city or postalCode
    // For now, flat rate of Rs. 400
    const shippingFee = 400;
    
    // TODO: Implement tax logic if needed
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
    const cart = await prisma.cart.findUnique({
      where: { id: cartId },
      include: {
        items: { include: { variant: true } },
      },
    });

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
          isGuest: customerData.isGuest !== false,
        },
      });
    } else if (customerData.email && !customer.email) {
      // Update email if not present
      customer = await prisma.customer.update({
        where: { id: customer.id },
        data: { email: customerData.email },
      });
    }

    // 2. Calculation
    const totals = await this.calculateCheckout(cartId, shippingAddress);

    // 3. Create Order
    const orderNumber = `LC-${Date.now().toString().slice(-6)}`; // Simple unique generator
    
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

    // 4. Mark Cart as Converted
    await prisma.cart.update({
      where: { id: cartId },
      data: { status: 'CONVERTED' },
    });

    return order;
  },
};
