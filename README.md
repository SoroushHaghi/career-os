# Career OS

A privacy-first, AI-assisted Career Operating System for persistent memory, evidence tracking, job matching, source ingestion, and career workflows.

## Purpose

This repository contains the **reusable system layer**: architecture, operating rules, privacy boundaries, templates, automation documentation, and agent instructions. It must remain free of real user data, credentials, private source files, and runtime state.

It is also the **entrypoint for another AI/agent**. An agent joining Career OS should understand this repository first, then request only the private/contextual resources required for the current task.

## Agent start sequence

1. Read this `README.md`.
2. Read `docs/ARCHITECTURE.md` for authority, storage, and data-flow rules.
3. Read `docs/GOVERNANCE.md` and `PRIVACY.md` for operating boundaries.
4. For ingestion work, read `docs/INGESTION_AUTOMATION.md`, `docs/AUTOMATION_RUNTIME.md`, and `docs/AUTOMATION_OPERATIONS.md`.
5. Read `docs/IMPLEMENTATION_STATUS.md` before assuming a capability exists.
6. Access private `career-memory` or active Google Drive state only when the task requires user-specific context.
7. Never assume the user's local machine is available or required for normal runtime.

## Data separation

- `career-os` — reusable/public-safe framework, rules, templates, and automation documentation.
- `career-memory` — private, sanitized, AI-readable durable memory/state and protected internal snapshots.
- Google Drive — active cloud working environment and short-term project/source workspace.
- Local/SSD — independent raw-source archive and optional local backup; **not a runtime dependency**.

## Runtime principle

Normal Career OS work must remain available when the user's laptop is off or unavailable.

```text
AI / agents
     ↕
Google Drive active workspace
     ↓ processing / derived evidence
career-memory durable processed memory

career-os = rules / architecture / reusable framework
```

Drive-to-repository promotion is one-way. Do not build automatic GitHub -> Drive synchronization.

## Current ingestion automation

The current implementation is session-centric and cloud-first.

```text
Drive change
   ↓
scanner (`checkDriveChanges`)
   ↓
content fingerprint / routing
   ↓
queue lightweight work
   ↓
dynamic worker (`processCareerOsQueues`)
   ↓
OCR / transcription where supported
   ↓
`_AI_WORKSPACE`
   ├── extracted/transcribed text
   └── `SESSION_MANIFEST.md`
```

Key properties:

- Drive File ID is source identity.
- Content checksum/fingerprint is source version for stored binary files.
- Session folder Drive ID is canonical session identity; folder names are mutable labels.
- Scanner and worker are separate so API quota errors do not replay Drive change batches.
- Worker trigger exists only while queues contain work.
- Retry/backoff handles transient failures and Gemini free-tier rate limits.
- Existing credible transcript text can satisfy an audio source without retranscribing it.
- Generated artifacts are provenance-tagged and source files are preserved.
- Semantic synthesis is intentionally separate from mechanical ingestion.

See `docs/INGESTION_AUTOMATION.md` and `docs/AUTOMATION_RUNTIME.md` for details.

## Implementation status

Do not infer implementation from architecture alone. The system deliberately distinguishes **WORKING**, **PARTIAL**, and **PLANNED** capabilities.

Current high-level state:

- Drive change detection — WORKING
- session-centric workspace + manifest — WORKING
- image OCR — WORKING, quota-limited by provider free tier
- large-audio resumable upload/transcription path — WORKING
- existing transcript detection — WORKING
- content fingerprinting / duplicate suppression — WORKING
- dynamic queue worker + retry/backoff — WORKING
- PDF hybrid extraction — PLANNED
- DOCX / Google Docs extraction — PLANNED
- durable central source registry — PARTIAL / PLANNED
- automatic `SESSION_SYNTHESIS.md` generation — PLANNED
- explicit privacy allowlist before broad Drive-to-AI processing — PLANNED

The authoritative status list is `docs/IMPLEMENTATION_STATUS.md`.

## Core principles

1. Privacy first: no secrets, private identifiers, or private source documents in this repository.
2. Evidence before claims: demonstrated, developing, planned, inferred, and verified states remain distinct.
3. Persistent memory: meaningful decisions and state changes survive individual chats.
4. Cloud-first availability: normal operation must not depend on the user's laptop being online.
5. Low-consumption operation: targeted reads, batched writes, fingerprints, queues, and deferred deep processing.
6. Portable design: provider/model choices are adapters, not architectural truth.
7. Automation before dashboards: reliable ingestion/execution comes before UI polish.
8. No silent destructive propagation: source deletion, cloud deletion, and archival deletion are separate decisions.
9. Separate ingestion from interpretation: extraction/OCR/transcription creates evidence; AI synthesis is a later reasoning layer.

## Documentation map

- `docs/ARCHITECTURE.md` — system/storage authority and data flow.
- `docs/GOVERNANCE.md` — ownership, persistence, evidence, and external-action rules.
- `PRIVACY.md` — repository and cloud-processing privacy boundary.
- `docs/INGESTION_AUTOMATION.md` — ingestion design and current behavior.
- `docs/AUTOMATION_RUNTIME.md` — scanner, queues, worker, fingerprints, manifests, retry behavior.
- `docs/AUTOMATION_OPERATIONS.md` — safe operating/runbook instructions.
- `docs/IMPLEMENTATION_STATUS.md` — what is working, partial, or planned.
- `docs/WORKSPACE_STANDARD.md` — reusable project/session workspace model.
- `docs/MIGRATION_PROTOCOL.md` — safe migration from legacy stores.
- `docs/APPLICATION_STANDARD.md` — application workflow standard.
