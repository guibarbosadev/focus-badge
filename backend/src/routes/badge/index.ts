import express, { Request, Response } from "express";
import { getDatabase } from "../../config/database.js";
import type {
    SessionDocument,
    SessionBadge,
} from "../../../../common/src/session.js";

const router = express.Router();

// GET /badge/:sessionId - get session badge (public, no auth required)
router.get("/:sessionId", async (req: Request, res: Response) => {
    const sessionId = req.params.sessionId;

    const db = getDatabase();
    if (!db) return res.status(500).json({ error: "Database not initialized" });

    const sessions = db.collection("sessions");
    const doc = await sessions.findOne({ id: sessionId });
    if (!doc) return res.status(404).json({ error: "Session not found" });
    const s = doc as unknown as SessionDocument;

    const badge: SessionBadge = {
        id: s.id,
        startDate: s.startDate,
        lastCheckedAt: s.lastCheckedAt,
        endDate: s.endDate,
        status: s.status,
        device: { deviceId: s.device.deviceId, label: s.device.label },
        existsLocally: s.existsLocally,
    };

    return res.json({ badge });
});

export default router;
