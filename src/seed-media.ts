import prisma from './config/prisma';

async function seedMedia() {
  await prisma.mediaFile.create({
    data: {
      name: 'Sample Image.jpg',
      type: 'image',
      folder: 'Uncategorized',
      size: 102400,
      url: 'http://localhost:5000/api/v1/media/view?key=Uncategorized/sample.jpg',
      key: 'Uncategorized/sample.jpg'
    }
  });
  console.log("Seeded sample media file.");
  process.exit(0);
}

seedMedia().catch(console.error);
