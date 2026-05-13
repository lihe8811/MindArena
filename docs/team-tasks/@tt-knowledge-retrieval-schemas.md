# Person 3: Knowledge Store, Retrieval, And Shared Schemas

## Owns

- `src/server/stores/knowledgeBaseStore.ts`
- `src/server/memory/vectorStore.ts`
- `src/server/memory/repositories.ts`
- `src/server/tools/retrievalTools.ts`
- `src/shared/schemas/evidence.ts`
- `src/shared/schemas/debateState.ts`
- `src/shared/schemas/agentOutputs.ts`
- `src/shared/schemas/scoring.ts`

## TODO

- Extract reusable retrieval functions from the current knowledge-base store without changing existing endpoint behavior.
- Define role-aware retrieval contracts for rulebook, topic packs, evidence cards, student history, and curriculum notes.
- Use Neon Postgres + pgvector as the target persistence/search layer, but keep JSON behavior working until migration.
- Add shared schema/type definitions for `DebateSession`, `DebateState`, `TranscriptEvent`, `EvidenceClaim`, `KnowledgeSearchResult`, and agent output payloads.
- Provide retrieval functions that Person 4, Person 5, and Person 6 can call without importing Express route code.
- Add fixtures from `docs/rulebook.md` for retrieval and rules tests.
- Coordinate with Person 6 so evidence tools can reuse retrieval rather than duplicate document search.

## Suggested Verification

- `bun run lint`
- Targeted retrieval tests if a test runner is added.
