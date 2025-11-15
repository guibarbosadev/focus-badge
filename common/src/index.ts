export type SessionStatus = "scheduled" | "active" | "completed" | "stained" | "removed";

export interface DeviceSpecs {
  deviceId: string;
  label?: string;
  os?: string;
  browser?: string;
}

export interface SessionConfig {
  id: string;
  blockedSites: string[];
  startDate: string;
  lastCheckedAt?: string;
  endDate?: string;
  status: SessionStatus;
  device: DeviceSpecs;
  existsLocally: boolean;
}

export const VERSION = "0.0.0-development";
