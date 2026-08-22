import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import * as dotenv from 'dotenv';
dotenv.config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function migrateVariants() {
  console.log('Clearing existing migrated data...');
  await prisma.productVariant.deleteMany();
  await prisma.product.deleteMany();
  
  console.log('Fetching all legacy products...');
  const legacyProducts = await prisma.legacyProduct.findMany();
  console.log(`Found ${legacyProducts.length} legacy products to process.`);

  // Group by base name
  // Example name: "Classic Shirt - Serene Green - UK 12" -> base: "Classic Shirt"
  // Some names might not have hyphens, they are just "Adore Dress"
  
  const groupedProducts = new Map<string, any[]>();

  for (const lp of legacyProducts) {
    // split by " - " to guess base name
    const parts = lp.name.split(' - ').map((p: string) => p.trim());
    const baseName = parts[0];
    
    if (!groupedProducts.has(baseName)) {
      groupedProducts.set(baseName, []);
    }
    groupedProducts.get(baseName)?.push(lp);
  }

  console.log(`Grouped into ${groupedProducts.size} unique base products.`);

  // For each base product, create one Product, and multiple Variants
  for (const [baseName, items] of groupedProducts.entries()) {
    const firstItem = items[0];
    
    // Create base product
    const product = await prisma.product.create({
      data: {
        name: baseName,
        slug: firstItem.slug + '-' + Math.random().toString(36).substring(2, 8), // Ensure unique slug for base
        description: firstItem.description,
        excerpt: firstItem.excerpt,
        categoryId: firstItem.categoryId,
        createdAt: firstItem.createdAt,
      }
    });

    // Create variants
    for (const item of items) {
      const parts = item.name.split(' - ').map((p: string) => p.trim());
      
      let color = null;
      let size = null;

      if (parts.length === 3) {
        color = parts[1];
        size = parts[2];
      } else if (parts.length === 2) {
        // Guess if it's size or color based on keywords or just assign to size
        const p2 = parts[1].toLowerCase();
        if (p2.includes('uk') || p2.includes('small') || p2.includes('medium') || p2.includes('large') || p2.match(/^[smlxlx]+$/)) {
          size = parts[1];
        } else {
          color = parts[1];
        }
      }

      await prisma.productVariant.create({
        data: {
          productId: product.id,
          name: item.name,
          sku: item.sku || `SKU-${Date.now().toString().slice(-6)}-${Math.floor(Math.random()*1000)}`,
          price: item.price,
          salePrice: item.salePrice,
          stockStatus: item.stockStatus,
          quantity: item.quantity,
          color: color,
          size: size,
          featuredImage: item.featuredImage,
          gallery: item.gallery,
          createdAt: item.createdAt,
        }
      });
    }
    console.log(`Created base product '${baseName}' with ${items.length} variants.`);
  }

  console.log('Migration completed successfully.');
}

migrateVariants()
  .catch(e => {
    console.error('Migration failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
