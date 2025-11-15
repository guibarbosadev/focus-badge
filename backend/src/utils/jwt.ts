import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import type { AuthTokenPayload } from '../../../common/src/auth.js';

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

export function signToken(payload: { userId: string; provider: string }) {
  return (jwt as any).sign({ userId: payload.userId, provider: payload.provider }, JWT_SECRET as any, {
    expiresIn: JWT_EXPIRES_IN,
  });
}

export function verifyToken(token: string): AuthTokenPayload | null {
  try {
    const decoded = (jwt as any).verify(token, JWT_SECRET as any) as AuthTokenPayload;
    return decoded;
  } catch (err) {
    return null;
  }
}
