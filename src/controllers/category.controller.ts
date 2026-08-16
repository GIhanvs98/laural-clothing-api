import { Request, Response, NextFunction } from "express";
import { AppError } from "../middlewares/errorHandler";
import { logger } from "../utils/logger";

export const getCategories = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // TODO: Fetch categories from Prisma
    res.status(200).json({
      success: true,
      data: [],
      message: "Categories fetched successfully (Mock)"
    });
  } catch (error) {
    next(error);
  }
};

export const createCategory = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // TODO: Validate req.body and create category via Prisma
    res.status(201).json({
      success: true,
      data: req.body,
      message: "Category created successfully (Mock)"
    });
  } catch (error) {
    next(error);
  }
};

export const updateCategory = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    // TODO: Update category via Prisma
    res.status(200).json({
      success: true,
      data: { id, ...req.body },
      message: "Category updated successfully (Mock)"
    });
  } catch (error) {
    next(error);
  }
};

export const deleteCategory = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    // TODO: Delete category via Prisma
    res.status(200).json({
      success: true,
      data: { id },
      message: "Category deleted successfully (Mock)"
    });
  } catch (error) {
    next(error);
  }
};
