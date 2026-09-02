import { Request, Response, NextFunction } from "express";
import { verifyAccessToken, JWTPayload, generateFingerprint, generateAccessToken } from "../utils/jwt";
import { requestContext } from "../context/RequestContext";

export interface AuthRequest extends Request {
  user?: JWTPayload;
}

function normalizeRole(role: string): string {
  return role.toUpperCase().replace(/[\s_]/g, "");
}

export function isSuperAdminRole(userRoles: string[] = []): boolean {
  return userRoles.some((r) => {
    const norm = normalizeRole(r);
    return norm === "SUPERADMIN" || norm === "SYSTEMOWNER";
  });
}

export function isAdminUserRole(userRoles: string[] = []): boolean {
  return userRoles.some((r) => {
    const norm = normalizeRole(r);
    return norm === "SUPERADMIN" || norm === "SYSTEMOWNER" || norm === "ADMIN" || norm === "BRANCHADMIN";
  });
}

function runWithContext(user: JWTPayload | undefined, next: NextFunction) {
  const isAdmin = isAdminUserRole(user?.roles || []);
  requestContext.run({
    userId: user?.userId || null,
    role: isAdmin ? 'ADMIN' : (user ? 'USER' : 'GUEST'),
    isAdmin
  }, () => {
    next();
  });
}

export function authenticateJWT(req: AuthRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  const token = 
    req.cookies?.laural_access_token || 
    (authHeader && authHeader.startsWith("Bearer ") ? authHeader.split(" ")[1] : null);

  if (!token) {
    res.status(401).json({
      success: false,
      message: "Authentication token missing or invalid",
    });
    return;
  }

  try {
    const payload = verifyAccessToken(token);

    const forwarded = req.headers['x-forwarded-for'] as string | undefined;
    const ip = (forwarded ? forwarded.split(',')[0]?.trim() : undefined) || req.socket?.remoteAddress || 'unknown';
    const userAgent = (req.headers['user-agent'] as string) || 'unknown';
    const currentFingerprint = generateFingerprint(ip, userAgent);

    if (payload.fingerprint && payload.fingerprint !== currentFingerprint) {
      res.status(401).json({
        success: false,
        message: "Session context mismatch. Please log in again.",
      });
      return;
    }

    let finalPayload = payload;
    const isAdmin = isAdminUserRole(payload.roles || []);

    // Admin Session Rotation every 15 minutes
    if (isAdmin && payload.iat && (Date.now() / 1000) - payload.iat > 15 * 60) {
      const newAccessToken = generateAccessToken({
        userId: payload.userId,
        email: payload.email,
        roles: payload.roles,
        permissions: payload.permissions,
        fingerprint: currentFingerprint
      });
      res.cookie("laural_access_token", newAccessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 60 * 60 * 1000,
      });
      res.setHeader('x-token-rotated', 'true');
      finalPayload = verifyAccessToken(newAccessToken);
    }

    req.user = finalPayload;
    runWithContext(finalPayload, next);
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
  const token = 
    req.cookies?.laural_access_token || 
    (authHeader && typeof authHeader === "string" && authHeader.startsWith("Bearer ") ? authHeader.split(" ")[1] : null);

  if (token) {
    try {
      const payload = verifyAccessToken(token);
      req.user = payload;
    } catch {
      // Ignore invalid token for optional auth
    }
  }

  runWithContext(req.user, next);
}

export function requireRole(...allowedRoles: string[]) {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ success: false, message: "Unauthorized" });
      return;
    }

    const userRoles = req.user.roles || [];
    const isSuperAdmin = isSuperAdminRole(userRoles);
    const isAdmin = isAdminUserRole(userRoles);

    if (isAdmin) {
      const adminIps = process.env.ADMIN_ALLOWED_IPS;
      if (adminIps) {
        const forwarded = req.headers['x-forwarded-for'] as string | undefined;
        const ip = (forwarded ? forwarded.split(',')[0]?.trim() : undefined) || req.socket?.remoteAddress || 'unknown';
        const allowedIps = adminIps.split(',').map(i => i.trim());
        if (!allowedIps.includes(ip) && !allowedIps.includes('*')) {
          res.status(403).json({ success: false, message: "Access Denied: IP address not whitelisted for admin actions." });
          return;
        }
      }
    }

    if (isSuperAdmin) {
      next();
      return;
    }

    const normalizedAllowed = allowedRoles.map(r => normalizeRole(r));
    const hasAllowedRole = userRoles.some(userRole =>
      normalizedAllowed.includes(normalizeRole(userRole))
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
    const isSuperAdmin = isSuperAdminRole(userRoles);
    const isAdmin = isAdminUserRole(userRoles);

    if (isAdmin) {
      const adminIps = process.env.ADMIN_ALLOWED_IPS;
      if (adminIps) {
        const forwarded = req.headers['x-forwarded-for'] as string | undefined;
        const ip = (forwarded ? forwarded.split(',')[0]?.trim() : undefined) || req.socket?.remoteAddress || 'unknown';
        const allowedIps = adminIps.split(',').map(i => i.trim());
        if (!allowedIps.includes(ip) && !allowedIps.includes('*')) {
          res.status(403).json({ success: false, message: "Access Denied: IP address not whitelisted for admin actions." });
          return;
        }
      }
    }

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
