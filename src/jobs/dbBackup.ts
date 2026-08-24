import { exec } from "child_process";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import fs from "fs";
import path from "path";
import util from "util";
import { logger } from "../utils/logger";

const execPromise = util.promisify(exec);

export const dbBackupService = {
  async runEncryptedBackup(): Promise<void> {
    logger.info("[DBBackup] Starting encrypted database backup...");
    
    const dbUrl = process.env.DATABASE_URL;
    const gpgKey = process.env.BACKUP_ENCRYPTION_KEY;
    const bucketName = process.env.AWS_S3_BUCKET_NAME;
    
    if (!dbUrl || !gpgKey || !bucketName) {
      logger.error("[DBBackup] Missing required environment variables: DATABASE_URL, BACKUP_ENCRYPTION_KEY, AWS_S3_BUCKET_NAME");
      return;
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFileName = `db-backup-${timestamp}.sql`;
    const encryptedFileName = `${backupFileName}.gpg`;
    const backupFilePath = path.join("/tmp", backupFileName);
    const encryptedFilePath = path.join("/tmp", encryptedFileName);

    try {
      // 1. pg_dump
      logger.info(`[DBBackup] Running pg_dump to ${backupFilePath}`);
      await execPromise(`pg_dump "${dbUrl}" > ${backupFilePath}`);

      // 2. Encrypt with GPG symmetric encryption
      logger.info(`[DBBackup] Encrypting backup to ${encryptedFilePath}`);
      await execPromise(`gpg --batch --yes --passphrase "${gpgKey}" -c -o ${encryptedFilePath} ${backupFilePath}`);

      // 3. Upload to S3
      logger.info(`[DBBackup] Uploading to S3 bucket ${bucketName}`);
      const s3Client = new S3Client({
        region: process.env.AWS_REGION || "ap-southeast-1",
        credentials: {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
        }
      });

      const fileStream = fs.createReadStream(encryptedFilePath);
      
      const uploadParams = {
        Bucket: bucketName,
        Key: `backups/${encryptedFileName}`,
        Body: fileStream,
        ServerSideEncryption: "AES256" // additional S3 SSE
      };

      await s3Client.send(new PutObjectCommand(uploadParams as any));
      
      logger.info(`[DBBackup] Encrypted backup successfully uploaded to S3: backups/${encryptedFileName}`);
    } catch (error) {
      logger.error("[DBBackup] Backup process failed:", error);
    } finally {
      // Clean up tmp files
      if (fs.existsSync(backupFilePath)) fs.unlinkSync(backupFilePath);
      if (fs.existsSync(encryptedFilePath)) fs.unlinkSync(encryptedFilePath);
    }
  }
};
