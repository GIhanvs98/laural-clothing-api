import { Request, Response } from 'express';
import { promotionService } from '../services/promotion.service';

export const getCoupons = async (req: Request, res: Response) => {
  try {
    const coupons = await promotionService.getCoupons();
    res.json(coupons);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const createCoupon = async (req: Request, res: Response) => {
  try {
    const coupon = await promotionService.createCoupon(req.body);
    res.status(201).json(coupon);
  } catch (error: any) {
    console.error(error);
    res.status(400).json({ error: error.message || 'Failed to create coupon' });
  }
};

export const updateCoupon = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const coupon = await promotionService.updateCoupon(id as string, req.body);
    res.json(coupon);
  } catch (error: any) {
    console.error(error);
    res.status(400).json({ error: error.message || 'Failed to update coupon' });
  }
};

export const deleteCoupon = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await promotionService.deleteCoupon(id as string);
    res.status(204).send();
  } catch (error: any) {
    console.error(error);
    res.status(400).json({ error: error.message || 'Failed to delete coupon' });
  }
};

export const getFlashSales = async (req: Request, res: Response) => {
  try {
    const flashSales = await promotionService.getFlashSales();
    res.json(flashSales);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const createFlashSale = async (req: Request, res: Response) => {
  try {
    const flashSale = await promotionService.createFlashSale(req.body);
    res.status(201).json(flashSale);
  } catch (error: any) {
    console.error(error);
    res.status(400).json({ error: error.message || 'Failed to create flash sale' });
  }
};

export const updateFlashSale = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const flashSale = await promotionService.updateFlashSale(id as string, req.body);
    res.json(flashSale);
  } catch (error: any) {
    console.error(error);
    res.status(400).json({ error: error.message || 'Failed to update flash sale' });
  }
};

export const deleteFlashSale = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await promotionService.deleteFlashSale(id as string);
    res.status(204).send();
  } catch (error: any) {
    console.error(error);
    res.status(400).json({ error: error.message || 'Failed to delete flash sale' });
  }
};
