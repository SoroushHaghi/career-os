# 08 — Knowledge Fusion, Retrieval and Learner Model

Status: APPROVED
Updated: 2026-09-27

## Goal

Define how Career OS turns source-faithful evidence into reusable knowledge, how agents retrieve that knowledge, and how user-specific learning state is represented without contaminating source truth.

This stage keeps three layers separate:

1. evidence truth;
2. derived knowledge;
3. learner/user state.

The separation is mandatory.

## 1. Layer model

```text
Raw Source
  ↓
Source-faithful Evidence
  ↓
Knowledge Fusion
  ↓
Knowledge Entities / Relations
  ↓
Retrieval Indexes / Read Models
  ↓
Learner Overlay
  ↓
Task-specific reasoning
```

No upper layer is allowed to silently rewrite the layer below it.

## 2. Evidence truth

Evidence Units are the smallest traceable source-faithful units.

Examples:
- transcript segment;
- PDF page/region;
- slide/object;
- image region/OCR block;
- web section;
- text paragraph/chunk.

Every evidence unit retains source version, anchor, extraction method, processor/profile version, quality flags, and context bindings.

Evidence can contain extraction errors. Therefore evidence is not the same thing as a verified claim.

## 3. Knowledge fusion

Fusion aligns multiple evidence units around the same topic/event/concept. It must not simply concatenate files.

Fusion may use timestamps, slide/page order, session hierarchy, exact lexical overlap, semantic similarity, explicit references, and user-confirmed relationships.

Typical output:

```text
Topic Block
  - concept/entity
  - concise explanation
  - supporting evidence_ids[]
  - contradictions/uncertainty
  - source coverage
  - context refs
```

## 4. Multi-source conflict handling

When sources disagree, do not silently average or overwrite.

Create an explicit conflict record with subject, evidence refs, disagreement type, status, optional resolution, and provenance.

Possible states:

```text
OPEN
RESOLVED_BY_SOURCE_AUTHORITY
RESOLVED_BY_USER
RESOLVED_BY_LATER_EVIDENCE
UNRESOLVED
```

A synthesis may state uncertainty, but should preserve both sides.

## 5. Knowledge entities

Initial types:

```text
Concept
Topic
Course
Project
Session
Artifact
Skill
Person
Organization
Method
Formula
QuestionPattern
```

User-specific states are not Knowledge Entities.

## 6. Knowledge relations

Initial relations:

```text
CONTAINS
APPLIES_TO
DERIVED_FROM
MENTIONS
EXPLAINS
SUPPORTS
PREREQUISITE_OF
SAME_TOPIC_AS
CONTRADICTS
EXAMPLE_OF
USED_IN
```

Every inferred relation records evidence refs where available, inference method, confidence, and provenance.

## 7. Knowledge package hierarchy

A session/project context should expose a package, not one giant summary.

Logical package:

```text
manifest
sources
evidence
timeline
concepts
relations
notes
synthesis
semantic_profile
promotion_candidates
```

Course/module/project packages can reference child packages instead of duplicating all evidence.

## 8. Retrieval order

Default agent retrieval path:

```text
1. career-memory durable state
2. context manifest / semantic profile
3. exact/full-text evidence retrieval
4. semantic retrieval if needed
5. graph expansion if needed
6. raw source only for exact verification or missing detail
```

This minimizes repeated provider/media processing.

## 9. Retrieval modes

Milestone 1 conceptually supports metadata/context filtering, exact/full-text retrieval, semantic retrieval when needed, and graph expansion when connected concepts/prerequisites matter.

No separate vector database is required for milestone 1.

## 10. Index policy

Indexes are rebuildable accelerators and never canonical truth.

Allowed future indexes include JSONL-derived lookup maps, SQLite/FTS, embeddings, and explicit graph node/edge tables.

Milestone 1 may begin with context-scoped JSONL, deterministic manifests, and compact semantic profiles.

## 11. Embedding policy

Embeddings are optional retrieval aids.

