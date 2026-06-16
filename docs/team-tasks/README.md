# MindArena Team Tasks

This folder splits the implementation work by owner. Each person owns a folder boundary and should avoid changing another person's files except through shared interfaces in `src/shared/`.

## Shared Working Rules

- Use TypeScript, Bun, Express, and the current `src/` structure.
- Keep the MVP text-first. Voice, Rival B, Redis, and MCP can be deferred unless a TODO explicitly says to prepare an interface.
- Use Neon Postgres with pgvector as the target database. JSON stores can remain temporarily while repositories are migrated.
- Use `src/shared/types.ts` and `src/shared/schemas/` for cross-team contracts.
- Keep app business state out of agent prompts. The Round Orchestrator owns sequencing.
- Run `bun run lint` before handing work back.
- Use port `3001` for server tests.

## Current Status

Reviewed against current code on 2026-06-16.

Completed MVP foundations:
- JSON-backed auth, sessions, debates, notifications, settings, and knowledge storage.
- Phase-marker debate orchestration with deterministic 17-phase order and user-turn gating.
- Start Debate flow, role phase assignments, notification modal, and client-side input gating.
- Rival A, Rival B, Teammate, and Judge agent factories with prompt templates and no handoffs.
- Timer, evidence, transcript, rules marshal, calculator, Brave search, and rules lookup runtime tools.
- Unit/source tests for orchestration, app store, runtime services, search tools, rules tools, and key client behavior.

Primary remaining integration work:
- Split monolithic Express routes out of `src/server/index.ts`.
- Add registration email verification.
- Extract retrieval contracts and shared schemas for debate state, transcript events, evidence, and scoring.
- Wire agents, runtime services, evidence interruptions, rules checks, timer checks, and judge feedback into live orchestration.
- Replace phase-marker-only UI states with live agent, evidence, and judge result states.

## Files

- [@Lawrence](https://github.com/Lawrence-SHSID): [Client Side User Interface](./@lawrence-client-ui.md)
- [@Emma](https://github.com/shzh0828-dotcom): [Server API, Session Store, And Shared Knowledge](./@emma-server-api-session-knowledge.md)
- [@TT](https://github.com/LOLandXD): [Knowledge Store, Retrieval, And Shared Schemas](./@tt-knowledge-retrieval-schemas.md)
- [@Carl](https://github.com/PuLiFy-sus): [Debate Agents](./@carl-debate-agents.md)
- [@Hallie](https://github.com/Hallie-Lunalg): [Judge Agent And Orchestration](./@hallie-judge-orchestration.md)
- [@Oscar](https://github.com/Oscar-The-Great): [Tools And Runtime Services](./@oscar-tools-runtime-services.md)

## Integration Order

1. [@Emma](https://github.com/shzh0828-dotcom) splits current Express routes while preserving existing behavior and tests.
2. [@TT](https://github.com/LOLandXD) stabilizes shared schemas and reusable retrieval interfaces.
3. [@Hallie](https://github.com/Hallie-Lunalg) wires live orchestration to agent runs, timer checks, evidence interruptions, rules checks, and judge feedback.
4. [@Carl](https://github.com/PuLiFy-sus) validates real Rival/Teammate outputs and attaches approved tools through the finalized contracts.
5. [@Oscar](https://github.com/Oscar-The-Great) connects runtime services and tools to the orchestrator contracts.
6. [@Lawrence](https://github.com/Lawrence-SHSID) replaces phase-marker-only UI states with live round, evidence, and judge-result UI.
7. Everyone runs `bun test`, `bun run lint`, and `bun run build`; [@Lawrence](https://github.com/Lawrence-SHSID) or [@Emma](https://github.com/shzh0828-dotcom) runs full app smoke tests.

## MVP Boundary

Build first:
- Text-only rounds.
- Judge Agent.
- Rival A Agent.
- Teammate Agent.
- Round Orchestrator.
- Timer Service.
- Evidence Clerk with basic citation checks.
- Rulebook retrieval.
- JSON-backed session, transcript, debate, and knowledge storage.

Defer:
- Live realtime voice.
- Teacher dashboard.
- Advanced student memory.
- Full repository-backed Neon Postgres migration.
- Redis and MCP integration.
