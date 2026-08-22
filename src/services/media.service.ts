import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { MediaFile } from "@prisma/client";
import prisma from '../config/prisma';
import { randomUUID } from "crypto";

const BUCKET_NAME = process.env.AWS_S3_BUCKET_NAME || "laural-media-bucket";

// Initialize S3 Client
// If the environment variables are not set, it will fallback to mock values to prevent crashing during local dev
const s3Client = new S3Client({
  region: process.env.AWS_REGION || "ap-southeast-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || "MOCK_ACCESS_KEY",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "MOCK_SECRET_KEY"
  }
});

export const mediaService = {
  /**
   * List all media files
   */
  async getMediaFiles(folder?: string): Promise<MediaFile[]> {
    const where = folder && folder !== 'All' ? { folder } : {};
    return prisma.mediaFile.findMany({
      where,
      orderBy: { createdAt: 'desc' }
    });
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
    
    const publicUrl = `https://${BUCKET_NAME}.s3.${process.env.AWS_REGION || 'ap-southeast-1'}.amazonaws.com/${key}`;

    return { url, key, publicUrl };
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
