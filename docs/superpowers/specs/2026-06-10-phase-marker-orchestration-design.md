# Phase Marker Orchestration Design

## Goal

Replace mock and Agent-generated debate speeches in the active orchestration flow with a deterministic NHSDLC phase state machine. The transcript displays every phase marker and waits for student input only when the selected student role participates.

## Formal Role Names

The internal role IDs remain stable for persistence and API compatibility, but all user-facing labels use:

- `pro1`: First Pro Speaker
- `pro2`: Second Pro Speaker
- `con1`: First Con Speaker
- `con2`: Second Con Speaker

## Phase Order

The orchestration follows the exact sequence documented in `docs/plans/2026-05-10-debate-agent-architecture-plan.md`:

1. `setup`
2. `judge_opening`
3. `student_prep_optional`
4. `constructive_pro`
5. `constructive_con`
6. `crossfire_1`
7. `rebuttal_pro`
8. `rebuttal_con`
9. `crossfire_2`
10. `summary_pro`
11. `summary_con`
12. `grand_crossfire`
13. `final_focus_pro`
14. `final_focus_con`
15. `judge_deliberation`
16. `judge_feedback`
17. `complete`

## Student Turn Ownership

Only phases involving the selected student role wait for input:

- First Pro Speaker: `constructive_pro`, `crossfire_1`, `summary_pro`, `grand_crossfire`
- First Con Speaker: `constructive_con`, `crossfire_1`, `summary_con`, `grand_crossfire`
- Second Pro Speaker: `rebuttal_pro`, `crossfire_2`, `final_focus_pro`, `grand_crossfire`
- Second Con Speaker: `rebuttal_con`, `crossfire_2`, `final_focus_con`, `grand_crossfire`

All other phases are automatic for this orchestration-only test.

## Orchestration Behavior

Creating a debate starts at `setup`. The orchestrator appends a Moderator phase marker for each automatic phase and advances until it reaches a phase owned by the student.

At a student phase:

- The Arena input is enabled.
- The UI identifies the formal student role and current phase.
- The orchestrator waits without advancing.

After the student submits:

- The message is recorded under the formal role name.
- The orchestrator advances through automatic phases, appending one marker per phase.
- It stops at the next phase owned by the student or at `complete`.

The `complete` marker is appended before the debate is marked `Completed`.

## Agent Isolation

The active debate creation and message routes do not call Agent Factory, OpenAI Agents, teammate Agent helpers, judge Agent helpers, or mock speech builders. Agent-specific functions may remain in their modules for later isolated testing, but they are not wired into the phase-marker orchestration.

## UI

The Arena uses formal role labels in the selected-role summary, team cards, and transcript author names. The workflow panel explains that phase markers are being tested without Agent speeches.

The input is disabled unless the current phase belongs to the selected role and the debate is active.

## Testing

Tests verify:

- The exact 17-phase order.
- Automatic phases append markers and stop at the first student-owned phase.
- Each role waits only for its own phases.
- Crossfire ownership follows the role mapping.
- One student submission advances to the next owned phase.
- No Agent Factory or OpenAI Agent run occurs in creation or turn processing.
- The UI renders formal role names and disables input outside student turns.
