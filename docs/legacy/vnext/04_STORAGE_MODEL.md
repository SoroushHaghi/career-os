# 04 — Storage, Registry and Artifact Layout

Status: APPROVED
Updated: 2026-09-26

## Goal

Define where each vNext data class lives during the first migration milestone without introducing a new database service or breaking the current Drive/Apps Script runtime.

The key distinction is:

- raw/original authority;
- operational runtime state;
- active derived artifacts;
- registry/read models;
- durable promoted memory;
- public reusable code/specification.

The logical model is stable even if physical backends change later.

---

## 1. Storage authority by data class

### Raw originals

Primary active location:

```text
Google Drive
```

Long-term archival location where retained:

```text
Local / SSD
```

Examples:
- audio;
- video;
- images;
- PDFs;
- PPTX/DOCX;
- source notes;
- other original project/course files.

Rule:
raw binaries are not copied into `career-os` or `career-memory` merely for convenience.

---

## 2. Runtime state

Milestone-1 runtime state remains in the existing Apps Script mechanisms:

```text
Script Properties
```

Examples:
- Drive page token;
- active queues;
- retry/backoff state;
- shared provider cooldown;
- worker lifecycle state;
- runtime policy/version flags.

This state is operational and mutable.

It is not the canonical long-term knowledge store.

---

## 3. Per-source operational metadata

Continue reusing:

```text
Drive appProperties
```

for source/artifact associations that are useful close to the file.

Examples:
- Career OS generated ownership;
- source ID association;
- source fingerprint;
- processing status;
- artifact type;
- processor/model metadata where safe;
- primary context binding where practical.

Rules:
- appProperties are implementation metadata, not the entire registry;
- they may be rebuilt or migrated later;
- credentials and temporary provider authorization material never go here.

---

## 4. Active generated artifacts

Current generated text/evidence remains in the active Drive context under:

```text
_AI_WORKSPACE/
```

This convention is retained.

Examples:
- OCR text;
- transcript;
- timeline;
- visual notes;
- deterministic manifest;
- semantic profile;
- synthesis;
- future evidence index.

The exact physical layout may evolve without changing logical artifact IDs.

### Compatibility rule

Existing flat sidecar files do not need to be reorganized immediately.

vNext should first index/reference them correctly.

---

## 5. Machine-readable context manifest

For each active context, vNext adds a machine-readable projection alongside the current human-readable manifest.

Recommended pair:

```text
_AI_WORKSPACE/
  SESSION_MANIFEST.md
  SESSION_MANIFEST.json
```

For non-session contexts, the same logical role may use:

```text
CONTEXT_MANIFEST.md
CONTEXT_MANIFEST.json
```

The JSON form is for machines.
The Markdown form is for humans/agents.

Both are deterministic projections of the same logical registry state.

They are rebuildable and therefore are not a second source of truth.

---

## 6. Context-scoped registry projection

Milestone 1 does not require one global database.

Use a context-scoped registry projection stored with the active context.

Recommended logical files:

```text
_AI_WORKSPACE/
  REGISTRY/
    sources.jsonl
    artifacts.jsonl
    evidence.jsonl
    processing.jsonl
```

These files are optional physical projections of the registry contract.

They may be generated incrementally or regenerated from current metadata/artifacts.

### Why context-scoped first

This avoids:
- one giant registry file;
- database installation;
- cross-context rewrite contention;
- making the user's laptop a runtime dependency.

It also matches how active course/project material is already organized.

---

## 7. Registry ownership

The Source Registry is a logical operational catalog.

For milestone 1, its physical information is distributed across:

```text
Drive file metadata / appProperties
+ Script Properties
+ context manifests
+ context-scoped registry projections
```

This is acceptable during migration.

The contract must make it possible to replace this later with SQLite or another private backend without changing source/process/knowledge semantics.

### Important rule

Do not build business logic that directly depends on one physical registry representation.

Consumers query the registry abstraction.

---

## 8. Artifact identity and storage locator

Each generated Artifact has:

```text
artifact_id
artifact_type
source_version_key?
context_id?
locator
processor_name
processor_version
created_at
provenance
```

Recommended deterministic artifact identity:

```text
artifact_id =
hash(
  source_version_key
  + artifact_type
  + processor_name
  + processor_version
)
```

where applicable.

The physical `locator` may be a Drive file reference initially.

The locator is storage-specific.
The artifact ID is Career-OS-specific.

This allows moving an artifact later without changing its logical identity.

---

## 9. Evidence storage

Evidence Units should not require a separate database in milestone 1.

Store evidence records in a context-scoped machine-readable index:

```text
_AI_WORKSPACE/REGISTRY/evidence.jsonl
```

