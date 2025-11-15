import express, { Request, Response } from "express";
import dotenv from "dotenv";
import {
    connectToDatabase,
    closeDatabaseConnection,
} from "./config/database.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());

// Auth routes
import authRouter from "./routes/auth/index.js";
app.use("/auth", authRouter);

// Session routes
import sessionRouter from "./routes/sessions/index.js";
app.use("/session", sessionRouter);

// Badge routes
import badgeRouter from "./routes/badge/index.js";
app.use("/badge", badgeRouter);

// Routes
app.get("/", (req: Request, res: Response) => {
    res.json({ message: "FocusBadge API is running" });
});

// Only start server when not running tests. Jest sets `JEST_WORKER_ID` in the environment.
const isTestEnv =
    process.env.JEST_WORKER_ID !== undefined || process.env.NODE_ENV === "test";
if (!isTestEnv) {
    // Initialize database connection
    connectToDatabase().catch((error) => {
        console.error("Failed to initialize database connection:", error);
        process.exit(1);
    });

    // Graceful shutdown
    process.on("SIGTERM", async () => {
        console.log("SIGTERM received, shutting down gracefully");
        await closeDatabaseConnection();
        process.exit(0);
    });

    process.on("SIGINT", async () => {
        console.log("SIGINT received, shutting down gracefully");
        await closeDatabaseConnection();
        process.exit(0);
    });

    // Start server
    app.listen(PORT, () => {
        console.log(`Server is running on port ${PORT}`);
    });
}

export default app;
