import request from "supertest";
import app from "../index.js";
import * as dbModule from "../config/database.js";
import { signToken } from "../utils/jwt.js";
import { badgeState } from "../routes/badge/index.js";

process.env.JWT_SECRET = process.env.JWT_SECRET || "test-secret";

describe("Sessions routes", () => {
    const store: Record<string, any> = {};
    const sessionsCollection = {
        insertOne: jest.fn(async (doc: any) => {
            store[doc.id] = { ...doc };
            return { insertedId: doc.id };
        }),
        findOne: jest.fn(async (filter: any) => store[filter.id] ?? null),
        updateOne: jest.fn(async (filter: any, update: any) => {
            Object.assign(store[filter.id], update.$set);
            return { matchedCount: 1 };
        }),
    } as any;

    const fakeDb = { collection: jest.fn(() => sessionsCollection) } as any;
    const owner = () => `Bearer ${signToken({ userId: "user-1", provider: "google" })}`;
    const stranger = () => `Bearer ${signToken({ userId: "user-2", provider: "google" })}`;

    const create = (body: any = {}) =>
        request(app)
            .post("/session")
            .set("Authorization", owner())
            .send({
                blockedSites: ["a.com", " B.com "],
                name: "<script>x</script>",
                device: { deviceId: "dev-1" },
                ...body,
            });

    beforeAll(() => {
        jest.spyOn(dbModule, "getDatabase").mockResolvedValue(fakeDb);
    });

    afterAll(() => {
        jest.restoreAllMocks();
    });

    it("rejects invalid session payload", async () => {
        const res = await request(app)
            .post("/session")
            .set("Authorization", owner())
            .send({ blockedSites: [], endDate: "2000-01-01" });
        expect(res.status).toBe(400);
        expect(res.body.details).toHaveLength(3);
    });

    it("creates an active session with a server-generated id", async () => {
        const res = await create({ id: "client-id", status: "completed" });
        expect(res.status).toBe(201);
        expect(res.body.session.id).not.toBe("client-id");
        expect(res.body.session.status).toBe("active");
        expect(res.body.session.blockedSites).toEqual(["a.com", "b.com"]);
    });

    it("merges additions on ping and refreshes the token", async () => {
        const { body } = await create();
        const res = await request(app)
            .post(`/session/${body.session.id}/ping`)
            .set("Authorization", owner())
            .send({ blockedSites: ["a.com", "b.com", "c.com"] });
        expect(res.status).toBe(200);
        expect(res.body.session.status).toBe("active");
        expect(res.body.session.blockedSites).toEqual(["a.com", "b.com", "c.com"]);
        expect(typeof res.body.token).toBe("string");
    });

    it("stains the session when a site is removed", async () => {
        const { body } = await create();
        const res = await request(app)
            .post(`/session/${body.session.id}/ping`)
            .set("Authorization", owner())
            .send({ blockedSites: ["a.com"] });
        expect(res.body.session.status).toBe("stained");
        expect(res.body.session.stainReason).toContain("b.com");
        // canonical list keeps the removed site
        expect(res.body.session.blockedSites).toEqual(["a.com", "b.com"]);
    });

    it("completes the session on the first ping after endDate", async () => {
        const { body } = await create({ endDate: new Date(Date.now() + 60_000).toISOString() });
        store[body.session.id].endDate = new Date(Date.now() - 1000).toISOString();
        const res = await request(app)
            .post(`/session/${body.session.id}/ping`)
            .set("Authorization", owner())
            .send({ blockedSites: ["a.com", "b.com"] });
        expect(res.body.session.status).toBe("completed");
    });

    it("prevents other users from pinging or ending the session", async () => {
        const { body } = await create();
        const ping = await request(app)
            .post(`/session/${body.session.id}/ping`)
            .set("Authorization", stranger())
            .send({ blockedSites: [] });
        const end = await request(app)
            .post(`/session/${body.session.id}/end`)
            .set("Authorization", stranger());
        expect(ping.status).toBe(403);
        expect(end.status).toBe(403);
    });

    it("lets the owner end the session early", async () => {
        const { body } = await create();
        const res = await request(app)
            .post(`/session/${body.session.id}/end`)
            .set("Authorization", owner());
        expect(res.body.session.status).toBe("removed");
        expect(res.body.session.endDate).toBeDefined();
    });

    it("serves a public badge without the blocklist", async () => {
        const { body } = await create();
        const json = await request(app).get(`/badge/${body.session.id}`);
        expect(json.status).toBe(200);
        expect(json.body.badge.id).toBe(body.session.id);
        expect(json.body.badge.blockedSites).toBeUndefined();
        expect(json.body.state.label).toBe("Focusing — clean");

        const html = await request(app)
            .get(`/badge/${body.session.id}`)
            .set("Accept", "text/html");
        expect(html.type).toBe("text/html");
        expect(html.text).not.toContain("a.com");
        expect(html.text).not.toContain("<script>x</script>");
    });

    it("marks stale or never-finished sessions as unverified", () => {
        const hoursAgo = (h: number) => new Date(Date.now() - h * 3_600_000).toISOString();
        const base = { id: "x", startDate: hoursAgo(10), status: "active" as const };
        expect(badgeState({ ...base, lastCheckedAt: hoursAgo(1) }).label).toBe("Focusing — clean");
        expect(badgeState({ ...base, lastCheckedAt: hoursAgo(5) }).label).toBe("Unverified");
        expect(
            badgeState({ ...base, lastCheckedAt: hoursAgo(1), endDate: hoursAgo(0.5) }).label
        ).toBe("Unverified");
    });
});
