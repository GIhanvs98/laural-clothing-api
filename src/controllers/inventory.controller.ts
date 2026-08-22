import { Request, Response } from 'express';
import { inventoryService } from '../services/inventory.service';

// GET /api/inventory
export const getInventory = async (req: Request, res: Response) => {
  try {
    const search = req.query.search as string | undefined;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const result = await inventoryService.getInventory(search, page, limit);
    res.json(result);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
};

// GET /api/inventory/stats
export const getStats = async (req: Request, res: Response) => {
  try {
    const stats = await inventoryService.getStats();
    res.json(stats);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
};

// GET /api/inventory/transactions
export const getTransactions = async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const result = await inventoryService.getTransactions(page, limit);
    res.json(result);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
};

// POST /api/inventory/adjust
export const adjustStock = async (req: Request, res: Response) => {
  try {
    const { variantId, type, quantity, reason, reference } = req.body;
    if (!variantId || !type || !quantity) {
      return res.status(400).json({ error: 'variantId, type and quantity are required' });
    }
    if (!['RECEIVE', 'DEDUCT'].includes(type)) {
      return res.status(400).json({ error: 'type must be RECEIVE or DEDUCT' });
    }
    const result = await inventoryService.adjustStock({ variantId, type, quantity: Number(quantity), reason, reference });
    res.json(result);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
};

// GET /api/inventory/transfers
export const getTransfers = async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const result = await inventoryService.getTransfers(page, limit);
    res.json(result);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
};

// POST /api/inventory/transfers
export const createTransfer = async (req: Request, res: Response) => {
  try {
    const { variantId, fromLocation, toLocation, quantity, requestedBy, notes } = req.body;
    if (!variantId || !fromLocation || !toLocation || !quantity) {
      return res.status(400).json({ error: 'variantId, fromLocation, toLocation, and quantity are required' });
    }
    if (fromLocation === toLocation) {
      return res.status(400).json({ error: 'fromLocation and toLocation must be different' });
    }
    const transfer = await inventoryService.createTransfer({ variantId, fromLocation, toLocation, quantity: Number(quantity), requestedBy, notes });
    res.status(201).json(transfer);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
};

// PUT /api/inventory/transfers/:id/status
export const updateTransferStatus = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const { status } = req.body;
    const validStatuses = ['Pending', 'Approved', 'Dispatched', 'Received', 'Cancelled'];
    if (!status || !validStatuses.includes(status as string)) {
      return res.status(400).json({ error: `status must be one of: ${validStatuses.join(', ')}` });
    }
    const result = await inventoryService.updateTransferStatus(id, status);
    res.json(result);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
};
