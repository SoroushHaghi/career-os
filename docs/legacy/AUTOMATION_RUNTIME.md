# Automation Runtime

This document describes the current Career OS ingestion runtime. It documents behavior; it does not contain private configuration, source IDs, API keys, queue contents, or user data.

## Runtime split

The automation deliberately separates **detection** from **heavy processing**.

### Scanner: `checkDriveChanges()`

Purpose:
- read Google Drive Changes API from the persisted page token;
- classify changed files;
- compute/refresh source content fingerprints;
- prepare session workspace state;
- enqueue supported image/audio work;
- update deterministic session inventory when needed;
- advance the Drive page token safely.

The scanner should remain short and deterministic. It should not perform expensive OCR/transcription inline.

Typical cadence: every 5 minutes.

### Worker: `processCareerOsQueues()`

Purpose:
- process queued image/audio work;
- respect per-job retry timing;
- respect shared Gemini backoff;
- perform OCR/transcription;
- create/update generated text artifacts;
- remove its own trigger when no queued work remains.

Typical cadence while active: every 1 minute.

A script lock serializes scanner/worker execution to avoid concurrent queue mutations.

## Dynamic worker lifecycle

The worker trigger is intentionally temporary:

```text
queue empty -> no worker trigger
queue becomes non-empty -> create one worker trigger
worker processes/retries jobs
queues empty -> delete worker trigger
```

This reduces unnecessary Apps Script executions and keeps the runtime simple.

## Identity and version model

Three identities are intentionally separate:

- **Drive File ID** = source identity.
- **content fingerprint/checksum** = source content version.
- **session folder Drive ID** = canonical session identity.

File names and folder names are human labels and may change.

For stored binary Drive files, MD5 is the preferred fingerprint when available. `modifiedTime` is informational and must not be the primary content-version key, because metadata/app-property writes can change it without changing file bytes.

This rule prevents self-trigger loops such as:

```text
process source
-> write processing metadata
-> Drive modifiedTime changes
-> scanner sees apparent new version
-> process same bytes again
```

## Session-centric workspace

A repeated course/session may use:

```text
<course>/
  <collection>/
    <session>/
      <raw source files>
      _AI_WORKSPACE/
        <source-derived text>
        SESSION_MANIFEST.md
        SESSION_SYNTHESIS.md   # later AI reasoning layer, not mechanical ingestion
```

`_AI_WORKSPACE` is a technical evidence workspace inside the session. Raw source files stay in the session folder unless another explicit policy says otherwise.

## Session manifest

`SESSION_MANIFEST.md` is a deterministic inventory/provenance artifact. It is not a lesson summary and not evidence of mastery.

It records, where available:
- current course/collection/session labels;
- stable folder IDs;
- source file IDs;
- MIME types;
- content fingerprints;
- transcript association;
- processing status;
- text artifact source associations.

The manifest is only rewritten when normalized inventory/state changes. A timestamp-only difference must not cause endless rewrites.

## Image OCR queue

Supported current image types include common JPEG/PNG/WebP and HEIC/HEIF forms.

Flow:

```text
changed image
-> fingerprint
-> skip if current generated artifact already exists
-> enqueue
-> worker calls configured AI OCR path
-> create/update protected text sidecar in `_AI_WORKSPACE`
-> mark processing state
```

Generated artifacts carry provenance in both visible metadata headers and Drive appProperties when available.

## Audio queue

Large audio uses resumable upload rather than loading the whole recording into Apps Script memory.

Current design:
- read Drive byte ranges;
- upload in bounded chunks;
- persist upload URL/offset/state in queue storage;
- resume across executions;
- transcribe only after upload finalization;
- delete temporary provider-side file after successful transcription.

For long recordings, requested timestamps are navigation-level model-generated segment starts. They are not forensic word-level timestamps.

## Existing transcript association

Before retranscribing audio, the runtime searches the session workspace for credible existing transcript evidence. Strong associations include explicit source/fingerprint provenance. Conservative same-basename transcript matching may also be used for substantial transcript-like text while excluding obvious notes/summaries.

If the audio content fingerprint changes, a previously linked unchanged external transcript must not silently satisfy the new audio version.

## Sidecar safety

The automation must never overwrite an ambiguous user-created text file merely because its name matches the preferred generated name.

Ownership is proven through Career OS provenance metadata. If same-name text exists but ownership cannot be proven, preserve it and create a safe alternative Career OS filename.

## Retry and backoff

Transient HTTP failures are queued for retry instead of crashing the Drive scanner.

For provider `Retry-After` hints:
- prefer the server hint;
- never retry faster than the worker cadence/minimum retry interval;
- add small jitter;
- use exponential backoff only when no authoritative hint exists.

A shared Gemini backoff prevents an image 429 from immediately causing another Gemini request through the audio path in the same quota bucket.

HTTP 429 remains retryable beyond ordinary attempt caps because it represents quota/rate availability rather than corrupt source content.

## State storage

Current runtime state is distributed across:
- Script Properties for Drive page token, queues, retry policy version, shared backoff, and secret reference;
- Drive appProperties for source/artifact associations and processing status;
- deterministic `SESSION_MANIFEST.md` for readable session inventory.

This is sufficient for the current implementation, but it is not yet the final durable central source registry described in the architecture.

## Provider boundary

Provider/model identifiers are implementation adapters. They must not become architectural requirements. Credentials live outside Git and must never appear in this repository.
