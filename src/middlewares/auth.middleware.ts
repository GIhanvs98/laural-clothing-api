import { Request, Response, NextFunction } from "express";
import { verifyAccessToken, JWTPayload } from "../utils/jwt";

export interface AuthRequest extends Request {
  user?: JWTPayload;
}

export function authenticateJWT(req: AuthRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader || typeof authHeader !== "string" || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({
      success: false,
      message: "Authentication token missing or invalid",
    });
    return;
  }

  const token = authHeader.split(" ")[1];
  if (!token) {
    res.status(401).json({
      success: false,
      message: "Authentication token missing or invalid",
    });
    return;
  }

  try {
    const payload = verifyAccessToken(token);
    req.user = payload;
    next();
  } catch (error: any) {
    res.status(401).json({
      success: false,
      message: "Session expired or token invalid. Please log in again.",
    });
    return;
  }
}

export function optionalAuth(req: AuthRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (authHeader && typeof authHeader === "string" && authHeader.startsWith("Bearer ")) {
    const token = authHeader.split(" ")[1];
    if (token) {
      try {
        const payload = verifyAccessToken(token);
        req.user = payload;
      } catch {
        // Ignore invalid token for optional auth
      }
    }
  }

  next();
}

export function requireRole(...allowedRoles: string[]) {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ success: false, message: "Unauthorized" });
      return;
    }

    const userRoles = req.user.roles || [];
    const isSuperAdmin = userRoles.some(
      (r) => r.toUpperCase() === "SUPER_ADMIN" || r.toLowerCase() === "super admin"
    );

    if (isSuperAdmin) {
      next();
      return;
    }

    const hasAllowedRole = allowedRoles.some((allowed) =>
      userRoles.some((userRole) => userRole.toLowerCase() === allowed.toLowerCase())
    );

    if (!hasAllowedRole) {
      res.status(403).json({
        success: false,
        message: "Access Denied: You do not have permission to perform this action.",
      });
      return;
    }

    next();
  };
}

export function requirePermission(...requiredPermissions: string[]) {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ success: false, message: "Unauthorized" });
      return;
    }

    const userRoles = req.user.roles || [];
    const isSuperAdmin = userRoles.some(
      (r) => r.toUpperCase() === "SUPER_ADMIN" || r.toLowerCase() === "super admin"
    );

    if (isSuperAdmin) {
      next();
      return;
    }

    const userPermissions = req.user.permissions || [];
    const hasPermission = requiredPermissions.some((reqPerm) =>
      userPermissions.includes(reqPerm)
    );

    if (!hasPermission) {
      res.status(403).json({
        success: false,
        message: "Access Denied: Required permission is missing.",
      });
      return;
    }

    next();
  };
}
