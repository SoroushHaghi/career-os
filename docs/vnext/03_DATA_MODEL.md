# 03 — Canonical Data Model and Identity Rules

Status: APPROVED
Updated: 2026-09-26

## Goal

Define the minimum stable data model that lets Career OS reuse the current Drive/Apps Script runtime while removing hidden coupling to folder names, one provider, one UI or one storage backend.

The model must support:
- source identity and versioning;
- hierarchical context;
- source-faithful evidence;
- generated artifacts;
- processing state/provenance;
- later knowledge fusion;
- later learner-state linkage.

This stage defines contracts and identities only. It does not choose the final database.

---

## 1. Source

A Source is the logical external thing Career OS knows about.

Examples:
- one Drive file;
- one web page;
- one local file;
- one email;
- one future API object.

Required fields:

```text
source_system
source_id
source_type
name
mime_type
content_locator
account_or_scope
created_at? 
modified_at?
metadata?
```

Canonical source key:

```text
source_key = source_system + ":" + source_id
```

Examples:

```text
drive:1AbC...
web:https://example.org/course/qft
local:sha256-or-stable-local-id
```

### Compatibility rule

For Google Drive:

```text
source_system = "drive"
source_id     = Drive File ID
```

This preserves the proven current identity model.

File names are labels, not identity.

---

## 2. Source Version

A Source Version represents one content state of a Source.

Required fields:

```text
source_key
version_id
fingerprint_type
fingerprint_value
observed_at
size?
modified_at?
```

Canonical version key:

```text
source_version_key = source_key + "@" + version_id
```

### Preferred version strategy

Use the strongest stable content identity available.

For stored Drive binaries:

```text
version_id = "md5:" + md5Checksum
```

If no checksum exists, adapters may use provider revision/etag/content hash.

`modified_at` alone is not a preferred version identity.

### Invariant

Same source + same content fingerprint must not be reprocessed unnecessarily.

---

## 3. Context

A Context describes where a source belongs logically.

Context is independent from the physical folder label.

Supported kinds for milestone 1:

```text
course
project
module
collection
session
event
reference
unclassified
```

Required fields:

```text
context_id
context_kind
label
parent_context_id?
origin?
metadata?
```

### Context identity

When the context is backed by a stable external container, reuse that identity.

For Drive folder-backed context:

```text
context_id = "drive-folder:" + DriveFolderID
```

For virtual/non-folder contexts, Career OS may generate an internal stable ID.

### Important invariant

Folder names and regexes are context hints, never validity gates.

A source can be:

```text
authorized + unclassified
```

and still enter the registry.

---

## 4. Context Binding

A Source may relate to one or more contexts.

Required fields:

```text
source_key
context_id
scope
binding_method
confidence
is_primary
```

Supported scope values:

```text
session
module
course
project
reference
global
```

Binding method examples:

```text
drive_parent
user_confirmed
rule_inferred
ai_inferred
manual
imported
```

### Why this exists

A textbook may apply to a whole course.
A slide deck may apply to one session.
A website may apply to several sessions.

Do not duplicate the source to represent this.

---

## 5. Processing Authorization

Processing permission is explicit data, not implied by presence in Drive.

Required fields:

```text
source_key or scope/context
authorization_state
privacy_class
allowed_processing
provider_policy?
updated_at
provenance
```

Initial authorization states:

```text
UNKNOWN
AUTHORIZED
RESTRICTED
DENIED
```

### Milestone-1 rule

The current Drive runtime may continue operating inside the already approved scope, but vNext must model authorization explicitly before broadening automatic AI processing.

---

## 6. Artifact

An Artifact is any generated derivative or structured output.

Examples:
- OCR text;
- transcript;
- timeline;
- visual notes;
- manifest;
- semantic profile;
- synthesis;
- knowledge package.

Required fields:

```text
artifact_id
artifact_type
source_version_key?
context_id?
locator
content_type
generated_by
processor_version
created_at
provenance
```

Artifact types may include:

```text
SOURCE_TEXT
TRANSCRIPT
TIMELINE
VISUAL_NOTES
SOURCE_MANIFEST
SEMANTIC_PROFILE
SYNTHESIS
KNOWLEDGE_PACKAGE
```

### Compatibility rule

Current Drive sidecars and `_AI_WORKSPACE` outputs are valid artifacts.

They do not need to be moved immediately.

The registry only needs stable references to them.

---

## 7. Evidence Unit

An Evidence Unit is the smallest referable source-faithful unit used for later reasoning.

Required fields:

```text
evidence_id
source_version_key
artifact_id?
modality
anchor
content
extraction_method
processor_version
quality_flags?
context_ids?
```

Typical anchors:

```text
audio/video -> start/end timestamp
PDF         -> page + optional region
PPTX        -> slide + optional object/region
image       -> image/region
web         -> URL version + section/text anchor
text        -> heading/paragraph/chunk
```

