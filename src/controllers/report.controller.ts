import { Request, Response } from 'express';
import { reportService } from '../services/report.service';

const getDates = (req: Request) => {
  const { startDate, endDate } = req.query;
  const end = endDate ? new Date(endDate as string) : new Date();
  const start = startDate ? new Date(startDate as string) : new Date();
  
  if (!startDate) {
    // Default to last 30 days
    start.setDate(end.getDate() - 30);
  }
  
  return { startDate: start, endDate: end };
};

export const getSalesReport = async (req: Request, res: Response) => {
  try {
    const { startDate, endDate } = getDates(req);
    const report = await reportService.getSalesReport(startDate, endDate);
    res.json(report);
  } catch (error: any) {
    console.error('Error fetching sales report:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
};

export const getBranchReport = async (req: Request, res: Response) => {
  try {
    const { startDate, endDate } = getDates(req);
    const report = await reportService.getBranchReport(startDate, endDate);
    res.json(report);
  } catch (error: any) {
    console.error('Error fetching branch report:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
};

export const getPaymentReport = async (req: Request, res: Response) => {
  try {
    const { startDate, endDate } = getDates(req);
    const report = await reportService.getPaymentReport(startDate, endDate);
    res.json(report);
  } catch (error: any) {
    console.error('Error fetching payment report:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
};

export const getInventoryValuationReport = async (req: Request, res: Response) => {
  try {
    // Inventory valuation doesn't use date ranges usually as it's a snapshot of current state
    const report = await reportService.getInventoryValuationReport();
    res.json(report);
  } catch (error: any) {
    console.error('Error fetching inventory report:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
};
