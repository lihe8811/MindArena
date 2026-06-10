# Phase-Only Round Orchestration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Run debates through the documented 17 NHSDLC phases using transcript markers only, pausing exclusively at user-input phases and making no Agent or mock-speech calls.

**Architecture:** Define the ordered phase list and user-turn predicate in a shared orchestration module. Persist the active phase and `awaitingUserInput` on the debate, with store operations for entering phases, recording user input, and completing the round. `RoundOrchestrator` becomes a small phase driver that advances automatic phases until the next required user turn.

**Tech Stack:** TypeScript, Bun tests, Express, React.

---

### Task 1: Define and Test the Phase State Machine

**Files:**
- Create: `src/shared/debatePhases.ts`
- Modify: `src/shared/types.ts`
- Replace: `tests/orchestration/roundOrchestrator.test.ts`

- [ ] Add failing tests for the exact 17-phase order and user-turn rules.
- [ ] Verify tests fail because the phase module does not exist.
- [ ] Implement `DEBATE_PHASES`, `DebatePhase`, `getNextDebatePhase`, and `phaseWaitsForUser`.
- [ ] Verify phase tests pass.

### Task 2: Persist Phase Markers and Waiting State

**Files:**
- Modify: `src/server/stores/appStore.ts`
- Modify: `tests/server-api/appStore.test.ts`

- [ ] Add failing tests asserting a new pro debate pauses at `constructive_pro`, a new con debate pauses at `constructive_con`, and every entered phase appears as a Moderator marker.
- [ ] Add store operations to enter a phase, append `Phase: <phase>` markers, set `awaitingUserInput`, and complete at `complete`.
- [ ] Replace the old four-stage progression with the documented phases.
- [ ] Verify store tests pass.

### Task 3: Remove Agent Wiring from Orchestration

**Files:**
- Rewrite: `src/server/orchestration/roundOrchestrator.ts`
- Modify: `src/server/index.ts`
- Modify: `tests/orchestration/roundOrchestrator.test.ts`

- [ ] Add failing tests that initialization advances through automatic markers, user input advances to the next waiting phase, and no assistant speech is appended.
- [ ] Rewrite `RoundOrchestrator` without `AgentFactory`, `@openai/agents`, knowledge search, teammate, rival, or judge calls.
- [ ] Start orchestration after debate creation and process messages only when `awaitingUserInput` is true.
- [ ] Remove the coaching API route from the active orchestration flow.
- [ ] Verify orchestration and API/store tests pass.

### Task 4: Reflect Turn Ownership in Arena

**Files:**
- Modify: `src/client/App.tsx`
- Modify: `src/client/pages/Arena.tsx`
- Modify: `tests/client/notificationAlert.test.ts`

- [ ] Add a failing client test for `awaitingUserInput`, removal of mock-agent workflow copy, and disabled input outside user phases.
- [ ] Remove teammate coaching from the Arena integration.
- [ ] Display the exact phase and a waiting/automatic status message.
- [ ] Enable textarea/send only when the debate is open, the timer is active, and `awaitingUserInput` is true.
- [ ] Verify client tests pass.

### Task 5: Full Verification

- [ ] Run `bun test`.
- [ ] Run `bun run lint`.
- [ ] Run `bun run build`.
- [ ] Run `git diff --check`.
- [ ] Restart the single server on port 3000.
- [ ] Browser-test phase markers and user-turn pauses.
- [ ] Restore runtime test data without reverting unrelated user changes.
