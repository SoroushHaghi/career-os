# vNext Architecture Validation Log

Updated: 2026-09-26
Scope: Stages 1–7

## Validation purpose

Re-check the current vNext design against the working Career OS baseline before moving deeper into implementation.

Reviewed against:
- docs/AUTOMATION_RUNTIME.md
- docs/INGESTION_AUTOMATION.md
- docs/SOURCE_REGISTRY.md
- docs/PREPROCESSING_PIPELINE.md
- docs/MULTIMODAL_KNOWLEDGE_ARCHITECTURE.md
- docs/VIDEO_INGESTION.md
- docs/CAPABILITY_REGISTRY.md
- current private Gemini migration/runtime state in career-memory

## Result

No blocking architectural contradiction found.

The vNext documents remain compatible with the current working baseline while correcting known coupling.

## Confirmed compatibility

1. Drive File ID remains source identity for the Drive adapter.
2. Content checksum/fingerprint remains source-version identity.
3. Drive Changes page token remains the incremental scanner cursor.
4. Scanner and worker remain separated.
5. Script Properties may continue to hold queue/retry/cursor runtime state.
6. Drive appProperties may continue to hold lightweight source/artifact provenance.
7. _AI_WORKSPACE remains the active Drive artifact workspace.
8. SESSION_MANIFEST.md remains a supported human-readable projection.
9. Existing image/audio provider paths can be reused behind vNext processor/provider boundaries.
10. Current retry/backoff/shared-cooldown/resumable-upload behavior is preserved.
11. career-memory remains the private durable promoted-memory backend.
12. No new API key, database service, orchestration service, or always-on local machine is required for milestone 1.

## Intentional refinements

### Context handling

Old behavior:
- session-name regex could effectively reject a valid source.

vNext:
- folder/session patterns are context hints;
- authorized but unresolved sources become unclassified rather than discarded.

This is an intentional correction, not a compatibility break.

### State model

Older architecture used one broad lifecycle chain.

Stage 5 separates:
- source/version state;
- processing-job state;
- artifact readiness;
- enrichment state;
- promotion state.

This is a refinement that maps back to current queue/runtime statuses.

### Registry layout

The Source Registry contract remains backend-neutral.

Stage 4 does not introduce a permanent database choice.
Milestone 1 uses current Drive/Apps Script state plus rebuildable JSON/JSONL projections.

### Video runtime

Existing target architecture recommends a future heavier worker for advanced video preprocessing.

Milestone 1 does not require that worker.

This is not a contradiction:
- processor contracts are defined now;
- heavy runtime migration remains deferred until required.

## Branch safety check

At validation time:

```text
main...vnext status: ahead
vnext ahead of main: 21 commits
vnext behind main: 0 commits
```

Therefore the baseline main branch has not been replaced by vNext work.

## Pages/monitor check

GitHub Pages is configured from vNext docs.

Multiple rapid vNext commits may cancel intermediate Pages builds because a newer deployment supersedes them.

The newest Pages deployment should be treated as authoritative.

## Current design status

```text
Stage 1  APPROVED
Stage 2  APPROVED
Stage 3  APPROVED
Stage 4  APPROVED
Stage 5  PROPOSED FOR REVIEW
Stage 6  PROPOSED FOR REVIEW
Stage 7  PROPOSED FOR REVIEW
```

## Current gate

Review Stages 5–7 as one compatibility set before moving into Stage 8 knowledge/retrieval/learner semantics or implementation.


## Validation pass — 2026-09-27 — Stages 8–11

Reviewed:
- docs/vnext/08_KNOWLEDGE_MODEL.md
- docs/vnext/09_RUNTIME_OPERATIONS.md
- docs/vnext/10_UI_PROJECTIONS.md
- docs/vnext/11_DELIVERY_MIGRATION.md
- docs/MULTIMODAL_KNOWLEDGE_ARCHITECTURE.md
- docs/OPERATIONS_CONTROL_PLANE.md
- docs/ARCHITECTURE.md
- docs/ROUTING_PROTOCOL.md
- private Career Memory authority/storage rules

### Result

No blocking architectural contradiction found.

### Key checks

1. Personal/user-specific knowledge remains private and is never written to the public career-os repository.
2. career-os is the canonical source for reusable system code/config schemas/tests/docs/deployment logic.
3. career-memory remains canonical private processed/user state rather than a second system-code repository.
4. Drive/local/source systems remain raw/active source authorities where appropriate.
5. Knowledge, evidence, learner state and operational state remain separate.
6. Classification ownership is automated by system components; manual review is only an exception path.
7. Apps Script remains the milestone-1 runtime but is no longer intended to be a separately edited source-of-truth.
8. Dagster/n8n are optional future runtimes, not milestone-1 dependencies.
9. Public monitoring reads only public-safe data.
10. Migration is incremental and rollback remains Git-based.

### Corrections made during validation

- Fixed the public monitor Stage 9–11 document paths.
- Added a vNext authority note to OPERATIONS_CONTROL_PLANE.md so its older Dagster-first recommendation does not conflict with the reuse-first milestone-1 plan.

### Repo-centric invariant

At steady state:
- system behavior changes start in career-os;
- private user state is read from authorized private stores;
- runtime deployments are generated/synced from repository source;
- no personal information is required in the public repository.

### Architecture-complete recommendation

Stages 8–11 are compatible with Stages 1–7 and the current baseline. They can be approved together and implementation can begin from a repository-owned milestone plan.
