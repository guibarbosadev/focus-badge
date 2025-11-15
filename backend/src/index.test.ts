import request from "supertest";
import app from "./index.js";
import {
    connectToDatabase,
    closeDatabaseConnection,
} from "./config/database.js";
import * as dbModule from "./config/database.js";

describe("API Routes", () => {
    beforeAll(async () => {
        // Mock database connection in tests to avoid network calls
        jest.spyOn(dbModule, "connectToDatabase").mockImplementation(
            async () => {
                return null as any;
            }
        );
        jest.spyOn(dbModule, "closeDatabaseConnection").mockImplementation(
            async () => {}
        );
        try {
            await connectToDatabase();
        } catch (error) {
            console.warn(
                "MongoDB connection failed in tests, continuing without DB"
            );
        }
    });

    afterAll(async () => {
        await closeDatabaseConnection();
    });

    describe("GET /", () => {
        it("should return a success message", async () => {
            const response = await request(app).get("/");

            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty("message");
            expect(response.body.message).toBe("FocusBadge API is running");
        });
    });
});
