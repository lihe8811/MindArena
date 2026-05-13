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

## Files

- [Person 1: Client Side User Interface](./@lawrence-client-ui.md)
- [Person 2: Server API, Session Store, And Shared Knowledge](./@emma-server-api-session-knowledge.md)
- [Person 3: Knowledge Store, Retrieval, And Shared Schemas](./@tt-knowledge-retrieval-schemas.md)
- [Person 4: Debate Agents](./@carl-debate-agents.md)
- [Person 5: Judge Agent And Orchestration](./@hallie-judge-orchestration.md)
- [Person 6: Tools And Runtime Services](./@oscar-tools-runtime-services.md)

## Integration Order

1. Person 2 splits current Express routes and keeps existing behavior stable.
2. Person 3 stabilizes shared schemas and retrieval interfaces.
3. Person 6 builds deterministic runtime services.
4. Person 5 wires phase/state/orchestration and debate routes with mocked agents.
5. Person 4 plugs in Rival A and Teammate through the factory.
6. Person 1 updates the UI against the new route and state contracts.
7. Everyone runs `bun run lint`; Person 1 or Person 2 runs full app smoke tests.

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
- JSON-backed session, transcript, debate, and knowledge storage, then repository-backed Neon Postgres migration.

Defer:
- Rival B behavior beyond interface scaffolding.
- Live realtime voice.
- Teacher dashboard.
- Advanced student memory.
- Redis and MCP integration.
