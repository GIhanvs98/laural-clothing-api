import jwt, { SignOptions, Secret } from "jsonwebtoken";

const JWT_SECRET: Secret = process.env.JWT_SECRET || "laural-clothing-jwt-secret-key-2026";
const JWT_REFRESH_SECRET: Secret = process.env.JWT_REFRESH_SECRET || "laural-clothing-jwt-refresh-secret-key-2026";
const ACCESS_TOKEN_EXPIRY = (process.env.JWT_ACCESS_EXPIRY || "1h") as any;
const REFRESH_TOKEN_EXPIRY = (process.env.JWT_REFRESH_EXPIRY || "7d") as any;

export interface JWTPayload {
  userId: string;
  email: string;
  roles: string[];
  permissions: string[];
}

export function generateAccessToken(payload: JWTPayload): string {
  const options: SignOptions = { expiresIn: ACCESS_TOKEN_EXPIRY };
  return jwt.sign(payload, JWT_SECRET, options);
}

export function generateRefreshToken(userId: string): string {
  const options: SignOptions = { expiresIn: REFRESH_TOKEN_EXPIRY };
  return jwt.sign({ userId }, JWT_REFRESH_SECRET, options);
}

export function verifyAccessToken(token: string): JWTPayload {
  return jwt.verify(token, JWT_SECRET) as JWTPayload;
}

export function verifyRefreshToken(token: string): { userId: string } {
  return jwt.verify(token, JWT_REFRESH_SECRET) as { userId: string };
}
