import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  try {
    const id = "ac6bc2c1-8fef-4cc3-a40a-0bf6fd1bb3e5";
    
    // Attempt the exact update the frontend is trying to do
    const result = await prisma.product.update({
      where: { id },
      data: {
        name: "Test Update",
        sizeGuideEnabled: true,
        sizeGuideContent: "Test content",
        sizeGuideImageUrl: "http://example.com/image.jpg",
      },
    });
    console.log("Success:", result);
  } catch (error) {
    console.error("Prisma Error:", error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
