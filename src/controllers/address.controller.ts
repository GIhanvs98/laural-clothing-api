import { Request, Response } from 'express';
import { addressService } from '../services/address.service';

export const getAddresses = async (req: Request, res: Response) => {
  try {
    const { customerId } = req.query;
    if (!customerId) {
      return res.status(400).json({ error: 'Customer ID is required' });
    }

    const addresses = await addressService.getAddresses(customerId as string);
    res.json(addresses);
  } catch (error: any) {
    console.error('Error fetching addresses:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
};

export const addAddress = async (req: Request, res: Response) => {
  try {
    const { customerId } = req.query;
    if (!customerId) {
      return res.status(400).json({ error: 'Customer ID is required' });
    }

    const address = await addressService.addAddress(customerId as string, req.body);
    res.status(201).json(address);
  } catch (error: any) {
    console.error('Error adding address:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
};

export const updateAddress = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { customerId } = req.query;
    
    if (!id || !customerId) {
      return res.status(400).json({ error: 'Address ID and Customer ID are required' });
    }

    const address = await addressService.updateAddress(id as string, customerId as string, req.body);
    res.json(address);
  } catch (error: any) {
    console.error('Error updating address:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
};

export const deleteAddress = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ error: 'Address ID is required' });
    }

    await addressService.deleteAddress(id as string);
    res.json({ success: true, message: 'Address deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting address:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
};

export const setDefault = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { customerId, type } = req.body;
    
    if (!id || !customerId || !type) {
      return res.status(400).json({ error: 'Address ID, Customer ID, and type are required' });
    }

    const address = await addressService.setDefault(id as string, customerId as string, type as string);
    res.json(address);
  } catch (error: any) {
    console.error('Error setting default address:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
};
