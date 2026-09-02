import { Request, Response, NextFunction } from 'express';
import prisma from '../config/prisma';

function sanitizeData(data: any): any {
  if (!data || typeof data !== 'object') return data;
  const clone = JSON.parse(JSON.stringify(data));
  const sensitiveKeys = ['password', 'passwordConfirm', 'token', 'secret', 'creditCard', 'cvv'];

  const mask = (obj: any) => {
    if (!obj || typeof obj !== 'object') return;
    for (const key of Object.keys(obj)) {
      if (sensitiveKeys.includes(key.toLowerCase())) {
        obj[key] = '[REDACTED]';
      } else if (typeof obj[key] === 'object') {
        mask(obj[key]);
      }
    }
  };

  mask(clone);
  return clone;
}

function extractEntityId(paramsId: string | string[] | undefined, resBody: any): string | null {
  if (paramsId) return Array.isArray(paramsId) ? (paramsId[0] || null) : paramsId;
  if (!resBody || typeof resBody !== 'object') return null;

  if (resBody.id && typeof resBody.id === 'string') return resBody.id;
  if (resBody.data) {
    if (resBody.data.id && typeof resBody.data.id === 'string') return resBody.data.id;
    if (typeof resBody.data === 'object') {
      for (const val of Object.values(resBody.data)) {
        if (val && typeof val === 'object' && (val as any).id && typeof (val as any).id === 'string') {
          return (val as any).id;
        }
      }
    }
  }
  return null;
}

export const auditLog = (entity: string, action: string) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const forwardedFor = req.headers['x-forwarded-for'];
    const ipAddress = (Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor as string) || req.ip || '0.0.0.0';
    const userAgent = (req.headers['user-agent'] as string) || 'unknown';
    const rawData = req.body;

    let responseBody: any = null;

    // Intercept res.json to capture created entityId from response
    const originalJson = res.json;
    res.json = function (body: any) {
      responseBody = body;
      return originalJson.call(this, body);
    };

    res.on('finish', async () => {
      // Log successful state-changing operations (2xx)
      if (res.statusCode >= 200 && res.statusCode < 300) {
        try {
          const userId = (req as any).user?.userId || null;
          const entityId = extractEntityId(req.params.id, responseBody);
          const sanitizedBody = rawData ? sanitizeData(rawData) : null;

          await prisma.auditLog.create({
            data: {
              userId: userId || null,
              action,
              entity,
              entityId,
              newData: sanitizedBody ? JSON.parse(JSON.stringify(sanitizedBody)) : undefined,
              ipAddress,
              userAgent
            }
          });
        } catch (error: any) {
          // If FK fails because user ID isn't in User table, retry with userId: null
          if (error.code === 'P2003' || error.message?.includes('Foreign key')) {
            try {
              const userId = (req as any).user?.userId || null;
              const userEmail = (req as any).user?.email || null;
              const entityId = extractEntityId(req.params.id, responseBody);
              const sanitizedBody = rawData ? sanitizeData(rawData) : {};

              await prisma.auditLog.create({
                data: {
                  userId: null,
                  action,
                  entity,
                  entityId,
                  newData: JSON.parse(JSON.stringify({
                    ...sanitizedBody,
                    _attemptedUserId: userId,
                    _attemptedUserEmail: userEmail
                  })),
                  ipAddress,
                  userAgent
                }
              });
            } catch (fallbackErr) {
              console.error('[Audit Log Error]: Failed fallback audit log write', fallbackErr);
            }
          } else {
            console.error('[Audit Log Error]: Failed to write audit log', error);
          }
        }
      }
    });

    next();
  };
};
