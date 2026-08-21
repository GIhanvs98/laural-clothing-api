import { Request, Response } from 'express';
import { orderService } from '../services/order.service';

export const searchCustomer = async (req: Request, res: Response) => {
  try {
    const { phone } = req.query;
    if (!phone || typeof phone !== 'string') {
      return res.status(400).json({ error: 'Phone number is required' });
    }

    const customer = await orderService.searchCustomerByPhone(phone);
    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    res.json(customer);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const createQuickDispatch = async (req: Request, res: Response) => {
  try {
    // Basic validation
    const { customer, branchId, items, paymentMethod, subtotal, shippingFee, tax, total } = req.body;
    
    if (!customer || !customer.phone || !customer.firstName || !customer.lastName || !customer.addressLine1 || !customer.city) {
      return res.status(400).json({ error: 'Incomplete customer details' });
    }
    
    if (!branchId) {
      return res.status(400).json({ error: 'Branch is required' });
    }

    if (!items || !items.length) {
      return res.status(400).json({ error: 'Order must contain at least one item' });
    }

    if (!paymentMethod) {
      return res.status(400).json({ error: 'Payment method is required' });
    }

    const order = await orderService.createQuickDispatchOrder(req.body);
    res.status(201).json(order);
  } catch (error: any) {
    console.error(error);
    res.status(400).json({ error: error.message || 'Failed to create order' });
  }
};
