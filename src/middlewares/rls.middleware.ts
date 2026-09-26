import { Request, Response, NextFunction } from 'express';
import { requestContext } from '../context/RequestContext';

/**
 * Middleware to initialize the AsyncLocalStorage context for Row-Level Security (RLS).
 * Must be placed AFTER the authentication middleware so that `req.user` is available.
 * 
 * branchId = null  → Super Admin / no branch restriction (all branches visible)
 * branchId = string → Staff member restricted to that single branch
 */
export const rlsMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const user = (req as any).user; // Set by authenticateJWT
  
  const isSuperAdmin = user?.roles?.some((r: string) => ['SUPER_ADMIN', 'ADMIN'].includes(r));

  const contextData = {
    userId: user?.userId || null,
    role: user?.role || 'GUEST',
    isAdmin: isSuperAdmin || false,
    // Super Admins get null (unrestricted). Staff get their assigned branchId.
    branchId: isSuperAdmin ? null : (user?.branchId || null),
  };

  requestContext.run(contextData, () => {
    next();
  });
};