Rules:
- do not use embeddings as provenance;
- do not use vector similarity as proof;
- embed source-faithful chunks/artifacts, not only giant summaries;
- cache by source/artifact version plus embedding model/version;
- do not require embeddings for deterministic lookup.

## 12. Learner overlay

Learner state is private user-specific state linked to knowledge entities.

Example:

```text
Knowledge:
  Concept = QFT recursion

Learner state:
  PARTIAL / WEAK / STRONG / CONFUSED
```

The learner state may use tutoring interactions, exam performance, user answers, repeated misunderstandings, explicit user self-report, completed tasks, and verified outcomes. It must preserve provenance.

## 13. Learner-state record

Recommended fields:

```text
learner_state_id
subject_id
knowledge_id
state
confidence
observations[]
evidence_refs[]
last_observed
prerequisite_gaps[]
recommended_next_action?
provenance
```

Possible states:

```text
UNKNOWN
EXPOSED
PARTIAL
UNDERSTOOD
STRONG
WEAK
CONFUSED
NEEDS_PREREQUISITE
```

## 14. User-personal data boundary

Learner state, user-specific career state, private evidence and personal facts must never be published to the public career-os repository.

Public repo contains only schemas, contracts, generic algorithms, templates, synthetic examples and tests.

Private user state remains in career-memory, approved private Drive artifacts, and runtime-private storage.

This is a hard boundary.

## 15. Promotion to career-memory

Promotion candidates may include durable facts, project outcomes, stable skills/evidence, recurring learner weaknesses/strengths, durable course/project summaries, and important decisions/status.

Promotion rules:
- source/inference state remains visible;
- task-specific temporary reasoning is not promoted by default;
- raw transcripts/media are not canonical memory by default;
- private user state never enters the public repo.

## 16. Personal information flow

```text
private tutoring/session interaction
  -> learner observation
  -> private learner-state update
  -> optional durable promotion to career-memory
```

The public code only knows the schema and algorithm. It never stores the user's actual learner values.

## 17. Task-specific reasoning

Agents should receive a bounded evidence bundle rather than the entire personal data universe.

Example:

```text
Question: prepare ACQC session 10 review
  -> retrieve ACQC/S10 knowledge package
  -> retrieve relevant learner-state links
  -> retrieve required prerequisite concepts
  -> reason
```

This reduces privacy exposure and token cost.

## 18. External augmentation

If the system adds knowledge from outside uploaded/course material, origin must be EXTERNAL_RESEARCH.

It must remain distinguishable from course evidence, user-confirmed facts, and generated inference.

External material must not silently correct source material unless the task explicitly calls for verification/reconciliation.

## 19. Classification ownership

Automated classification is performed by system components, not manually by the user.

Responsibility chain:

```text
Connector            -> source/type metadata
Intake Router         -> task/source routing
Context Resolver      -> course/project/module/session/reference binding
Processor Planner     -> required extraction path
Knowledge Fusion      -> concepts/topics/relations
Promotion Router      -> durable private persistence destination
```

Use deterministic rules first. Use semantic/AI classification only where rules are insufficient. Request user confirmation only for genuinely ambiguous/high-impact cases.

## 20. Manual intervention policy

An authorized source may remain UNCLASSIFIED_AUTHORIZED without being dropped.

Manual review should be limited to low-confidence context resolution, high-impact conflicts, privacy ambiguity, and promotion ambiguity.

The user should not need to hand-sort normal inputs.

## Stage 8 decision gate

Approve or change:

1. evidence / knowledge / learner layers remain separate;
2. fusion aligns evidence instead of concatenating files;
3. conflicts remain explicit;
4. retrieval is hybrid but indexes are rebuildable;
5. learner state is private and provenance-linked;
6. classification is automatic by system components;
7. deterministic rules precede AI classification;
8. public repo contains schemas/logic only, never real personal state.

After approval, Stage 9 defines the repo-centric runtime, operations and observability model.