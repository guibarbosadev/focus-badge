import type { SessionConfig } from "./index.js";

export type SessionBadge = Pick<
    SessionConfig,
    "id" | "name" | "startDate" | "lastCheckedAt" | "endDate" | "status"
>;

export interface SessionDocument extends SessionConfig {
    ownerId: string; // user id who owns this session
    createdAt: string;
}
