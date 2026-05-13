# Person 4: Debate Agents

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

- Implement Rival A and Teammate first for MVP. Leave Rival B behind the same factory interface if time is tight.
- Make each agent speak only when called by the orchestrator. Do not implement agent-to-agent handoffs.
- Build prompts from role, side, phase, difficulty, active speaker, allowed actions, and role-aware retrieved context.
- Keep teammate coaching bounded to allowed prep/coaching windows and prevent hidden opponent strategy leakage.
- Attach only approved tools from Person 3 and Person 6.
- Return structured speech or coaching output using shared schemas.
- Add tests or test doubles proving each agent factory exposes no auto-handoff behavior.

## Suggested Verification

- `bun run lint`
- Factory tests with mocked SDK calls once the test setup exists.
