import { Request, Response } from 'express';
import { z } from 'zod';
import { NotificationService } from '../services/notification.service';

const SendSmsSchema = z.object({
  numbers: z.array(z.string()).min(1),
  message: z.string().min(1).max(1000),
  flashSaleId: z.string().uuid().optional(),
});

const PushSubscribeSchema = z.object({
  endpoint: z.string().url(),
  keys: z.object({
    p256dh: z.string(),
    auth: z.string(),
  }),
});

const PushBroadcastSchema = z.object({
  title: z.string().min(1).max(100),
  body: z.string().min(1).max(500),
  url: z.string().url().optional(),
  imageUrl: z.string().url().optional(),
  flashSaleId: z.string().uuid().optional(),
});

export class NotificationController {
  static async sendBulkSms(req: Request, res: Response) {
    try {
      const validatedData = SendSmsSchema.parse(req.body);
      const result = await NotificationService.sendBulkSms(
        validatedData.numbers,
        validatedData.message,
        validatedData.flashSaleId
      );
      res.json({ data: result, message: 'SMS dispatched successfully' });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: 'Invalid request payload', details: error.errors });
      }
      res.status(500).json({ error: error.message || 'Failed to dispatch SMS' });
    }
  }

  static async subscribePush(req: Request, res: Response) {
    try {
      const validatedData = PushSubscribeSchema.parse(req.body);
      // user might not be logged in for public push subscribe
      const userId = (req as any).user?.id;
      const result = await NotificationService.subscribePush(validatedData, userId);
      res.json({ data: result, message: 'Subscribed to push notifications' });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: 'Invalid request payload', details: error.errors });
      }
      res.status(500).json({ error: error.message || 'Failed to subscribe' });
    }
  }

  static async broadcastPush(req: Request, res: Response) {
    try {
      const validatedData = PushBroadcastSchema.parse(req.body);
      const result = await NotificationService.broadcastPush(
        validatedData.title,
        validatedData.body,
        validatedData.url,
        validatedData.imageUrl
      );
      res.json({ data: result, message: 'Push broadcast complete' });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: 'Invalid request payload', details: error.errors });
      }
      res.status(500).json({ error: error.message || 'Failed to broadcast push' });
    }
  }

  static async getVapidKey(req: Request, res: Response) {
    try {
      const publicKey = NotificationService.getVapidPublicKey();
      res.json({ data: { publicKey }, message: 'VAPID Public Key' });
    } catch (error: any) {
      res.status(500).json({ error: 'Failed to fetch VAPID key' });
    }
  }
}
