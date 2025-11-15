# FocusBadge Monorepo

FocusBadge keeps people accountable to their own focus goals. A browser extension blocks distracting sites, pings a backend to attest that the session is still healthy, and publishes a public badge page that proves when you last stayed on track.

This repository is being split into four focused workspaces so the browser extension, backend services, marketing/static site, and shared packages can evolve together.

## Repository Layout

- `extension/` — cross-browser WebExtension that enforces blocking rules and communicates with the backend.
- `backend/` — APIs for creating/updating sessions, device registration, badge rendering, and scheduled jobs.
- `site/` — marketing site plus public badge route (`focusbadge.com/{badgeId}`).
- `common/` — shared packages such as TypeScript types, validation helpers, and networking utilities.

Each subdirectory now contains its own tooling (package.json + scripts) so it can be developed or deployed independently. Check each folder’s README for local instructions.

## Product Vision

1. **Create a focus session** by selecting websites to block and optionally setting an end date. Every session captures an immutable list of URLs and device fingerprints.
2. **Enforce integrity** — once a session starts you cannot remove sites or disable blocking locally without staining the record. Only additions are allowed.
3. **Ping the backend** at a regular cadence. The backend stores “last checked” timestamps, flags missing devices, and retires configs that no longer exist on the device.
4. **Publish a badge** at `focusbadge.com/{badgeId}` to showcase your streak. Anyone can inspect if the latest session is clean or stained.

## Planning Questions


Please confirm the following before implementation; the answers below are the near-term decisions we agreed to for locking the architecture.

1. Which browsers/platforms must the extension support at launch (Chrome MV3, Firefox, Safari, etc.) and what are the release targets?

- Focus first on **Firefox**. Chrome/MV3 support is planned but deferred — supporting Chrome will require an adapter for service-worker lifecycle differences and `declarativeNetRequest` limits.

2. Where and how should we persist local session data (browser storage, IndexedDB, encrypted store) and how long must it survive reinstalls?

- Use **IndexedDB** in the extension for the blocklist and session storage (offline-friendly and suitable for larger lists). Use `browser.storage.local` for small stable values like `deviceId`, `sessionId`, and tokens. Blocklists are private; do not expose them publicly. If survival across reinstalls is required later, add a cloud backup/export option.

3. What authentication or device registration mechanism should the backend enforce so only trusted extensions can update sessions?

- Use **Google OAuth 2.0** (OIDC) with PKCE. The extension will initiate auth; the backend exchanges the authorization code, verifies the ID token, and returns an application session token for subsequent API calls.

4. What schema should define a session and the “device general specifications” payload (fields, size limits, privacy constraints)?

- Use the following shapes. Keep `blocklist` private on the backend.

```ts
interface Session {
	_id: string;
	userId: string;
	blocklist: string[];        // canonical, private
	blocklistHash?: string;     // sha256 of normalized list
	deviceId: string;           // device this session is attached to
	startDate: string;
	endDate?: string;
	name?: string;
	status?: 'active'|'stained'|'completed'|'removed';
	lastCheckedAt?: string;
}

interface Device {
	deviceId: string;           // generated per-install UUID
	label?: string;
	os?: string;
	browser?: string;
	userAgent?: string;
	fingerprintHash?: string;   // optional privacy-friendly fingerprint
	createdAt?: string;
	lastSeenAt?: string;
}
```

5. How should the extension fingerprint a device while respecting privacy (OS info, browser info, UUID, hash strategy)?

- Generate a random `deviceId` (UUID) at first run and persist it in `browser.storage.local`. Optionally compute a `fingerprintHash` from non-sensitive fields (platform + browser) with a salt, but avoid storing raw identifying strings unless necessary.

6. How frequently should the extension ping the backend and what should happen when it is offline or sleeping?

- Heartbeat every **1 hour** via the `alarms` API. Also trigger pings on `runtime.onStartup` and `windows.onFocusChanged` (or `tabs.onActivated`). If offline, do nothing; the extension continues blocking locally and will send the latest blocklist on next successful ping.

7. How do we reconcile backend-sent configs with local reality (e.g., marking remote sessions removed vs. still active) and what conflicts must be handled?

- Reconciliation policy:
	- The extension enforces local blocking and can add sites offline; additions are allowed and included in the next ping.
	- The backend is authoritative for session lifecycle and canonical blocklist.
	- Ping includes `blocklistHash` and the full list when necessary. If the backend detects local removals, it marks the session `stained` and returns a reason. If backend receives additions, it appends them to canonical and returns the updated config.

8. Should the badge page be static (compiled site) or rendered dynamically by the backend, and what information is safe to show publicly?

- Badge pages can be static but should be fed by a backend badge API. Public data must exclude the private `blocklist`. Show only safe metadata: session status (clean/stained), startDate, lastCheckedAt, optional session name, and non-identifying device labels only with explicit consent.

---

## **Next steps (recommended immediate work)**
- Add `Device` and `Session` interfaces to `common/src/index.ts` and emit types via the existing `common` build.
- Add small extension samples: `deviceId` getter, IndexedDB wrapper for the blocklist, and a `heartbeat` background module that registers the hourly alarm and sends `POST /api/session/ping`.
- Add a minimal backend placeholder endpoint `POST /api/session/ping` that can accept pings and echo canonical responses for local integration testing.

If you want I can implement all three (common types + extension samples + backend placeholder) now — tell me which to start with or say `all` and I'll create the files and basic handlers.
