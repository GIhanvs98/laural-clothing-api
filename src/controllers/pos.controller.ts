import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const openSession = async (req: Request, res: Response) => {
  try {
    const { branchId, terminalId, userId, openingFloat } = req.body;
    
    // Check if there's already an open session for this terminal
    const existing = await prisma.posSession.findFirst({
      where: { terminalId, status: 'OPEN' }
    });
    
    if (existing) {
      return res.status(400).json({ error: 'Terminal already has an open session.' });
    }

    const session = await prisma.posSession.create({
      data: {
        branchId,
        terminalId,
        userId,
        openingFloat: Number(openingFloat) || 0,
        status: 'OPEN'
      }
    });
    
    res.status(201).json(session);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const closeSession = async (req: Request, res: Response) => {
  try {
    const { sessionId, actualClosing } = req.body;
    
    const session = await prisma.posSession.findUnique({
      where: { id: sessionId },
      include: { orders: true }
    });
    
    if (!session || session.status === 'CLOSED') {
      return res.status(400).json({ error: 'Session not found or already closed.' });
    }
    
    // Calculate expected closing
    // Sum of all CASH payments during this session
    const cashOrders = await prisma.order.aggregate({
      where: { posSessionId: sessionId, paymentMethod: 'CASH', paymentStatus: 'PAID' },
      _sum: { total: true }
    });
    
    const expectedClosing = session.openingFloat + (cashOrders._sum.total || 0);
    const variance = actualClosing - expectedClosing;
    
    const closedSession = await prisma.posSession.update({
      where: { id: sessionId },
      data: {
        status: 'CLOSED',
        closedAt: new Date(),
        expectedClosing,
        actualClosing,
        variance
      }
    });
    
    res.json(closedSession);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getCurrentSession = async (req: Request, res: Response) => {
  try {
    const { terminalId } = req.query;
    if (!terminalId) {
      return res.status(400).json({ error: 'Terminal ID required.' });
    }
    
    const session = await prisma.posSession.findFirst({
      where: { terminalId: String(terminalId), status: 'OPEN' }
    });
    
    res.json(session);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const generateVoucher = async (req: Request, res: Response) => {
  try {
    const { branchId, returnedItems, value } = req.body;
    
    // 1. Restock items via InventoryTransaction
    if (returnedItems && returnedItems.length > 0) {
      for (const item of returnedItems) {
        await prisma.inventoryTransaction.create({
          data: {
            variantId: item.variantId,
            branchId,
            type: 'RETURN',
            quantityChange: item.qty,
            reason: 'POS Exchange Return'
          }
        });
        
        // Update stock
        await prisma.inventoryItem.update({
          where: { variantId_branchId: { variantId: item.variantId, branchId } },
          data: { quantity: { increment: item.qty } }
        });
      }
    }
    
    // 2. Generate Voucher
    const code = `VCH-${value}-${Math.floor(Math.random() * 10000)}`;
    const voucher = await prisma.exchangeVoucher.create({
      data: {
        code,
        value,
        status: 'ACTIVE'
      }
    });
    
    res.status(201).json(voucher);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const validateVoucher = async (req: Request, res: Response) => {
  try {
    const { code } = req.params;
    
    const voucher = await prisma.exchangeVoucher.findUnique({
      where: { code }
    });
    
    if (!voucher) {
      return res.status(404).json({ error: 'Voucher not found' });
    }
    if (voucher.status !== 'ACTIVE') {
      return res.status(400).json({ error: 'Voucher is already used or invalid' });
    }
    
    res.json(voucher);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const processPosOrder = async (req: Request, res: Response) => {
  try {
    const { branchId, sessionId, customerId, items, paymentMethod, appliedVouchers, subtotal, total, tax } = req.body;
    
    const orderNumber = `POS-${Date.now()}`;
    
    // 1. Validate vouchers and calculate deductions
    let voucherDeduction = 0;
    const validVouchers = [];
    if (appliedVouchers && appliedVouchers.length > 0) {
      for (const vCode of appliedVouchers) {
        const voucher = await prisma.exchangeVoucher.findUnique({ where: { code: vCode } });
        if (voucher && voucher.status === 'ACTIVE') {
          voucherDeduction += voucher.value;
          validVouchers.push(voucher.id);
        }
      }
    }
    
    // 2. Create Order
    const order = await prisma.order.create({
      data: {
        orderNumber,
        type: 'POS',
        status: 'DELIVERED', // POS orders are delivered instantly
        paymentStatus: 'PAID',
        paymentMethod,
        subtotal,
        tax,
        shippingFee: 0,
        total: Math.max(0, total - voucherDeduction),
        branchId,
        posSessionId: sessionId,
        customerId: customerId || undefined,
        items: {
          create: items.map((i: any) => ({
            variantId: i.variantId,
            quantity: i.qty,
            priceAtPurchase: i.price
          }))
        }
      }
    });
    
    // 3. Update Vouchers
    if (validVouchers.length > 0) {
      await prisma.exchangeVoucher.updateMany({
        where: { id: { in: validVouchers } },
        data: { status: 'USED', usedAt: new Date(), orderId: order.id }
      });
    }
    
    // 4. Deduct Inventory
    for (const item of items) {
      // Deduct from branch inventory
      await prisma.inventoryItem.updateMany({
        where: { variantId: item.variantId, branchId },
        data: { quantity: { decrement: item.qty } }
      });
      
      // Log transaction
      await prisma.inventoryTransaction.create({
        data: {
          variantId: item.variantId,
          branchId,
          type: 'SALE',
          quantityChange: -item.qty,
          reference: order.id,
          reason: 'POS Sale'
        }
      });
    }
    
    res.status(201).json(order);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
