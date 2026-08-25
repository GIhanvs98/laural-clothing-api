const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const start = Date.now();
  const products = await prisma.product.count();
  const variants = await prisma.productVariant.count();
  console.log(`Products: ${products}, Variants: ${variants}`);
  console.log(`Time: ${Date.now() - start}ms`);
}
main().finally(() => prisma.$disconnect());
