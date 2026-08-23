import { Request, Response, NextFunction } from 'express';
import { requestContext } from '../context/RequestContext';

/**
 * Middleware to initialize the AsyncLocalStorage context for Row-Level Security (RLS).
 * Must be placed AFTER the authentication middleware so that `req.user` is available.
 */
export const rlsMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const user = (req as any).user; // Set by authenticateJWT
  
  const contextData = {
    userId: user?.userId || null,
    role: user?.role || 'GUEST',
    isAdmin: user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN',
  };

  requestContext.run(contextData, () => {
    next();
  });
};
