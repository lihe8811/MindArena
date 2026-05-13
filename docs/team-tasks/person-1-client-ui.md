# Person 1: Client Side User Interface

## Owns

- `src/client/App.tsx`
- `src/client/pages/`
- `src/client/components/`
- `src/client/lib/api.ts`
- `src/client/index.css`

## TODO

- Update the UI around the planned NHSDLC round flow: setup, judge opening, constructive speeches, crossfires, rebuttals, summaries, final focus, judge feedback, complete.
- Add client state and view behavior for active round phase, active speaker, timer labels, allowed actions, transcript events, evidence-check requests, and judge feedback.
- Extend `src/client/lib/api.ts` to call the new Express route modules once Person 2/3 and Person 5 expose them.
- Keep the current authentication, dashboard, history, performance, knowledge base, and debate-start flows working.
- Add loading, empty, error, and disabled states for actions that are blocked by phase, timer, or auth.
- Coordinate with Person 2/3 on `AppBootstrap`, `ActiveDebate`, `KnowledgeDocument`, `TranscriptEvent`, and evidence response shapes.
- Coordinate with Person 5 on the client contract for advancing a round and submitting student input.

## Suggested Verification

- `bun run lint`
- `bun run build`
- Manual dev flow through `bun run dev:all`, client on `3000`, server on `3001`.
