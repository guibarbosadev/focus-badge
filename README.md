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

Please confirm the following before implementation:

1. Which browsers/platforms must the extension support at launch (Chrome MV3, Firefox, Safari, etc.) and what are the release targets?
2. Where and how should we persist local session data (browser storage, IndexedDB, encrypted store) and how long must it survive reinstalls?
3. What authentication or device registration mechanism should the backend enforce so only trusted extensions can update sessions?
4. What schema should define a session and the “device general specifications” payload (fields, size limits, privacy constraints)?
5. How should the extension fingerprint a device while respecting privacy (OS info, browser info, UUID, hash strategy)?
6. How frequently should the extension ping the backend and what should happen when it is offline or sleeping?
7. How do we reconcile backend-sent configs with local reality (e.g., marking remote sessions removed vs. still active) and what conflicts must be handled?
8. Should the badge page be static (compiled site) or rendered dynamically by the backend, and what information is safe to show publicly?

Let me know the answers (referencing the number for each) so we can lock the architecture prior to coding.
