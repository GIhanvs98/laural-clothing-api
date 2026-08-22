import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import csv from 'csv-parser';

import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import * as dotenv from 'dotenv';
dotenv.config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });
const DB_DIR = path.join(__dirname, '../databaseOLD');
const CSV_FILE = path.join(DB_DIR, 'wc-product-export-9-8-2026-1786290310470.csv');

async function migrateCategories() {
  console.log('Starting category migration from CSV...');
  const rows: any[] = [];
  
  return new Promise((resolve, reject) => {
    if (!fs.existsSync(CSV_FILE)) {
      console.warn(`[WARN] CSV file not found: ${CSV_FILE}`);
      return resolve(true);
    }
    
    fs.createReadStream(CSV_FILE)
      .pipe(csv())
      .on('data', (data) => rows.push(data))
      .on('end', async () => {
        console.log(`Found ${rows.length} rows in CSV.`);
        
        // Extract unique categories
        const categorySet = new Set<string>();
        for (const row of rows) {
          if (!row.Name || !row.Categories) continue;
          
          const cats = row.Categories.split(',').map((c: string) => c.trim()).filter(Boolean);
          if (cats.length > 0) {
            categorySet.add(cats[0]); // Take the first category for 1-to-many mapping
          }
        }
        
        console.log(`Found ${categorySet.size} unique categories:`, Array.from(categorySet));
        
        // Upsert categories
        const categoryMap = new Map<string, string>(); // name -> id
        for (const catName of categorySet) {
          const slug = catName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
          let category = await prisma.category.findUnique({ where: { slug } });
          
          if (!category) {
            category = await prisma.category.create({
              data: {
                name: catName,
                slug,
              }
            });
            console.log(`Created category: ${catName}`);
          } else {
            console.log(`Category exists: ${catName}`);
          }
          
          categoryMap.set(catName, category.id);
        }
        
        // Map products to categories
        console.log('Updating products with categories...');
        let updatedCount = 0;
        for (const row of rows) {
          if (!row.Name || !row.Categories) continue;
          
          const cats = row.Categories.split(',').map((c: string) => c.trim()).filter(Boolean);
          if (cats.length === 0) continue;
          
          const catName = cats[0];
          const categoryId = categoryMap.get(catName);
          
          if (!categoryId) continue;
          
          const sku = row.SKU || null;
          try {
            // Find product by name
            const products = await prisma.product.findMany({ where: { name: row.Name } });
            
            if (products.length > 0) {
              await prisma.product.update({
                where: { id: products[0].id },
                data: { categoryId }
              });
              updatedCount++;
            }
          } catch (e: any) {
            console.error(`Failed to update product ${row.Name}: ${e.message}`);
          }
        }
        
        console.log(`✓ Successfully mapped ${updatedCount} products to categories.`);
        resolve(true);
      })
      .on('error', reject);
  });
}

async function main() {
  try {
    await migrateCategories();
  } catch (error) {
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
