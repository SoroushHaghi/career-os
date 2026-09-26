# Implementation Status

Status vocabulary:

- **WORKING** — implemented and observed end-to-end.
- **PARTIAL** — implemented in useful form but not yet complete against the target architecture.
- **PLANNED** — architecture/design direction exists but implementation is not complete.
- **DEFERRED** — intentionally not part of the current milestone.

This file describes capability state, not provider availability at any specific moment.

| Capability | Status | Notes |
|---|---|---|
| Session bootstrap contract | PARTIAL | Mandatory startup/closeout contract and minimal host template are defined; the actual Career OS Project must still install the minimal binding so arbitrary new chats enforce it automatically. |
| Minimal reusable host binding | WORKING | A small Project-instruction template and installation contract are defined; detailed logic remains version-controlled in the repositories. |
| Automatic persistence policy | PARTIAL | Automatic persistence is the required normal path and manual handoff is removed from standard operation; true persistence still depends on a writable backend/queue being available to the host. |
| Role registry / ownership model | WORKING | Seven stable Roles are defined and adopted as the system contract. |
| Capability registry | WORKING | Runtime/provider-neutral ability taxonomy is defined. |
| Workflow registry | WORKING | Initial recurring workflows are defined. |
| Universal routing protocol | PARTIAL | Protocol is active for sessions/agents; a generalized automated semantic router is not yet implemented across all runtimes. |
| Promotion/persistence closeout | PARTIAL | Canonical ownership and closeout rules are active; automatic post-processing promotion is not yet implemented end-to-end. |
| Google Drive Changes scanner | WORKING | Incremental page-token scanning with `restrictToMyDrive` behavior in current implementation. |
| Permanent scanner trigger | WORKING | Intended cadence approximately every 5 minutes. |
| Dynamic queue worker | WORKING | Created only while queues contain work; removed when idle. |
| Script lock / serialization | WORKING | Prevents scanner/worker queue races. |
| Session-centric `_AI_WORKSPACE` | WORKING | Source-derived text + mechanical manifest live under session workspace. |
| Session folder ID as canonical identity | WORKING | Folder names remain mutable labels. |
| Content fingerprinting for stored binary files | WORKING | MD5 preferred; prevents metadata-only self-loop reprocessing. |
| Duplicate queue suppression | WORKING | Job identity includes source File ID + content fingerprint. |
| Deterministic `SESSION_MANIFEST.md` | WORKING | Avoids timestamp-only rewrites. |
| Image OCR | WORKING | Supported image formats; runtime success still depends on provider quota. |
| HEIC/HEIF path | WORKING | Observed in current image processing path. |
| Safe generated sidecar ownership | WORKING | Ambiguous user-created same-name text is preserved. |
| Large-audio resumable upload | WORKING | Byte-range Drive reads + resumable provider upload across executions. |
| Audio transcription | WORKING | Long-audio prompt with navigation timestamps. |
| Existing transcript detection | WORKING | Can satisfy audio source without unnecessary retranscription. |
| Temporary provider audio cleanup | WORKING | Deleted after successful transcription. |
| Retry/backoff for transient provider errors | WORKING | Server retry hint preferred; exponential fallback; jitter. |
| Shared Gemini quota cooldown | WORKING | Prevents immediate second request through another queue type. |
| Retry policy migration | WORKING | Older overly-long quota waits can be normalized once. |
| TXT evidence routing | WORKING | Existing text can be moved/tagged into session workspace. |
| PDF extraction | PLANNED | Target is hybrid native-text + OCR/visual evidence with page provenance. |
| DOCX extraction | PLANNED | Classification exists; extraction adapter not implemented. |
| Native Google Docs extraction | PLANNED | Classification exists; extraction adapter not implemented. |
| Video preprocessing | PLANNED | Target dual-path pipeline: extracted-audio transcription plus direct multimodal video analysis, salient timestamps/frames, visual notes and merged chronological notes. |
| Durable central source registry | PARTIAL | State is split across Script Properties, appProperties, and manifest; final registry not implemented. |
| Automatic semantic classification/routing beyond folder context | PARTIAL | Structural routing works; broader semantic routing is not complete. |
| Automatic semantic enrichment / staged synthesis | PLANNED | Target is compact semantic profiles + staged synthesis generated after source-faithful preprocessing; inference remains distinct from source truth. |
| Automatic `SESSION_SYNTHESIS.md` generation | PLANNED | Session-level synthesis becomes one output of the staged enrichment layer. |
| Cross-source semantic reconciliation | PLANNED | Needed to reconcile OCR/transcription errors before durable synthesis. |
| Explicit privacy allowlist / project opt-in before AI submission | PLANNED | Important before broad deployment of Drive-wide change detection. |
| Automated promotion to `career-memory` | PLANNED | Only selected durable processed outputs should be promoted. |
| Automated Drive deletion/retirement | DEFERRED | Must never happen as part of normal ingestion. |
| Dashboard/UI | DEFERRED | Reliability and data model come first. |
| Regression/integration test suite | PLANNED | Needed before wider reuse/distribution. |

## Current design debt

Highest-value next engineering items:

1. refactor the current monolith behind connector/core/processor/provider interfaces while preserving behavior;
2. implement a durable normalized source registry and idempotent processing-state model;
3. implement privacy-aware processing scope/allowlist before automatic AI-heavy processing broadens;
4. add staged semantic enrichment so approved inputs are summarized/indexed before interactive use;
5. implement hybrid PDF and dual-path video preprocessing with provenance;
6. add regression/integration tests for routing, fingerprinting, registry state, retries, sidecar safety, extraction and promotion;
7. add controlled automated promotion to career-memory for durable evidence-safe deltas.

Do not describe PLANNED items as implemented features in README, demos, or downstream agents.
