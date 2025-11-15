import request from 'supertest';
import app from '../index.js';
import * as dbModule from '../config/database.js';
import { OAuth2Client } from 'google-auth-library';

// Ensure env for tests
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';
process.env.GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || 'test-client-id';

describe('Auth routes', () => {
  const fakePayload = {
    sub: 'google-sub-123',
    email: 'test@example.com',
    name: 'Test User',
    picture: 'https://example.com/avatar.png',
  };

  beforeAll(() => {
    // Mock Google verification to return our fake payload
    (OAuth2Client as any).prototype.verifyIdToken = jest.fn().mockResolvedValue({
      getPayload: () => fakePayload,
    });

    // Mock DB getDatabase to return a fake collection
    const usersCollection = {
      findOneAndUpdate: jest.fn().mockImplementation(async (_filter: any, _update: any, _opts: any) => {
        const userDoc = {
          _id: { toString: () => '64-test-id' },
          email: fakePayload.email,
          name: fakePayload.name,
          avatarUrl: fakePayload.picture,
          provider: 'google',
          providerId: fakePayload.sub,
          createdAt: new Date().toISOString(),
          lastLoginAt: new Date().toISOString(),
        };
        return { value: userDoc };
      }),
    };

    const fakeDb = {
      collection: jest.fn().mockReturnValue(usersCollection),
    } as unknown as any;

    jest.spyOn(dbModule, 'getDatabase').mockReturnValue(fakeDb);
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  it('returns 400 when idToken is missing', async () => {
    const res = await request(app).post('/auth/google').send({});
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  it('accepts Google idToken and returns token and user', async () => {
    const res = await request(app).post('/auth/google').send({ idToken: 'valid-token' });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('token');
    expect(res.body).toHaveProperty('user');
    expect(res.body.user.email).toBe(fakePayload.email);
    expect(typeof res.body.token).toBe('string');
  });

  it('allows logout and rejects the same token afterwards', async () => {
    // sign in first
    const login = await request(app).post('/auth/google').send({ idToken: 'valid-token' });
    expect(login.status).toBe(200);
    const token = login.body.token as string;

    // logout should accept token
    const out = await request(app).post('/auth/logout').set('Authorization', `Bearer ${token}`).send();
    expect(out.status).toBe(200);
    expect(out.body).toEqual({ ok: true });

    // second attempt with same token should be unauthorized
    const out2 = await request(app).post('/auth/logout').set('Authorization', `Bearer ${token}`).send();
    expect(out2.status).toBe(401);
  });
});
