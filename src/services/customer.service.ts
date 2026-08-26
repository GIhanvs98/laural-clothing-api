import prisma from '../config/prisma';

export const customerService = {
  getCustomers: async (search?: string, type?: string, sort?: string, page: number = 1, limit: number = 10) => {
    const where: any = {};
    
    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (type === 'Registered') {
      where.isGuest = false;
    } else if (type === 'Guest') {
      where.isGuest = true;
    }

    let orderBy: any = { createdAt: 'desc' };
    if (sort === 'Sort By: Highest Spend') {
      // Prisma cannot easily sort by aggregated relation sum directly in findMany, 
      // fallback to createdAt desc
      orderBy = { createdAt: 'desc' };
    } else if (sort === 'Sort By: Most Orders') {
      orderBy = { orders: { _count: 'desc' } };
    }

    const skip = (page - 1) * limit;

    const [customers, total] = await Promise.all([
      prisma.customer.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          orders: {
            select: { totalAmount: true }
          },
          _count: {
            select: { orders: true }
          }
        }
      }),
      prisma.customer.count({ where })
    ]);

    const formattedCustomers = customers.map(c => {
      const spent = c.orders.reduce((sum, order) => sum + Number(order.totalAmount || 0), 0);
      return {
        id: c.id,
        name: (c.firstName || c.lastName) ? `${c.firstName || ''} ${c.lastName || ''}`.trim() : 'N/A',
        phone: c.phone,
        email: c.email || 'N/A',
        type: c.isGuest ? 'Guest' : 'Registered',
        orders: c._count.orders,
        spent: `Rs. ${spent.toLocaleString('en-US', { minimumFractionDigits: 2 })}`,
        lastActive: c.updatedAt.toLocaleDateString(),
      };
    });

    return {
      success: true,
      data: formattedCustomers,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    };
  }
};
