import { PrismaClient } from '@prisma/client';
import * as mysql from 'mysql2/promise';

// Config
const prisma = new PrismaClient();
const MYSQL_CONFIG = {
  host: 'localhost',
  user: 'root',
  password: '', // Update if your local MySQL has a password
  database: 'lauralclothing',
};

async function main() {
  console.log('Connecting to old MySQL database...');
  let connection;
  try {
    connection = await mysql.createConnection(MYSQL_CONFIG);
  } catch (err: any) {
    console.error('❌ Failed to connect to MySQL. Ensure your local WP database is running on port 3306.');
    console.error(err.message);
    process.exit(1);
  }

  // Get the Ganemulla branch
  const branch = await prisma.branch.findUnique({
    where: { code: 'GAN-MAIN' }
  });

  if (!branch) {
    console.error('❌ Ganemulla Main Store (GAN-MAIN) branch not found in DB!');
    process.exit(1);
  }

  console.log('Querying WordPress database for _stock...');
  
  // Query to get SKU and Stock from WordPress postmeta
  // (Assuming products and variations use _sku and _stock)
  const [rows] = await connection.query<mysql.RowDataPacket[]>(`
    SELECT 
      MAX(CASE WHEN pm.meta_key = '_sku' THEN pm.meta_value END) as sku,
      MAX(CASE WHEN pm.meta_key = '_stock' THEN pm.meta_value END) as stockQuantity,
      MAX(CASE WHEN pm.meta_key = '_stock_status' THEN pm.meta_value END) as stockStatus
    FROM wpqr_posts p
    JOIN wpqr_postmeta pm ON p.ID = pm.post_id
    WHERE pm.meta_key IN ('_sku', '_stock', '_stock_status')
    GROUP BY p.ID
    HAVING sku IS NOT NULL
  `);

  console.log(`Fetched ${rows.length} records with SKUs from WordPress. Updating Ganemulla stock...`);

  let updatedCount = 0;
  let notFoundCount = 0;

  for (const row of rows) {
    if (!row.sku) continue;
    
    // Find matching product variant in PostgreSQL
    const variant = await prisma.productVariant.findUnique({
      where: { sku: row.sku }
    });

    if (variant) {
      const parsedStock = parseInt(row.stockQuantity || '0', 10);
      const stock = isNaN(parsedStock) ? 0 : parsedStock;
      
      // Update or create inventory item specifically for Ganemulla branch
      await prisma.inventoryItem.upsert({
        where: {
          variantId_branchId: {
            variantId: variant.id,
            branchId: branch.id
          }
        },
        update: {
          quantity: stock
        },
        create: {
          variantId: variant.id,
          branchId: branch.id,
          quantity: stock,
          lowStockThreshold: 10,
          reservedQty: 0
        }
      });

      updatedCount++;
    } else {
      notFoundCount++;
    }
  }

  console.log(`✅ Successfully synced true stock for ${updatedCount} variants!`);
  if (notFoundCount > 0) {
    console.warn(`⚠️ ${notFoundCount} SKUs from WordPress were not found in the new database (ignored).`);
  }
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
