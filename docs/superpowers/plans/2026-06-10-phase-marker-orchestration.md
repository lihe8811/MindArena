# Phase Marker Orchestration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Run debates through the exact NHSDLC phase order using transcript markers and wait only for phases owned by the selected student role.

**Architecture:** Define phase order, formal role labels, and ownership in shared code. The store persists the current phase and exposes a single phase-transition operation. The orchestrator records markers and advances automatic phases without Agent calls, while the Arena derives whether input is enabled from the shared ownership map.

**Tech Stack:** TypeScript, Bun, Express, React 19.

---

### Task 1: Shared Phase and Role Model

**Files:**
- Create: `src/shared/debatePhases.ts`
- Modify: `src/shared/types.ts`
- Test: `tests/orchestration/roundOrchestrator.test.ts`

- [ ] Add the exact 17-phase tuple and `DebatePhase` type.
- [ ] Add formal role labels and student-phase ownership sets.
- [ ] Add helpers for next phase, formal role name, and role ownership.
- [ ] Test exact ordering and ownership for all four roles.

### Task 2: Store Phase Transitions

**Files:**
- Modify: `src/server/stores/appStore.ts`
- Test: `tests/server-api/appStore.test.ts`

- [ ] Create debates at `setup`.
- [ ] Replace the four-stage mock progression with a transition to an explicit next phase.
- [ ] Append phase markers as Moderator messages.
- [ ] Complete the debate only after the `complete` marker.
- [ ] Preserve completed/terminated notifications.

### Task 3: Unwire Agents and Drive Orchestration

**Files:**
- Rewrite: `src/server/orchestration/roundOrchestrator.ts`
- Modify: `src/server/index.ts`
- Rewrite: `tests/orchestration/roundOrchestrator.test.ts`
- Modify: `tests/server-api/appStore.test.ts`

- [ ] Add `initializeRound(userId)` to print automatic markers and stop at the first student phase.
- [ ] Make `processTurn` reject input outside a student-owned phase.
- [ ] Record student input under the formal role name.
- [ ] Advance through automatic markers to the next student-owned phase or completion.
- [ ] Remove opening-statement, rival, teammate, judge, and mock calls from creation and turn processing.
- [ ] Verify Agent Factory and OpenAI Agent mocks are never invoked.

### Task 4: Arena Role Labels and Turn Gating

**Files:**
- Modify: `src/client/pages/Arena.tsx`
- Test: `tests/client/phaseOrchestration.test.ts`

- [ ] Render formal participant names in the role summary and team cards.
- [ ] Display whether the current phase is waiting for the student.
- [ ] Disable and relabel the input outside the selected role's phases.
- [ ] Update workflow text to describe phase-marker testing without Agent speeches.

### Task 5: Verification

- [ ] Run `bun test`.
- [ ] Run `bun run lint`.
- [ ] Run `bun run build`.
- [ ] Run `git diff --check`.
- [ ] Restart one server on port 3000.
- [ ] Browser-test phase markers and student turn gating.
