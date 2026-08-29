import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { MediaFile } from "@prisma/client";
import prisma from '../config/prisma';
import { randomUUID } from "crypto";
import { productService } from "./product.service";

const BUCKET_NAME = process.env.AWS_S3_BUCKET_NAME || "laural-media-bucket";

// Initialize S3 Client
// If the environment variables are not set, it will fallback to mock values to prevent crashing during local dev
const s3Client = new S3Client({
  region: process.env.AWS_S3_REGION || "auto",
  endpoint: process.env.AWS_S3_ENDPOINT,
  credentials: {
    accessKeyId: process.env.AWS_S3_ACCESS_KEY_ID || "MOCK_ACCESS_KEY",
    secretAccessKey: process.env.AWS_S3_SECRET_ACCESS_KEY || "MOCK_SECRET_KEY"
  }
});

export const mediaService = {
  async getMediaFiles(folder?: string, page: number = 1, limit: number = 20): Promise<{ data: any[], total: number, page: number, totalPages: number }> {
    const skip = (page - 1) * limit;
    
    // Total count of product images
    let productImagesCount = 0;
    if (!folder || folder === 'All' || folder === 'Products') {
      const countQuery = `
        SELECT count(*) as total
        FROM (
          SELECT "featuredImage" as url FROM "ProductVariant" WHERE "featuredImage" IS NOT NULL
          UNION
          SELECT unnest("gallery") as url FROM "ProductVariant" WHERE "gallery" IS NOT NULL AND array_length("gallery", 1) > 0
        ) as images
      `;
      const res: any = await prisma.$queryRawUnsafe(countQuery);
      productImagesCount = Number(res[0]?.total || 0);
    }

    // Total count of MediaFile
    const where = folder && folder !== 'All' && folder !== 'Products' ? { folder } : {};
    const mediaFileCount = await prisma.mediaFile.count({ where });

    const totalCombined = productImagesCount + mediaFileCount;

    // Fetch paginated using raw SQL for products
    let flatImages: any[] = [];
    
    if (!folder || folder === 'All' || folder === 'Products') {
      const dataQuery = `
        SELECT url, 'Products' as folder, 153600 as size
        FROM (
          SELECT "featuredImage" as url FROM "ProductVariant" WHERE "featuredImage" IS NOT NULL
          UNION
          SELECT unnest("gallery") as url FROM "ProductVariant" WHERE "gallery" IS NOT NULL AND array_length("gallery", 1) > 0
        ) as images
        ORDER BY url
        LIMIT ${limit} OFFSET ${skip};
      `;
      const rawImages: any[] = await prisma.$queryRawUnsafe(dataQuery);
      
      const { signImageUrl } = require('./product.service');
      
      flatImages = await Promise.all(rawImages.map(async (img, idx) => {
        const signedUrl = await signImageUrl(img.url);
        const nameParts = img.url.split('/');
        const rawName = nameParts[nameParts.length - 1] || `Product Image ${idx}`;
        return {
          id: `prod-img-${skip + idx}`,
          name: rawName,
          type: 'image',
          folder: 'Products',
          size: 153600,
          url: signedUrl,
          key: img.url,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          usedIn: ['Products']
        };
      }));
    }

    // Fill remaining limit from MediaFile if needed
    const remainingLimit = limit - flatImages.length;
    if (remainingLimit > 0 && (!folder || folder !== 'Products')) {
      const mediaSkip = Math.max(0, skip - productImagesCount);
      const dbMedia = await prisma.mediaFile.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: mediaSkip,
        take: remainingLimit,
      });
      flatImages.push(...dbMedia);
    }

    return {
      data: flatImages,
      total: totalCombined,
      page,
      totalPages: Math.ceil(totalCombined / limit)
    };
  },

  /**
   * Generate a Presigned URL for frontend upload
   */
  async generatePresignedUrl(filename: string, contentType: string, folder: string = "Uncategorized"): Promise<{ url: string, key: string, publicUrl: string }> {
    const fileExtension = filename.split('.').pop();
    const uniqueId = randomUUID();
    const key = `${folder}/${uniqueId}.${fileExtension}`;

    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
      ContentType: contentType,
      // ACL: 'public-read' // Only if bucket supports ACLs
    });

    // URL expires in 5 minutes
    const url = await getSignedUrl(s3Client, command, { expiresIn: 300 });
    
    // Use an internal proxy route instead of exposing the bucket URL
    const baseUrl = process.env.API_BASE_URL || "http://localhost:5000";
    const publicUrl = `${baseUrl}/api/v1/media/view?key=${encodeURIComponent(key)}`;

    return { url, key, publicUrl };
  },

  /**
   * Generate a temporary Read-Only Presigned URL for viewing assets
   */
  async getPresignedReadUrl(key: string): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
    });

    // Valid for 5 minutes
    return getSignedUrl(s3Client, command, { expiresIn: 300 });
  },

  /**
   * Confirm upload and save to Database
   */
  async createMediaRecord(data: {
    name: string;
    type: string;
    folder: string;
    size: number;
    dimensions?: string;
    url: string;
    key: string;
  }): Promise<MediaFile> {
    return prisma.mediaFile.create({
      data
    });
  },

  /**
   * Delete media file
   */
  async deleteMediaFile(id: string): Promise<void> {
    const media = await prisma.mediaFile.findUnique({ where: { id } });
    if (!media) throw new Error("Media file not found");

    // Attempt to delete from S3
    try {
      const command = new DeleteObjectCommand({
        Bucket: BUCKET_NAME,
        Key: media.key
      });
      await s3Client.send(command);
    } catch (error) {
      console.warn("Failed to delete from S3, continuing with DB deletion:", error);
    }

    // Delete from DB
    await prisma.mediaFile.delete({ where: { id } });
  }
};
