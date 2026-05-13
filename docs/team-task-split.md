# MindArena Team Task Split

This task split converts the original Python/FastAPI architecture plan to the current TypeScript/Bun/Express project. Each person owns a folder boundary and should avoid changing another person's files except through shared interfaces in `src/shared/`.

## Shared Working Rules

- Use TypeScript, Bun, Express, and the current `src/` structure.
- Keep the MVP text-first. Voice, Rival B, Postgres, pgvector, Redis, and MCP can be deferred unless a TODO explicitly says to prepare an interface.
- Use `src/shared/types.ts` and `src/shared/schemas/` for cross-team contracts.
- Keep app business state out of agent prompts. The Round Orchestrator owns sequencing.
- Run `bun run lint` before handing work back.
- Use port `3001` for server tests.

## Person 1: Client Side User Interface

**Owns:**
- `src/client/App.tsx`
- `src/client/pages/`
- `src/client/components/`
- `src/client/lib/api.ts`
- `src/client/index.css`

**TODO:**
- Update the UI around the planned NHSDLC round flow: setup, judge opening, constructive speeches, crossfires, rebuttals, summaries, final focus, judge feedback, complete.
- Add client state and view behavior for active round phase, active speaker, timer labels, allowed actions, transcript events, evidence-check requests, and judge feedback.
- Extend `src/client/lib/api.ts` to call the new Express route modules once Person 2/3 and Person 5 expose them.
- Keep the current authentication, dashboard, history, performance, knowledge base, and debate-start flows working.
- Add loading, empty, error, and disabled states for actions that are blocked by phase, timer, or auth.
- Coordinate with Person 2/3 on `AppBootstrap`, `ActiveDebate`, `KnowledgeDocument`, `TranscriptEvent`, and evidence response shapes.
- Coordinate with Person 5 on the client contract for advancing a round and submitting student input.

**Suggested verification:**
- `bun run lint`
- `bun run build`
- Manual dev flow through `bun run dev:all`, client on `3000`, server on `3001`.

## Person 2: Server API, Session Store, And Shared Knowledge

**Owns:**
- `src/server/index.ts`
- `src/server/api/sessionRoutes.ts`
- `src/server/api/knowledgeBaseRoutes.ts`
- `src/server/api/healthRoutes.ts`
- `src/server/stores/appStore.ts`
- shared user/session/knowledge types in `src/shared/types.ts`

**TODO:**
- Split existing session, bootstrap, health, and knowledge-base endpoints out of `src/server/index.ts` into Express routers.
- Keep `src/server/index.ts` focused on Express app setup, JSON middleware, upload middleware, route mounting, static assets, and listen.
- Preserve existing JSON-backed auth/session/debate persistence in `src/server/stores/appStore.ts`.
- Preserve existing JSON-backed knowledge storage and indexing in `src/server/stores/knowledgeBaseStore.ts` until Person 3 extracts reusable retrieval logic.
- Define stable shared types for sessions, users, dashboard data, history, performance, knowledge documents, and bootstrap payloads.
- Keep current API behavior backward-compatible for Person 1 while route modules are split.
- Add small route-level tests or smoke scripts if a Bun-compatible test setup is added.

**Suggested verification:**
- `bun run lint`
- `bun run build`
- `bun run start`, then `curl -s http://localhost:3001/api/health`.

## Person 3: Knowledge Store, Retrieval, And Shared Schemas

**Owns:**
- `src/server/stores/knowledgeBaseStore.ts`
- `src/server/memory/vectorStore.ts`
- `src/server/memory/repositories.ts`
- `src/server/tools/retrievalTools.ts`
- `src/shared/schemas/evidence.ts`
- `src/shared/schemas/debateState.ts`
- `src/shared/schemas/agentOutputs.ts`
- `src/shared/schemas/scoring.ts`

**TODO:**
- Extract reusable retrieval functions from the current knowledge-base store without changing existing endpoint behavior.
- Define role-aware retrieval contracts for rulebook, topic packs, evidence cards, student history, and curriculum notes.
- Keep the current local vector approach acceptable for MVP; do not introduce Postgres or pgvector yet.
- Add shared schema/type definitions for `DebateSession`, `DebateState`, `TranscriptEvent`, `EvidenceClaim`, `KnowledgeSearchResult`, and agent output payloads.
- Provide retrieval functions that Person 4, Person 5, and Person 6 can call without importing Express route code.
- Add fixtures from `docs/rulebook.md` for retrieval and rules tests.
- Coordinate with Person 6 so evidence tools can reuse retrieval rather than duplicate document search.

