const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function run() {
  const p = await prisma.product.findFirst({ where: { name: { contains: 'Retro Bag' } }, include: { variants: true } });
  console.log(JSON.stringify(p, null, 2));
}
run();
