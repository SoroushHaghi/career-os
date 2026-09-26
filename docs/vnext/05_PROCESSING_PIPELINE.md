# 05 — Processing Pipeline and State Machine

Status: PROPOSED FOR REVIEW
Updated: 2026-09-26

## Goal

Define the processing lifecycle without replacing the current Apps Script scanner/queue runtime.

The main correction from earlier drafts is to avoid one overloaded status field.

vNext separates:

1. source/version registration state;
2. processing-job state;
3. artifact readiness;
4. semantic-enrichment state;
5. promotion state.

This makes retries and partial success explicit.

---

## 1. End-to-end flow

```text
Drive change detected
  -> normalize source
  -> compute/reuse source version
  -> evaluate processing authorization
  -> resolve context hints
  -> register source/version
  -> plan required processors
  -> skip already-current work
  -> enqueue required jobs
  -> process
  -> persist artifact + provenance
  -> update context manifest/registry projections
  -> optional semantic enrichment
  -> READY
  -> optional promotion candidate
  -> selected career-memory promotion
```

A missing/uncertain context is not a processing failure when the source is authorized.

It may remain:

```text
authorized + unclassified
```

until later resolution.

---

## 2. Source-version state

Source-version state answers:

> Do we know this exact content version, and is it eligible for processing?

Recommended states:

```text
DETECTED
AUTHORIZED
REGISTERED
BLOCKED_POLICY
RETIRED
```

### DETECTED

The connector observed the source/version.

No AI processing is implied.

### AUTHORIZED

Current processing policy permits the required class of processing.

### REGISTERED

The source/version identity and context bindings have been durably represented in the operational registry/projections.

### BLOCKED_POLICY

The source exists but current policy does not permit the requested processing.

This is not a technical failure.

### RETIRED

The source/version is historical or no longer active.

Retirement must not imply deletion of raw originals.

---

## 3. Processing-job state

Each processor execution has its own job state.

Recommended states:

```text
PLANNED
QUEUED
RUNNING
RETRY_WAIT
SUCCEEDED
SKIPPED_CURRENT
FAILED_RETRYABLE
FAILED_FINAL
CANCELLED
```

### PLANNED

The planner determined that this processor output is required.

### QUEUED

The job has been durably added to runtime state.

For milestone 1 this may continue to be Script Properties queue state.

### RUNNING

A worker owns the current attempt.

### RETRY_WAIT

The job is valid but temporarily delayed by:
- provider rate limit;
- provider Retry-After;
- transient network/service error;
- resumable upload continuation;
- temporary runtime quota.

### SUCCEEDED

Required artifact/provenance writes completed.

### SKIPPED_CURRENT

A valid current artifact already exists for the same idempotency key.

This is a successful terminal outcome, not an error.

### FAILED_RETRYABLE

A transient failure occurred and retry scheduling remains possible.

### FAILED_FINAL

The current processing profile cannot complete this job without a material change.

Examples:
- unsupported input;
- corrupt source;
- repeated non-retryable provider rejection.

The source/version remains registered.

### CANCELLED

Processing was explicitly cancelled or superseded.

---

## 4. Artifact readiness

Artifacts are tracked independently from jobs.

Recommended states:

```text
AVAILABLE
STALE
INCOMPLETE
INVALID
SUPERSEDED
```

### AVAILABLE

Artifact is usable for its declared purpose.

### STALE

Artifact belongs to an older source version or processor revision.

It remains historical provenance but should not satisfy the current job.

### INCOMPLETE

Partial output exists.

Example:
a video transcript succeeds while visual analysis is still missing.

### INVALID

Artifact exists but failed integrity/quality checks.

### SUPERSEDED

A newer approved artifact replaced it for default retrieval.

Do not delete solely because it is superseded.

---

## 5. Semantic enrichment state

Semantic staging is separate from source-faithful preprocessing.

Recommended states:

```text
NOT_REQUESTED
PENDING
RUNNING
READY
PARTIAL
FAILED_RETRYABLE
FAILED_FINAL
```

A failed synthesis does not invalidate a valid transcript/OCR artifact.

---

## 6. Promotion state

Promotion into Career Memory has its own lifecycle:

```text
NOT_CANDIDATE
CANDIDATE
PENDING_REVIEW_OR_POLICY
PROMOTED
REJECTED
SUPERSEDED
```

Promotion is narrower than preprocessing.

No raw source or transcript becomes canonical Career Memory merely because processing succeeded.

---

## 7. Idempotency

Job idempotency key:

```text
source_version_key
+ processor_name
+ processor_version
+ processing_profile_version
```

The processing profile version captures behavior that materially changes output, such as:
- prompt family;
- extraction policy;
- segmentation strategy;
- provider-routing policy when it changes output semantics.

Provider/model metadata is still recorded in provenance.

Same idempotency key + valid AVAILABLE artifact:

```text
-> SKIPPED_CURRENT
```

No repeated provider call is required.

---

## 8. Current Apps Script mapping

