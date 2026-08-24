import prisma from '../src/config/prisma';

async function main() {
  console.log('Seeding InventoryItem from existing ProductVariant quantities...');

  const variants = await prisma.productVariant.findMany({
    select: { id: true, quantity: true, sku: true },
  });

  console.log(`Found ${variants.length} variants to sync.`);

  let created = 0;
  let skipped = 0;

  for (const v of variants) {
    const existing = await prisma.inventoryItem.findUnique({ where: { variantId: v.id } });
    if (existing) { skipped++; continue; }

    await prisma.inventoryItem.create({
      data: {
        variantId: v.id,
        quantity: v.quantity,
        reservedQty: 0,
        lowStockThreshold: 5,
      },
    });

    // Log initial stock as a RECEIVE transaction
    if (v.quantity > 0) {
      await prisma.inventoryTransaction.create({
        data: {
          variantId: v.id,
          type: 'RECEIVE',
          quantityChange: v.quantity,
          reason: 'Initial stock sync from ProductVariant',
          reference: 'SEED',
        },
      });
    }

    created++;
  }

  console.log(`Done! Created: ${created}, Skipped (already exists): ${skipped}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
