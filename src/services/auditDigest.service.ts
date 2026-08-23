import prisma from '../config/prisma';
import { alertService } from './alert.service';
import { logger } from '../utils/logger';

/**
 * Weekly Security Audit Log Digest
 *
 * Generates a human-readable summary of the past 7 days of audit log activity
 * and sends it as a Slack/webhook alert. Designed to be run on a weekly cron.
 */
export const auditDigestService = {
  async generateWeeklyDigest(): Promise<void> {
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    logger.info('[AuditDigest] Generating weekly security audit digest...');

    try {
      // 1. Total events in last 7 days
      const totalEvents = await prisma.auditLog.count({
        where: { createdAt: { gte: weekAgo } },
      });

      // 2. Breakdown by action type
      const byAction = await prisma.auditLog.groupBy({
        by: ['action'],
        where: { createdAt: { gte: weekAgo } },
        _count: { action: true },
        orderBy: { _count: { action: 'desc' } },
      });

      // 3. Breakdown by entity type
      const byEntity = await prisma.auditLog.groupBy({
        by: ['entity'],
        where: { createdAt: { gte: weekAgo } },
        _count: { entity: true },
        orderBy: { _count: { entity: 'desc' } },
      });

      // 4. Most active users (top 5 by audit event count)
      const byUser = await prisma.auditLog.groupBy({
        by: ['userId'],
        where: { createdAt: { gte: weekAgo }, userId: { not: null } },
        _count: { userId: true },
        orderBy: { _count: { userId: 'desc' } },
        take: 5,
      });

      // 5. DELETE operations — always high-risk, list them all
      const deleteEvents = await prisma.auditLog.findMany({
        where: { action: 'DELETE', createdAt: { gte: weekAgo } },
        select: { entity: true, entityId: true, userId: true, ipAddress: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
        take: 50,
      });

      // 6. Unique IPs that triggered audit events
      const uniqueIps = await prisma.auditLog.groupBy({
        by: ['ipAddress'],
        where: { createdAt: { gte: weekAgo } },
        _count: { ipAddress: true },
        orderBy: { _count: { ipAddress: 'desc' } },
        take: 10,
      });

      // Format the digest message
      const actionSummary = byAction
        .map(a => `  • ${a.action}: ${a._count.action}`)
        .join('\n');

      const entitySummary = byEntity.slice(0, 8)
        .map(e => `  • ${e.entity}: ${e._count.entity}`)
        .join('\n');

      const deleteSummary = deleteEvents.length === 0
        ? '  None ✅'
        : deleteEvents.map(d =>
            `  • [${d.entity}] ID:${d.entityId || 'n/a'} by User:${d.userId || 'anon'} from ${d.ipAddress} at ${d.createdAt.toISOString()}`
          ).join('\n');

      const ipSummary = uniqueIps
        .map(i => `  • ${i.ipAddress}: ${i._count.ipAddress} events`)
        .join('\n');

      const webhookUrl = process.env.SLACK_WEBHOOK_URL;
      if (!webhookUrl) {
        logger.warn('[AuditDigest] SLACK_WEBHOOK_URL not configured — printing digest to logs only');
        logger.info(`[AuditDigest] Weekly Digest:\n${JSON.stringify({
          totalEvents, byAction, byEntity, byUser, deleteEvents, uniqueIps
        }, null, 2)}`);
        return;
      }

      const message = [
        `📊 *Weekly Security Audit Digest* — ${weekAgo.toDateString()} → ${now.toDateString()}`,
        ``,
        `*Total Audit Events:* ${totalEvents}`,
        ``,
        `*Events by Action:*`,
        actionSummary || '  None',
        ``,
        `*Events by Entity (top 8):*`,
        entitySummary || '  None',
        ``,
        `⚠️ *DELETE Operations (${deleteEvents.length}):*`,
        deleteSummary,
        ``,
        `*Top IPs by Activity:*`,
        ipSummary || '  None',
        ``,
        `_This is an automated weekly digest. Review any unexpected DELETEs immediately._`,
      ].join('\n');

      await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: message }),
      });

      logger.info(`[AuditDigest] Weekly digest sent successfully. Total events: ${totalEvents}`);
    } catch (error) {
      logger.error('[AuditDigest] Failed to generate or send weekly digest', error);
    }
  },
};
