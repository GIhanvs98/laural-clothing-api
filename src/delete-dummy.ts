import prisma from './config/prisma';

async function deleteSeed() {
  await prisma.mediaFile.deleteMany({
    where: { key: 'Uncategorized/sample.jpg' }
  });
  console.log("Deleted sample dummy media file.");
  process.exit(0);
}

deleteSeed().catch(console.error);
