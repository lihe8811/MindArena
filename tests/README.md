# Test Structure

Tests are organized by project component, matching the `src/` architecture rather than individual team member names.

Run all tests:

```bash
bun test
```

Run one ownership area:

```bash
bun test tests/knowledge
```

## Component Folders

- `client/`: `src/client/` views, components, and browser API wrappers.
- `server-api/`: Express app setup, session routes, bootstrap routes, and current JSON stores.
- `knowledge/`: shared schemas, knowledge retrieval, vector persistence contracts, and DB schema tests.
- `agents/`: Rival, Teammate, and future agent factories, prompts, and agent output contracts.
- `orchestration/`: Judge agent, phase model, state machine, orchestrator, and debate routes.
- `runtime-services/`: timer, evidence clerk, rules marshal, transcript service, tools, and guardrails.

Keep tests close to the component that owns the behavior. Cross-component integration tests should live with the coordinating component.
