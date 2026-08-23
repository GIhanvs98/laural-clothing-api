import prisma from '../src/config/prisma';

async function migrate() {
  const baseUrl = process.env.API_BASE_URL || "http://localhost:5000";
  console.log(`Starting S3 URL migration to proxy format: ${baseUrl}/api/v1/media/view?key=...`);

  // 1. Migrate MediaFiles
  const mediaFiles = await prisma.mediaFile.findMany({
    where: { url: { startsWith: 'https://' } }
  });

  let mediaCount = 0;
  for (const media of mediaFiles) {
    if (media.url.includes('.amazonaws.com/')) {
      const newUrl = `${baseUrl}/api/v1/media/view?key=${encodeURIComponent(media.key)}`;
      await prisma.mediaFile.update({
        where: { id: media.id },
        data: { url: newUrl }
      });
      mediaCount++;
    }
  }

  // Products don't have direct imageUrl in schema, they use relationships to MediaFile.
  // Their image URLs are derived or stored elsewhere, or perhaps they use the MediaFile url directly.


  // 3. Migrate Collections
  const collections = await prisma.collection.findMany({
    where: { imageUrl: { startsWith: 'https://' } }
  });

  let collectionCount = 0;
  for (const collection of collections) {
    if (collection.imageUrl && collection.imageUrl.includes('.amazonaws.com/')) {
      const keyStr = collection.imageUrl.split('.amazonaws.com/')[1];
      if (keyStr) {
        const newUrl = `${baseUrl}/api/v1/media/view?key=${encodeURIComponent(keyStr)}`;
        await prisma.collection.update({
          where: { id: collection.id },
          data: { imageUrl: newUrl }
        });
        collectionCount++;
      }
    }
  }

  console.log(`Migration Complete!`);
  console.log(`Updated MediaFiles: ${mediaCount}`);
  console.log(`Updated Collections: ${collectionCount}`);
}

migrate()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
