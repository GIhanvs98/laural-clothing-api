import { Request, Response, NextFunction } from "express";

/**
 * Recursively sanitizes an object by removing any keys that start with a dollar sign ($).
 * This protects against NoSQL injection patterns (e.g. $where, $gt, $regex).
 */
function sanitizePayload(obj: any): any {
  if (Array.isArray(obj)) {
    return obj.map((v) => sanitizePayload(v));
  }
  
  if (obj !== null && typeof obj === 'object') {
    const sanitizedObj: Record<string, any> = {};
    for (const key of Object.keys(obj)) {
      if (key.startsWith('$')) {
        continue;
      }
      sanitizedObj[key] = sanitizePayload(obj[key]);
    }
    return sanitizedObj;
  }
  
  return obj;
}

function sanitizeInPlace(obj: any): void {
  if (obj !== null && typeof obj === 'object' && !Array.isArray(obj)) {
    for (const key of Object.keys(obj)) {
      if (key.startsWith('$')) {
        delete obj[key];
      } else if (obj[key] !== null && typeof obj[key] === 'object') {
        if (Array.isArray(obj[key])) {
          obj[key] = sanitizePayload(obj[key]);
        } else {
          sanitizeInPlace(obj[key]);
        }
      }
    }
  }
}

export const sanitizeMiddleware = (req: Request, res: Response, next: NextFunction) => {
  if (req.body && typeof req.body === 'object') {
    sanitizeInPlace(req.body);
  }
  if (req.query && typeof req.query === 'object') {
    sanitizeInPlace(req.query);
  }
  if (req.params && typeof req.params === 'object') {
    sanitizeInPlace(req.params);
  }
  
  next();
};

