# [@Lawrence](https://github.com/Lawrence-SHSID): Client Side User Interface

## Owns

- `src/client/App.tsx`
- `src/client/pages/`
- `src/client/components/`
- `src/client/lib/api.ts`
- `src/client/index.css`

## Status Snapshot

Reviewed against current code on 2026-06-16.

## Completed

- [x] Show phase-marker round flow and selected speaker role in the debate UI.
- [x] Add Start Debate behavior and API call.
- [x] Gate the textarea and send button on `awaitingUserInput`, debate status, and timer state.
- [x] Show role phase assignments in the debate setup UI.
- [x] Keep authentication, dashboard, history, performance, notification, and debate-start flows wired through `src/client/App.tsx` and `src/client/lib/api.ts`.
- [x] Add notification modal, unread badge, dismissal state, and client source tests.

## Remaining

- [ ] Replace phase-marker-only copy with live agent speech, evidence interruption, and judge feedback states after backend orchestration is wired.
- [ ] Add UI for active speaker, allowed actions, transcript event types, evidence-check requests, structured judge decision, and speaker points.
- [ ] Extend `src/client/lib/api.ts` when [@Emma](https://github.com/shzh0828-dotcom) extracts route modules or changes endpoint contracts.
- [ ] Add loading, empty, error, and disabled states for future asynchronous agent and evidence actions.
- [ ] Coordinate with [@Emma](https://github.com/shzh0828-dotcom), [@TT](https://github.com/LOLandXD), and [@Hallie](https://github.com/Hallie-Lunalg) on `AppBootstrap`, `ActiveDebate`, `TranscriptEvent`, and evidence response shapes.

## Suggested Verification
    
- `bun run lint`
- `bun run build`
- Manual dev flow through `bun run dev:all`, client on `3000`, server on `3001`.
