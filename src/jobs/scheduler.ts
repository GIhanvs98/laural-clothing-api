import cron from 'node-cron';
import { auditDigestService } from '../services/auditDigest.service';
import { logger } from '../utils/logger';

/**
 * Registers all recurring background jobs.
 * Call once on server startup from index.ts.
 */
export function registerScheduledJobs() {
  // Weekly security audit digest — every Monday at 08:00 UTC
  // Cron: "0 8 * * 1" = minute=0, hour=8, any day-of-month, any month, Monday
  cron.schedule('0 8 * * 1', async () => {
    logger.info('[Scheduler] Running weekly security audit log digest...');
    await auditDigestService.generateWeeklyDigest();
  }, {
    timezone: 'UTC',
  });

  logger.info('[Scheduler] Registered jobs: [weekly-audit-digest @ Monday 08:00 UTC]');
}
