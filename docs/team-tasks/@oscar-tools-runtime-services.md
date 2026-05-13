# [@Oscar](https://github.com/Oscar-The-Great): Tools And Runtime Services

## Owns

- `src/server/services/timerService.ts`
- `src/server/services/evidenceClerk.ts`
- `src/server/services/rulesMarshal.ts`
- `src/server/services/transcriptService.ts`
- `src/server/tools/evidenceTools.ts`
- `src/server/tools/calculatorTools.ts`
- `src/server/guardrails/inputGuardrails.ts`
- `src/server/guardrails/outputGuardrails.ts`
- `src/server/guardrails/toolGuardrails.ts`

## TODO

- Implement timer service for speech time, prep time, pause/resume, expiration, and UI event payloads.
- Implement evidence clerk logic for recording claims, checking citation completeness, showing evidence in full/context, and reporting evidence problems.
- Implement deterministic rules marshal checks for wrong side, wrong speaker role, illegal prep timing, excessive partner assistance, and new final-focus arguments.
- Implement transcript service for appending, listing, summarizing, and filtering transcript events by phase/session.
- Implement calculator and evidence tools as callable backend functions for agents and orchestrator.
- Keep timer as a backend service, not an agent tool.
- Keep rules marshal deterministic for MVP; only add an internal agent later if deterministic checks are insufficient.
- Coordinate with [@TT](https://github.com/LOLandXD) on retrieval interfaces and with [@Hallie](https://github.com/Hallie-Lunalg) on orchestrator interruption behavior.

## Suggested Verification

- `bun run lint`
- Unit tests for timer, citation completeness, rule checks, and transcript appends once a test runner is added.
