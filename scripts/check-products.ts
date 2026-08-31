import prisma from '../src/config/prisma';

async function run() {
  const products = await prisma.product.findMany({ take: 3, select: { id: true, name: true, images: true } });
  console.log(JSON.stringify(products, null, 2));
}

run()
  .catch(e => {
    console.error(e);
    process.exit(1);
  });
