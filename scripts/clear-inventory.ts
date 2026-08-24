import prisma from '../src/config/prisma';

async function main() {
  await prisma.inventoryTransaction.deleteMany({});
  await prisma.stockTransfer.deleteMany({});
  await prisma.inventoryItem.deleteMany({});
  console.log('Cleared existing inventory data');
}

main().catch(console.error).finally(() => prisma.$disconnect());
