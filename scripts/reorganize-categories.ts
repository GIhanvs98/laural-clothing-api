import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import * as dotenv from 'dotenv';
dotenv.config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const LUXURY_CATEGORIES = [
  'Dresses',
  'Tops',
  'Bottoms',
  'Co-ords',
  'Bodysuits',
  'Lingerie & Sleepwear',
  'Accessories',
  'The Essentials',
  'New Arrivals',
  'Sale & Archive'
];

const EXACT_MAPPINGS: Record<string, string> = {
  'Tops': 'Tops',
  'CL top': 'Tops',
  'cl Shirts': 'Tops',
  'Cropped Shirts': 'Tops',
  'Shirts': 'Tops',
  'Crew Neck Tops': 'Tops',
  'Blouses': 'Tops',
  'Collar Tops': 'Tops',
  'July Tops': 'Tops',
  
  'Dresses': 'Dresses',
  'july Dresses': 'Dresses',
  
  'Pants': 'Bottoms',
  'Skirts': 'Bottoms',
  'Shorts': 'Bottoms',
  
  'Two piece sets': 'Co-ords',
  
  'Bodysuits': 'Bodysuits',
  
  'Everyday Essentials': 'The Essentials',
  
  'Lingerie': 'Lingerie & Sleepwear',
  
  'Handbag': 'Accessories',
  
  'New arrivals': 'New Arrivals',
  'New Collection Push 4': 'New Arrivals'
};

async function main() {
  console.log('Starting category reorganization...');
  
  // 1. Create luxury categories
  const newCategoryIds: Record<string, string> = {};
  for (const catName of LUXURY_CATEGORIES) {
    const slug = catName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    let category = await prisma.category.findUnique({ where: { slug } });
    if (!category) {
      category = await prisma.category.create({
        data: { name: catName, slug }
      });
      console.log(`Created new luxury category: ${catName}`);
    }
    newCategoryIds[catName] = category.id;
  }
  
  // 2. Map existing products
  const products = await prisma.product.findMany({
    include: { category: true }
  });
  
  console.log(`Found ${products.length} products to re-map.`);
  let remappedCount = 0;
  
  for (const product of products) {
    let newCategoryName = 'Sale & Archive'; // Default fallback
    
    // Check old category mapping first
    if (product.category && product.category.name) {
      const mapped = EXACT_MAPPINGS[product.category.name];
      if (mapped) {
        newCategoryName = mapped;
      } else {
        // Fallback to keyword mapping for promotional/old categories
        const nameLower = product.name.toLowerCase();
        if (nameLower.includes('dress')) newCategoryName = 'Dresses';
        else if (nameLower.includes('top') || nameLower.includes('shirt') || nameLower.includes('blouse')) newCategoryName = 'Tops';
        else if (nameLower.includes('skirt') || nameLower.includes('pant') || nameLower.includes('short')) newCategoryName = 'Bottoms';
        else if (nameLower.includes('set') || nameLower.includes('co-ord')) newCategoryName = 'Co-ords';
        else if (nameLower.includes('bodysuit')) newCategoryName = 'Bodysuits';
        else if (nameLower.includes('bag') || nameLower.includes('handbag')) newCategoryName = 'Accessories';
      }
    } else {
      // No category, use keyword mapping
      const nameLower = product.name.toLowerCase();
      if (nameLower.includes('dress')) newCategoryName = 'Dresses';
      else if (nameLower.includes('top') || nameLower.includes('shirt') || nameLower.includes('blouse')) newCategoryName = 'Tops';
      else if (nameLower.includes('skirt') || nameLower.includes('pant') || nameLower.includes('short')) newCategoryName = 'Bottoms';
      else if (nameLower.includes('set') || nameLower.includes('co-ord')) newCategoryName = 'Co-ords';
      else if (nameLower.includes('bodysuit')) newCategoryName = 'Bodysuits';
      else if (nameLower.includes('bag') || nameLower.includes('handbag')) newCategoryName = 'Accessories';
    }
    
    const newCategoryId = newCategoryIds[newCategoryName];
    if (product.categoryId !== newCategoryId) {
      await prisma.product.update({
        where: { id: product.id },
        data: { categoryId: newCategoryId }
      });
      remappedCount++;
    }
  }
  console.log(`✓ Successfully remapped ${remappedCount} products.`);
  
  // 3. Delete old categories
  const oldCategories = await prisma.category.findMany({
    where: {
      name: {
        notIn: LUXURY_CATEGORIES
      }
    }
  });
  
  if (oldCategories.length > 0) {
    console.log(`Deleting ${oldCategories.length} old categories...`);
    const oldIds = oldCategories.map(c => c.id);
    await prisma.category.deleteMany({
      where: {
        id: { in: oldIds }
      }
    });
    console.log('✓ Successfully deleted old categories.');
  }
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });
