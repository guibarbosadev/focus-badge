import express, { Request, Response } from 'express';
import { OAuth2Client } from 'google-auth-library';
import { getDatabase } from '../config/database.js';
import { signToken } from '../utils/jwt.js';
import { requireAuth, blacklistToken } from '../middleware/authMiddleware.js';
import type { UserProfile, LoginResponse } from '../../../common/src/auth.js';

const router = express.Router();

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
const client = new OAuth2Client(GOOGLE_CLIENT_ID);

// POST /auth/google
// body: { idToken }
router.post('/google', async (req: Request, res: Response) => {
  const { idToken } = req.body || {};
  if (!idToken) return res.status(400).json({ error: 'Missing idToken' });

  try {
    const ticket = await client.verifyIdToken({ idToken, audience: GOOGLE_CLIENT_ID || undefined });
    const payload = ticket.getPayload();
    if (!payload) return res.status(401).json({ error: 'Invalid idToken' });

    const googleSub = payload.sub as string;
    const email = payload.email as string;
    const name = payload.name as string | undefined;
    const picture = payload.picture as string | undefined;

    // Persist or update user in our DB
    const db = getDatabase();
    if (!db) return res.status(500).json({ error: 'Database not initialized' });

    const users = db.collection('users');
    const now = new Date().toISOString();

    const update = {
      $set: {
        email,
        name,
        avatarUrl: picture,
        provider: 'google',
        providerId: googleSub,
        lastLoginAt: now,
      },
      $setOnInsert: {
        createdAt: now,
      },
    };

    const result = await users.findOneAndUpdate({ provider: 'google', providerId: googleSub }, update, { upsert: true, returnDocument: 'after' });
    if (!result || !result.value) {
      return res.status(500).json({ error: 'Failed to create or fetch user' });
    }
    const userDoc = result.value as any;

    const user: UserProfile = {
      id: userDoc._id.toString(),
      email: userDoc.email,
      name: userDoc.name,
      avatarUrl: userDoc.avatarUrl,
      provider: 'google',
      providerId: userDoc.providerId,
      createdAt: userDoc.createdAt,
      lastLoginAt: userDoc.lastLoginAt,
    };

    const token = signToken({ userId: user.id, provider: 'google' });

    const response: LoginResponse = { token, user };
    return res.json(response);
  } catch (err: any) {
    console.error('Google auth error', err);
    return res.status(401).json({ error: 'Failed to verify Google token' });
  }
});

// POST /auth/logout
// Authorization: Bearer <token>
router.post('/logout', requireAuth, async (req: Request, res: Response) => {
  const authHeader = req.headers.authorization as string | undefined;
  if (!authHeader) return res.status(400).json({ error: 'Missing Authorization' });
  const token = authHeader.split(' ')[1];
  // Optionally extract exp from token to set blacklist ttl; we'll just blacklist for default period
  blacklistToken(token);
  return res.json({ ok: true });
});

export default router;
