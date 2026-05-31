# [@Emma](https://github.com/shzh0828-dotcom): Server API, Session Store, And Shared Knowledge

## Owns

- `src/server/index.ts`
- `src/server/api/sessionRoutes.ts`
- `src/server/api/knowledgeBaseRoutes.ts`
- `src/server/api/healthRoutes.ts`
- `src/server/stores/appStore.ts`
- shared user/session/knowledge types in `src/shared/types.ts`

## TODO

- Split existing session, bootstrap, health, and knowledge-base endpoints out of `src/server/index.ts` into Express routers.
- Keep `src/server/index.ts` focused on Express app setup, JSON middleware, upload middleware, route mounting, static assets, and listen.
- Preserve existing JSON-backed auth/session/debate persistence in `src/server/stores/appStore.ts` until the repository migration is ready.
- Preserve existing JSON-backed knowledge storage and indexing in `src/server/stores/knowledgeBaseStore.ts` until [@TT](https://github.com/LOLandXD) extracts reusable retrieval logic.
- Define stable shared types for sessions, users, dashboard data, history, performance, knowledge documents, and bootstrap payloads.
- Keep current API behavior backward-compatible for [@Lawrence](https://github.com/Lawrence-SHSID) while route modules are split.
- Prepare route and store boundaries so Neon/Drizzle repositories can replace JSON stores one domain at a time.
- Add small route-level tests or smoke scripts if a Bun-compatible test setup is added.

## Suggested Verification

- `bun run lint`
- `bun run build`
- `bun run start`, then `curl -s http://localhost:3001/api/health`.
