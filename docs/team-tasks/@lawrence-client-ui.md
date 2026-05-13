# [@Lawrence](https://github.com/Lawrence-SHSID): Client Side User Interface

## Owns

- `src/client/App.tsx`
- `src/client/pages/`
- `src/client/components/`
- `src/client/lib/api.ts`
- `src/client/index.css`

## TODO

- Update the UI around the planned NHSDLC round flow: setup, judge opening, constructive speeches, crossfires, rebuttals, summaries, final focus, judge feedback, complete.
- Add client state and view behavior for active round phase, active speaker, timer labels, allowed actions, transcript events, evidence-check requests, and judge feedback.
- Extend `src/client/lib/api.ts` to call the new Express route modules once [@Emma](https://github.com/shzh0828-dotcom), [@TT](https://github.com/LOLandXD), and [@Hallie](https://github.com/Hallie-Lunalg) expose them.
- Keep the current authentication, dashboard, history, performance, knowledge base, and debate-start flows working.
- Add loading, empty, error, and disabled states for actions that are blocked by phase, timer, or auth.
- Coordinate with [@Emma](https://github.com/shzh0828-dotcom) and [@TT](https://github.com/LOLandXD) on `AppBootstrap`, `ActiveDebate`, `KnowledgeDocument`, `TranscriptEvent`, and evidence response shapes.
- Coordinate with [@Hallie](https://github.com/Hallie-Lunalg) on the client contract for advancing a round and submitting student input.

## Suggested Verification

- `bun run lint`
- `bun run build`
- Manual dev flow through `bun run dev:all`, client on `3000`, server on `3001`.
