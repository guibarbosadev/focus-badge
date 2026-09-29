export type SessionStatus =
    | "active"
    | "completed"
    | "stained"
    | "removed";

export interface DeviceSpecs {
    deviceId: string;
    label?: string;
    os?: string;
    browser?: string;
}

export interface SessionConfig {
    id: string;
    name?: string;
    blockedSites: string[]; // private, never exposed on the badge
    startDate: string;
    lastCheckedAt?: string;
    endDate?: string;
    status: SessionStatus;
    stainReason?: string;
    device: DeviceSpecs;
}

export const VERSION = "0.0.0-development";

export * from "./auth";
export * from "./session";
