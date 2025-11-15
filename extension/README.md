# Extension

Cross-browser WebExtension that enforces the FocusBadge rules, blocks distracting sites, and keeps the backend informed about session activity for accountability.

## Functional Highlights

- Manage sessions: capture blocked sites, device metadata, end date, and immutable config hash.
- Enforce blocking via declarative or programmatic request blocking APIs depending on the browser.
- Sync with the backend for new sessions, heartbeat pings, and config reconciliation.
- Surface the current badge link and state so users can share progress.

## Development

```bash
cd extension
yarn install
yarn dev      # runs web-ext using the manifest + src/* files inside this folder
```

## TODO

- [ ] Choose extension tooling (Manifest v3, build pipeline, bundler, testing strategy).
- [ ] Design UX for creating sessions, adding domains, and showing read-only locked states.
- [ ] Implement local persistence + integrity rules (no removals, additions only).
- [ ] Prototype network layer that authenticates against the backend and schedules pings reliably.
