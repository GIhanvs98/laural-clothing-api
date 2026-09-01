import { Request, Response, NextFunction } from "express";
import { redisClient } from "../config/redis";
import { logger } from "../utils/logger";

export const emergencyKillSwitch = async (req: Request, res: Response, next: NextFunction) => {
  if (redisClient.status !== 'ready') {
    return next();
  }

  try {
    const isEmergency = await redisClient.get("emergency:readonly");
    
    if (isEmergency === "true" || isEmergency === "1") {
      // If the emergency switch is active, only allow GET, HEAD, OPTIONS requests
      if (req.method !== 'GET' && req.method !== 'HEAD' && req.method !== 'OPTIONS') {
        res.status(503).json({
          success: false,
          message: "Service is temporarily in read-only mode due to an emergency security lockdown."
        });
        return;
      }
    }
    
    next();
  } catch (error) {
    // If Redis error occurs, fail open smoothly
    logger.warn("Failed to check emergency kill switch in Redis:", (error as any)?.message || error);
    next();
  }
};
