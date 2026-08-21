import { Request, Response } from 'express';
import { cartService } from '../services/cart.service';

// Helper to extract identifier
const getIdentifier = (req: Request) => {
  const sessionId = req.headers['x-session-id'] as string;
  // TODO: extract customerId from authenticated request (req.user?.id) when auth is integrated
  const customerId = req.headers['x-customer-id'] as string | undefined;
  return { sessionId, customerId };
};

export const getCart = async (req: Request, res: Response) => {
  try {
    const { sessionId, customerId } = getIdentifier(req);
    if (!sessionId && !customerId) {
      return res.status(400).json({ error: 'Missing x-session-id or authentication' });
    }

    const cart = await cartService.getOrCreateCart(sessionId, customerId);
    res.json(cart);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const addItemToCart = async (req: Request, res: Response) => {
  try {
    const { sessionId, customerId } = getIdentifier(req);
    if (!sessionId && !customerId) {
      return res.status(400).json({ error: 'Missing x-session-id or authentication' });
    }

    const { variantId, quantity } = req.body;
    if (!variantId || !quantity) {
      return res.status(400).json({ error: 'variantId and quantity are required' });
    }

    const isGuest = !customerId;
    const cart = await cartService.getOrCreateCart(sessionId, customerId);
    
    await cartService.addItem(cart.id, variantId, Number(quantity), isGuest);
    
    // Fetch updated cart to return full state
    const updatedCart = await cartService.getOrCreateCart(sessionId, customerId);
    res.json(updatedCart);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const updateCartItem = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string; // itemId
    const { quantity } = req.body;
    
    if (quantity === undefined) {
      return res.status(400).json({ error: 'quantity is required' });
    }

    const { sessionId, customerId } = getIdentifier(req);
    const isGuest = !customerId;
    const cart = await cartService.getOrCreateCart(sessionId, customerId);

    await cartService.updateItemQuantity(cart.id, id, Number(quantity), isGuest);
    
    // Fetch updated cart
    const updatedCart = await cartService.getOrCreateCart(sessionId, customerId);
    res.json(updatedCart);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const removeCartItem = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string; // itemId
    const { sessionId, customerId } = getIdentifier(req);
    const isGuest = !customerId;
    const cart = await cartService.getOrCreateCart(sessionId, customerId);

    await cartService.removeItem(cart.id, id, isGuest);
    
    // Fetch updated cart
    const updatedCart = await cartService.getOrCreateCart(sessionId, customerId);
    res.json(updatedCart);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const mergeCarts = async (req: Request, res: Response) => {
  try {
    const { sessionId, customerId } = req.body;
    if (!sessionId || !customerId) {
      return res.status(400).json({ error: 'sessionId and customerId are required' });
    }
    
    const cart = await cartService.mergeCarts(sessionId, customerId);
    res.json(cart);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};
