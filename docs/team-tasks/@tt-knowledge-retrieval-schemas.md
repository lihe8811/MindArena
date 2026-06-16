# [@TT](https://github.com/LOLandXD): Knowledge Store, Retrieval, And Shared Schemas

## Owns

- `src/server/stores/knowledgeBaseStore.ts`
- `src/server/memory/vectorStore.ts`
- `src/server/memory/repositories.ts`
- `src/server/tools/retrievalTools.ts`
- `src/shared/schemas/evidence.ts`
- `src/shared/schemas/debateState.ts`
- `src/shared/schemas/agentOutputs.ts`
- `src/shared/schemas/scoring.ts`

## Status Snapshot

Reviewed against current code on 2026-06-16.

## Completed

- [x] Keep JSON knowledge-base storage and local vector search working through `knowledgeBaseStore`.
- [x] Add shared knowledge document, chunk preview, and search response types in `src/shared/types.ts`.
- [x] Define agent speech and coaching output schemas in `src/shared/schemas/agentOutputs.ts`.
- [x] Add Neon schema support for knowledge chunks with vector columns.
- [x] Add Neon-backed rules lookup tool and tests in Oscar's runtime-tools area.

## Remaining

- [ ] Extract reusable retrieval functions from the current knowledge-base store without changing existing endpoint behavior.
- [ ] Define role-aware retrieval contracts for rulebook, topic packs, evidence cards, student history, and curriculum notes.
- [ ] Decide whether MVP retrieval stays on the JSON/local-vector path or moves to Neon/pgvector; the schema exists, but live retrieval still uses JSON.
- [ ] Add shared schema/type definitions for `DebateSession`, `DebateState`, `TranscriptEvent`, `EvidenceClaim`, and scoring.
- [ ] Provide retrieval functions that [@Carl](https://github.com/PuLiFy-sus), [@Hallie](https://github.com/Hallie-Lunalg), and [@Oscar](https://github.com/Oscar-The-Great) can call without importing Express route code.
- [ ] Add fixtures from `docs/rulebook.md` for retrieval and rules tests.
- [ ] Coordinate with [@Oscar](https://github.com/Oscar-The-Great) so evidence tools can reuse retrieval rather than duplicate document search.

## Suggested Verification

- `bun run lint`
- Targeted retrieval and schema tests.
