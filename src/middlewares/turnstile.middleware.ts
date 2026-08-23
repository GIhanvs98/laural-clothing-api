import { Request, Response, NextFunction } from 'express';

const VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

export const verifyTurnstile = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = req.body.turnstileToken;

    if (!token) {
      return res.status(403).json({ error: 'CAPTCHA token is required.' });
    }

    const secret = process.env.TURNSTILE_SECRET_KEY;
    if (!secret) {
      console.error('[Turnstile] TURNSTILE_SECRET_KEY is not defined in environment variables.');
      return res.status(500).json({ error: 'Internal server error.' });
    }

    const response = await fetch(VERIFY_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        secret: secret,
        response: token,
        remoteip: req.ip,
      }),
    });

    const data = await response.json();

    if (data.success) {
      return next();
    } else {
      console.warn(`[Turnstile] Verification failed:`, data['error-codes']);
      return res.status(403).json({ error: 'CAPTCHA verification failed. Please try again.' });
    }
  } catch (error) {
    console.error('[Turnstile] Error during verification:', error);
    return res.status(500).json({ error: 'Failed to verify CAPTCHA.' });
  }
};