```text
CURRENT RUNTIME                    vNEXT STATE

Drive change event              -> DETECTED
scope/session gate              -> authorization + context resolution
fingerprint                     -> SourceVersion
queue insert                    -> QUEUED
worker starts                   -> RUNNING
resumable upload pending        -> RETRY_WAIT / RUNNING
429 + Retry-After               -> RETRY_WAIT
successful OCR/transcript       -> SUCCEEDED + AVAILABLE artifact
existing current sidecar        -> SKIPPED_CURRENT
terminal unsupported/error      -> FAILED_FINAL
shared Gemini cooldown          -> runtime-level retry policy
```

No rewrite is required to begin modeling these states.

---

## 9. Scanner transaction boundary

The scanner should remain short.

For each detected source/version:

1. normalize identity/version;
2. evaluate authorization;
3. resolve context hints;
4. persist enough registration/queue state to avoid losing work;
5. only then advance/commit the source-system cursor/page token.

Provider processing success must not control cursor advancement.

This preserves the current proven design where provider failures do not replay Drive change batches.

---

## 10. Worker transaction boundary

For one queued job:

1. acquire serialization/ownership guard;
2. reload current job/source state;
3. verify source/version still matches;
4. check for current artifact/idempotency hit;
5. execute or resume processing;
6. persist artifact safely;
7. persist provenance;
8. mark processing result;
9. update manifests/registry projections;
10. schedule retry or remove completed job.

A job must be safe to resume after runtime interruption.

---

## 11. Retry policy

Retry classes:

### Provider quota / rate limit

Examples:
- HTTP 429;
- explicit Retry-After.

Policy:
- honor provider hint;
- maintain minimum worker-safe delay;
- preserve shared provider cooldown where useful;
- do not classify ordinary rate limits as corrupt input.

### Transient service/network

Policy:
- bounded exponential backoff when no authoritative retry hint exists;
- jitter;
- retain attempt/error metadata.

### Runtime interruption

Examples:
- Apps Script execution limit;
- partial resumable upload.

Policy:
- persist continuation state;
- resume, do not restart from byte zero when avoidable.

### Non-retryable input/provider error

Policy:
- mark FAILED_FINAL for the current processor/profile;
- preserve source registration;
- permit a future processor/profile version to retry intentionally.

---

## 12. Partial-success rule

Multistage sources must retain successful lower layers.

Examples:

```text
audio transcript succeeds
semantic profile fails
=> transcript AVAILABLE, enrichment FAILED_RETRYABLE
```

```text
video transcript succeeds
visual timeline fails
=> transcript AVAILABLE, video evidence INCOMPLETE
```

```text
PDF native extraction succeeds
visual figure interpretation fails
=> text AVAILABLE, visual enrichment INCOMPLETE
```

Never roll back source-faithful evidence because an optional higher layer failed.

---

## 13. Context-resolution behavior

Context resolution runs before processor planning but is not a mandatory classification success.

Possible outcomes:

```text
RESOLVED_PRIMARY
RESOLVED_MULTIPLE
UNCLASSIFIED_AUTHORIZED
BLOCKED_POLICY
```

The current folder-name regex may remain temporarily as one inference signal.

It must no longer be the rule that decides whether an authorized source is discarded.

---

## 14. Processor planning

The planner maps source type + available artifacts + policy to required jobs.

Examples:

### image
```text
image source
-> current OCR exists? skip
-> otherwise queue image extraction
-> optional semantic enrichment
```

### audio
```text
audio source
-> credible current transcript exists? associate + skip transcription
-> otherwise queue transcription
-> optional navigation/topic enrichment
```

### PDF
```text
PDF
-> deterministic/native text first
-> OCR/vision only for missing/scanned/visual regions as needed
-> semantic enrichment later
```

### video
```text
video
-> transcript path
-> visual path
-> partial results preserved independently
-> fusion only when inputs are available
```

---

## 15. Cost/quota behavior

Processor planning prefers:

```text
cached/current artifact
-> deterministic extraction
-> existing transcript/sidecar
-> low-cost provider processing
-> richer semantic processing only when useful
```

Current free-only/provider guard may remain in the Apps Script runtime.

vNext records:
- provider;
- model;
- processing profile;
- quota/cost class;
- attempt/result.

No new billing integration is required for milestone 1.

---

## 16. Deletion and destructive actions

Normal processing may:
- create/update Career OS-owned artifacts;
- update Career OS metadata;
- supersede older derived artifacts.

Normal processing must not:
- delete raw originals;
- overwrite ambiguous user-created files;
- delete historical evidence merely because a new version exists;
- retire Drive material automatically without explicit safe-retirement rules.

---

## 17. Health/read-model requirements

Without opening raw logs, the system should eventually answer:

- pending jobs;
- jobs in retry wait;
- final failures;
- sources with stale artifacts;
- sources authorized but unclassified;
- contexts partially processed;
- last successful processor run;
- provider cooldown state.

Milestone 1 can expose this through registry projections and later through the monitor/control plane.

---

## Stage 5 decision gate

Approve or change:

1. separate source, job, artifact, enrichment and promotion states;
2. preserve scanner/worker split;
3. preserve cursor advancement independent of provider success;
4. use source-version + processor/profile idempotency;
5. preserve partial success;
6. treat context uncertainty separately from processing failure;
7. retain current retry/backoff/resumable-upload behavior behind the new state model.

After approval, Stage 6 defines connector contracts.
