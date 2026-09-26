# Career OS Preprocessing Pipeline

Status: TARGET ARCHITECTURE / v1
Updated: 2026-09-26

## Objective

Every approved source entering Career OS should become AI-ready before an interactive agent needs it.

The system should precompute enough structure that later tasks can answer quickly without repeatedly re-reading raw media. This is preprocessing and semantic staging, not automatic truth promotion.

## Design principle

Career OS uses a connector-independent, event-driven preprocessing pipeline implemented initially as a modular monolith.

```text
source systems
  -> source adapters
  -> normalized source event
  -> privacy/processing gate
  -> source registry
  -> type-specific preprocessing
  -> semantic enrichment
  -> staged knowledge artifacts
  -> promotion candidates
  -> canonical memory promotion
```

Raw/source-faithful artifacts and inferred/semantic artifacts must remain distinguishable.

## Source states

A source version progresses idempotently through:

`DETECTED -> AUTHORIZED -> REGISTERED -> PREPROCESSED -> ENRICHED -> READY`

Optional promotion states:

`PROMOTION_PENDING -> PROMOTED`

Failure states are retryable/non-retryable and never erase a successfully registered source version.

The idempotency key is:

`source_system + source_id + source_version + processor_version`

## Normalized source envelope

Every connector emits the same logical record:

- source_system
- source_account_or_scope
- source_id
- source_version
- source_type / mime_type
- name
- size
- modified_at
- parent_context
- content_locator
- privacy_class
- processing_authorization
- provenance

Provider-native IDs remain adapter details after normalization.

## Processing profiles

### Plain text / Markdown / code
- preserve source-faithful text;
- normalize encoding/line endings;
- detect language/type;
- extract headings/structure where useful;
- semantic enrichment only after source text is preserved.

### Image
- OCR/source-visible text;
- visual description limited to useful facts;
- detect tables/diagrams/screenshots;
- preserve distinction between literal OCR and visual interpretation.

### PDF/document
- native text first when available;
- page-preserving extraction;
- OCR/vision for scanned or visual pages;
- tables/figures handled as separate derived evidence when useful;
- record extraction method per page/block.

### Audio
- source-faithful/verbatim transcript;
- language/speaker metadata where useful;
- navigation-level timeline;
- topic/segment index;
- domain vocabulary profile when known.

### Video
- high-quality speech transcript from extracted audio when possible;
- direct multimodal video analysis for visual events;
- salient scene/timestamp index;
- OCR/visual notes for important frames/slides;
- merged chronological notes preserving audio-vs-visual provenance.

## Semantic enrichment

After source-faithful preprocessing, generate a compact semantic profile:

- concise digest;
- topics;
- named entities;
- dates/deadlines when explicitly present;
- projects/courses/organizations;
- key concepts/skills mentioned;
- artifact/deliverable references;
- open questions;
- likely workspace/context;
- promotion candidates;
- uncertainty/conflict flags.

Enrichment is AI-generated analysis and must not be treated as verified source truth without provenance.

## Staged artifact bundle

The active source workspace may contain:

- SOURCE_MANIFEST
- SOURCE_TEXT / TRANSCRIPT
- TIMELINE
- VISUAL_NOTES
- SEMANTIC_PROFILE
- SYNTHESIS
- PROMOTION_CANDIDATES

The raw/faithful layer should be reusable without rerunning AI. Higher-level layers can be regenerated when models/prompts improve.

## Retrieval acceleration

Interactive Career OS agents should normally query in this order:

1. canonical career-memory;
2. compact source registry / semantic profiles;
3. staged processed artifacts;
4. raw originals only when exact verification or missing detail requires them.

This minimizes latency and repeated token/media processing.

## Promotion boundary

Automatic preprocessing and automatic semantic staging are allowed for approved input scope.

Automatic promotion to canonical Career Memory is narrower:
- durable user facts/status/decisions may be promoted when supported and policy-safe;
- career claims still require evidence-state rules;
- raw transcripts/media do not become canonical memory by default;
- inferred semantic observations remain labeled as inferred until verified.

## Runtime architecture

Initial implementation should be a modular monolith, not a fleet of microservices.

Logical modules:
- connectors
- registry
- policy/privacy
- router
- processors
- providers
- enrichment
- artifacts
- promotion
- observability

Execution may later split across runtimes without changing these contracts.

## Runtime placement

- Google Apps Script: thin Google Drive connector, lightweight metadata operations, trigger entrypoints.
- General/background worker: heavy media processing, long jobs, provider orchestration, future non-Google connectors.
- GitHub Actions: CI/CD only, not the normal ingestion worker.
- career-memory: durable processed state/knowledge, not raw-media storage.
- Drive/source system: raw originals and active generated source artifacts.

## Observability

Every processing run should record:
- source/version;
- processor/version;
- model/provider;
- start/end/result;
- retry/error state;
- artifact refs;
- cost/quota class where relevant.

A health view should answer what is pending, failed, stale, or ready without reading execution logs manually.
