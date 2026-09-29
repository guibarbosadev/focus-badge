import express, { Request, Response } from "express";
import { getDatabase } from "../../config/database.js";
import type {
    SessionDocument,
    SessionBadge,
} from "../../../../common/src/session.js";

const router = express.Router();

// Hourly pings; allow a couple of missed alarms before calling a session unverified.
const STALE_MS = 3 * 60 * 60 * 1000;

export function badgeState(b: SessionBadge, now = Date.now()) {
    if (b.status === "stained") return { label: "Stained", tone: "bad" };
    if (b.status === "removed") return { label: "Ended early", tone: "bad" };
    if (b.status === "completed") return { label: "Completed clean", tone: "good" };
    const last = Date.parse(b.lastCheckedAt ?? b.startDate);
    const end = b.endDate ? Date.parse(b.endDate) : Infinity;
    // Past the end without a final ping means the device stopped reporting (e.g. uninstalled).
    if (now >= end || now - last > STALE_MS)
        return { label: "Unverified", tone: "warn" };
    return { label: "Focusing — clean", tone: "good" };
}

const escapeHtml = (s: string) =>
    s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

const fmt = (iso?: string) =>
    iso ? `<time datetime="${escapeHtml(iso)}">${escapeHtml(iso)}</time>` : "—";

function renderBadge(b: SessionBadge) {
    const state = badgeState(b);
    const title = escapeHtml(b.name || "Focus session");
    return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title} · FocusBadge</title>
<meta property="og:title" content="${title} · ${state.label}">
<meta property="og:description" content="Verified by the FocusBadge browser extension.">
<style>
:root{--bg:#f5f6f7;--card:#fff;--text:#1f2933;--muted:#5f6b7c;--good:#1e8e3e;--warn:#b06000;--bad:#c5221f;color-scheme:light dark}
@media (prefers-color-scheme:dark){:root{--bg:#0f172a;--card:#1e293b;--text:#f1f5f9;--muted:#94a3b8;--good:#4ade80;--warn:#fbbf24;--bad:#f87171}}
body{margin:0;min-height:100vh;display:grid;place-items:center;background:var(--bg);color:var(--text);font:16px/1.5 system-ui,sans-serif;padding:16px;box-sizing:border-box}
.card{background:var(--card);border-radius:16px;padding:28px;max-width:420px;width:100%;box-shadow:0 8px 24px rgba(0,0,0,.08)}
h1{margin:0 0 8px;font-size:22px}.state{font-weight:700;font-size:18px;color:var(--${state.tone})}
dl{display:grid;grid-template-columns:auto 1fr;gap:6px 16px;margin:20px 0 0;color:var(--muted);font-size:14px}dd{margin:0;color:var(--text)}
footer{margin-top:20px;font-size:13px;color:var(--muted)}a{color:inherit}
</style>
</head>
<body>
<main class="card">
<h1>${title}</h1>
<div class="state">${state.label}</div>
<dl>
<dt>Started</dt><dd>${fmt(b.startDate)}</dd>
<dt>Ends</dt><dd>${fmt(b.endDate)}</dd>
<dt>Last check-in</dt><dd>${fmt(b.lastCheckedAt)}</dd>
</dl>
<footer>Verified by <a href="https://focusbadge.com">FocusBadge</a></footer>
</main>
<script>for(const t of document.querySelectorAll("time"))t.textContent=new Date(t.dateTime).toLocaleString()</script>
</body>
</html>`;
}

// GET /badge/:sessionId - public; HTML for browsers, JSON otherwise. Never exposes the blocklist.
router.get("/:sessionId", async (req: Request, res: Response) => {
    const db = await getDatabase();
    if (!db) return res.status(500).json({ error: "Database not initialized" });

    const doc = await db.collection("sessions").findOne({ id: req.params.sessionId });
    if (!doc) return res.status(404).json({ error: "Session not found" });
    const s = doc as unknown as SessionDocument;

    const badge: SessionBadge = {
        id: s.id,
        name: s.name,
        startDate: s.startDate,
        lastCheckedAt: s.lastCheckedAt,
        endDate: s.endDate,
        status: s.status,
    };

    if (req.accepts(["json", "html"]) === "html")
        return res.type("html").send(renderBadge(badge));
    return res.json({ badge, state: badgeState(badge) });
});

export default router;
