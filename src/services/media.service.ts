import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand, ListObjectsV2Command } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { MediaFile } from "@prisma/client";
import prisma from '../config/prisma';
import { randomUUID } from "crypto";

const BUCKET_NAME = process.env.AWS_S3_BUCKET_NAME || "laural-media-bucket";

// Initialize S3 Client
// If the environment variables are not set, it will fallback to mock values to prevent crashing during local dev
const s3Client = new S3Client({
  region: process.env.AWS_S3_REGION || process.env.AWS_REGION || "ap-southeast-1",
  endpoint: process.env.AWS_S3_ENDPOINT || undefined,
  credentials: {
    accessKeyId: process.env.AWS_S3_ACCESS_KEY_ID || process.env.AWS_ACCESS_KEY_ID || "MOCK_ACCESS_KEY",
    secretAccessKey: process.env.AWS_S3_SECRET_ACCESS_KEY || process.env.AWS_SECRET_ACCESS_KEY || "MOCK_SECRET_KEY"
  },
  forcePathStyle: true,
});

export const mediaService = {
  /**
   * List all media files
   */
  async getMediaFiles(folder?: string, page: number = 1, limit: number = 20): Promise<{ data: MediaFile[], total: number, page: number, totalPages: number }> {
    const where = folder && folder !== 'All' ? { folder } : {};
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      prisma.mediaFile.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit
      }),
      prisma.mediaFile.count({ where })
    ]);
    
    return {
      data,
      total,
      page,
      totalPages: Math.ceil(total / limit)
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
    
    // Use a relative path so the frontend's rewrites handle routing to the correct API base
    const publicUrl = `/api/v1/media/view?key=${encodeURIComponent(key)}`;

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
  },

  /**
   * Sync from S3 Bucket
   * Pulls all files from the S3 bucket and registers them in the database if missing
   */
  async syncS3Files(): Promise<{ added: number }> {
    let continuationToken: string | undefined = undefined;
    let addedCount = 0;

    do {
      const command: any = new ListObjectsV2Command({
        Bucket: BUCKET_NAME,
        ContinuationToken: continuationToken,
      });

      const response: any = await s3Client.send(command);

      if (response.Contents) {
        const keys = response.Contents.map((item: any) => item.Key).filter(Boolean);
        if (keys.length > 0) {
          // Check if files already exist in DB
          const existingFiles = await prisma.mediaFile.findMany({
            where: { key: { in: keys } },
            select: { key: true }
          });
          const existingKeys = new Set(existingFiles.map(f => f.key));

          const newItems = response.Contents.filter((item: any) => item.Key && !existingKeys.has(item.Key));

          if (newItems.length > 0) {
            const createData = newItems.map((item: any) => {
              const parts = item.Key.split('/');
              const filename = parts.pop() || item.Key;
              const folder = parts.length > 0 ? parts.join('/') : 'Uncategorized';
              
              const ext = filename.split('.').pop()?.toLowerCase();
              let type = 'image/jpeg';
              if (ext === 'png') type = 'image/png';
              if (ext === 'webp') type = 'image/webp';
              if (ext === 'svg') type = 'image/svg+xml';
              if (ext === 'mp4') type = 'video/mp4';

              const publicUrl = `/api/v1/media/view?key=${encodeURIComponent(item.Key)}`;

              return {
                name: filename,
                type,
                folder,
                size: item.Size || 0,
                url: publicUrl,
                key: item.Key
              };
            });

            await prisma.mediaFile.createMany({
              data: createData,
              skipDuplicates: true
            });

            addedCount += newItems.length;
          }
        }
      }
      continuationToken = response.NextContinuationToken;
    } while (continuationToken);

    return { added: addedCount };
  }
};
