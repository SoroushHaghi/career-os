# Implementation Status

Status vocabulary:

- **WORKING** — implemented and observed end-to-end.
- **PARTIAL** — implemented in useful form but not yet complete against the target architecture.
- **PLANNED** — architecture/design direction exists but implementation is not complete.
- **DEFERRED** — intentionally not part of the current milestone.

This file describes capability state, not provider availability at any specific moment.

| Capability | Status | Notes |
|---|---|---|
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
| Video transcription | DEFERRED | Video classification exists; audio extraction/transcription adapter not implemented. |
| Durable central source registry | PARTIAL | State is split across Script Properties, appProperties, and manifest; final registry not implemented. |
| Automatic semantic classification/routing beyond folder context | PARTIAL | Structural routing works; broader semantic routing is not complete. |
| Automatic `SESSION_SYNTHESIS.md` generation | PLANNED | Must remain a separate AI reasoning/review layer. |
| Cross-source semantic reconciliation | PLANNED | Needed to reconcile OCR/transcription errors before durable synthesis. |
| Explicit privacy allowlist / project opt-in before AI submission | PLANNED | Important before broad deployment of Drive-wide change detection. |
| Automated promotion to `career-memory` | PLANNED | Only selected durable processed outputs should be promoted. |
| Automated Drive deletion/retirement | DEFERRED | Must never happen as part of normal ingestion. |
| Dashboard/UI | DEFERRED | Reliability and data model come first. |
| Regression/integration test suite | PLANNED | Needed before wider reuse/distribution. |

## Current design debt

Highest-value next engineering items:

1. privacy-aware processing scope/allowlist;
2. hybrid PDF extraction with page boundaries and visual-evidence labeling;
3. durable source registry/state model;
4. regression tests for fingerprint, manifest, queue migration, retries, and sidecar conflict safety;
5. controlled semantic synthesis/promotion layer.

Do not describe PLANNED items as implemented features in README, demos, or downstream agents.
