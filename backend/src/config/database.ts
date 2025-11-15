/**
 * Serverless-optimized MongoDB connection
 * Use this version when deploying to Vercel/Netlify Functions
 * 
 * Features:
 * - Connection pooling optimized for serverless
 * - Reuses connections when functions are kept warm
 * - Lower connection limits for free tier
 */

import { MongoClient, Db } from 'mongodb';
import dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/focusbadge';

// Cache connections (Vercel keeps functions warm between invocations)
let cachedClient: MongoClient | null = null;
let cachedDb: Db | null = null;

export async function connectToDatabase(): Promise<Db> {
    // Reuse connection if available (serverless functions can be kept warm)
    if (cachedClient && cachedDb) {
        return cachedDb;
    }

    try {
        // Optimize for serverless: lower connection pool, faster timeouts
        const client = new MongoClient(MONGODB_URI, {
            maxPoolSize: 10, // Lower for free tier (MongoDB Atlas M0 allows 100)
            minPoolSize: 0, // Don't maintain idle connections
            maxIdleTimeMS: 30000, // Close idle connections after 30s
            serverSelectionTimeoutMS: 5000, // Fail fast
            connectTimeoutMS: 10000,
        });

        await client.connect();
        cachedDb = client.db();
        cachedClient = client;
        console.log('Connected to MongoDB (serverless mode)');
        return cachedDb;
    } catch (error) {
        console.error('Failed to connect to MongoDB:', error);
        throw error;
    }
}

export async function closeDatabaseConnection(): Promise<void> {
    // In serverless, we typically don't close connections
    // as they're reused across invocations
    // Only close if explicitly needed (e.g., during tests)
    if (cachedClient) {
        await cachedClient.close();
        cachedClient = null;
        cachedDb = null;
        console.log('Disconnected from MongoDB');
    }
}

export function getDatabase(): Db | null {
    return cachedDb;
}

