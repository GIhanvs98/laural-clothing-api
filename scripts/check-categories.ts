import prisma from '../src/config/prisma';

async function main() {
  try {
    // Check if category column exists on Product
    const products = await prisma.$queryRaw`SELECT * FROM "Product" LIMIT 5;`;
    console.log('Product columns:', Object.keys((products as any[])[0] || {}));
    
    // Check LegacyProduct just in case
    const legacyProducts = await prisma.$queryRaw`SELECT * FROM "LegacyProduct" LIMIT 5;`;
    if ((legacyProducts as any[]).length > 0) {
      console.log('LegacyProduct columns:', Object.keys((legacyProducts as any[])[0] || {}));
    }
    
    // If it exists, group by it to see unique categories
    try {
      const cats = await prisma.$queryRaw`SELECT DISTINCT category FROM "Product" WHERE category IS NOT NULL;`;
      console.log('Categories in Product:', cats);
    } catch (e) {
      console.log('No category column on Product');
    }
  } catch (error) {
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
