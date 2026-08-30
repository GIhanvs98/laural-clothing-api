import prisma from '../src/config/prisma';

async function main() {
  console.log('Syncing all customers to LoyaltyAccount...');
  
  const customers = await prisma.customer.findMany({
    where: { isGuest: false }
  });

  let synced = 0;
  for (const customer of customers) {
    const existing = await prisma.loyaltyAccount.findUnique({
      where: { customerId: customer.id }
    });

    if (!existing) {
      await prisma.loyaltyAccount.create({
        data: {
          customerId: customer.id,
          points: 0,
          lifetimePoints: 0,
          tier: 'Bronze'
        }
      });
      synced++;
    }
  }

  console.log(`Successfully synced ${synced} customers to loyalty accounts.`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
