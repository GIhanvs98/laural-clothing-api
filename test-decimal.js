const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function test() {
  const dec = new (require('@prisma/client').Prisma.Decimal)(10.5);
  console.log(JSON.stringify(dec));
}
test().catch(console.error);
