import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../utils/jwt.js';

// Simple in-memory blacklist for tokens (for logout). In production use persistent store.
const tokenBlacklist = new Map<string, number>(); // token -> expiry timestamp (ms)

export function blacklistToken(token: string, expSeconds?: number) {
  const now = Date.now();
  const expireAt = expSeconds ? now + expSeconds * 1000 : now + 7 * 24 * 60 * 60 * 1000;
  tokenBlacklist.set(token, expireAt);
}

export function isBlacklisted(token: string) {
  const exp = tokenBlacklist.get(token);
  if (!exp) return false;
  if (Date.now() > exp) {
    tokenBlacklist.delete(token);
    return false;
  }
  return true;
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const auth = req.headers.authorization;
  if (!auth) return res.status(401).json({ error: 'Missing Authorization header' });
  const parts = auth.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') return res.status(401).json({ error: 'Invalid Authorization header' });
  const token = parts[1];
  if (isBlacklisted(token)) return res.status(401).json({ error: 'Token is logged out' });
  const payload = verifyToken(token);
  if (!payload) return res.status(401).json({ error: 'Invalid token' });
  // attach payload to request for downstream handlers
  (req as any).auth = payload;
  next();
}
