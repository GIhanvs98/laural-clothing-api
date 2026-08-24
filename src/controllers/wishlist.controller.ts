import { Request, Response } from 'express';
import { wishlistService } from '../services/wishlist.service';

export const getWishlist = async (req: Request, res: Response) => {
  try {
    const { sessionId, customerId } = req.query;
    if (!sessionId && !customerId) {
      return res.status(400).json({ error: 'Session ID or Customer ID is required' });
    }

    const wishlist = await wishlistService.getWishlist(
      sessionId as string | undefined, 
      customerId as string | undefined
    );
    res.json(wishlist);
  } catch (error: any) {
    console.error('Error fetching wishlist:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
};

export const addItem = async (req: Request, res: Response) => {
  try {
    const { wishlistId, productId } = req.body;
    if (!wishlistId || !productId) {
      return res.status(400).json({ error: 'wishlistId and productId are required' });
    }

    const wishlist = await wishlistService.addItem(wishlistId, productId);
    res.status(201).json(wishlist);
  } catch (error: any) {
    console.error('Error adding item to wishlist:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
};

export const removeItem = async (req: Request, res: Response) => {
  try {
    const { wishlistId, productId } = req.params;
    if (!wishlistId || !productId) {
      return res.status(400).json({ error: 'wishlistId and productId are required' });
    }

    const wishlist = await wishlistService.removeItem(wishlistId as string, productId as string);
    res.json(wishlist);
  } catch (error: any) {
    console.error('Error removing item from wishlist:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
};
