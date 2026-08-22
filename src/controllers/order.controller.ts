import { Request, Response } from 'express';
import { orderService } from '../services/order.service';

export const getAllOrders = async (req: Request, res: Response) => {
  try {
    const orders = await orderService.getAllOrders();
    res.json(orders);
  } catch (error: any) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
};

export const dispatchOrder = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const order = await orderService.dispatchOrder(id as string);
    res.json(order);
  } catch (error: any) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
};

export const trackOrderByPhone = async (req: Request, res: Response) => {
  try {
    const { phone } = req.params;
    const trackingInfo = await orderService.trackOrderByPhone(phone as string);
    res.json(trackingInfo);
  } catch (error: any) {
    console.error(error);
    res.status(404).json({ error: error.message });
  }
};
