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

- [@Lawrence](https://github.com/Lawrence-SHSID): [Client Side User Interface](./@lawrence-client-ui.md)
- [@Emma](https://github.com/shzh0828-dotcom): [Server API, Session Store, And Shared Knowledge](./@emma-server-api-session-knowledge.md)
- [@TT](https://github.com/LOLandXD): [Knowledge Store, Retrieval, And Shared Schemas](./@tt-knowledge-retrieval-schemas.md)
- [@Carl](https://github.com/PuLiFy-sus): [Debate Agents](./@carl-debate-agents.md)
- [@Hallie](https://github.com/Hallie-Lunalg): [Judge Agent And Orchestration](./@hallie-judge-orchestration.md)
- [@Oscar](https://github.com/Oscar-The-Great): [Tools And Runtime Services](./@oscar-tools-runtime-services.md)

## Integration Order

1. [@Emma](https://github.com/shzh0828-dotcom) splits current Express routes and keeps existing behavior stable.
2. [@TT](https://github.com/LOLandXD) stabilizes shared schemas and retrieval interfaces.
3. [@Oscar](https://github.com/Oscar-The-Great) builds deterministic runtime services.
4. [@Hallie](https://github.com/Hallie-Lunalg) wires phase/state/orchestration and debate routes with mocked agents.
5. [@Carl](https://github.com/PuLiFy-sus) plugs in Rival A and Teammate through the factory.
6. [@Lawrence](https://github.com/Lawrence-SHSID) updates the UI against the new route and state contracts.
7. Everyone runs `bun run lint`; [@Lawrence](https://github.com/Lawrence-SHSID) or [@Emma](https://github.com/shzh0828-dotcom) runs full app smoke tests.

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
