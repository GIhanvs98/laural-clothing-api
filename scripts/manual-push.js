require('dotenv').config();
const { Client } = require('pg');

const sql = `
BEGIN;

-- Rename old table and indices
ALTER TABLE "Product" RENAME TO "LegacyProduct";
ALTER INDEX IF EXISTS "Product_pkey" RENAME TO "LegacyProduct_pkey";
ALTER INDEX IF EXISTS "Product_slug_key" RENAME TO "LegacyProduct_slug_key";
ALTER INDEX IF EXISTS "Product_sku_key" RENAME TO "LegacyProduct_sku_key";

-- Create new Product table
CREATE TABLE "Product" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "excerpt" TEXT,
    "categoryId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Product_slug_key" ON "Product"("slug");

-- Create new ProductVariant table
CREATE TABLE "ProductVariant" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "name" TEXT,
    "sku" TEXT,
    "price" DOUBLE PRECISION NOT NULL,
    "salePrice" DOUBLE PRECISION,
    "stockStatus" TEXT NOT NULL DEFAULT 'instock',
    "quantity" INTEGER NOT NULL DEFAULT 0,
    "color" TEXT,
    "size" TEXT,
    "featuredImage" TEXT,
    "gallery" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductVariant_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ProductVariant_sku_key" ON "ProductVariant"("sku");

-- Add foreign keys
ALTER TABLE "Product" ADD CONSTRAINT "Product_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ProductVariant" ADD CONSTRAINT "ProductVariant_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

COMMIT;
`;

async function main() {
    const client = new Client({ connectionString: process.env.DATABASE_URL });
    await client.connect();
    
    try {
        console.log("Executing schema updates...");
        await client.query(sql);
        console.log("Schema updates executed successfully!");
    } catch (e) {
        console.error("Error executing schema update:", e);
    } finally {
        await client.end();
    }
}
main();
