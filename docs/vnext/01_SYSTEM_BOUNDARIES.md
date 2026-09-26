# 01 — System Boundaries and Top-Level Subsystems

Status: PROPOSED FOR REVIEW
Updated: 2026-09-26

## Goal

Career OS should accept heterogeneous inputs, turn them into reusable and traceable knowledge before an agent needs them, maintain private durable memory, expose operational/knowledge views, and remain portable across storage providers, AI providers and runtimes.

The architecture must avoid coupling Career OS to Google Drive, Apps Script, Gemini, one folder naming convention, one chatbot, or one UI.

## System boundary

Career OS is the software/control system.

It does not own raw private source binaries, provider credentials, or the user's archival storage.

External systems may include:
- Google Drive, local files, web pages, email, OneDrive, Dropbox or future sources;
- Gemini, OpenAI, Anthropic or future model providers;
- Career Memory as the private durable processed-memory backend;
- Obsidian or a web UI as projections;
- runtime/orchestration infrastructure.

## Top-level subsystem map

```text
                     Source Systems
                  Drive / Web / Local / ...
                             |
                             v
                       CAREER OS

  1. Intake & Connectors
       |
  2. Policy & Context
       |
  3. Source Registry & Provenance
       |
  4. Multimodal Processing
       |
  5. Knowledge & Fusion
       |
  6. Retrieval & Indexing
       |
  7. Learner / User-State Overlay
       |
  8. Promotion & Memory

  Cross-cutting:
  9. Orchestration & Jobs
 10. Observability & Operations
 11. API / Agent Interface

                             |
        +--------------------+--------------------+
        v                    v                    v
   career-memory        Knowledge UI       Ops / Control UI
```

## 1. Intake & Connectors

Responsibility:
- detect or receive source changes;
- read source-system metadata/content;
- convert provider-specific records into a normalized source envelope.

Must not:
- contain OCR/transcription logic;
- decide career truth;
- embed provider-specific assumptions into the processing core.

Examples:
- Google Drive connector;
- web/URL connector;
- local import;
- future OneDrive/email connectors.

## 2. Policy & Context

Responsibility:
- determine whether a source may be processed;
- resolve logical context: course, module, session, project, global reference, etc.;
- apply privacy/cost/processing policies.

Key correction from the old design:
folder names are routing signals, not canonical truth. A source must never be discarded merely because a folder name fails a hidden regex.

## 3. Source Registry & Provenance

Responsibility:
- stable source identity/version;
- context mapping;
- processing state;
- artifact references;
- provenance/lineage.

This becomes the authoritative operational catalog of what Career OS has seen and processed.

It does not replace raw storage or Career Memory.

## 4. Multimodal Processing

Responsibility:
turn each source into source-faithful evidence.

Processor families:
- text/code;
- document/PDF/PPTX;
- image/OCR/visual evidence;
- audio/transcript/timeline;
- video/audio+visual timeline;
- web page extraction.

Provider choice is separate from processor behavior.

## 5. Knowledge & Fusion

Responsibility:
- align multiple sources that describe the same session/topic;
- create Evidence Units with stable anchors;
- build session/module/course knowledge packages;
- reconcile duplicates/conflicts while retaining provenance;
- derive concept/entity/relation structures.

This is fusion, not simple concatenation or one giant summary.

## 6. Retrieval & Indexing

Responsibility:
- exact/full-text retrieval;
- semantic retrieval;
- graph traversal;
- context filtering;
- ranked evidence bundles for agents.

Indexes are accelerators, not sources of truth.

## 7. Learner / User-State Overlay

Responsibility:
- strengths;
- weaknesses;
- misunderstandings;
- prerequisite gaps;
- mastery state;
- recommended next learning actions.

This overlay is distinct from source/course knowledge.

## 8. Promotion & Memory

Responsibility:
- decide which durable outputs should enter Career Memory;
- preserve evidence state;
- update canonical private user state;
- avoid dumping raw transcripts/media into memory by default.

Preprocessing may be automatic; promotion remains evidence/privacy governed.

## 9. Orchestration & Jobs

Responsibility:
- job lifecycle;
- scheduling/sensors;
- retries/backoff;
- idempotency;
- dependency execution;
- resumability;
- concurrency control.

It executes workflows but does not own domain truth.

The implementation should remain replaceable: Dagster is a candidate runtime, not an architectural dependency.

## 10. Observability & Operations

Responsibility:
- structured logs;
- run history;
- failures/retries;
- processing latency;
- provider/model usage;
- health state;
- lineage visualization.

A user should be able to answer:
- what is running?
- what failed?
- what is stale?
- what produced this artifact?
- which provider/model/version was used?

## 11. API / Agent Interface

Responsibility:
give ChatGPT, Gemini, Claude, future agents and UI clients a stable way to:
- query registry/knowledge;
- retrieve evidence bundles;
- request processing;
- inspect system state;
- submit approved updates.

Agents must not depend directly on Drive/App Script internals.

## Repository-level separation

At the highest level the repository should converge toward:

```text
career-os/
├── docs/          # architecture, contracts, ADRs, standards
├── apps/          # deployable/executable entry points
├── packages/      # reusable domain/application/infrastructure modules
├── tests/         # cross-package integration/contract tests
├── infra/         # deployment/runtime infrastructure
├── templates/     # reusable project/user templates
├── examples/      # synthetic examples only
├── scripts/       # development/migration/maintenance tools
├── .github/       # CI/CD and repository automation
└── README.md
```

## Non-negotiable boundaries

The public/reusable `career-os` repository must not contain:
- API keys/tokens/passwords;
- real private raw files;
- real private transcripts;
- private Drive IDs or account mappings;
- the user's live registry/database;
- the user's learner state;
- private Career Memory records.

Those belong to runtime secret/config storage, raw source systems, or private `career-memory` according to the data policy.

## Architecture qualities

vNext should optimize for:
- provider independence;
- connector independence;
- deterministic identities and provenance;
- idempotent processing;
- testability;
- modularity without premature microservices;
- local/developer portability;
- graceful partial failure;
- observability;
- privacy boundaries;
- future multi-agent use.

## Explicit anti-goals

Do not:
- recreate the current Apps Script monolith in another language;
- use folder names as the only context model;
- use one giant Markdown summary as the knowledge store;
- use a vector database as canonical truth;
- make Obsidian/n8n/Dagster the domain model;
- let one AI provider leak into core contracts;
- add microservices before scale/runtime constraints justify them.

## Next design gate

Before implementation, approve or change these top-level subsystem boundaries.

After approval, Stage 2 defines the precise repository/package ownership map and dependency rules between these subsystems.