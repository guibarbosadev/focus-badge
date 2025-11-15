# Common

Shared packages that keep FocusBadge consistent across projects. This workspace will host TypeScript types, validation schemas, request helpers, or any UI primitives shared between the extension, backend, and site.

## Design Goals

- Provide a single source of truth for session/device schemas and API contracts.
- Publish lightweight modules that can be consumed by node-based services and browser builds.
- Encourage reusability so updates roll out through version bumps rather than copy-paste.

## Development

```bash
cd common
npm install
npm run build   # emits dist/ with compiled ESM + type definitions
```

## TODO

- [ ] Establish monorepo tooling (pnpm/yarn workspaces, linting, testing).
- [ ] Expand shared interfaces (SessionConfig, PingPayload, BadgeMetadata).
- [ ] Decide if this package should be published to npm or consumed locally only.