### Identity rule

Evidence identity should change when its source version or extraction segmentation changes.

A recommended deterministic form:

```text
evidence_id =
hash(
  source_version_key
  + processor_version
  + canonical_anchor
)
```

### Invariant

Higher-level summaries and knowledge claims should be traceable back to Evidence Units.

---

## 8. Processing Record

A Processing Record tracks one processor run.

Required fields:

```text
processing_id
source_version_key
processor_name
processor_version
status
started_at
finished_at?
attempt
provider?
model?
input_artifact_ids?
output_artifact_ids?
error_code?
retry_at?
cost_or_quota_class?
```

Idempotency key:

```text
source_version_key
+ processor_name
+ processor_version
```

Initial status vocabulary:

```text
DETECTED
AUTHORIZED
REGISTERED
QUEUED
PROCESSING
PREPROCESSED
ENRICHED
READY
RETRY_WAIT
FAILED_RETRYABLE
FAILED_FINAL
```

Current Apps Script queue/retry state can map into this model without immediate migration to a new database.

---

## 9. Knowledge Entity

Knowledge Entities are semantic objects derived above the evidence layer.

Milestone-1 types:

```text
Concept
Topic
Person
Organization
Course
Project
Session
Skill
ArtifactReference
```

Required fields:

```text
knowledge_id
knowledge_type
label
normalized_key?
provenance
confidence?
```

These are not source truth by default.

If AI-generated, provenance must say so.

---

## 10. Knowledge Relation

A Knowledge Relation links two semantic objects.

Required fields:

```text
relation_id
source_knowledge_id
relation_type
target_knowledge_id
evidence_ids?
provenance
confidence?
```

Initial relation examples:

```text
CONTAINS
APPLIES_TO
MENTIONS
EXPLAINS
SUPPORTS
PREREQUISITE_OF
SAME_TOPIC_AS
CONTRADICTS
DERIVED_FROM
```

No graph database is required to use this model.

Relations can initially live in simple structured files or the same operational registry.

---

## 11. Learner State

Learner state is separate from source/course knowledge.

Required fields:

```text
learner_state_id
subject_id
knowledge_id
state
confidence
evidence_ids?
last_observed
notes?
next_action?
```

Example states:

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

### Invariant

Updating learner state must never rewrite source/evidence truth.

---

## 12. Provenance

Every derived object should carry enough provenance to answer:

- where did this come from?
- which source version?
- which processor/version?
- which model/provider, if any?
- was this extracted, inferred, user-confirmed or manually authored?

Minimum provenance fields:

```text
origin_type
source_refs?
artifact_refs?
processor?
processor_version?
provider?
model?
created_at
actor?
```

Suggested origin types:

```text
SOURCE
DETERMINISTIC_EXTRACTION
AI_EXTRACTION
AI_INFERENCE
USER_CONFIRMED
MANUAL
IMPORTED
```

---

## 13. Identity Summary

```text
Source:
  source_system + source_id

Source Version:
  source_key + content/revision identity

Context:
  stable external container ID where possible,
  otherwise stable internal ID

Artifact:
  stable generated-artifact ID + provenance

Evidence Unit:
  hash(source_version + processor_version + anchor)

Processing Run:
  source_version + processor + processor_version

Knowledge Node:
  stable semantic ID, independent of source filename

Learner State:
  subject + knowledge node + observation lineage
```

---

## 14. Current-to-vNext Compatibility Mapping

```text
CURRENT                              vNEXT

Drive File ID                    -> Source.source_id
MD5/checksum                     -> SourceVersion.version_id
Session folder Drive ID          -> Context.context_id
Folder name                      -> Context.label only
Drive parent hierarchy           -> ContextBinding evidence
Drive appProperties              -> Artifact/processing provenance
Script Properties queue          -> Processing Record runtime state
_AI_WORKSPACE sidecar            -> Artifact
SESSION_MANIFEST.md              -> Artifact + registry projection
existing transcript association  -> Source/Artifact relation
Gemini model metadata            -> ProcessingRecord provenance
```

This mapping allows migration without throwing away the current implementation.

---

## 15. What is intentionally NOT decided here

Stage 3 does not decide:

- SQLite vs another registry backend;
- final JSON/SQL schemas;
- Dagster/n8n/runtime orchestration;
- vector database choice;
- final graph storage technology;
- final UI;
- API design.

Those decisions come later only if required.

---

## Stage 3 decision gate

Approve or change:

1. Source / SourceVersion identity;
2. Context + ContextBinding model;
3. Artifact vs Evidence Unit distinction;
4. Processing Record/idempotency model;
5. Knowledge/Learner separation;
6. compatibility mapping to the existing Apps Script/Drive runtime.

After approval, Stage 4 defines the storage/registry/artifact layout using these contracts.
