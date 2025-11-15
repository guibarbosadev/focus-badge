import request from 'supertest';
import app from '../index.js';
import * as dbModule from '../config/database.js';
import { signToken } from '../utils/jwt.js';

process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';

describe('Sessions routes', () => {
  let store: Record<string, any> = {};
  const sessionsCollection = {
    insertOne: jest.fn(async (doc: any) => {
      store[doc.id] = { ...doc };
      return { insertedId: doc.id };
    }),
    findOne: jest.fn(async (filter: any) => {
      if (filter.id) return store[filter.id] || null;
      if (filter.ownerId) {
        // return first matching
        const keys = Object.keys(store);
        for (const k of keys) {
          if (store[k].ownerId === filter.ownerId) return store[k];
        }
      }
      return null;
    }),
    updateOne: jest.fn(async (filter: any, update: any) => {
      const s = store[filter.id];
      if (!s) return { matchedCount: 0 };
      if (update.$set) Object.assign(s, update.$set);
      store[filter.id] = s;
      return { matchedCount: 1 };
    }),
    find: jest.fn(() => ({
      sort: () => ({
        limit: () => ({
          toArray: async () => Object.values(store),
        }),
      }),
    })),
  } as any;

  const fakeDb = {
    collection: jest.fn((name: string) => {
      if (name === 'sessions') return sessionsCollection;
      return null;
    }),
  } as any;

  beforeAll(() => {
    jest.spyOn(dbModule, 'getDatabase').mockReturnValue(fakeDb as any);
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  it('rejects invalid session payload', async () => {
    const token = signToken({ userId: 'user-1', provider: 'google' });
    const res = await request(app).post('/sessions').set('Authorization', `Bearer ${token}`).send({});
    expect(res.status).toBe(400);
  });

  it('creates a session and returns it', async () => {
    const token = signToken({ userId: 'user-1', provider: 'google' });
    const payload = {
      id: 'session-1',
      blockedSites: ['a.com'],
      startDate: new Date().toISOString(),
      status: 'active',
      device: { deviceId: 'dev-1', label: 'Laptop' },
      existsLocally: true,
    };
    const res = await request(app).post('/sessions').set('Authorization', `Bearer ${token}`).send(payload);
    expect(res.status).toBe(201);
    expect(res.body.session).toBeDefined();
    expect(res.body.session.id).toBe(payload.id);
  });

  it('allows owner to ping and updates lastCheckedAt', async () => {
    const token = signToken({ userId: 'user-1', provider: 'google' });
    const res = await request(app).post('/sessions/session-1/ping').set('Authorization', `Bearer ${token}`).send();
    expect(res.status).toBe(200);
    expect(res.body.session.lastCheckedAt).toBeDefined();
  });

  it('prevents other users from updating session', async () => {
    const token = signToken({ userId: 'user-2', provider: 'google' });
    const res = await request(app).post('/sessions/session-1/ping').set('Authorization', `Bearer ${token}`).send();
    expect(res.status).toBe(403);
  });

  it('allows owner to change status to removed and sets endDate', async () => {
    const token = signToken({ userId: 'user-1', provider: 'google' });
    const res = await request(app).patch('/sessions/session-1/status').set('Authorization', `Bearer ${token}`).send({ status: 'removed' });
    expect(res.status).toBe(200);
    expect(res.body.session.status).toBe('removed');
    expect(res.body.session.endDate).toBeDefined();
  });

  it('returns current badge for owner', async () => {
    const token = signToken({ userId: 'user-1', provider: 'google' });
    const res = await request(app).get('/sessions/current-badge').set('Authorization', `Bearer ${token}`).send();
    expect(res.status).toBe(200);
    expect(res.body.badge).toBeDefined();
    expect(res.body.badge.id).toBe('session-1');
  });
});
