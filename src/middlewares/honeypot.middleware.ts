import { Request, Response, NextFunction } from 'express';

/**
 * Honeypot Middleware
 * Checks for the presence of a hidden '_honeypot' field.
 * If filled, it implies a bot is blindly filling out the form.
 * We return a fake 200 OK to waste the bot's resources and avoid giving feedback.
 */
export const checkHoneypot = (req: Request, res: Response, next: NextFunction): void => {
  if (req.body && req.body._honeypot) {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    console.warn(`[Bot Detected] Honeypot filled by IP: ${ip} on ${req.method} ${req.originalUrl}`);
    
    // Fake success response to trick the bot
    res.status(200).json({
      success: true,
      message: "Action successful."
    });
    return;
  }
  
  next();
};
