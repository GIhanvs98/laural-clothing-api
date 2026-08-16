import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import csv from 'csv-parser';
import * as readline from 'readline';

const prisma = new PrismaClient();
const DB_DIR = path.join(__dirname, '../databaseOLD');
const CSV_FILE = path.join(DB_DIR, 'wc-product-export-9-8-2026-1786290310470.csv');
const SQL_FILE = path.join(DB_DIR, 'lauralclothing_wp605.sql');

async function migrateProducts() {
  console.log('Starting product migration from CSV...');
  const products: any[] = [];
  
  return new Promise((resolve, reject) => {
    if (!fs.existsSync(CSV_FILE)) {
      console.warn(`[WARN] CSV file not found: ${CSV_FILE}`);
      return resolve(true);
    }
    
    fs.createReadStream(CSV_FILE)
      .pipe(csv())
      .on('data', (data) => products.push(data))
      .on('end', async () => {
        console.log(`Found ${products.length} products. Inserting...`);
        let count = 0;
        for (const row of products) {
          // Skip if no name
          if (!row.Name) continue;
          
          try {
            const price = parseFloat(row['Regular price']) || 0;
            const salePrice = row['Sale price'] ? parseFloat(row['Sale price']) : null;
            const quantity = parseInt(row['Stock']) || 0;
            const sku = row['SKU'] || null;
            // Generate a unique slug if not present
            const slug = sku || `product-${Date.now()}-${count}`;
            
            // Basic mapping
            // Check if product exists if we have a sku, otherwise create
            if (sku) {
               const existing = await prisma.product.findUnique({ where: { sku } });
               if (existing) {
                  // We could update it, but for simplicity let's just skip
                  console.log(`Product SKU ${sku} already exists, skipping.`);
                  continue;
               }
            }

            await prisma.product.create({
              data: {
                name: row.Name,
                slug,
                description: row.Description || null,
                excerpt: row['Short description'] || null,
                price,
                salePrice,
                sku,
                stockStatus: row['In stock?'] === '1' ? 'instock' : 'outofstock',
                quantity,
              }
            });
            count++;
          } catch (e: any) {
            console.error(`✗ Failed to insert product ${row.Name}:`, e.message);
          }
        }
        console.log(`✓ Successfully migrated ${count} products.`);
        resolve(true);
      })
      .on('error', reject);
  });
}

async function migrateUsers() {
  console.log('Starting user migration from SQL dump...');
  if (!fs.existsSync(SQL_FILE)) {
    console.warn(`[WARN] SQL file not found: ${SQL_FILE}`);
    return;
  }
  
  const fileStream = fs.createReadStream(SQL_FILE);
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });

  let count = 0;
  // Regex to extract values from INSERT INTO `wpqr_users` (...) VALUES (...)
  const insertRegex = /INSERT INTO `wpqr_users`.*VALUES/;
  const valuesRegex = /^\((\d+),\s*'(.*?)',\s*'(.*?)',\s*'(.*?)',\s*'(.*?)',\s*'(.*?)',\s*'(.*?)',\s*'(.*?)',\s*(\d+),\s*'(.*?)'\)[,;]/;
  
  let inUsersInsert = false;

  for await (const line of rl) {
    if (insertRegex.test(line)) {
      inUsersInsert = true;
      continue; 
    }
    
    if (inUsersInsert) {
      if (line.trim() === '' || line.startsWith('--')) {
         continue; 
      }
      if (line.startsWith('INSERT INTO')) {
         inUsersInsert = insertRegex.test(line);
         continue;
      }
      
      const match = line.match(valuesRegex);
      if (match) {
        const [, id, login, pass, nicename, email, url, registered, activation, status, display_name] = match;
        
        try {
          // Verify if user already exists
          const existingUser = await prisma.user.findUnique({
             where: { email }
          });

          if (!existingUser) {
             await prisma.user.create({
               data: {
                 email: email,
                 password: pass,
                 name: display_name || login,
                 createdAt: new Date(registered as string)
               }
             });
             count++;
          }
        } catch (e: any) {
          console.error(`✗ Failed to insert user ${email}:`, e.message);
        }
      } else {
        if (!line.startsWith('(')) {
            inUsersInsert = false;
        }
      }
    }
  }
  console.log(`✓ Successfully migrated ${count} users.`);
}

async function main() {
  await migrateProducts();
  await migrateUsers();
  console.log('Migration complete!');
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
