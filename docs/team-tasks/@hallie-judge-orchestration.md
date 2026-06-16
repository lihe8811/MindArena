# [@Hallie](https://github.com/Hallie-Lunalg): Judge Agent And Orchestration

## Owns

- `src/server/agents/judgeAgent.ts`
- `src/server/agents/agentFactory.ts`
- `src/server/orchestration/phases.ts`
- `src/server/orchestration/stateMachine.ts`
- `src/server/orchestration/roundOrchestrator.ts`
- `src/server/api/debateRoutes.ts`
- `src/server/prompts/judge.md`
- `src/server/prompts/sharedRules.md`

## Status Snapshot

Reviewed against current code on 2026-06-16.

## Completed

- [x] Define the 17-phase NHSDLC order in `src/shared/debatePhases.ts`.
- [x] Add helpers for next phase, role names, role-owned user phases, and phase waiting state.
- [x] Implement `RoundOrchestrator` as the current source of truth for phase-marker sequencing and user-turn gating.
- [x] Add Judge Agent factory support, prompt template, and mock fallback output.
- [x] Keep agents from deciding phase order; phase sequencing is deterministic.
- [x] Expose current debate creation, start, message submission, current-state, and expiration routes in `src/server/index.ts`.

## Remaining

- [ ] Add explicit active side, active speaker, allowed-action, and terminal-phase helpers beyond the current user-phase ownership checks.
- [ ] Route agent runs, timer checks, evidence interruptions, and judge feedback through the orchestrator; current live orchestration does not invoke agents or runtime services.
- [ ] Persist Judge Agent decisions as structured winner, reason for decision, speaker points, key issues, rule notes, and improvement suggestions.
- [ ] Extract debate routes to `src/server/api/debateRoutes.ts` once [@Emma](https://github.com/shzh0828-dotcom) splits API modules.
- [ ] Coordinate with [@Oscar](https://github.com/Oscar-The-Great) on timer, rules, evidence interruption, and transcript service contracts.

## Suggested Verification

- `bun run lint`
- `bun test tests/orchestration/roundOrchestrator.test.ts`
- Integration tests with mocked agent SDK calls.
- `curl` route smoke checks against port `3001`.
