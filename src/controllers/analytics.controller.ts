import { Request, Response } from 'express';
import { analyticsService } from '../services/analytics.service';

export const getBusinessOverview = async (req: Request, res: Response) => {
  try {
    const period = (req.query.period as string) || 'Today';
    const branch = (req.query.branch as string) || 'All';
    
    const overview = await analyticsService.getBusinessOverview(period, branch);
    res.json(overview);
  } catch (error) {
    console.error('Error fetching analytics overview:', error);
    res.status(500).json({ error: 'Failed to fetch analytics overview' });
  }
};
