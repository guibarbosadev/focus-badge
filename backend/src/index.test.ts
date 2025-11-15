import request from 'supertest';
import app from './index.js';
import { connectToDatabase, closeDatabaseConnection } from './config/database.js';

describe('API Routes', () => {
    beforeAll(async () => {
        // Connect to test database or mock connection
        try {
            await connectToDatabase();
        } catch (error) {
            // If MongoDB is not available, we can still test the routes
            console.warn('MongoDB connection failed in tests, continuing without DB');
        }
    });

    afterAll(async () => {
        await closeDatabaseConnection();
    });

    describe('GET /', () => {
        it('should return a success message', async () => {
            const response = await request(app).get('/');

            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('message');
            expect(response.body.message).toBe('FocusBadge API is running');
        });
    });
});

