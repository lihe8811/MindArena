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

## TODO

- [ ] Define NHSDLC phase ordering and helper functions such as `nextPhase`, terminal phase detection, active side, active speaker, and allowed actions.
- [ ] Implement the Round Orchestrator as the single source of truth for sequencing.
- [ ] Route setup, student input, round advancement, agent runs, timer checks, evidence interruptions, and judge feedback through the orchestrator.
- [ ] Implement Judge Agent output for winner, reason for decision, speaker points, key issues, rule notes, and improvement suggestions.
- [ ] Keep agents from deciding who speaks next.
- [ ] Expose Express routes for creating a debate session, submitting student input, advancing the round, getting current round state, and returning transcript/timer events.
- [ ] Coordinate with [@Oscar](https://github.com/Oscar-The-Great) on timer, rules, evidence interruptions, and transcript service contracts.

## Suggested Verification

- `bun run lint`
- Integration tests with mocked agent SDK calls when test setup exists.
- `curl` route smoke checks against port `3001`.
