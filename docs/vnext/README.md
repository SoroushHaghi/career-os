# Career OS vNext

Status: DESIGN IN PROGRESS
Branch: `vnext`

## Working rule

vNext is designed top-down.

Do not add production implementation until the current architecture layer is agreed.

Design order:

1. system boundaries and top-level subsystems;
2. repository ownership and package boundaries;
3. canonical data model and identities;
4. storage / registry / artifact model;
5. processing pipeline and state machine;
6. connector contracts;
7. processor/provider contracts;
8. knowledge fusion / retrieval / learner model;
9. runtime orchestration and observability;
10. UI projections;
11. tests, CI/CD, deployment and migration.

Each stage should leave an explicit contract for the next stage.

## Current baseline

The existing `main` branch remains the current Career OS baseline.

The earlier `apps/ingestion/` code was an experimental vertical slice created before the vNext architecture was approved. It is intentionally absent from the `vnext` branch and is not a vNext implementation dependency.

## Current design status

```text
1. System boundaries                         APPROVED
2. Reuse-first repository/runtime boundaries APPROVED
3. Canonical data model and identities       APPROVED
4. Storage / registry / artifact model       APPROVED
5. Processing pipeline and state machine     PROPOSED FOR REVIEW
6. Connector contracts                       PROPOSED FOR REVIEW
7. Processor / provider contracts            PROPOSED FOR REVIEW
8. Knowledge / retrieval / learner model     NOT STARTED
9. Runtime orchestration / observability      NOT STARTED
10. UI projections                           NOT STARTED
11. Tests / CI-CD / deployment / migration   NOT STARTED
```

Compatibility re-check:
- `docs/vnext/VALIDATION_LOG.md`

Current gate:
Review Stages 5–7 together before Stage 8 or implementation.
