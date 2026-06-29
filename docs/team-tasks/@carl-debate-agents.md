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

Reviewed against current code and tests on 2026-06-29.

## Completed

- [x] Implement Rival A, Rival B, and Teammate factory functions.
- [x] Register Rival A, Rival B, Teammate, and Judge in `AgentFactory`.
- [x] Keep agent handoffs disabled in the factory-created agents (`handoffs: []`).
- [x] Build basic agent prompts from side, topic, phase, rigor/context, and performance context.
- [x] Define shared speech and coaching schemas in `src/shared/schemas/agentOutputs.ts`.
- [x] Provide `buildMockTeammateResponse` helper for mock/testing flows.
- [x] Expand config interfaces with `debateId`, `speakerId`, `speakerRole`, `studentId`, and `allowedActions`.
- [x] Interpolate the new identifiers and allowed actions into `rivalA.md`, `rivalB.md`, and `teammate.md`.
- [x] Validate required config fields (`debateId`, `speakerId`, `studentId`).
- [x] Attach `outputType: SpeechSchema` to rivals and `outputType: CoachingSchema` to teammate.
- [x] Fix agent factory test mock so `AgentFactory` tests run without crashing on the judge agent import.
- [x] Attach approved runtime tools to rivals and teammate via `src/server/agents/toolAdapter.ts`.
- [x] Set `toolUseBehavior: 'run_llm_again'` on all three agents.
- [x] Attach real input/output guardrails (`debate_input_safety`, `debate_output_quality`) via `src/server/agents/agentGuardrails.ts`.
- [x] Create `src/server/agents/agentRunner.ts` that maps debate phases to Rival A, Rival B, or Teammate agents.
- [x] Wire agent execution into `RoundOrchestrator` so automatic opponent speech phases produce assistant messages.
- [x] Enforce teammate coaching windows: teammate only runs during `student_prep_optional`.
- [x] Validate real agent outputs against `SpeechSchema` and `CoachingSchema` in the runner.
- [x] Add `recordDebateAgentMessage` to `appStore.ts` so the orchestrator can persist assistant messages.
- [x] Update orchestrator and app-store tests for async agent execution.

## Remaining

- [ ] **Add role-aware retrieved context** once [@TT](https://github.com/LOLandXD) exposes retrieval contracts.
- [ ] **Get `bun run lint` fully passing.** Agent/orchestrator files are clean; only unrelated `tests/runtime-services/searchTools.test.ts` errors remain.
- [ ] **Stabilize `tests/server-api/appStore.test.ts` under combined test runs.** The file passes alone but shows store-file pollution when executed alongside other test files (pre-existing isolation issue).

## Suggested Verification

- `bun run lint`
- `bun test tests/agents/`
- `bun test tests/orchestration/`
- `bun test tests/server-api/appStore.test.ts`
- Factory tests with mocked OpenAI SDK calls.
