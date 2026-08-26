import { Request, Response, NextFunction } from "express";
import { AppError } from "../middlewares/errorHandler";
import { logger } from "../utils/logger";

import { customerService } from '../services/customer.service';

export const getCustomers = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const search = req.query.search as string;
    const type = req.query.type as string;
    const sort = req.query.sort as string;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;

    const result = await customerService.getCustomers(search, type, sort, page, limit);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

export const getCustomerById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    // TODO: Fetch single customer from Prisma
    res.status(200).json({
      success: true,
      data: { id },
      message: "Customer fetched successfully (Mock)"
    });
  } catch (error) {
    next(error);
  }
};

export const createCustomer = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // TODO: Validate req.body and create customer via Prisma
    res.status(201).json({
      success: true,
      data: req.body,
      message: "Customer created successfully (Mock)"
    });
  } catch (error) {
    next(error);
  }
};

export const updateCustomer = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    // TODO: Update customer via Prisma
    res.status(200).json({
      success: true,
      data: { id, ...req.body },
      message: "Customer updated successfully (Mock)"
    });
  } catch (error) {
    next(error);
  }
};
