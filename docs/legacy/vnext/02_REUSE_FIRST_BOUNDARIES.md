# 02 — Reuse-First Repository and Runtime Boundaries

Status: APPROVED
Updated: 2026-09-26

## Principle

Career OS vNext should reuse proven infrastructure before introducing new services or APIs.

The objective is not to replace working pieces for architectural purity. The objective is to remove coupling and failure modes while preserving working behavior.

## Reuse now

Keep and wrap these current capabilities:

- Google Drive Changes scanner and page-token model;
- permanent scanner trigger plus temporary queue worker;
- script lock / serialized queue mutation;
- Drive File ID + content fingerprint identity pattern;
- duplicate queue suppression;
- Drive appProperties provenance/status metadata;
- session _AI_WORKSPACE convention;
- deterministic SESSION_MANIFEST;
- HEIC/image OCR path;
- large-audio resumable upload;
- existing transcript detection;
- safe generated-sidecar ownership rules;
- retry/backoff and shared provider cooldown;
- existing Gemini API key and validated 3.8 Flash / 3.5 Transcribe access;
- Career Memory as the private durable processed-state backend;
- existing session bootstrap / harvest / promotion rules.

These are implementation assets. They may later move behind interfaces, but they should not be discarded merely because vNext introduces cleaner boundaries.

## Do not require yet

The following are NOT prerequisites for vNext:

- a new public HTTP API;
- a new API key;
- Dagster;
- n8n;
- a separate worker service;
- Cloud Run;
- a vector database;
- a new database server;
- Docker for normal user operation.

They can be introduced only when a concrete requirement justifies them.

## Initial runtime shape

For the first vNext milestone:

```text
Google Drive
    |
    v
existing Apps Script scanner / queue runtime
    |
    +--> existing Gemini provider paths
    |
    v
normalized vNext contracts
    |
    +--> source/context registry view
    +--> evidence/artifact metadata
    +--> staged knowledge package
    |
    v
selective promotion to career-memory
```

Apps Script remains a working runtime while vNext contracts are introduced around it.

## First architectural correction

Replace the hidden "valid session folder name" gate with an explicit Context Resolver.

Folder hierarchy remains useful input, but folder-name regexes cannot decide whether a source is valid.

A source may resolve to:
- session;
- module/collection;
- course/project;
- global/reference;
- unclassified-but-authorized.

Unclassified authorized inputs are registered and held for later context resolution instead of being discarded.

## Repository target for the first milestone

Do not create every future package immediately.

Start with:

```text
career-os/
├── docs/
│   └── vnext/
├── packages/
│   ├── core/
│   ├── drive-adapter/
│   ├── processing/
│   ├── knowledge/
│   └── persistence/
├── apps/
│   └── apps-script-runtime/
├── tests/
├── templates/
└── .github/
```

Later splits such as providers/, retrieval/, observability/, projections/, api/, worker/ and orchestrator/ happen only when their responsibilities are large enough to justify separate packages/apps.

## Ownership

### packages/core
Pure contracts and data model:
- SourceEnvelope;
- ContextRef;
- SourceVersion;
- EvidenceUnit;
- ArtifactRef;
- processing state;
- policy/state types.

No Drive/Gemini/Apps Script dependencies.

### packages/drive-adapter
Maps Drive metadata/content access into core contracts.

Reuses current:
- file IDs;
- checksums;
- page tokens;
- appProperties;
- Drive Changes behavior.

### packages/processing
Defines media processing behavior and processor routing.

For milestone 1, it may call the already working Gemini implementation through a narrow adapter rather than building a new provider framework first.

### packages/knowledge
Cross-source/session fusion and semantic staging.

### packages/persistence
Abstracts operational registry/state and Career Memory promotion boundaries.

Milestone 1 may continue to use Script Properties, Drive appProperties, Drive artifacts and career-memory behind this boundary.

### apps/apps-script-runtime
Keeps the existing working scanner/queue execution model.

Its job is composition and runtime glue, not domain logic.

## Migration rule

For each current behavior:

1. characterize it;
2. preserve it;
3. put a contract around it;
4. move/refactor only when tests protect the behavior.

Do not rewrite working behavior and architecture at the same time.

## Milestone 1

The first useful vNext milestone is reached when:

- current Drive scanner still detects changes;
- current image/audio processing still works;
- arbitrary authorized folders no longer fail because of naming conventions;
- every source is normalized into the vNext source/context model;
- registry/provenance can answer what was processed and where the derivatives are;
- no new API/service is required from the user.

## Next design gate

Stage 3 should define the canonical data model and identity rules needed to support this compatibility-first migration.
