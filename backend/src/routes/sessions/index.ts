import express, { Request, Response } from "express";
import { randomUUID } from "node:crypto";
import { getDatabase } from "../../config/database.js";
import { requireAuth } from "../../middleware/authMiddleware.js";
import { signToken } from "../../utils/jwt.js";
import type { SessionDocument } from "../../../../common/src/session.js";

const router = express.Router();

const MAX_SITES = 1000;
const MAX_NAME = 100;

// Returns a normalized, deduped host list, or null when the input is not a list of strings.
export function parseSites(value: unknown): string[] | null {
    if (!Array.isArray(value) || value.length > MAX_SITES) return null;
    if (!value.every((v) => typeof v === "string" && v.length <= 253))
        return null;
    const sites = value.map((v: string) => v.trim().toLowerCase()).filter(Boolean);
    return [...new Set(sites)];
}

function isFutureISODate(v: unknown) {
    return typeof v === "string" && Date.parse(v) > Date.now();
}

// Integrity rule: sites can be added but never removed. The backend list is canonical.
export function reconcile(session: SessionDocument, reported: string[]) {
    const missing = session.blockedSites.filter((s) => !reported.includes(s));
    const added = reported.filter((s) => !session.blockedSites.includes(s));
    const update: Partial<SessionDocument> = {
        lastCheckedAt: new Date().toISOString(),
        blockedSites: [...session.blockedSites, ...added],
    };
    if (session.status === "active" && missing.length) {
        update.status = "stained";
        update.stainReason = `Removed from blocklist: ${missing.join(", ")}`;
    } else if (
        session.status === "active" &&
        session.endDate &&
        Date.parse(session.endDate) <= Date.now()
    ) {
        update.status = "completed";
    }
    return update;
}

// POST /session - start a session (owner is the authenticated user)
// body: { blockedSites: string[], name?, endDate?, device: { deviceId, label?, os?, browser? } }
router.post("/", requireAuth, async (req: Request, res: Response) => {
    const body = req.body || {};
    const errors: string[] = [];
    const blockedSites = parseSites(body.blockedSites);
    if (!blockedSites?.length)
        errors.push("blockedSites must be a non-empty array of hosts");
    if (body.name !== undefined && (typeof body.name !== "string" || body.name.length > MAX_NAME))
        errors.push(`name must be a string up to ${MAX_NAME} chars`);
    if (body.endDate !== undefined && !isFutureISODate(body.endDate))
        errors.push("endDate must be a future ISO date string");
    if (typeof body.device?.deviceId !== "string")
        errors.push("device.deviceId is required");
    if (errors.length)
        return res.status(400).json({ error: "Invalid payload", details: errors });

    const db = await getDatabase();
    if (!db) return res.status(500).json({ error: "Database not initialized" });

    const now = new Date().toISOString();
    const { deviceId, label, os, browser } = body.device;
    const session: SessionDocument = {
        id: randomUUID(),
        ownerId: (req as any).auth.userId,
        name: body.name,
        blockedSites: blockedSites!,
        startDate: now,
        lastCheckedAt: now,
        endDate: body.endDate,
        status: "active",
        device: { deviceId, label, os, browser },
        createdAt: now,
    };
    await db.collection("sessions").insertOne({ ...session });
    return res.status(201).json({ session });
});

// POST /session/:id/ping - heartbeat; body: { blockedSites: string[] }
// Returns the canonical session plus a refreshed token so active devices stay signed in.
router.post("/:id/ping", requireAuth, async (req: Request, res: Response) => {
    const auth = (req as any).auth;
    const reported = parseSites(req.body?.blockedSites);
    if (!reported)
        return res.status(400).json({ error: "blockedSites must be an array of hosts" });

    const db = await getDatabase();
    if (!db) return res.status(500).json({ error: "Database not initialized" });

    const sessions = db.collection("sessions");
    const existing = (await sessions.findOne({ id: req.params.id })) as unknown as SessionDocument | null;
    if (!existing) return res.status(404).json({ error: "Session not found" });
    if (existing.ownerId !== auth.userId)
        return res.status(403).json({ error: "Forbidden" });

    const token = signToken({ userId: auth.userId, provider: auth.provider });
    if (existing.status === "removed" || existing.status === "completed")
        return res.json({ session: existing, token });

    const update = reconcile(existing, reported);
    await sessions.updateOne({ id: existing.id }, { $set: update });
    return res.json({ session: { ...existing, ...update }, token });
});

// POST /session/:id/end - owner gives up the session early; it shows as "removed" on the badge.
router.post("/:id/end", requireAuth, async (req: Request, res: Response) => {
    const db = await getDatabase();
    if (!db) return res.status(500).json({ error: "Database not initialized" });

    const sessions = db.collection("sessions");
    const existing = (await sessions.findOne({ id: req.params.id })) as unknown as SessionDocument | null;
    if (!existing) return res.status(404).json({ error: "Session not found" });
    if (existing.ownerId !== (req as any).auth.userId)
        return res.status(403).json({ error: "Forbidden" });
    if (existing.status !== "active") return res.json({ session: existing });

    const update = { status: "removed" as const, endDate: new Date().toISOString() };
    await sessions.updateOne({ id: existing.id }, { $set: update });
    return res.json({ session: { ...existing, ...update } });
});

export default router;
