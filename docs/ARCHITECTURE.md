# Career OS Architecture

## System boundary

Career OS is the umbrella system. Do not create a second Personal/Academic OS above it.

Career OS supervises independent academic, career, and technical-project ecosystems while preserving their working context and canonical ownership.

## Organizational control plane

Career OS separates organizational responsibility from execution runtime.

Stable Roles own durable responsibility. Capabilities describe reusable abilities. Workflows compose capabilities. Task Sessions are disposable executions. Agents are runtime executors. Workspaces hold continuing context. Tabs are UI views only.

The seven core Roles and their ownership boundaries are defined in `ROLE_REGISTRY.md`. Reusable abilities are defined in `CAPABILITY_REGISTRY.md`, recurring flows in `WORKFLOW_REGISTRY.md`, and the runtime-independent task lifecycle in `ROUTING_PROTOCOL.md`.

Every meaningful task is assigned one Primary Role plus optional Contributor Roles. After execution, a Promotion Router sends durable outputs to their canonical owners. A chat, Work session, automation, or script must never become a competing truth store merely because it executed the task.

## Authority model

Career OS uses different authorities for different data layers:

1. **Local/SSD = archival source of truth for retained raw/original material.**
   - long-term raw archive and resilience layer;
   - not a normal runtime dependency.

2. **Google Drive = active cloud working environment / short-term project and source memory.**
   - active-course/project files, recordings, images, temporary transcripts, generated session evidence, and operational workspaces;
   - supports work while the local machine is offline;
   - not the long-term authority after project closure.

3. **`career-memory` private repository = canonical processed/AI-readable long-term memory.**
   - durable structured facts/state/evidence, project archives, selected processed outputs, and protected internal snapshots;
   - not a warehouse for raw sensitive source binaries or credentials.

4. **`career-os` reusable/public-safe repository = system/agent layer.**
   - architecture, policies, templates, automation documentation, onboarding, and operating rules;
   - no real user data or private runtime state.

Raw originals and processed knowledge therefore have separate authorities by design.

## Runtime independence

Normal Chat is the default interactive runtime. Work mode, automations, and scripts are alternate executors selected for capability or execution needs; they do not define ownership.

Normal operation is cloud-first:

```text
AI / agent
     ↕
Google Drive active workspace
        ↓ one-way processing / selected promotion
career-memory durable processed memory

career-os = reusable rules / architecture / agent instructions
```

The user's local machine may be offline without blocking normal operation.

## One-way flow rule

Drive-to-repository promotion is one way. Never build automatic GitHub -> Drive synchronization.

Repository-to-local backup is a separate resilience workflow and must not become a prerequisite for day-to-day work.

## Ingestion runtime architecture

Current source ingestion separates change detection from heavy processing:

```text
Drive Changes API
      ↓
scanner: checkDriveChanges
      ↓
source identity + content fingerprint
      ↓
route / enqueue
      ↓
dynamic worker: processCareerOsQueues
      ↓
OCR / transcription where supported
      ↓
session `_AI_WORKSPACE`
      ↓
mechanical SESSION_MANIFEST
      ↓
optional later semantic synthesis/promotion
```

Why split scanner and worker:
- advancing the Drive page token does not depend on provider success;
- HTTP 429/quota errors do not replay the same Drive change batch;
- expensive work can resume independently;
- queues preserve retry/progress state;
- temporary worker trigger exists only while work remains.

See `AUTOMATION_RUNTIME.md`.

## Identity model

- Drive File ID = source identity.
- Content checksum/fingerprint = source version for stored binary files where available.
- Session folder Drive ID = canonical session identity.
- File/folder names = mutable human labels.
- `modifiedTime` = diagnostic/fallback metadata, not primary binary content identity.

This prevents metadata-only writes from creating self-trigger reprocessing loops.

## Session-centric active workspace

An active repeated session may keep:

```text
<course>/<collection>/<session>/
  raw sources
  _AI_WORKSPACE/
    source-derived text
    SESSION_MANIFEST.md
    SESSION_SYNTHESIS.md   # later AI-reviewed layer
```

The session manifest is deterministic inventory/provenance. Semantic synthesis is intentionally separate.

## Active project rule

An active project may keep its operational ecosystem on Drive. Career OS supervises through stable references and reads relevant state when needed.

`career-memory` must not create a competing canonical copy of every active project file. Only durable processed state/outputs worth preserving should be promoted.

## Closed project rule

When a project closes:

1. verify required raw/original material is retained in the intended archival layer;
2. extract/promote durable processed knowledge/state worth preserving;
3. preserve provenance and closure state;
4. verify retrieval;
5. retire Drive working material only if desired and explicitly safe.

Deletion is not part of automatic ingestion.

## What may enter `career-memory`

Preferred durable formats include `.md`, `.txt`, `.jsonl`, `.yaml`, source indexes, and protected text source snapshots when policy permits.

Do not duplicate audio/video/image/PDF binaries merely because they exist on Drive.

## Source representation and provenance

Durable processed representation should retain enough provenance to answer:
- which source(s) produced it;
- where the source is/was stored;
- source identity/version when known;
- processing/verification state;
- extraction uncertainty or exclusions.

Raw evidence and processed representation are not interchangeable.

## Universal task lifecycle

The generic task path is:

```text
input
  -> privacy/safety gate
  -> intake router
  -> decision gate when material
  -> workflow/capability execution
  -> promotion router
  -> canonical persistence
  -> state/next-action closeout
```

Deterministic routing rules are preferred before semantic classification. High-risk ambiguity around privacy, cost, destructive actions, external actions, or canonical ownership requires review rather than silent guessing.

See `ROUTING_PROTOCOL.md`.

## Activation layer

Long-term memory is retrieved selectively:

```text
career-memory archive
      ↓ targeted retrieval
active context packet
      ↓
Chat / Work execution
```

Do not load the whole memory repository into every task.

## Evidence rule

Career claims must distinguish demonstrated evidence, developing knowledge, planned learning, inference, and verification.

Processed academic material never automatically becomes a career skill claim.

## Privacy architecture

Drive change detection scope is not equivalent to cloud-AI processing authorization. A privacy-aware allowlist/project-opt-in layer is planned before broad deployment of Drive-wide automatic provider submission.

Credentials remain outside Git. Generated OCR/transcripts inherit source sensitivity unless deliberately sanitized.

## Availability and failure policy

- laptop offline -> cloud workflow continues;
- local backup delayed -> catch up later;
- provider quota exhausted -> queued retry, source preserved;
- Drive unavailable -> durable processed state remains in GitHub;
- GitHub unavailable -> active Drive work can continue temporarily;
- accidental upstream deletion -> independent archival copies must not be destructively synchronized by default.

No single storage layer should be the only recoverable copy of everything.
