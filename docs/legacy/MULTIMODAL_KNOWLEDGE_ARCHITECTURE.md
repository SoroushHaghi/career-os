# Multimodal Knowledge Architecture

Status: TARGET ARCHITECTURE / v1
Updated: 2026-09-26

## Purpose

Career OS should turn heterogeneous course/project inputs into a referable, reusable knowledge package before an interactive agent needs them.

The system must preserve raw material, keep source-faithful derivatives distinct from AI inference, fuse multiple modalities around shared topics/events, support sources that apply to one session or many sessions, and expose fast hybrid retrieval plus graph projections.

## Core model

Career OS separates five layers:

1. Raw Source Layer — immutable originals remain in their approved source/archive locations.
2. Evidence Layer — source-faithful text/structure extracted with stable anchors.
3. Fusion Layer — session/module/course knowledge packages align evidence across modalities.
4. Index Layer — source registry, full-text index, embeddings and explicit graph edges.
5. Learner Overlay — user-specific mastery/weakness/prerequisite state linked to concepts and evidence.

No layer replaces the layer below it.

## Context hierarchy

The logical hierarchy is independent of physical folder names:

```text
Course / Project
  -> Module / Collection (optional)
      -> Session / Event (optional)
          -> Source
              -> Evidence Unit
```

A source carries a scope:
- session
- module/collection
- course/project
- global/reference

A course-wide source is referenced by child sessions rather than duplicated.

Folder hierarchy is an input signal, not canonical identity. Once context is resolved, the registry stores a stable context mapping by source/folder identity.

## Evidence Unit

The smallest referable object is an Evidence Unit.

Required fields:
- evidence_id
- source_key
- source_version
- modality
- source_anchor
- source-faithful content
- extraction method/version
- confidence/quality flags
- context refs

Typical source anchors:
- audio/video: timestamp range
- PDF: page + optional region
- PowerPoint: slide number + optional object/region
- image: image ID + optional region
- web: canonical URL + fetched_at + section/DOM/text anchor
- text: heading + line/paragraph/chunk

Every higher-level synthesis statement should be traceable to one or more Evidence Units.

## Session Knowledge Package

A session is represented as a package, not a single giant summary.

Recommended logical artifacts:

```text
SESSION_KNOWLEDGE/
  manifest.yaml
  sources.jsonl
  evidence.jsonl
  timeline.jsonl
  transcript.md
  visual_notes.md
  concepts.jsonl
  relations.jsonl
  session_notes.md
  synthesis.md
  semantic_profile.json
```

Raw binaries are referenced rather than duplicated when they already live in the session/source system.

Human-facing Markdown and machine-facing JSONL are generated from the same stable IDs.

## Multi-material fusion

Fusion is evidence alignment, not concatenation.

For a session containing fragmented video, audio, images, slides, PDF, notes and web references:

- order time-bearing media using capture/start metadata;
- segment transcript/video into timestamped units;
- extract slide/page/image text and visual facts;
- align transcript segments with slides/pages/images using time metadata where available and semantic similarity otherwise;
- detect duplicates/overlap between recordings;
- preserve disagreements or uncertainty rather than silently merging them;
- build topic blocks whose claims cite contributing Evidence Units.

## Video

Video uses two evidence channels:
- speech/audio evidence;
- visual evidence.

Preferred path:
- dedicated verbatim transcription for speech;
- direct multimodal video understanding for scene/slide/demonstration/timestamp discovery;
- targeted high-detail inspection of salient frames;
- chronological fusion into notes with provenance.

For long video, agentic video understanding is preferred over processing every frame at high resolution.

## Web sources

URLs are first-class versioned sources.

A URL ingestion stores:
- original and canonical URL;
- fetched_at;
- title/metadata;
- content fingerprint or response validators when available;
- extracted main text;
- relevant links/assets when useful;
- source scope/context.

A later page change becomes a new source version. Career OS should not rely on a live URL alone for durable provenance.

## Retrieval

Interactive agents use hybrid retrieval:

```text
query
 -> metadata/context filter
 -> exact/full-text search
 -> semantic/vector search
 -> graph expansion
 -> ranked evidence bundle
 -> reasoning
```

The default retrieval order is:
canonical career-memory -> source registry/semantic profiles -> processed evidence -> raw source verification.

## Index implementation

For a single-user Career OS, prefer a portable registry before introducing distributed infrastructure.

Recommended baseline:
- SQLite for normalized source/context/evidence metadata;
- SQLite FTS5 for lexical/full-text search;
- multimodal/text embeddings as a secondary semantic index;
- explicit node/edge tables for graph relations.

A separate vector database is optional when scale/concurrency justifies it. Vector storage is an index, never the source of truth.

## Embeddings

Gemini Embedding 2 can map text, images, audio, video and PDFs into one semantic space. Use embeddings for candidate retrieval/alignment, not provenance.

For long media, embed derived chunks/segments and selected salient visual units rather than treating one entire recording as one vector.

## Knowledge graph

Graph node types may include:
- Course/Project
- Module/Collection
- Session/Event
- Source
- Evidence Unit
- Concept
- Person/Organization
- Artifact
- Skill/Topic
- Learner State

Important edge types include:
- CONTAINS
- APPLIES_TO
- DERIVED_FROM
- SUPPORTS
- MENTIONS
- EXPLAINS
- PREREQUISITE_OF
- SAME_TOPIC_AS
- CONTRADICTS
- LEARNER_WEAK_ON
- LEARNER_MASTERED

Graph edges must reference stable IDs and provenance when the relation is inferred.

## Learner overlay

The learner model is separate from source knowledge.

A learner-state record contains:
- concept_id
- state/score band
- observed strengths/weaknesses
- evidence refs
- last_observed
- confidence
- prerequisite gaps
- recommended next learning action

Source truth is not changed by a learner-state update.

The system may identify missing prerequisites beyond uploaded material, but external augmentation must be labeled as external knowledge/research rather than source-derived content.

## Human graph projection

Obsidian may be used as a local-first human UI projection:
- Markdown notes;
- YAML properties;
- internal links/backlinks;
- graph/local-graph views.

Obsidian is not canonical storage. The system generates/updates an Obsidian-compatible projection from the registry/knowledge artifacts.

n8n or another workflow UI may visualize/orchestrate processing flows, but it is not the knowledge graph or source of truth.

## Processing economics

Use deterministic extraction before AI:
- native text extraction for text/PDF/PPTX/DOCX where possible;
- AI vision only for scanned/visual content;
- dedicated ASR for speech;
- selective video inspection for long media;
- semantic enrichment after evidence extraction.

Cache every derivative by source_version + processor_version so unchanged sources are never reprocessed unnecessarily.

## Privacy

Free cloud-model tiers can be operationally useful, but provider privacy terms remain part of the processing policy.

Raw originals stay in approved source/archive locations. Generated transcripts and OCR inherit source sensitivity. Public repositories contain only reusable code/specification, not user content.
