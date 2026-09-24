import { exec, spawn } from "child_process";
import fs from "fs";
import path from "path";
import util from "util";
import { logger } from "../utils/logger";

const execPromise = util.promisify(exec);

/**
 * Runs GPG symmetric encryption using a pipe for the passphrase.
 * This avoids exposing the passphrase in the process list (ps aux would show it otherwise).
 */
function gpgEncrypt(passphrase: string, inputPath: string, outputPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const gpg = spawn('gpg', [
      '--batch',
      '--yes',
      '--passphrase-fd', '0',     // read passphrase from stdin
      '--symmetric',
      '--cipher-algo', 'AES256',
      '--output', outputPath,
      inputPath,
    ]);

    gpg.stdin.write(passphrase);
    gpg.stdin.end();

    let stderr = '';
    gpg.stderr.on('data', (data) => { stderr += data.toString(); });

    gpg.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`GPG exited with code ${code}: ${stderr}`));
      }
    });
  });
}

async function sendSlackAlert(message: string) {
  const webhookUrl = process.env.SLACK_WEBHOOK_URL;
  if (!webhookUrl) return;
  try {
    await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: message }),
    });
  } catch { /* non-critical */ }
}

export const dbBackupService = {
  async runEncryptedBackup(): Promise<void> {
    logger.info("[DBBackup] Starting encrypted database backup...");
    
    const dbUrl = process.env.DATABASE_URL;
    const gpgKey = process.env.BACKUP_ENCRYPTION_KEY;
    const bucketName = process.env.AWS_S3_BUCKET_NAME;
    
    if (!dbUrl || !gpgKey || !bucketName) {
      const msg = "[DBBackup] Missing required environment variables: DATABASE_URL, BACKUP_ENCRYPTION_KEY, AWS_S3_BUCKET_NAME";
      logger.error(msg);
      await sendSlackAlert(`🔴 *DB Backup FAILED* — ${msg}`);
      return;
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFileName = `db-backup-${timestamp}.sql`;
    const encryptedFileName = `${backupFileName}.gpg`;
    const backupFilePath = path.join("/tmp", backupFileName);
    const encryptedFilePath = path.join("/tmp", encryptedFileName);

    try {
      // 1. pg_dump — dumps to plaintext SQL
      logger.info(`[DBBackup] Running pg_dump to ${backupFilePath}`);
      await execPromise(`pg_dump "${dbUrl}" > ${backupFilePath}`);
      
      // Verify dump file was created and is non-empty
      const stats = fs.statSync(backupFilePath);
      if (stats.size === 0) {
        throw new Error("pg_dump produced an empty file — aborting backup.");
      }
      logger.info(`[DBBackup] pg_dump complete: ${stats.size} bytes`);

      // 2. GPG symmetric encryption (AES-256, passphrase via stdin to avoid CLI exposure)
      logger.info(`[DBBackup] Encrypting backup...`);
      await gpgEncrypt(gpgKey, backupFilePath, encryptedFilePath);
      logger.info(`[DBBackup] Encryption complete: ${encryptedFilePath}`);

      // 3. Move to local storage directory instead of S3
      logger.info(`[DBBackup] Storing backup locally`);
      const backupDir = path.resolve(process.cwd(), process.env.STORAGE_PATH || 'uploads', 'backups');
      if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir, { recursive: true });
      }
      const destPath = path.join(backupDir, encryptedFileName);
      fs.copyFileSync(encryptedFilePath, destPath);
      
      const successMsg = `✅ *DB Backup Success* — \`${encryptedFileName}\` saved locally at ${new Date().toUTCString()}`;
      logger.info(`[DBBackup] ${successMsg}`);
      await sendSlackAlert(successMsg);
    } catch (error: any) {
      const errMsg = `🔴 *DB Backup FAILED* — ${error?.message || 'Unknown error'} at ${new Date().toUTCString()}`;
      logger.error("[DBBackup] Backup process failed:", error);
      await sendSlackAlert(errMsg);
    } finally {
      // Always clean up plaintext and encrypted temp files
      try { if (fs.existsSync(backupFilePath)) fs.unlinkSync(backupFilePath); } catch { /* noop */ }
      try { if (fs.existsSync(encryptedFilePath)) fs.unlinkSync(encryptedFilePath); } catch { /* noop */ }
    }
  }
};
