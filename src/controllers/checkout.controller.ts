import { Request, Response } from 'express';
import { checkoutService } from '../services/checkout.service';

const getIdentifier = (req: Request) => {
  const sessionId = req.headers['x-session-id'] as string;
  const customerId = req.headers['x-customer-id'] as string | undefined;
  return { sessionId, customerId };
};

export const calculateCheckout = async (req: Request, res: Response) => {
  try {
    const { cartId, shippingAddress } = req.body;
    if (!cartId) {
      return res.status(400).json({ error: 'cartId is required' });
    }

    const { customerId } = getIdentifier(req);
    const isGuest = !customerId;

    const totals = await checkoutService.calculateCheckout(cartId, shippingAddress, isGuest);
    res.json(totals);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const initiateCheckout = async (req: Request, res: Response) => {
  try {
    const { cartId, customer, shippingAddress, paymentMethod, deviceFingerprint } = req.body;
    const { redisClient } = require('../config/redis');
    
    if (!cartId) {
      return res.status(400).json({ error: 'cartId is required' });
    }
    if (!customer || !customer.phone) {
      return res.status(400).json({ error: 'customer object with phone number is required' });
    }
    if (!shippingAddress) {
      return res.status(400).json({ error: 'shippingAddress is required' });
    }

    // Force isGuest appropriately based on the authenticated context
    const { customerId } = getIdentifier(req);
    if (customerId) {
      customer.isGuest = false;
    } else {
      customer.isGuest = true;
    }

    // Device Fingerprint Velocity Check
    if (deviceFingerprint) {
      const fingerprintKey = `fingerprint:checkout:${deviceFingerprint}`;
      const attempts = await redisClient.incr(fingerprintKey);
      
      if (attempts === 1) {
        await redisClient.expire(fingerprintKey, 900); // 15 minutes window
      }
      
      if (attempts > 5) {
        console.warn(`[Bot Detected] Checkout spam from fingerprint: ${deviceFingerprint}`);
        return res.status(429).json({ error: 'Too many checkout attempts from this device. Please try again later.' });
      }
    }

    // If guest checkout, enforce phone verification
    if (customer.isGuest) {
      const { verificationToken } = req.body;
      if (!verificationToken) {
        return res.status(403).json({ error: 'Phone number verification is required for guest checkout' });
      }
      
      const tokenKey = `verified_phone:${customer.phone}`;
      const storedToken = await redisClient.get(tokenKey);
      
      if (!storedToken || storedToken !== verificationToken) {
        return res.status(403).json({ error: 'Invalid or expired verification token' });
      }
      
      // Consume the token so it can't be reused
      await redisClient.del(tokenKey);
    }

    const order = await checkoutService.initiateCheckout(cartId, customer, shippingAddress, paymentMethod);
    res.status(201).json(order);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};
