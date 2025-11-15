# Backend

API and worker services that keep FocusBadge sessions authoritative. The backend creates sessions, records hourly pings, flags stained sessions, and powers the badge endpoint consumed by the marketing site.

## Tech Notes

- Prefer TypeScript with Node.js (Express/Fastify) so we can reuse types from `common/`.
- Store session/device state in a relational database to enforce constraints (blocked site immutability, session lifecycle).
- Provide authenticated endpoints for the extension plus a public badge route with cached responses.

## Development

```bash
cd backend
npm install   # no dependencies yet, but keeps parity
npm run dev   # runs src/index.js placeholder server
```

## TODO

- [ ] Finalize service architecture (REST vs. GraphQL, deployment strategy, database choices).
- [ ] Define data models for sessions, devices, badge views, and config history.
- [ ] Sketch API contracts for session lifecycle and for “last checked” updates.
- [ ] Decide how to schedule background jobs (cron/queue) to mark stale sessions as removed.
