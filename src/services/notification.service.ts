import axios from 'axios';
import webpush from 'web-push';
import prisma from '../config/prisma';

// Configure web-push with VAPID keys
// In production, these should be generated once and stored in .env
const vapidKeys = {
  publicKey: process.env.VAPID_PUBLIC_KEY || webpush.generateVAPIDKeys().publicKey,
  privateKey: process.env.VAPID_PRIVATE_KEY || webpush.generateVAPIDKeys().privateKey,
};

webpush.setVapidDetails(
  'mailto:admin@laural.lk',
  vapidKeys.publicKey,
  vapidKeys.privateKey
);

export class NotificationService {
  /**
   * Send bulk SMS using Send.lk API
   */
  static async sendBulkSms(numbers: string[], message: string, flashSaleId?: string) {
    const apiKey = process.env.SEND_LK_API_KEY;
    const senderId = process.env.SEND_LK_SENDER_ID || 'LAURAL';

    if (!apiKey) {
      console.warn('SEND_LK_API_KEY is missing. Mocking SMS send...');
      return { success: true, sentCount: numbers.length, failedCount: 0, mocked: true };
    }

    try {
      // Assuming typical Send.lk API v3 format
      // https://sms.send.lk/api/v3/sms/send
      const response = await axios.post(
        'https://sms.send.lk/api/v3/sms/send',
        {
          recipient: numbers.join(','),
          sender_id: senderId,
          message: message,
        },
        {
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
        }
      );

      return {
        success: true,
        sentCount: numbers.length,
        failedCount: 0,
        providerResponse: response.data,
      };
    } catch (error: any) {
      console.error('Failed to send SMS via Send.lk:', error?.response?.data || error.message);
      throw new Error('Failed to dispatch SMS through gateway');
    }
  }

  /**
   * Store a new push subscription
   */
  static async subscribePush(subscription: any, userId?: string) {
    const existing = await prisma.pushSubscription.findUnique({
      where: { endpoint: subscription.endpoint },
    });

    if (existing) {
      if (userId && existing.userId !== userId) {
        await prisma.pushSubscription.update({
          where: { id: existing.id },
          data: { userId },
        });
      }
      return existing;
    }

    return prisma.pushSubscription.create({
      data: {
        endpoint: subscription.endpoint,
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
        userId: userId || null,
      },
    });
  }

  /**
   * Broadcast push notification to all subscribers
   */
  static async broadcastPush(title: string, body: string, url?: string, imageUrl?: string) {
    const subscriptions = await prisma.pushSubscription.findMany();
    
    if (subscriptions.length === 0) {
      return { success: true, dispatched: 0 };
    }

    const payload = JSON.stringify({
      title,
      body,
      url: url || '/',
      icon: '/icon-192x192.png',
      image: imageUrl,
    });

    let successCount = 0;
    let failCount = 0;

    const promises = subscriptions.map(async (sub) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: {
              p256dh: sub.p256dh,
              auth: sub.auth,
            },
          },
          payload
        );
        successCount++;
      } catch (error: any) {
        if (error.statusCode === 410 || error.statusCode === 404) {
          // Subscription has expired or is no longer valid
          await prisma.pushSubscription.delete({ where: { id: sub.id } });
        }
        failCount++;
      }
    });

    await Promise.allSettled(promises);

    return {
      success: true,
      dispatched: successCount,
      failed: failCount,
    };
  }

  /**
   * Get VAPID Public Key for frontend
   */
  static getVapidPublicKey() {
    return vapidKeys.publicKey;
  }

  // --- INTERNAL DASHBOARD NOTIFICATIONS ---

  static async createInternal(title: string, message: string, type: string = 'INFO', link?: string) {
    return prisma.notification.create({
      data: {
        title,
        message,
        type,
        link,
        isRead: false
      }
    });
  }

  static async getInternalNotifications(limit: number = 20) {
    return prisma.notification.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  static async getUnreadCount() {
    return prisma.notification.count({
      where: { isRead: false }
    });
  }

  static async markAsRead(id: string) {
    return prisma.notification.update({
      where: { id },
      data: { isRead: true }
    });
  }

  static async markAllAsRead() {
    return prisma.notification.updateMany({
      where: { isRead: false },
      data: { isRead: true }
    });
  }
}
