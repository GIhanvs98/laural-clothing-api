import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import * as dotenv from 'dotenv';
dotenv.config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const products = await prisma.productVariant.findFirst({
    where: { featuredImage: { not: null } },
  });
  console.log('ProductVariant with image:', products);
  
  const legacy = await prisma.legacyProduct.findFirst({
    where: { featuredImage: { not: null } },
  });
  console.log('LegacyProduct with image:', legacy);
}

main().finally(() => prisma.$disconnect());
