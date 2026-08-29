import prisma from '../config/prisma';

export const reportService = {
  getSalesReport: async (startDate: Date, endDate: Date) => {
    // Fetch all orders within date range that are not cancelled
    const orders = await prisma.order.findMany({
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
        status: {
          not: 'CANCELLED'
        }
      },
      select: {
        id: true,
        total: true,
        type: true,
        createdAt: true,
      }
    });

    // Aggregate by Day (YYYY-MM-DD)
    const dailyData: Record<string, { date: string; revenue: number; orders: number; ecommerceRevenue: number; posRevenue: number }> = {};
    
    orders.forEach(order => {
      const dateStr = order.createdAt.toISOString().split('T')[0] || 'unknown';
      if (!dailyData[dateStr]) {
        dailyData[dateStr] = { date: dateStr, revenue: 0, orders: 0, ecommerceRevenue: 0, posRevenue: 0 };
      }
      
      dailyData[dateStr].revenue += order.total;
      dailyData[dateStr].orders += 1;
      
      if (order.type === 'ECOMMERCE') {
        dailyData[dateStr].ecommerceRevenue += order.total;
      } else {
        dailyData[dateStr].posRevenue += order.total;
      }
    });

    const summary = {
      totalRevenue: orders.reduce((sum, o) => sum + o.total, 0),
      totalOrders: orders.length,
      aov: orders.length > 0 ? (orders.reduce((sum, o) => sum + o.total, 0) / orders.length) : 0,
    };

    return {
      summary,
      dailyTrend: Object.values(dailyData).sort((a, b) => a.date.localeCompare(b.date)),
    };
  },

  getBranchReport: async (startDate: Date, endDate: Date) => {
    const branches = await prisma.branch.findMany({
      include: {
        orders: {
          where: {
            createdAt: {
              gte: startDate,
              lte: endDate,
            },
            status: {
              not: 'CANCELLED'
            }
          },
          select: {
            total: true
          }
        }
      }
    });

    return branches.map(branch => {
      const revenue = branch.orders.reduce((sum, o) => sum + o.total, 0);
      return {
        branchId: branch.id,
        branchName: branch.name,
        type: branch.type,
        revenue,
        orders: branch.orders.length
      };
    }).sort((a, b) => b.revenue - a.revenue);
  },

  getPaymentReport: async (startDate: Date, endDate: Date) => {
    const orders = await prisma.order.findMany({
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
        status: {
          not: 'CANCELLED'
        },
        paymentMethod: {
          not: null
        }
      },
      select: {
        paymentMethod: true,
        total: true,
      }
    });

    const paymentData: Record<string, { method: string; revenue: number; count: number }> = {};
    
    orders.forEach(order => {
      const method = order.paymentMethod || 'UNKNOWN';
      if (!paymentData[method]) {
        paymentData[method] = { method, revenue: 0, count: 0 };
      }
      paymentData[method].revenue += order.total;
      paymentData[method].count += 1;
    });

    return Object.values(paymentData).sort((a, b) => b.revenue - a.revenue);
  },

  getInventoryValuationReport: async () => {
    const inventoryItems = await prisma.inventoryItem.findMany({
      include: {
        branch: {
          select: { name: true, id: true }
        },
        variant: {
          select: { price: true, salePrice: true, product: { select: { name: true } }, name: true }
        }
      }
    });

    const branchValuation: Record<string, { branchId: string; branchName: string; totalItems: number; valuation: number }> = {};
    
    inventoryItems.forEach(item => {
      const bId = item.branch.id;
      if (!branchValuation[bId]) {
        branchValuation[bId] = { branchId: bId, branchName: item.branch.name, totalItems: 0, valuation: 0 };
      }
      
      const price = item.variant.salePrice ?? item.variant.price;
      branchValuation[bId].totalItems += item.quantity;
      branchValuation[bId].valuation += (item.quantity * price);
    });

    // Get low stock items
    const lowStockItems = inventoryItems.filter(item => item.quantity <= item.lowStockThreshold).map(item => ({
      branchName: item.branch.name,
      productName: `${item.variant.product.name} - ${item.variant.name}`,
      quantity: item.quantity,
      threshold: item.lowStockThreshold
    }));

    return {
      branchValuations: Object.values(branchValuation),
      lowStockItems,
      totalGlobalValuation: Object.values(branchValuation).reduce((sum, b) => sum + b.valuation, 0),
    };
  },

  getCustomerReport: async (startDate: Date, endDate: Date) => {
    // Top customers by spending (LTV within date range or overall? Let's do overall for the top 5, but filter the query if needed. 
    // Usually, you want the top buyers in that period)
    const topBuyers = await prisma.customer.findMany({
      where: {
        orders: {
          some: {
            createdAt: {
              gte: startDate,
              lte: endDate
            },
            status: { not: 'CANCELLED' }
          }
        }
      },
      include: {
        orders: {
          where: {
            createdAt: { gte: startDate, lte: endDate },
            status: { not: 'CANCELLED' }
          }
        }
      }
    });

    const processedBuyers = topBuyers.map(c => {
      const spent = c.orders.reduce((sum, o) => sum + o.total, 0);
      return {
        id: c.id,
        name: c.firstName ? `${c.firstName} ${c.lastName}` : (c.email || c.phone),
        isGuest: c.isGuest,
        spent,
        orderCount: c.orders.length
      };
    }).sort((a, b) => b.spent - a.spent).slice(0, 10);

    const customersInPeriod = await prisma.customer.findMany({
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate
        }
      }
    });

    const registered = customersInPeriod.filter(c => !c.isGuest).length;
    const guest = customersInPeriod.filter(c => c.isGuest).length;

    return {
      totalNew: customersInPeriod.length,
      registered,
      guest,
      topCustomers: processedBuyers
    };
  },

  getPosReport: async (startDate: Date, endDate: Date) => {
    const sessions = await prisma.posSession.findMany({
      where: {
        createdAt: { gte: startDate, lte: endDate }
      },
      include: {
        terminal: true,
        user: true,
        orders: {
          where: { status: { not: 'CANCELLED' } }
        }
      }
    });

    let totalVariance = 0;
    let expectedTotal = 0;
    let actualTotal = 0;

    const terminalStats: Record<string, { terminalName: string; revenue: number; sessionCount: number }> = {};

    sessions.forEach(session => {
      totalVariance += (session.variance || 0);
      expectedTotal += (session.expectedClosing || 0);
      actualTotal += (session.actualClosing || 0);

      const tId = session.terminalId;
      if (!terminalStats[tId]) {
        terminalStats[tId] = { terminalName: session.terminal.name, revenue: 0, sessionCount: 0 };
      }
      terminalStats[tId].sessionCount += 1;
      terminalStats[tId].revenue += session.orders.reduce((sum, o) => sum + o.total, 0);
    });

    return {
      summary: {
        totalSessions: sessions.length,
        totalVariance,
        expectedTotal,
        actualTotal
      },
      terminals: Object.values(terminalStats)
    };
  },

  getPromotionsReport: async (startDate: Date, endDate: Date) => {
    // Vouchers (Exchange Vouchers)
    const vouchers = await prisma.exchangeVoucher.findMany({
      where: { createdAt: { gte: startDate, lte: endDate } }
    });
    const vouchersIssued = vouchers.length;
    const vouchersUsed = vouchers.filter(v => v.status === 'USED').length;
    const liability = vouchers.filter(v => v.status === 'ACTIVE').reduce((sum, v) => sum + v.value, 0);

    // Coupons
    const coupons = await prisma.coupon.findMany({
      where: { createdAt: { gte: startDate, lte: endDate } }
    });
    const couponsIssued = coupons.length;
    const totalCouponUsages = coupons.reduce((sum, c) => sum + c.usedCount, 0);

    return {
      vouchers: {
        issued: vouchersIssued,
        used: vouchersUsed,
        outstandingLiability: liability
      },
      coupons: {
        issued: couponsIssued,
        totalUsages: totalCouponUsages
      }
    };
  }
};
