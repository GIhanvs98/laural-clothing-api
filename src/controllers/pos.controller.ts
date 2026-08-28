import { Request, Response } from 'express';
import { posService } from '../services/pos.service';

export const openSession = async (req: Request, res: Response) => {
  try {
    const { branchId, terminalId, userId, openingFloat } = req.body;
    const session = await posService.openSession({
      branchId,
      terminalId,
      userId,
      openingFloat: Number(openingFloat) || 0
    });
    res.status(201).json(session);
  } catch (error: any) {
    console.error(error);
    res.status(400).json({ error: error.message || 'Internal server error' });
  }
};

export const getExpectedClosing = async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.query;
    if (!sessionId) {
      return res.status(400).json({ error: 'Session ID required.' });
    }
    const result = await posService.getExpectedClosing(String(sessionId));
    res.json(result);
  } catch (error: any) {
    console.error(error);
    res.status(400).json({ error: error.message || 'Internal server error' });
  }
};

export const closeSession = async (req: Request, res: Response) => {
  try {
    const { sessionId, actualClosing } = req.body;
    const closedSession = await posService.closeSession({
      sessionId,
      actualClosing
    });
    res.json(closedSession);
  } catch (error: any) {
    console.error(error);
    res.status(400).json({ error: error.message || 'Internal server error' });
  }
};

export const getCurrentSession = async (req: Request, res: Response) => {
  try {
    const { terminalId } = req.query;
    if (!terminalId) {
      return res.status(400).json({ error: 'Terminal ID required.' });
    }
    const session = await posService.getCurrentSession(String(terminalId));
    res.json(session);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getSessionSummary = async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.query;
    if (!sessionId) {
      return res.status(400).json({ error: 'Session ID required.' });
    }
    const summary = await posService.getSessionSummary(String(sessionId));
    res.json(summary);
  } catch (error: any) {
    console.error(error);
    res.status(400).json({ error: error.message || 'Internal server error' });
  }
};

export const generateVoucher = async (req: Request, res: Response) => {
  try {
    const { branchId, returnedItems, value } = req.body;
    const voucher = await posService.generateVoucher({
      branchId,
      returnedItems,
      value
    });
    res.status(201).json(voucher);
  } catch (error: any) {
    console.error(error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
};

export const validateVoucher = async (req: Request, res: Response) => {
  try {
    const { code } = req.params;
    if (!code) {
      return res.status(400).json({ error: 'Code is required' });
    }
    const voucher = await posService.validateVoucher(code as string);
    res.json(voucher);
  } catch (error: any) {
    console.error(error);
    res.status(400).json({ error: error.message || 'Internal server error' });
  }
};

export const processPosOrder = async (req: Request, res: Response) => {
  try {
    const order = await posService.processPosOrder(req.body);
    res.status(201).json(order);
  } catch (error: any) {
    console.error(error);
    res.status(400).json({ error: error.message || 'Internal server error' });
  }
};
