# MindArena Coding Conventions

This document defines the coding conventions for the MindArena team. It is intentionally practical: follow the existing architecture, keep changes small, and verify before handing work back.

## Required Checks

Run these before opening a PR or handing off work:

```bash
bun test
bun run lint
bun run build
```

Use port `3001` for local server checks:

```bash
bun run start
curl -s http://localhost:3001/api/health
```

## Project Boundaries

Keep code in the folder that owns the concern:

- `src/client/`: React UI, client state, browser API calls, styles.
- `src/server/`: Express routes, server services, agents, orchestration, tools, stores, database access.
- `src/shared/`: types and schemas used by both client and server.
- `docs/`: plans, task ownership, rulebook, team conventions.
- `tests/`: Bun tests.
- `drizzle/`: SQL migrations.

Do not import client code from server code. Do not import server code from client code. Shared contracts belong in `src/shared/`.

## TypeScript

- Prefer TypeScript interfaces/types over untyped objects for cross-module contracts.
- Use `unknown` instead of `any` unless the data is truly untyped and contained at the boundary.
- Validate or normalize external input at route/service boundaries.
- Keep public function signatures explicit when the return type is part of a contract.
- Use `@/` imports for stable cross-folder imports, for example `@/shared/types`.
- Use relative imports inside tightly related local modules, for example `./stores/appStore`.
- Keep file names in `camelCase.ts` or `PascalCase.tsx` to match existing code.

## React Client

- Use function components and hooks.
- Keep page-level orchestration in `src/client/pages/` or `src/client/App.tsx`.
- Keep reusable UI in `src/client/components/`.
- Keep browser API wrappers in `src/client/lib/`.
- Use types from `src/shared/`; do not duplicate API response shapes in components.
- UI states must cover loading, empty, error, disabled, and authenticated/unauthenticated paths where relevant.
- Use `lucide-react` icons when an icon exists.
- Keep the interface dense and task-focused. This is a debate workspace, not a marketing landing page.

## Server

- Keep `src/server/index.ts` focused on app setup, middleware, route mounting, static assets, and `listen`.
- Put route handlers under `src/server/api/`.
- Put deterministic business logic under `src/server/services/`.
- Put debate sequencing under `src/server/orchestration/`.
- Put agent definitions under `src/server/agents/`.
- Put model-callable helpers under `src/server/tools/`.
- Put persistence adapters and repositories under `src/server/stores/` or `src/server/memory/`.
- Return clear HTTP status codes and plain error messages for client-displayable failures.
- Never let agents decide debate phase progression. The Round Orchestrator owns sequencing.

## Agents And Orchestration

- Agents speak only when called by the orchestrator.
- Do not use agent-to-agent handoffs for round flow.
- Prompts should receive structured context: role, side, phase, active speaker, allowed actions, timer state, and retrieved context.
- Keep timer behavior as a runtime service, not an agent tool.
- Keep rules checks deterministic for MVP. Add an internal rules agent only if deterministic checks become insufficient.
- Store agent inputs, outputs, trace IDs, and metadata through the repository layer once persistence is wired.

## Database

- Neon Postgres with pgvector is the target database.
- Drizzle schema lives in `src/server/db/schema.ts`.
- SQL migrations live in `drizzle/`.
- Do not hand-edit generated migrations after they are applied in shared environments unless the team agrees.
- Use `jsonb` for flexible metadata, traces, and structured agent output snapshots.
- Use pgvector for embeddings that belong to app-owned records, such as knowledge chunks.
- Keep JSON stores only as temporary MVP compatibility until their repositories are migrated.

## Tests

- Use `bun:test`.
- Tests should cover behavior, not implementation details.
- For new services or repositories, write tests before implementation.
- Put tests under the matching project component folder in `tests/`, for example `tests/orchestration/`.
- Cross-module/API tests should live with the coordinating component.
- Keep tests deterministic. Avoid live network/API calls in normal test runs.
- If a test requires external services, isolate it behind an explicit script or environment flag.

## Error Handling

- Throw `Error` objects from lower-level services with specific messages.
- Convert service errors to HTTP responses in route handlers.
- Avoid swallowing errors silently.
- Do not leak secrets, database URLs, auth tokens, or raw provider payloads to the client.
- Prefer explicit fallback states over ambiguous `null` values when the client must render a user-facing state.

## Naming

- Components: `PascalCase`, for example `Navigation.tsx`.
- Hooks: `useSomething`.
- Services: `somethingService.ts`.
- Routes: `somethingRoutes.ts`.
- Stores/repositories: `somethingStore.ts` or `somethingRepository.ts`.
- Types/interfaces: `PascalCase`.
- Variables/functions: `camelCase`.
- Database tables and columns: `snake_case`.
- Drizzle exports: `camelCase` table names, for example `debateSessions`.

## Git And PRs

- Work from `main` and create PRs directly back to `main`. Avoid stacked or long-lived feature branches unless the team explicitly agrees.
- Keep commits focused by concern.
- Do not mix docs, schema changes, UI redesigns, and runtime logic in one commit unless they are inseparable.
- Do not commit local runtime files such as `.claude/` or generated local JSON store data unless explicitly requested.
- PR descriptions should include summary and verification commands.
- If a branch changes shared contracts, mention the affected owners in the PR.

## Security And Secrets

- Never commit real `.env` files or real Neon URLs.
- `.env.example` may contain placeholder values only.
- Keep `DATABASE_URL` server-side only.
- Do not expose auth tokens or API keys to `src/client/`.
- Uploaded files must be size-limited and parsed only through approved server paths.

## Documentation

- Update docs when changing architecture, team ownership, setup steps, database contracts, or API contracts.
- Team task files live in `docs/team-tasks/`.
- Architecture plans live in `docs/plans/`.
- Keep docs concise and implementation-oriented.
