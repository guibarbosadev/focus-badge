import { MongoClient, Db } from 'mongodb';
import dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/focusbadge';

let client: MongoClient | null = null;
let db: Db | null = null;

export async function connectToDatabase(): Promise<Db> {
    if (db) {
        return db;
    }

    try {
        client = new MongoClient(MONGODB_URI);
        await client.connect();
        db = client.db();
        console.log('Connected to MongoDB');
        return db;
    } catch (error) {
        console.error('Failed to connect to MongoDB:', error);
        throw error;
    }
}

export async function closeDatabaseConnection(): Promise<void> {
    if (client) {
        await client.close();
        client = null;
        db = null;
        console.log('Disconnected from MongoDB');
    }
}

export function getDatabase(): Db | null {
    return db;
}

