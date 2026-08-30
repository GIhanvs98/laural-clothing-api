import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const loyaltyService = {
  getLoyaltyRules: async () => {
    const setting = await prisma.setting.findUnique({
      where: { key: 'LOYALTY_RULES' }
    });

    if (setting && setting.value) {
      return setting.value as any;
    }

    // Default rules
    return {
      earnRate: 0.01, // 1 point per 100 LKR
      redemptionValue: 1, // 1 point = 1 LKR
      tiers: [
        { name: 'Bronze', minPoints: 0 },
        { name: 'Silver', minPoints: 1000 },
        { name: 'Gold', minPoints: 3000 },
        { name: 'Platinum', minPoints: 10000 }
      ]
    };
  },

  calculateTier: (lifetimePoints: number, tiers: any[]) => {
    let currentTier = 'Bronze';
    for (const tier of tiers.sort((a: any, b: any) => a.minPoints - b.minPoints)) {
      if (lifetimePoints >= tier.minPoints) {
        currentTier = tier.name;
      }
    }
    return currentTier;
  },

  ensureLoyaltyAccount: async (customerId: string) => {
    let account = await prisma.loyaltyAccount.findUnique({
      where: { customerId }
    });

    if (!account) {
      account = await prisma.loyaltyAccount.create({
        data: { customerId }
      });
    }

    return account;
  },

  creditPointsForOrder: async (orderId: string) => {
    const order = await prisma.order.findUnique({
      where: { id: orderId }
    });

    if (!order || !order.customerId) return;

    // Check if points already credited for this order
    const existingTx = await prisma.loyaltyTransaction.findFirst({
      where: { orderId, type: 'EARNED' }
    });

    if (existingTx) return;

    const rules = await loyaltyService.getLoyaltyRules();
    const pointsToEarn = Math.floor(order.subtotal * rules.earnRate);

    if (pointsToEarn <= 0) return;

    const account = await loyaltyService.ensureLoyaltyAccount(order.customerId);
    const newLifetimePoints = account.lifetimePoints + pointsToEarn;
    const newTier = loyaltyService.calculateTier(newLifetimePoints, rules.tiers);

    await prisma.$transaction([
      prisma.loyaltyTransaction.create({
        data: {
          accountId: account.id,
          amount: pointsToEarn,
          type: 'EARNED',
          reason: `Order #${order.orderNumber}`,
          orderId: order.id
        }
      }),
      prisma.loyaltyAccount.update({
        where: { id: account.id },
        data: {
          points: { increment: pointsToEarn },
          lifetimePoints: { increment: pointsToEarn },
          tier: newTier
        }
      })
    ]);
  },

  migrateGuestOrders: async (customerId: string, email: string | null, phone: string) => {
    const account = await loyaltyService.ensureLoyaltyAccount(customerId);

    // Find all past guest customers with this email or phone
    const guestCustomers = await prisma.customer.findMany({
      where: {
        isGuest: true,
        OR: [
          { phone },
          { email: email || 'NON_EXISTENT_EMAIL' }
        ]
      },
      include: {
        orders: {
          where: { status: 'DELIVERED' }
        }
      }
    });

    let totalPointsToMigrate = 0;
    const rules = await loyaltyService.getLoyaltyRules();

    for (const gc of guestCustomers) {
      if (gc.id === customerId) continue;

      for (const order of gc.orders) {
        const existingTx = await prisma.loyaltyTransaction.findFirst({
          where: { orderId: order.id }
        });

        if (!existingTx) {
          const points = Math.floor(order.subtotal * rules.earnRate);
          totalPointsToMigrate += points;
          
          await prisma.loyaltyTransaction.create({
            data: {
              accountId: account.id,
              amount: points,
              type: 'MIGRATED',
              reason: `Guest Migration: Order #${order.orderNumber}`,
              orderId: order.id
            }
          });
        }
      }
    }

    if (totalPointsToMigrate > 0) {
      const newLifetimePoints = account.lifetimePoints + totalPointsToMigrate;
      const newTier = loyaltyService.calculateTier(newLifetimePoints, rules.tiers);

      await prisma.loyaltyAccount.update({
        where: { id: account.id },
        data: {
          points: { increment: totalPointsToMigrate },
          lifetimePoints: { increment: totalPointsToMigrate },
          tier: newTier
        }
      });
    }
  }
};
