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

## TODO

- [x] Implement Rival A and Teammate first for MVP. Leave Rival B behind the same factory interface if time is tight.
- [x] Make each agent speak only when called by the orchestrator. Do not implement agent-to-agent handoffs.
- [x] Build prompts from role, side, phase, difficulty, active speaker, allowed actions, and role-aware retrieved context.
- [x] Keep teammate coaching bounded to allowed prep/coaching windows and prevent hidden opponent strategy leakage.
- [x] Attach only approved tools from [@TT](https://github.com/LOLandXD) and [@Oscar](https://github.com/Oscar-The-Great).
- [x] Return structured speech or coaching output using shared schemas.
- [x] Add tests or test doubles proving each agent factory exposes no auto-handoff behavior.

## Suggested Verification

- `bun run lint`
- Factory tests with mocked SDK calls once the test setup exists.
