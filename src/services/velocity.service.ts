import { redisClient } from '../config/redis';
import { alertService } from './alert.service';
import { logger } from '../utils/logger';

/**
 * Order Velocity Anomaly Detection
 *
 * Tracks order placement rate per phone, IP, and device fingerprint
 * within sliding time windows. Fires alerts when suspicious rates are detected.
 */

// Thresholds — tune for your business volume
const VELOCITY_WINDOWS = [
  { label: '1min',  seconds: 60,       limit: 2 },   // >2 orders in 1 min = suspicious
  { label: '5min',  seconds: 5 * 60,   limit: 4 },   // >4 orders in 5 min = high risk
  { label: '15min', seconds: 15 * 60,  limit: 6 },   // >6 orders in 15 min = block
];

const BLOCK_THRESHOLD_ORDERS = 6;   // order count that triggers an automatic block
const BLOCK_DURATION_SECONDS  = 30 * 60; // 30-minute block

export interface VelocityResult {
  blocked: boolean;
  reason?: string;
  windowCounts: Record<string, number>;
}

async function incrementAndCheck(key: string, windowSeconds: number): Promise<number> {
  const count = await redisClient.incr(key);
  if (count === 1) {
    await redisClient.expire(key, windowSeconds);
  }
  return count;
}

/**
 * Evaluates order velocity for a given phone, IP, and optional fingerprint.
 * Returns { blocked: true } if thresholds are exceeded and writes a block key.
 * Fires a Slack/webhook alert when anomaly is detected.
 */
export const velocityService = {
  async checkAndRecord(params: {
    phone: string;
    ip: string;
    fingerprint?: string;
    orderAmount?: number;
  }): Promise<VelocityResult> {
    const { phone, ip, fingerprint, orderAmount } = params;
    const windowCounts: Record<string, number> = {};
    let triggered = false;
    let triggerLabel = '';
    let triggerKey = '';

    // Check each window for phone-based velocity
    for (const window of VELOCITY_WINDOWS) {
      const key = `velocity:phone:${phone}:${window.label}`;
      const count = await incrementAndCheck(key, window.seconds);
      windowCounts[`phone_${window.label}`] = count;

      if (count > window.limit && !triggered) {
        triggered = true;
        triggerLabel = `Phone ${phone} placed ${count} orders in ${window.label}`;
        triggerKey   = key;
      }
    }

    // Check each window for IP-based velocity
    for (const window of VELOCITY_WINDOWS) {
      const key = `velocity:ip:${ip}:${window.label}`;
      const count = await incrementAndCheck(key, window.seconds);
      windowCounts[`ip_${window.label}`] = count;

      if (count > window.limit && !triggered) {
        triggered = true;
        triggerLabel = `IP ${ip} placed ${count} orders in ${window.label}`;
        triggerKey   = key;
      }
    }

    // Check fingerprint-based velocity (if provided)
    if (fingerprint) {
      for (const window of VELOCITY_WINDOWS) {
        const key = `velocity:fp:${fingerprint}:${window.label}`;
        const count = await incrementAndCheck(key, window.seconds);
        windowCounts[`fp_${window.label}`] = count;

        if (count > window.limit && !triggered) {
          triggered = true;
          triggerLabel = `Device fingerprint placed ${count} orders in ${window.label}`;
          triggerKey   = key;
        }
      }
    }

    if (triggered) {
      logger.warn('[VelocityDetector] Order velocity anomaly detected', {
        phone, ip, fingerprint, windowCounts, triggerLabel
      });

      // Determine if we should hard-block (only at highest threshold)
      const maxPhoneCount = windowCounts[`phone_15min`] || 0;
      const maxIpCount    = windowCounts[`ip_15min`] || 0;
      const shouldBlock   = maxPhoneCount > BLOCK_THRESHOLD_ORDERS || maxIpCount > BLOCK_THRESHOLD_ORDERS;

      if (shouldBlock) {
        // Write block keys
        await redisClient.setex(`velocity:blocked:phone:${phone}`, BLOCK_DURATION_SECONDS, '1');
        await redisClient.setex(`velocity:blocked:ip:${ip}`,    BLOCK_DURATION_SECONDS, '1');
        if (fingerprint) {
          await redisClient.setex(`velocity:blocked:fp:${fingerprint}`, BLOCK_DURATION_SECONDS, '1');
        }
      }

      // Deduplicated alert — only send once per 5-min window per phone
      const alertDedupeKey = `velocity:alerted:${phone}`;
      const alreadyAlerted = await redisClient.get(alertDedupeKey);
      if (!alreadyAlerted) {
        await redisClient.setex(alertDedupeKey, 5 * 60, '1');
        await alertService.sendSecurityAlert(
          'Order Velocity Anomaly',
          triggerLabel,
          ip,
          {
            phone,
            fingerprint,
            orderAmount,
            windowCounts,
            blocked: shouldBlock,
          }
        );
      }

      if (shouldBlock) {
        return {
          blocked: true,
          reason: 'Unusual order velocity detected. Access temporarily restricted.',
          windowCounts,
        };
      }
    }

    return { blocked: false, windowCounts };
  },

  async isBlocked(phone: string, ip: string, fingerprint?: string): Promise<boolean> {
    const [phoneBlocked, ipBlocked] = await Promise.all([
      redisClient.get(`velocity:blocked:phone:${phone}`),
      redisClient.get(`velocity:blocked:ip:${ip}`),
    ]);
    if (phoneBlocked || ipBlocked) return true;

    if (fingerprint) {
      const fpBlocked = await redisClient.get(`velocity:blocked:fp:${fingerprint}`);
      if (fpBlocked) return true;
    }

    return false;
  },
};
