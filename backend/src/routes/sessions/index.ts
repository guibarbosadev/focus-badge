import express, { Request, Response } from "express";
import { getDatabase } from "../../config/database.js";
import { requireAuth } from "../../middleware/authMiddleware.js";
import type { SessionConfig } from "../../../../common/src/index.js";
import type {
    SessionDocument,
    SessionBadge,
} from "../../../../common/src/session.js";

const router = express.Router();

function isISODateString(v: any) {
    return typeof v === "string" && !Number.isNaN(Date.parse(v));
}

function validateSessionPayload(body: any): {
    valid: boolean;
    errors?: string[];
} {
    const errors: string[] = [];
    if (!body) {
        errors.push("Missing body");
        return { valid: false, errors };
    }
    if (!body.id || typeof body.id !== "string")
        errors.push("id is required (string)");
    if (!Array.isArray(body.blockedSites))
        errors.push("blockedSites must be an array");
    if (!body.startDate || !isISODateString(body.startDate))
        errors.push("startDate must be an ISO date string");
    if (!body.status || typeof body.status !== "string")
        errors.push("status is required");
    if (
        !body.device ||
        typeof body.device !== "object" ||
        !body.device.deviceId
    )
        errors.push("device.deviceId is required");
    if (typeof body.existsLocally !== "boolean")
        errors.push("existsLocally must be boolean");
    return { valid: errors.length === 0, errors };
}

// POST /sessions - register a session (owner is the authenticated user)
router.post("/", requireAuth, async (req: Request, res: Response) => {
    const { valid, errors } = validateSessionPayload(req.body);
    if (!valid)
        return res
            .status(400)
            .json({ error: "Invalid payload", details: errors });

    const auth = (req as any).auth;
    const ownerId = auth.userId as string;

    const db = getDatabase();
    if (!db) return res.status(500).json({ error: "Database not initialized" });

    const sessions = db.collection("sessions");
    const now = new Date().toISOString();

    const sessionDoc: SessionDocument = {
        ownerId,
        blockedSites: req.body.blockedSites,
        id: req.body.id,
        startDate: req.body.startDate,
        lastCheckedAt: req.body.lastCheckedAt,
        endDate: req.body.endDate,
        status: req.body.status,
        device: req.body.device,
        existsLocally: req.body.existsLocally,
        createdAt: now,
    } as unknown as SessionDocument;

    try {
        await sessions.insertOne(sessionDoc as any);
        // Return the stored session (full)
        return res.status(201).json({ session: sessionDoc });
    } catch (err: any) {
        console.error("Failed to create session", err);
        return res.status(500).json({ error: "Failed to create session" });
    }
});

// POST /sessions/:id/ping - update lastCheckedAt
router.post("/:id/ping", requireAuth, async (req: Request, res: Response) => {
    const auth = (req as any).auth;
    const ownerId = auth.userId as string;
    const sessionId = req.params.id;

    const db = getDatabase();
    if (!db) return res.status(500).json({ error: "Database not initialized" });

    const sessions = db.collection("sessions");
    const now = new Date().toISOString();

    const existing = await sessions.findOne({ id: sessionId });
    if (!existing) return res.status(404).json({ error: "Session not found" });
    if (existing.ownerId !== ownerId)
        return res.status(403).json({ error: "Forbidden" });

    await sessions.updateOne(
        { id: sessionId },
        { $set: { lastCheckedAt: now } }
    );
    const updated = await sessions.findOne({ id: sessionId });
    return res.json({ session: updated });
});

// PATCH /sessions/:id/status - update status field (stained/removed)
router.patch(
    "/:id/status",
    requireAuth,
    async (req: Request, res: Response) => {
        const auth = (req as any).auth;
        const ownerId = auth.userId as string;
        const sessionId = req.params.id;
        const { status } = req.body || {};
        if (!status || typeof status !== "string")
            return res.status(400).json({ error: "Missing status" });
        const allowed = [
            "stained",
            "removed",
            "active",
            "completed",
            "scheduled",
        ];
        if (!allowed.includes(status))
            return res.status(400).json({ error: "Invalid status" });

        const db = getDatabase();
        if (!db)
            return res.status(500).json({ error: "Database not initialized" });

        const sessions = db.collection("sessions");
        const existing = await sessions.findOne({ id: sessionId });
        if (!existing)
            return res.status(404).json({ error: "Session not found" });
        if (existing.ownerId !== ownerId)
            return res.status(403).json({ error: "Forbidden" });

        const update: any = { status };
        if (status === "removed" || status === "completed")
            update.endDate = new Date().toISOString();

        await sessions.updateOne({ id: sessionId }, { $set: update });
        const updated = await sessions.findOne({ id: sessionId });
        return res.json({ session: updated });
    }
);

export default router;
