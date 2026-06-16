# [@Emma](https://github.com/shzh0828-dotcom): Server API, Session Store, And Shared Knowledge

## Owns

- `src/server/index.ts`
- `src/server/api/sessionRoutes.ts`
- `src/server/api/knowledgeBaseRoutes.ts`
- `src/server/api/healthRoutes.ts`
- `src/server/stores/appStore.ts`
- shared user/session/knowledge types in `src/shared/types.ts`

## Status Snapshot

Reviewed against current code on 2026-06-16.

## Completed

- [x] Preserve JSON-backed auth, session, debate, notification, and settings persistence in `src/server/stores/appStore.ts`.
- [x] Preserve JSON-backed knowledge storage and local vector indexing in `src/server/stores/knowledgeBaseStore.ts`.
- [x] Define shared user, session, dashboard, history, performance, knowledge, notification, and debate payload types in `src/shared/types.ts`.
- [x] Keep current API behavior covered by app-store and client source tests.
- [x] Add password-reset request and reset endpoints with Resend/dev-log delivery.

## Remaining

- [ ] Split session, bootstrap, health, settings, notifications, knowledge-base, and debate endpoints out of `src/server/index.ts` into Express routers.
- [ ] Keep `src/server/index.ts` focused on Express app setup, JSON middleware, upload middleware, route mounting, static assets, and listen.
- [ ] Add registration email verification; registration currently creates verified users immediately.
- [ ] Prepare repository boundaries so Neon/Drizzle repositories can replace JSON stores one domain at a time.
- [ ] Add route-level tests or smoke scripts around the extracted routers.

## Suggested Verification

- `bun run lint`
- `bun run build`
- `bun run start`, then `curl -s http://localhost:3001/api/health`.
