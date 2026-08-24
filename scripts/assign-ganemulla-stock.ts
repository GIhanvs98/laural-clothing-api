import prisma from '../src/config/prisma';

async function main() {
  console.log('Starting true stock migration from ProductVariant to Ganemulla Branch...');

  // 1. Get the Ganemulla branch
  const ganemullaBranch = await prisma.branch.findUnique({
    where: { code: 'GAN-MAIN' }
  });

  if (!ganemullaBranch) {
    console.error('Ganemulla branch not found!');
    return;
  }

  // 2. Fetch all product variants
  const variants = await prisma.productVariant.findMany();
  console.log(`Found ${variants.length} product variants in the database.`);

  if (variants.length === 0) {
    console.log('No product variants found to assign stock to.');
    return;
  }

  // 3. Clear existing fake stock
  console.log('Clearing existing fake inventory items...');
  await prisma.inventoryItem.deleteMany({});

  // 4. Create inventory items using chunked createMany for speed and safety
  const lowStockThreshold = 10;
  const CHUNK_SIZE = 500;
  let assignedCount = 0;

  for (let i = 0; i < variants.length; i += CHUNK_SIZE) {
    const chunk = variants.slice(i, i + CHUNK_SIZE);
    
    const itemsToCreate = chunk.map(variant => {
      // Use the TRUE quantity that was previously synced from WordPress!
      const trueQuantity = variant.quantity || 0;
      
      return {
        variantId: variant.id,
        branchId: ganemullaBranch.id,
        quantity: trueQuantity,
        reservedQty: 0,
        lowStockThreshold
      };
    });

    const result = await prisma.inventoryItem.createMany({
      data: itemsToCreate,
      skipDuplicates: false
    });

    assignedCount += result.count;
    console.log(`Batched ${i + chunk.length}/${variants.length}...`);
  }

  console.log(`✅ Successfully assigned TRUE WP stock for ${assignedCount} variants to the Ganemulla branch!`);
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
