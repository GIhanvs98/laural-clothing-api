import { CollectionType } from '@prisma/client';
import prisma from '../src/config/prisma';

async function main() {
  console.log('Seeding collections...');

  // 1. Create a manual collection (e.g., Summer 2026)
  const manualCollection = await prisma.collection.upsert({
    where: { slug: 'summer-2026' },
    update: {},
    create: {
      title: 'Summer 2026',
      slug: 'summer-2026',
      description: 'Our curated picks for the summer season.',
      type: CollectionType.MANUAL,
      status: 'Active',
    },
  });

  // Get some products to assign to manual collection
  const products = await prisma.product.findMany({ take: 5 });
  for (const product of products) {
    await prisma.collectionProduct.upsert({
      where: {
        collectionId_productId: {
          collectionId: manualCollection.id,
          productId: product.id,
        }
      },
      update: {},
      create: {
        collectionId: manualCollection.id,
        productId: product.id,
      }
    });
  }

  // 2. Create an automated collection (e.g., Best Sellers / Under 5000)
  await prisma.collection.upsert({
    where: { slug: 'budget-friendly' },
    update: {},
    create: {
      title: 'Budget Friendly',
      slug: 'budget-friendly',
      description: 'Amazing pieces under Rs. 3000',
      type: CollectionType.AUTOMATED,
      status: 'Active',
      rules: [
        { field: 'price', operator: '<', value: '3000' }
      ]
    },
  });

  // 3. Create a Draft collection
  await prisma.collection.upsert({
    where: { slug: 'winter-2026' },
    update: {},
    create: {
      title: 'Winter 2026 Preview',
      slug: 'winter-2026',
      description: 'Draft collection for upcoming winter.',
      type: CollectionType.MANUAL,
      status: 'Draft',
    },
  });

  console.log('Collections seeded successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