Large source-faithful content may remain in dedicated transcript/OCR files while the Evidence Unit stores:
- stable evidence ID;
- source/artifact reference;
- anchor;
- short content/chunk when appropriate;
- extraction method/version;
- quality flags;
- context refs.

The evidence record should point back to the artifact/source rather than duplicate large content unnecessarily.

---

## 10. Semantic staging

AI-generated semantic outputs remain in active private Drive workspaces while the project/course is active.

Examples:

```text
SEMANTIC_PROFILE.json
concepts.jsonl
relations.jsonl
synthesis.md
promotion_candidates.jsonl
```

These are derived artifacts.

They are not automatically canonical Career Memory.

---

## 11. Durable promotion to career-memory

`career-memory` receives selected durable state only.

Examples:
- durable user facts;
- reviewed evidence summaries;
- project/course closure summaries;
- durable decisions;
- reusable learner observations;
- stable knowledge indexes worth preserving;
- source references/provenance needed for future verification.

Do not automatically copy:
- every transcript;
- every OCR artifact;
- every processing event;
- raw media;
- active queue state.

### Active-project rule

While a project/course is active:

```text
Drive = active operational/artifact store
career-memory = selected durable promoted memory
```

### Closed-project rule

At closure:
- verify raw archival retention;
- promote durable knowledge/state;
- preserve source references;
- retire transient Drive workspace only when explicitly safe.

---

## 12. Public repository boundary

`career-os` stores only public-safe reusable assets:

```text
code
contracts
schemas
templates
tests
synthetic examples
architecture docs
CI/CD
public monitoring UI
```

Never store in public Git:
- real source IDs where private;
- transcripts;
- private registry snapshots;
- learner state;
- user-specific processing metadata;
- credentials/tokens.

---

## 13. Read path for agents

Default retrieval order:

```text
1. career-memory
2. active context manifest / registry projection
3. semantic profiles / processed artifacts
4. evidence indexes
5. raw source only when needed
```

This preserves fast reuse and minimizes repeated media/API processing.

---

## 14. Write path

For an authorized changed source:

```text
source change
  -> runtime queue/state
  -> source metadata/fingerprint
  -> context binding
  -> processor output in _AI_WORKSPACE
  -> appProperties provenance
  -> manifest/registry projection update
  -> optional semantic staging
  -> optional promotion candidate
  -> selected career-memory promotion
```

Every step must be idempotent by source version + processor version.

---

## 15. Rebuildability

These are rebuildable projections:

```text
SESSION_MANIFEST.md
SESSION_MANIFEST.json
sources.jsonl
artifacts.jsonl
evidence.jsonl
processing.jsonl
semantic indexes
dashboard/read models
```

Raw originals and canonical promoted memory are not considered disposable projections.

This distinction makes recovery/migration simpler.

---

## 16. Failure behavior

A registry/artifact write failure must not destroy the source or previous successful artifacts.

Rules:
- never overwrite ambiguous user-created files;
- write Career OS ownership/provenance metadata;
- prefer update-or-create only when ownership is proven;
- processing state may retry independently;
- a failed semantic stage does not invalidate a successful transcript/OCR result;
- a failed promotion does not erase active Drive artifacts.

---

## 17. What Stage 4 does not require

No new requirement for:

- SQLite;
- Postgres;
- vector database;
- Cloud Run;
- Dagster;
- n8n;
- Docker;
- new API key;
- new public API;
- always-on local machine.

Those remain future options only if scale or usability demands them.

---

## Milestone-1 physical mapping

```text
Raw active source          -> Google Drive
Raw archival copy          -> Local / SSD
Drive scanner cursor       -> Script Properties
Queues / retry state       -> Script Properties
Source/artifact metadata   -> Drive appProperties
Generated artifacts        -> Drive _AI_WORKSPACE
Human manifest             -> SESSION/CONTEXT_MANIFEST.md
Machine manifest           -> SESSION/CONTEXT_MANIFEST.json
Registry projection        -> _AI_WORKSPACE/REGISTRY/*.jsonl
Semantic staging           -> active Drive _AI_WORKSPACE
Durable promoted memory    -> career-memory
Reusable software/spec     -> career-os
Public monitor             -> GitHub Pages from career-os
```

---

## Stage 4 decision gate

Approve or change:

1. no new database for milestone 1;
2. keep Script Properties + appProperties for current runtime metadata/state;
3. add machine-readable JSON manifest beside Markdown;
4. use context-scoped JSONL registry projections in `_AI_WORKSPACE`;
5. keep active semantic artifacts on Drive;
6. promote only selected durable state to `career-memory`;
7. preserve a future migration path to SQLite/other storage through the registry abstraction.

After approval, Stage 5 defines the processing pipeline/state machine against this layout.
