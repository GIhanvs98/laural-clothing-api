import { Request, Response, NextFunction } from "express";
import { AppError } from "../middlewares/errorHandler";
import { logger } from "../utils/logger";

export const getProducts = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // TODO: Fetch products from Prisma
    res.status(200).json({
      success: true,
      data: [],
      message: "Products fetched successfully (Mock)"
    });
  } catch (error) {
    next(error);
  }
};

export const getProductById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    // TODO: Fetch single product from Prisma
    res.status(200).json({
      success: true,
      data: { id },
      message: "Product fetched successfully (Mock)"
    });
  } catch (error) {
    next(error);
  }
};

export const createProduct = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // TODO: Validate req.body and create product via Prisma
    res.status(201).json({
      success: true,
      data: req.body,
      message: "Product created successfully (Mock)"
    });
  } catch (error) {
    next(error);
  }
};

export const updateProduct = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    // TODO: Update product via Prisma
    res.status(200).json({
      success: true,
      data: { id, ...req.body },
      message: "Product updated successfully (Mock)"
    });
  } catch (error) {
    next(error);
  }
};

export const deleteProduct = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    // TODO: Delete product via Prisma
    res.status(200).json({
      success: true,
      data: { id },
      message: "Product deleted successfully (Mock)"
    });
  } catch (error) {
    next(error);
  }
};
