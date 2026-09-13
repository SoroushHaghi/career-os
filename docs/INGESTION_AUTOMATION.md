# Ingestion Automation

This document defines the current event-driven ingestion layer for Career OS.

## Goal

Reduce manual source-processing work while preserving user control, provenance, privacy, and recoverability.

Ingestion should make a source AI-readable and traceable. It must not silently turn source material into career claims, mastery claims, final notes, or external actions.

## Current operating model

The current implementation is Google-Drive-first and session-centric.

```text
new/changed Drive source
    -> detect through Drive Changes API
    -> identify source by Drive File ID
    -> fingerprint source content
    -> skip current version if already processed
    -> route to session context where available
    -> queue supported heavy work
    -> OCR/transcribe in worker
    -> write source-derived text into `_AI_WORKSPACE`
    -> update deterministic `SESSION_MANIFEST.md`
    -> defer semantic synthesis until useful
```

Detection and heavy AI processing are separated. See `AUTOMATION_RUNTIME.md`.

## Intake scope

The scanner currently observes changes in My Drive rather than relying only on one dedicated intake folder. Folder hierarchy is used as a strong routing signal for known course/session structures.

This broad detection model does **not** imply that every changed Drive file should automatically be sent to an AI provider. An explicit privacy-aware processing scope/allowlist remains a planned hardening step before broad deployment.

## Session structure

A typical academic session can look like:

```text
COURSE/
  L/
    10/
      recording.m4a
      slides.pdf
      board.heic
      _AI_WORKSPACE/
        recording.txt
        board.txt
        SESSION_MANIFEST.md
        SESSION_SYNTHESIS.md   # later AI reasoning layer
```

Rules:
- raw evidence stays in the session folder;
- text evidence and mechanical provenance live in `_AI_WORKSPACE`;
- session folder Drive ID is canonical identity;
- folder/file names are mutable labels;
- `SESSION_MANIFEST.md` is inventory/provenance, not semantic synthesis;
- `SESSION_SYNTHESIS.md` is a later AI-reviewed output, not produced mechanically by ingestion.

## Source identity and change detection

Use:
- Drive File ID for source identity;
- content checksum/fingerprint for source version;
- modified time only as supporting diagnostics/fallback where a stable checksum is unavailable.

For stored binary files, MD5 is preferred when Drive exposes it.

Same fingerprint -> do not reprocess unnecessarily.
Changed fingerprint -> treat as a new content version and invalidate stale processing associations as needed.

## Current source-type behavior

### Text evidence

TXT/Markdown is already machine-readable. It is treated as evidence and may be organized/tagged into the session workspace rather than extracted again.

### Images

Supported image formats are queued for OCR/visual text extraction. Generated text is provenance-tagged and written into `_AI_WORKSPACE`.

Ambiguous user-created same-name text must never be overwritten. Career OS proves generated-file ownership before updating it; otherwise it creates a safe alternative name.

### Audio

Large audio uses resumable provider upload with bounded Drive byte-range reads. Queue state allows work to resume across Apps Script executions.

Before transcription, the system searches for a credible existing transcript in the session workspace. A valid existing transcript may satisfy the audio source without redundant provider work.

### PDF

Classification exists, but the target hybrid PDF extractor is not yet implemented.

Planned behavior:
- text-native pages -> direct text extraction;
- scanned/image pages -> OCR/vision;
- mixed documents -> combine both;
- preserve page boundaries such as `[PAGE n]`;
- clearly label AI visual interpretation separately from source-faithful extracted text.

### DOCX / native Google Docs

Classification exists; extraction adapters are planned but not complete.

### Video

Deferred. Future path may extract/transcribe audio, but this is not a current implemented capability.

## Immediate vs deferred processing

### Immediate ingestion

Perform only what is required to make the source usable and traceable:
- detect change;
- fingerprint;
- route structurally;
- extract/OCR/transcribe where implemented;
- create/update source-derived text;
- record provenance/status;
- queue retries for transient failures.

### Deferred reasoning

Do not automatically spend large AI budgets on every source.

Deferred work includes:
- semantic lesson synthesis;
- cross-source reconciliation;
- study plan generation;
- career evidence promotion;
- interview preparation;
- final project notes;
- long-term memory promotion.

## Queue and failure model

Heavy work is queue-based so provider failures do not replay Drive change batches.

Transient failures such as HTTP 429 are retried. Provider retry hints are preferred when available, with a worker-safe minimum delay and jitter. Exponential backoff is fallback behavior when no server hint exists.

A shared provider cooldown prevents one quota failure from immediately triggering another request through another queue type.

## Processing state

Current state is distributed across:
- Script Properties: page token, queues, retry/backoff state, secret reference;
- Drive appProperties: source/artifact associations and processing status;
- `SESSION_MANIFEST.md`: human/AI-readable session inventory.

This is **PARTIAL** relative to the target durable central source registry. A dedicated registry remains planned.

## Privacy and storage boundary

- raw sources remain in approved private source storage;
- credentials remain outside Git;
- this repository contains only reusable system documentation/templates;
- full private transcripts should not be copied into `career-os`;
- `career-memory` receives only selected durable private state/processed outputs according to its policy;
- highly sensitive material should not be sent to cloud AI processing without an explicitly approved scope.

## Human control

The ingestion automation may perform approved internal processing such as reading, fingerprinting, OCR/transcription, queue management, provenance tagging, and internal state updates.

It does not gain authority to:
- publish content;
- submit applications/forms;
- send messages;
- modify public profiles;
- delete originals;
- expose private source content publicly;
- silently promote extracted material into verified career claims.

## Implementation references

- `AUTOMATION_RUNTIME.md` — runtime mechanics.
- `AUTOMATION_OPERATIONS.md` — safe runbook.
- `IMPLEMENTATION_STATUS.md` — working/partial/planned matrix.
- `../templates/SESSION_MANIFEST.example.md` — synthetic manifest example.
