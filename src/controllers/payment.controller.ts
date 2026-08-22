import { Request, Response } from 'express';
import { paymentService } from '../services/payment.service';

export const handleWebhook = async (req: Request, res: Response) => {
  try {
    const provider = req.params.provider; // e.g., koko, mintpay, onepay
    const payload = req.body;

    // Ideally, we log this and verify headers here
    console.log(`[Payment Webhook] Received from ${provider}:`, payload);

    await paymentService.handleWebhook(provider as string, payload);
    
    res.status(200).json({ received: true });
  } catch (error: any) {
    console.error(`[Payment Webhook Error]`, error);
    res.status(400).json({ error: error.message });
  }
};
