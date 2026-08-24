import { Request, Response, NextFunction } from "express";

/**
 * Recursively sanitizes an object by removing any keys that start with a dollar sign ($).
 * This protects against NoSQL injection patterns (e.g. $where, $gt, $regex) which,
 * although not native to Prisma/Postgres in the same way as MongoDB, is a defense-in-depth
 * measure against any raw queries or secondary document stores that might process the payload.
 */
function sanitizePayload(obj: any): any {
  if (Array.isArray(obj)) {
    return obj.map((v) => sanitizePayload(v));
  }
  
  if (obj !== null && typeof obj === 'object') {
    const sanitizedObj: Record<string, any> = {};
    for (const key of Object.keys(obj)) {
      if (key.startsWith('$')) {
        // Strip out the suspicious key completely
        continue;
      }
      sanitizedObj[key] = sanitizePayload(obj[key]);
    }
    return sanitizedObj;
  }
  
  return obj;
}

export const sanitizeMiddleware = (req: Request, res: Response, next: NextFunction) => {
  if (req.body) {
    req.body = sanitizePayload(req.body);
  }
  if (req.query) {
    const sanitized = sanitizePayload(req.query);
    for (const key in req.query) delete req.query[key];
    Object.assign(req.query, sanitized);
  }
  if (req.params) {
    const sanitized = sanitizePayload(req.params);
    for (const key in req.params) delete req.params[key];
    Object.assign(req.params, sanitized);
  }
  
  next();
};
