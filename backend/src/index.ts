import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import { connectToDatabase, closeDatabaseConnection } from './config/database.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());

// Routes
app.get('/', (req: Request, res: Response) => {
    res.json({ message: 'FocusBadge API is running' });
});

// Only start server if this file is run directly (not when imported)
const isMainModule = process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/'));
if (isMainModule) {
    // Initialize database connection
    connectToDatabase().catch((error) => {
        console.error('Failed to initialize database connection:', error);
        process.exit(1);
    });

    // Graceful shutdown
    process.on('SIGTERM', async () => {
        console.log('SIGTERM received, shutting down gracefully');
        await closeDatabaseConnection();
        process.exit(0);
    });

    process.on('SIGINT', async () => {
        console.log('SIGINT received, shutting down gracefully');
        await closeDatabaseConnection();
        process.exit(0);
    });

    // Start server
    app.listen(PORT, () => {
        console.log(`Server is running on port ${PORT}`);
    });
}

export default app;

