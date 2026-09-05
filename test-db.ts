import prisma from './src/config/prisma';

async function run() {
  const count = await prisma.order.count();
  console.log('Total orders:', count);
  const recent = await prisma.order.findMany({
    take: 5,
    orderBy: { createdAt: 'desc' }
  });
  console.log('Recent orders:', recent);
}
run().catch(console.error).finally(() => prisma.$disconnect());
