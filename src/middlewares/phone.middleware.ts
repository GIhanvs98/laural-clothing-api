import { Request, Response, NextFunction } from 'express';
import { normalizePhone } from '../utils/phone';

export const phoneNormalizerMiddleware = (req: Request, res: Response, next: NextFunction) => {
  
  // Recursively traverse and normalize any key named 'phone'
  const normalizeDeep = (obj: any) => {
    if (!obj || typeof obj !== 'object') return;
    
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        if (key === 'phone' && typeof obj[key] === 'string') {
          obj[key] = normalizePhone(obj[key]);
        } else if (typeof obj[key] === 'object') {
          normalizeDeep(obj[key]);
        }
      }
    }
  };

  if (req.body) normalizeDeep(req.body);
  if (req.query) normalizeDeep(req.query);
  if (req.params) normalizeDeep(req.params);

  next();
};
