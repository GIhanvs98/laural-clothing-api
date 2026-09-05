import prisma from './src/config/prisma';
async function run() {
  const v = await prisma.productVariant.findFirst();
  console.log(v?.id);
  process.exit(0);
}
run();
