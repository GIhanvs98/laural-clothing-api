import { Request, Response, NextFunction } from "express";
import prisma from "../config/prisma";

export const handleWebhook = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { provider } = req.params;
    const signature = req.headers['x-webhook-signature'] as string | undefined;
    
    const { paymentService } = require('../services/payment.service');
    const result = await paymentService.handleWebhook(provider, req.body, signature);
    
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

export const retryPayment = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const orderNumber = req.params.orderNumber as string;
    const { paymentMethod } = req.body;

    const order = await prisma.order.findUnique({ where: { orderNumber } });
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const { paymentService } = require('../services/payment.service');
    const paymentInfo = await paymentService.initiatePayment(order.id, paymentMethod);

    res.status(200).json({ success: true, payment: paymentInfo });
  } catch (error) {
    next(error);
  }
};

export const getPaymentTransactions = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const gateway = req.query.gateway as string;

    const skip = (page - 1) * limit;

    let where: any = {};
    if (gateway && gateway !== "All") {
      where.gateway = gateway;
    }

    const [transactions, total] = await Promise.all([
      prisma.paymentTransaction.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          customer: true,
          order: { select: { orderNumber: true } }
        }
      }),
      prisma.paymentTransaction.count({ where })
    ]);

    const mappedTransactions = transactions.map((t: any) => ({
      id: t.id,
      order: t.order?.orderNumber || 'Unknown',
      customer: t.customer ? `${t.customer.firstName || ''} ${t.customer.lastName || ''}`.trim() : 'Guest',
      gateway: t.gateway,
      method: t.method,
      amount: t.amount,
      amountStr: `Rs. ${t.amount.toLocaleString()}`,
      status: t.status,
      created: t.createdAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }));

    res.status(200).json({
      success: true,
      data: mappedTransactions,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    next(error);
  }
};

export const getPaymentKpis = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const gateway = req.query.gateway as string;
    
    let where: any = {};
    if (gateway && gateway !== "All") {
      where.gateway = gateway;
    }

    const transactions = await prisma.paymentTransaction.findMany({ where });

    const totalAmount = transactions.filter((t: any) => t.status === "Paid").reduce((acc: number, t: any) => acc + t.amount, 0);
    const successfulCount = transactions.filter((t: any) => t.status === "Paid").length;
    const pendingCount = transactions.filter((t: any) => t.status === "Pending").length;
    const failedCount = transactions.filter((t: any) => t.status === "Failed").length;
    const totalCount = transactions.length;
    const successRate = totalCount > 0 ? Math.round((successfulCount / totalCount) * 100) : 0;

    res.status(200).json({
      success: true,
      data: {
        totalAmount: totalAmount,
        successfulCount: successfulCount.toString(),
        pendingCount: pendingCount.toString(),
        failedCount: failedCount.toString(),
        successRate: successRate
      }
    });
  } catch (error) {
    next(error);
  }
};
