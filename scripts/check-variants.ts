import prisma from '../src/config/prisma';

async function run() {
  const variants = await prisma.productVariant.findMany({ 
    where: { featuredImage: { not: null } },
    take: 3, 
    select: { id: true, featuredImage: true, gallery: true } 
  });
  console.log(JSON.stringify(variants, null, 2));
}

run()
  .catch(e => {
    console.error(e);
    process.exit(1);
  });
