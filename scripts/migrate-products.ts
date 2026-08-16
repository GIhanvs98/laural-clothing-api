import { PrismaClient } from '@prisma/client';
import * as mysql from 'mysql2/promise';
import { v2 as cloudinary } from 'cloudinary';
import * as fs from 'fs';
import * as path from 'path';

// --- CONFIGURATION ---
// 1. Prisma uses the DATABASE_URL in .env (PostgreSQL)
const prisma = new PrismaClient();

// 2. Local MySQL Connection (Old WordPress DB)
const MYSQL_CONFIG = {
  host: 'localhost',
  user: 'root',
  password: '', // Update if your local MySQL has a password
  database: 'lauralclothing', // Update to match the name of the DB you imported
};

// 3. Cloudinary Config (Must be set in .env)
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || '',
  api_key: process.env.CLOUDINARY_API_KEY || '',
  api_secret: process.env.CLOUDINARY_API_SECRET || '',
});

// 4. Local Images Directory
const LOCAL_IMAGES_DIR = '/Volumes/240GB SSD/Projects/Laural-Clothing/Laural-Clothing_images';

// --- HELPER TO UPLOAD LOCAL IMAGE ---
async function uploadLocalImage(filename: string): Promise<string | null> {
  const filePath = path.join(LOCAL_IMAGES_DIR, filename);
  
  if (!fs.existsSync(filePath)) {
    console.warn(`[WARN] Local image not found: ${filename}`);
    return null;
  }

  try {
    const result = await cloudinary.uploader.upload(filePath, {
      folder: 'laural_clothing_products',
      use_filename: true,
      unique_filename: false,
    });
    return result.secure_url;
  } catch (error) {
    console.error(`[ERROR] Failed to upload ${filename} to Cloudinary:`, error);
    return null;
  }
}

// --- MIGRATION SCRIPT ---
async function main() {
  console.log('Connecting to old MySQL database...');
  const connection = await mysql.createConnection(MYSQL_CONFIG);

  // Example Query to fetch products and price from WP
  const [rows] = await connection.query<mysql.RowDataPacket[]>(`
    SELECT 
      p.ID, 
      p.post_title as name, 
      p.post_name as slug, 
      p.post_content as description, 
      p.post_excerpt as excerpt,
      MAX(CASE WHEN pm.meta_key = '_price' THEN pm.meta_value END) as price,
      MAX(CASE WHEN pm.meta_key = '_sku' THEN pm.meta_value END) as sku,
      MAX(CASE WHEN pm.meta_key = '_stock_status' THEN pm.meta_value END) as stockStatus,
      MAX(CASE WHEN pm.meta_key = '_stock' THEN pm.meta_value END) as stockQuantity
    FROM wpqr_posts p
    LEFT JOIN wpqr_postmeta pm ON p.ID = pm.post_id
    WHERE p.post_type = 'product' AND p.post_status = 'publish'
    GROUP BY p.ID
  `);

  console.log(`Found ${rows.length} products to migrate. Starting processing...`);

  for (const row of rows) {
    console.log(`Migrating: ${row.name}`);

    // Here you would implement mapping the specific WP image filenames
    // For this example, we'll assume the sku matches a local image filename if it exists
    let featuredImageUrl = null;
    if (row.sku) {
      // Adjust this logic based on how your local image filenames map to products
      const possibleFilename = `${row.sku}.jpg`; 
      console.log(`Attempting to upload ${possibleFilename}...`);
      featuredImageUrl = await uploadLocalImage(possibleFilename) || null;
    }

    // Insert into Prisma
    try {
      await prisma.product.create({
        data: {
          name: row.name,
          slug: row.slug || `product-${row.ID}`,
          description: row.description,
          excerpt: row.excerpt,
          price: parseFloat(row.price || '0'),
          sku: row.sku || null,
          stockStatus: row.stockStatus || 'instock',
          quantity: parseInt(row.stockQuantity || '0', 10),
          featuredImage: featuredImageUrl,
        }
      });
      console.log(`✓ Successfully migrated ${row.name}`);
    } catch (e) {
      console.error(`✗ Failed to migrate ${row.name}:`, e);
    }
  }

  await connection.end();
  console.log('Migration complete!');
}

main()
  .catch((e) => {
    console.error('Migration failed:', e);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
