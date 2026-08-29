import prisma from './config/prisma';

async function checkMedia() {
  const files = await prisma.mediaFile.findMany();
  console.log(`Found ${files.length} files in DB:`);
  console.log(files);
  process.exit(0);
}

checkMedia().catch(console.error);
