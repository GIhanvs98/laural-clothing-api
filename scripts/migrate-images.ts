import * as fs from 'fs';
import * as path from 'path';
import csv from 'csv-parser';
import * as dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import mime from 'mime-types';

dotenv.config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const s3Client = new S3Client({
  region: process.env.AWS_S3_REGION || 'auto',
  endpoint: process.env.AWS_S3_ENDPOINT,
  credentials: {
    accessKeyId: process.env.AWS_S3_ACCESS_KEY_ID as string,
    secretAccessKey: process.env.AWS_S3_SECRET_ACCESS_KEY as string,
  },
  forcePathStyle: true,
});

const BUCKET_NAME = process.env.AWS_S3_BUCKET_NAME as string;
const DB_DIR = path.join(__dirname, '../databaseOLD');
const CSV_FILE = path.join(DB_DIR, 'wc-product-export-9-8-2026-1786290310470.csv');

async function downloadImage(url: string): Promise<Buffer | null> {
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Failed to fetch ${url}: ${response.statusText}`);
    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  } catch (err: any) {
    console.error(`✗ Error downloading ${url}:`, err.message);
    return null;
  }
}

async function uploadToS3(buffer: Buffer, originalUrl: string): Promise<string | null> {
  try {
    const urlObj = new URL(originalUrl);
    const basename = path.basename(urlObj.pathname) || `image-${Date.now()}.jpg`;
    
    const key = `products/${Date.now()}-${basename}`;
    const contentType = mime.lookup(basename) || 'application/octet-stream';

    await s3Client.send(new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
      Body: buffer,
      ContentType: contentType,
    }));

    const publicUrl = `${process.env.AWS_S3_ENDPOINT}/${BUCKET_NAME}/${key}`;
    return publicUrl;
  } catch (err: any) {
    console.error(`✗ Error uploading to S3:`, err.message);
    return null;
  }
}

async function main() {
  console.log('Starting image migration to S3...');
  const products: any[] = [];
  
  await new Promise<void>((resolve, reject) => {
    fs.createReadStream(CSV_FILE)
      .pipe(csv())
      .on('data', (data) => products.push(data))
      .on('end', () => resolve())
      .on('error', reject);
  });

  console.log(`Found ${products.length} products to check for images.`);
  
  let successCount = 0;
  let skippedCount = 0;

  for (const row of products) {
    if (!row.Name || !row.Images) {
      skippedCount++;
      continue;
    }

    const imageUrls: string[] = row.Images.split(',').map((u: string) => u.trim()).filter((u: string) => u);
    if (imageUrls.length === 0) {
      skippedCount++;
      continue;
    }

    const sku = row.SKU || null;
    let productRecord = null;
    if (sku) {
      productRecord = await prisma.product.findUnique({ where: { sku } });
    }
    
    if (!productRecord) {
      productRecord = await prisma.product.findFirst({ where: { name: row.Name } });
    }

    if (!productRecord) {
      skippedCount++;
      continue;
    }

    if (productRecord.featuredImage) {
      skippedCount++;
      continue;
    }

    console.log(`Processing ${imageUrls.length} images for "${row.Name}"...`);
    const s3Urls: string[] = [];

    for (const remoteUrl of imageUrls) {
      const buffer = await downloadImage(remoteUrl);
      if (buffer) {
        const s3Url = await uploadToS3(buffer, remoteUrl);
        if (s3Url) {
          s3Urls.push(s3Url);
        }
      }
    }

    if (s3Urls.length > 0) {
      const featuredImage = s3Urls[0];
      const gallery = s3Urls.slice(1);

      await prisma.product.update({
        where: { id: productRecord.id },
        data: {
          featuredImage,
          gallery
        }
      });
      console.log(`✓ Updated "${row.Name}" with ${s3Urls.length} images.`);
      successCount++;
    } else {
      console.log(`✗ Failed to process any images for "${row.Name}".`);
      skippedCount++;
    }
  }

  console.log(`Migration complete! Successfully added images for ${successCount} products. Skipped ${skippedCount} products.`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
