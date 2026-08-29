import { Request, Response } from 'express';
import { auditService } from '../services/audit.service';

export const getAuditLogs = async (req: Request, res: Response) => {
  try {
    const search = req.query.search as string;
    const action = req.query.action as string;
    const timeframe = req.query.timeframe as string;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;

    const result = await auditService.getLogs(search, action, timeframe, page, limit);
    res.json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
