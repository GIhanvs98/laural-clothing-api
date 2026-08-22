import prisma from '../config/prisma';

interface DateRange {
  start: Date;
  end: Date;
}

export const analyticsService = {
  getDateRanges(period: string): { current: DateRange; previous: DateRange } {
    const now = new Date();
    let currentStart = new Date();
    let currentEnd = new Date();
    let previousStart = new Date();
    let previousEnd = new Date();

    currentEnd = now;

    if (period === 'Today') {
      currentStart.setHours(0, 0, 0, 0);
      previousStart = new Date(currentStart);
      previousStart.setDate(previousStart.getDate() - 1);
      previousEnd = new Date(currentStart);
      previousEnd.setMilliseconds(-1);
    } else if (period === 'Last 7 Days') {
      currentStart.setDate(currentStart.getDate() - 7);
      currentStart.setHours(0, 0, 0, 0);
      previousStart = new Date(currentStart);
      previousStart.setDate(previousStart.getDate() - 7);
      previousEnd = new Date(currentStart);
      previousEnd.setMilliseconds(-1);
    } else if (period === 'Last 30 Days') {
      currentStart.setDate(currentStart.getDate() - 30);
      currentStart.setHours(0, 0, 0, 0);
      previousStart = new Date(currentStart);
      previousStart.setDate(previousStart.getDate() - 30);
      previousEnd = new Date(currentStart);
      previousEnd.setMilliseconds(-1);
    } else if (period === 'This Month') {
      currentStart.setDate(1);
      currentStart.setHours(0, 0, 0, 0);
      
      previousStart = new Date(currentStart);
      previousStart.setMonth(previousStart.getMonth() - 1);
      
      previousEnd = new Date(currentStart);
      previousEnd.setMilliseconds(-1);
    } else {
      // Default to Today
      currentStart.setHours(0, 0, 0, 0);
      previousStart = new Date(currentStart);
      previousStart.setDate(previousStart.getDate() - 1);
      previousEnd = new Date(currentStart);
      previousEnd.setMilliseconds(-1);
    }

    return {
      current: { start: currentStart, end: currentEnd },
      previous: { start: previousStart, end: previousEnd }
    };
  },

  calculateTrend(currentValue: number, previousValue: number): number {
    if (previousValue === 0) return currentValue > 0 ? 100 : 0;
    return ((currentValue - previousValue) / previousValue) * 100;
  },

  formatTrend(trend: number, suffix = '%'): string {
    const sign = trend > 0 ? '↑' : trend < 0 ? '↓' : '';
    return `${sign} ${Math.abs(trend).toFixed(1)}${suffix}`;
  },

  async getBusinessOverview(period: string, branchName: string) {
    const { current, previous } = this.getDateRanges(period);

    // Resolve branch
    let branchFilter = {};
    if (branchName && branchName !== 'All') {
      if (branchName === 'Online') {
        branchFilter = { branchId: null };
      } else {
        const branch = await prisma.branch.findUnique({ where: { code: branchName.toUpperCase() } });
        if (branch) {
          branchFilter = { branchId: branch.id };
        } else {
          // If branch not found by code, try by name
          const branchByName = await prisma.branch.findFirst({ where: { name: { contains: branchName, mode: 'insensitive' } } });
          if (branchByName) {
            branchFilter = { branchId: branchByName.id };
          }
        }
      }
    }

    const orderBaseFilter = {
      ...branchFilter,
      status: { notIn: ['CANCELLED', 'REFUNDED'] }
    };

    // CURRENT PERIOD METRICS
    const currentOrders = await prisma.order.findMany({
      where: {
        ...orderBaseFilter,
        createdAt: { gte: current.start, lte: current.end }
      }
    });

    const currentRevenue = currentOrders.reduce((sum, order) => sum + order.total, 0);
    const currentOrderCount = currentOrders.length;
    const currentAvgOrderValue = currentOrderCount > 0 ? currentRevenue / currentOrderCount : 0;

    const currentNewCustomers = await prisma.customer.count({
      where: { createdAt: { gte: current.start, lte: current.end } }
    });

    // PREVIOUS PERIOD METRICS
    const previousOrders = await prisma.order.findMany({
      where: {
        ...orderBaseFilter,
        createdAt: { gte: previous.start, lte: previous.end }
      }
    });

    const previousRevenue = previousOrders.reduce((sum, order) => sum + order.total, 0);
    const previousOrderCount = previousOrders.length;
    const previousAvgOrderValue = previousOrderCount > 0 ? previousRevenue / previousOrderCount : 0;

    const previousNewCustomers = await prisma.customer.count({
      where: { createdAt: { gte: previous.start, lte: previous.end } }
    });

    // OVERALL (NON-TIME BOUND OR SPECIFIC) METRICS
    const pendingOrdersCount = await prisma.order.count({
      where: {
        ...branchFilter,
        status: { in: ['PENDING', 'PROCESSING'] }
      }
    });

    const variants = await prisma.productVariant.findMany({
      select: { price: true, quantity: true }
    });
    const inventoryValue = variants.reduce((sum, variant) => sum + (variant.price * variant.quantity), 0);

    const returnsOrders = await prisma.order.findMany({
      where: {
        ...branchFilter,
        paymentStatus: 'REFUNDED',
        createdAt: { gte: current.start, lte: current.end }
      }
    });
    const returnsValue = returnsOrders.reduce((sum, order) => sum + order.total, 0);

    // PAYMENT GATEWAYS (CURRENT PERIOD)
    const paymentGateways: Record<string, { count: number, total: number }> = {};
    let totalGatewayAmount = 0;
    
    currentOrders.forEach(order => {
      const method = order.paymentMethod || 'UNKNOWN';
      if (!paymentGateways[method]) {
        paymentGateways[method] = { count: 0, total: 0 };
      }
      paymentGateways[method].count += 1;
      paymentGateways[method].total += order.total;
      totalGatewayAmount += order.total;
    });

    const paymentGatewayPerformance = Object.entries(paymentGateways)
      .map(([gw, stats]) => ({
        gw,
        amount: stats.total,
        count: stats.count,
        pct: totalGatewayAmount > 0 ? Math.round((stats.total / totalGatewayAmount) * 100) : 0
      }))
      .sort((a, b) => b.amount - a.amount); // Sort by highest revenue

    // Calculate trends
    const revenueTrend = this.calculateTrend(currentRevenue, previousRevenue);
    const ordersTrend = this.calculateTrend(currentOrderCount, previousOrderCount);
    const customersTrend = this.calculateTrend(currentNewCustomers, previousNewCustomers);
    const aovTrend = this.calculateTrend(currentAvgOrderValue, previousAvgOrderValue);

    // RECENT TRANSACTIONS
    const recentTransactions = await prisma.order.findMany({
      where: orderBaseFilter,
      take: 10,
      orderBy: { createdAt: 'desc' },
      include: {
        customer: true,
        branch: true
      }
    });

    return {
      revenue: {
        value: currentRevenue,
        trend: `${this.formatTrend(revenueTrend)} vs last period`,
        trendType: revenueTrend >= 0 ? 'positive' : 'negative'
      },
      orders: {
        value: currentOrderCount,
        trend: `${this.formatTrend(ordersTrend)} vs last period`,
        trendType: ordersTrend >= 0 ? 'positive' : 'negative'
      },
      newCustomers: {
        value: currentNewCustomers,
        trend: `${this.formatTrend(customersTrend)} vs last period`,
        trendType: customersTrend >= 0 ? 'positive' : 'negative'
      },
      avgOrderValue: {
        value: currentAvgOrderValue,
        trend: `${this.formatTrend(aovTrend)} vs last period`,
        trendType: aovTrend >= 0 ? 'positive' : 'negative'
      },
      pendingOrders: {
        value: pendingOrdersCount,
        trend: "Requires action",
        trendType: pendingOrdersCount > 0 ? 'neutral' : 'positive'
      },
      inventoryValue: {
        value: inventoryValue,
        trend: "Across all branches",
        trendType: "neutral"
      },
      loyaltyPoints: {
        value: 0, // Mocked until loyalty engine is built
        trend: "Outstanding balance",
        trendType: "neutral"
      },
      returns: {
        value: returnsValue,
        trend: "This period",
        trendType: returnsValue > 0 ? 'negative' : 'neutral'
      },
      paymentGatewayPerformance,
      recentTransactions: recentTransactions.map(t => ({
        id: t.id,
        customer: t.customer?.firstName ? `${t.customer.firstName} ${t.customer.lastName || ''}`.trim() : (t.customer?.isGuest ? 'Guest' : 'Unknown'),
        branch: t.branch?.name || 'Online',
        amount: t.total,
        paymentMethod: t.paymentMethod || 'Unknown',
        paymentStatus: t.paymentStatus,
        orderStatus: t.status,
        createdAt: t.createdAt
      }))
    };
  }
};
