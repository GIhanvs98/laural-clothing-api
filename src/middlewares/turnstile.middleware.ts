import { Request, Response, NextFunction } from 'express';

const VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

// Cloudflare test secrets that always pass/fail — safe for dev/CI
// https://developers.cloudflare.com/turnstile/reference/testing/
const TEST_ALWAYS_PASS_SECRET = '1x0000000000000000000000000000000AA';

export const verifyTurnstile = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const secret = process.env.TURNSTILE_SECRET_KEY;

    // Dev bypass: if key not set or we're in development, skip verification
    // In production TURNSTILE_SECRET_KEY MUST be set
    if (!secret || process.env.NODE_ENV !== 'production') {
      if (process.env.NODE_ENV === 'production' && !secret) {
        console.error('[Turnstile] TURNSTILE_SECRET_KEY is not defined in production!');
        return res.status(500).json({ error: 'Server security configuration error.' });
      }
      // Skip CAPTCHA in non-production environments
      return next();
    }

    const token = req.body.turnstileToken;

    if (!token) {
      return res.status(403).json({ 
        success: false,
        error: 'CAPTCHA verification is required.' 
      });
    }

    const response = await fetch(VERIFY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        secret,
        response: token,
        remoteip: req.ip,
      }),
    });

    const data = await response.json();

    if (data.success) {
      return next();
    } else {
      console.warn(`[Turnstile] Verification failed from IP ${req.ip}:`, data['error-codes']);
      return res.status(403).json({ 
        success: false,
        error: 'CAPTCHA verification failed. Please refresh and try again.' 
      });
    }
  } catch (error) {
    console.error('[Turnstile] Error during verification:', error);
    // Fail open on network errors (Cloudflare outage) — log and proceed
    console.error('[Turnstile] Failing open due to network error — monitor for abuse');
    return next();
  }
};
