import type { SessionConfig, DeviceSpecs } from "./index.js";

export type SessionBadge = Pick<
    SessionConfig,
    | "id"
    | "startDate"
    | "lastCheckedAt"
    | "endDate"
    | "status"
    | "existsLocally"
> & { device: Pick<DeviceSpecs, "deviceId" | "label"> };

export interface SessionDocument extends SessionConfig {
    ownerId: string; // user id who owns this session
    createdAt: string;
}
