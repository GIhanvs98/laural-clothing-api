import prisma from '../src/config/prisma';

async function run() {
  console.log("Fixing media file URLs...");
  const mediaFiles = await prisma.mediaFile.findMany();
  let mediaUpdated = 0;
  for (const media of mediaFiles) {
    if (media.url.startsWith("http://localhost:5000")) {
      const newUrl = media.url.replace("http://localhost:5000", "");
      await prisma.mediaFile.update({
        where: { id: media.id },
        data: { url: newUrl }
      });
      mediaUpdated++;
    }
  }
  console.log(`Updated ${mediaUpdated} MediaFiles.`);

  console.log("Fixing Category URLs...");
  const categories = await prisma.category.findMany();
  let catUpdated = 0;
  for (const cat of categories) {
    if (cat.imageUrl && cat.imageUrl.startsWith("http://localhost:5000")) {
      const newUrl = cat.imageUrl.replace("http://localhost:5000", "");
      await prisma.category.update({
        where: { id: cat.id },
        data: { imageUrl: newUrl }
      });
      catUpdated++;
    }
  }
  console.log(`Updated ${catUpdated} Categories.`);

  console.log("Done.");
}

run()
  .catch(e => {
    console.error(e);
    process.exit(1);
  });