**Suggested verification:**
- `bun run lint`
- Targeted retrieval tests if a test runner is added.

## Person 4: Debate Agents

**Owns:**
- `src/server/agents/rivalAgentA.ts`
- `src/server/agents/rivalAgentB.ts`
- `src/server/agents/teammateAgent.ts`
- shared parts of `src/server/agents/agentFactory.ts`
- `src/server/prompts/rivalA.md`
- `src/server/prompts/rivalB.md`
- `src/server/prompts/teammate.md`
- relevant output types in `src/shared/schemas/agentOutputs.ts`

**TODO:**
- Implement Rival A and Teammate first for MVP. Leave Rival B behind the same factory interface if time is tight.
- Make each agent speak only when called by the orchestrator. Do not implement agent-to-agent handoffs.
- Build prompts from role, side, phase, difficulty, active speaker, allowed actions, and role-aware retrieved context.
- Keep teammate coaching bounded to allowed prep/coaching windows and prevent hidden opponent strategy leakage.
- Attach only approved tools from Person 3 and Person 6.
- Return structured speech or coaching output using shared schemas.
- Add tests or test doubles proving each agent factory exposes no auto-handoff behavior.

**Suggested verification:**
- `bun run lint`
- Factory tests with mocked SDK calls once the test setup exists.

## Person 5: Judge Agent And Orchestration

**Owns:**
- `src/server/agents/judgeAgent.ts`
- `src/server/agents/agentFactory.ts`
- `src/server/orchestration/phases.ts`
- `src/server/orchestration/stateMachine.ts`
- `src/server/orchestration/roundOrchestrator.ts`
- `src/server/api/debateRoutes.ts`
- `src/server/prompts/judge.md`
- `src/server/prompts/sharedRules.md`

**TODO:**
- Define NHSDLC phase ordering and helper functions such as `nextPhase`, terminal phase detection, active side, active speaker, and allowed actions.
- Implement the Round Orchestrator as the single source of truth for sequencing.
- Route setup, student input, round advancement, agent runs, timer checks, evidence interruptions, and judge feedback through the orchestrator.
- Implement Judge Agent output for winner, reason for decision, speaker points, key issues, rule notes, and improvement suggestions.
- Keep agents from deciding who speaks next.
- Expose Express routes for creating a debate session, submitting student input, advancing the round, getting current round state, and returning transcript/timer events.
- Coordinate with Person 6 on timer, rules, evidence interruptions, and transcript service contracts.

**Suggested verification:**
- `bun run lint`
- Integration tests with mocked agent SDK calls when test setup exists.
- `curl` route smoke checks against port `3001`.

## Person 6: Tools And Runtime Services

**Owns:**
- `src/server/services/timerService.ts`
- `src/server/services/evidenceClerk.ts`
- `src/server/services/rulesMarshal.ts`
- `src/server/services/transcriptService.ts`
- `src/server/tools/evidenceTools.ts`
- `src/server/tools/calculatorTools.ts`
- `src/server/guardrails/inputGuardrails.ts`
- `src/server/guardrails/outputGuardrails.ts`
- `src/server/guardrails/toolGuardrails.ts`

**TODO:**
- Implement timer service for speech time, prep time, pause/resume, expiration, and UI event payloads.
- Implement evidence clerk logic for recording claims, checking citation completeness, showing evidence in full/context, and reporting evidence problems.
- Implement deterministic rules marshal checks for wrong side, wrong speaker role, illegal prep timing, excessive partner assistance, and new final-focus arguments.
- Implement transcript service for appending, listing, summarizing, and filtering transcript events by phase/session.
- Implement calculator and evidence tools as callable backend functions for agents and orchestrator.
- Keep timer as a backend service, not an agent tool.
- Keep rules marshal deterministic for MVP; only add an internal agent later if deterministic checks are insufficient.
- Coordinate with Person 3 on retrieval interfaces and with Person 5 on orchestrator interruption behavior.

**Suggested verification:**
- `bun run lint`
- Unit tests for timer, citation completeness, rule checks, and transcript appends once a test runner is added.

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
- JSON-backed session, transcript, debate, and knowledge storage.

Defer:
- Rival B behavior beyond interface scaffolding.
- Live realtime voice.
- Teacher dashboard.
- Advanced student memory.
- Postgres, pgvector, Redis, and MCP integration.
