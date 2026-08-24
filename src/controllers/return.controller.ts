import { Request, Response } from 'express';
import { returnService } from '../services/return.service';

export const verifyOrderForReturn = async (req: Request, res: Response) => {
  try {
    const { orderNumber, email } = req.query;
    if (!orderNumber || !email) {
      return res.status(400).json({ error: 'orderNumber and email are required' });
    }
    const data = await returnService.verifyOrderForReturn(orderNumber as string, email as string);
    res.json(data);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};

export const createReturn = async (req: Request, res: Response) => {
  try {
    const { orderId, items } = req.body;
    if (!orderId || !items || !items.length) {
      return res.status(400).json({ error: 'orderId and items are required' });
    }
    const data = await returnService.createReturn(orderId, items);
    res.status(201).json(data);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};

export const getReturns = async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const search = req.query.search as string;
    const status = req.query.status as string;
    const customerId = req.query.customerId as string;

    const data = await returnService.getReturns(page, limit, search, status, customerId);
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const getReturnById = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const rma = await returnService.getReturnById(id);
    res.json(rma);
  } catch (error: any) {
    if (error.message === 'Return not found') {
      res.status(404).json({ error: error.message });
    } else {
      res.status(500).json({ error: error.message });
    }
  }
};

export const updateReturnStatus = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const { status, items } = req.body;
    const updated = await returnService.updateReturnStatus(id, status, items);
    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};
