# Backend

API and worker services that keep FocusBadge sessions authoritative. The backend creates sessions, records hourly pings, flags stained sessions, and powers the badge endpoint consumed by the marketing site.

## Tech Notes

- Prefer TypeScript with Node.js (Express/Fastify) so we can reuse types from `common/`.
- Store session/device state in a relational database to enforce constraints (blocked site immutability, session lifecycle).
- Provide authenticated endpoints for the extension plus a public badge route with cached responses.

## Development

### Setup

1. Install dependencies:
```bash
cd backend
npm install
```

2. Set up environment variables:
Create a `.env` file in the `backend` directory with the following variables:
```env
PORT=3000
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/focusbadge
```

### Running

- **Development mode** (with hot reload):
```bash
npm run dev
```

- **Production mode**:
```bash
npm run build
npm start
```

### Testing

- Run tests:
```bash
npm test
```

- Run tests in watch mode:
```bash
npm run test:watch
```

- Run tests with coverage:
```bash
npm run test:coverage
```

## TODO

- [ ] Finalize service architecture (REST vs. GraphQL, deployment strategy, database choices).
- [ ] Define data models for sessions, devices, badge views, and config history.
- [ ] Sketch API contracts for session lifecycle and for “last checked” updates.
- [ ] Decide how to schedule background jobs (cron/queue) to mark stale sessions as removed.
