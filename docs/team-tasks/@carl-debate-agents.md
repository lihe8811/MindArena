# [@Carl](https://github.com/PuLiFy-sus): Debate Agents

## Owns

- `src/server/agents/rivalAgentA.ts`
- `src/server/agents/rivalAgentB.ts`
- `src/server/agents/teammateAgent.ts`
- shared parts of `src/server/agents/agentFactory.ts`
- `src/server/prompts/rivalA.md`
- `src/server/prompts/rivalB.md`
- `src/server/prompts/teammate.md`
- relevant output types in `src/shared/schemas/agentOutputs.ts`

## Status Snapshot

Reviewed against current code on 2026-06-16.

## Completed

- [x] Implement Rival A, Rival B, and Teammate factory functions.
- [x] Register Rival A, Rival B, Teammate, and Judge in `AgentFactory`.
- [x] Keep agent handoffs disabled in the factory-created agents.
- [x] Build agent prompts from side, topic, phase, rigor/context, and performance context where applicable.
- [x] Define shared speech and coaching schemas in `src/shared/schemas/agentOutputs.ts`.

## Remaining

- [ ] Wire Rival and Teammate agent execution into the live `RoundOrchestrator`; current orchestration advances phase markers without calling agents.
- [ ] Add role-aware retrieved context once [@TT](https://github.com/LOLandXD) exposes retrieval contracts.
- [ ] Attach only approved runtime tools from [@TT](https://github.com/LOLandXD) and [@Oscar](https://github.com/Oscar-The-Great) after the tool contracts are finalized.
- [ ] Enforce teammate coaching windows at the orchestrator/API boundary so coaching cannot leak hidden opponent strategy.
- [ ] Validate actual agent outputs against `SpeechSchema` and `CoachingSchema`; current guardrails only report validation success.
- [ ] Add factory tests or test doubles proving all agents expose no auto-handoff behavior.

## Suggested Verification

- `bun run lint`
- Factory tests with mocked OpenAI SDK calls.
