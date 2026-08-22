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
    const { cartId, customer, shippingAddress, paymentMethod } = req.body;
    
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

    const order = await checkoutService.initiateCheckout(cartId, customer, shippingAddress, paymentMethod);
    res.status(201).json(order);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};
