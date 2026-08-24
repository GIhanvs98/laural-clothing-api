import { Request, Response } from 'express';
import { otpService } from '../services/otp.service';

export const sendOtp = async (req: Request, res: Response) => {
  try {
    const { phone } = req.body;
    
    if (!phone) {
      return res.status(400).json({ error: 'Phone number is required' });
    }

    await otpService.sendOtp(phone);
    
    res.status(200).json({ message: 'OTP sent successfully' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const verifyOtp = async (req: Request, res: Response) => {
  try {
    const { phone, otp } = req.body;

    if (!phone || !otp) {
      return res.status(400).json({ error: 'Phone number and OTP are required' });
    }

    await otpService.verifyOtp(phone, otp);
    
    // Generate a secure verification token for the checkout process
    const crypto = require('crypto');
    const verificationToken = crypto.randomBytes(32).toString('hex');
    
    // Store it in Redis for 15 minutes
    const tokenKey = `verified_phone:${phone}`;
    const { redisClient } = require('../config/redis');
    await redisClient.set(tokenKey, verificationToken, 'EX', 900); // 15 mins
    
    res.status(200).json({ 
      message: 'OTP verified successfully',
      verificationToken
    });
  } catch (error: any) {
    if (error.message === 'Invalid OTP' || error.message.includes('expired')) {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: error.message });
  }
};
