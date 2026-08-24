import { Request, Response, NextFunction } from "express";
import { logger } from "../utils/logger";

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;

  constructor(message: string, statusCode: number, isOperational = true) {
    super(message);
    Object.setPrototypeOf(this, new.target.prototype);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    Error.captureStackTrace(this);
  }
}

export const errorHandler = (
  err: Error | AppError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  let statusCode = 500;
  let message = "Internal Server Error";

  if (err instanceof AppError) {
    statusCode = err.statusCode;
    message = err.message;
  }

  logger.error(`${statusCode} - ${message} - ${req.originalUrl} - ${req.method} - ${req.ip}`);
  if (err.stack) {
    logger.error(err.stack);
  }

  // Dark Security: Never leak internal error details to the client.
  // 500-level errors or unknown errors get obfuscated.
  const isDev = process.env.NODE_ENV === "development";
  if (statusCode >= 500 && !isDev) {
    message = "An error occurred";
  }

  res.status(statusCode).json({
    success: false,
    error: {
      message,
      ...(isDev && { stack: err.stack }),
    },
  });
};
