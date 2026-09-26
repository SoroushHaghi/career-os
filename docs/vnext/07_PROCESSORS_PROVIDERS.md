# 07 — Processor and Provider Contracts

Status: APPROVED
Updated: 2026-09-26

## Goal

Separate what Career OS wants done from which AI/model vendor performs it.

Processors own media/document behavior.
Providers implement narrow capabilities.

Milestone 1 must reuse the working Gemini paths already validated in Apps Script instead of forcing a new provider framework or new API setup.

---

## 1. Processor vs Provider

### Processor

A Processor owns domain behavior such as:

```text
image -> OCR / visible text / visual evidence
audio -> verbatim transcript / navigation timeline
PDF -> native extraction + visual fallback
video -> transcript + visual timeline + fusion inputs
text -> normalization / structure extraction
```

A processor decides:
- required outputs;
- source-faithful vs inferred distinction;
- segmentation/anchors;
- quality checks;
- artifact types;
- fallback semantics;
- idempotency/profile version.

### Provider

A Provider owns vendor/API mechanics such as:
- Gemini request construction;
- OpenAI request construction;
- Anthropic request construction;
- upload protocol;
- model ID;
- provider response parsing;
- provider-specific error mapping.

Provider adapters do not decide Career OS truth.

---

## 2. Processor input contract

Each processor receives a normalized request:

```text
ProcessingRequest {
  source_version
  source_type
  content_access
  context_refs[]
  existing_artifacts[]
  processing_profile
  authorization
}
```

Processors do not receive raw Drive implementation details as required business inputs.

The content access handle may still be implemented by the Drive adapter/runtime.

---

## 3. Processor output contract

Processors return structured drafts/results:

```text
ProcessingResult {
  status
  artifacts[]
  evidence_units[]
  warnings[]
  provenance
  quality
}
```

Artifacts are not considered persisted until the artifact-store write succeeds.

A processor result may be partial.

---

## 4. Provider capability interfaces

Milestone-1 provider capabilities:

```text
VisionExtractionProvider
TranscriptionProvider
GenerationProvider
```

Later, if needed:

```text
EmbeddingProvider
VideoUnderstandingProvider
DocumentVisionProvider
```

Do not create a separate package/interface merely because a future capability might exist.

---

## 5. Image processor

Required behavior:

```text
image
-> detect usable existing current artifact
-> otherwise visual/OCR extraction
-> preserve literal visible text separately from interpretation
-> create source-faithful text artifact
-> create anchored Evidence Units
-> optional semantic enrichment later
```

Current runtime reuse:
- HEIC/HEIF support;
- current Gemini image OCR path;
- generated sidecar ownership protection;
- fallback provider/model routing;
- current free-only guard.

Provider/model IDs stay in runtime configuration/provenance.

---

## 6. Audio processor

Required behavior:

```text
audio
-> search for credible current existing transcript
-> if found, associate and avoid redundant transcription
-> otherwise transcribe source-faithfully
-> preserve language/speaker/timestamp metadata where available
-> optionally create navigation/topic timeline
```

Canonical raw transcript should remain verbatim/source-faithful.

A cleaned summary or semantic analysis is a separate derived artifact.

Current runtime reuse:
- existing transcript association;
- resumable provider upload;
- chunk/range reads;
- retry continuation;
- temporary provider-side cleanup;
- validated dedicated transcription route.

---

## 7. PDF/document processor

Preferred order:

```text
native/deterministic extraction
-> page-preserving text
-> identify missing/scanned/visual content
-> vision/OCR fallback only where needed
-> merge with page provenance
```

Do not send an entire text-native PDF to an AI provider when deterministic extraction is sufficient.

Artifacts must preserve page/region anchors.

---

## 8. Video processor

Video has independent evidence channels:

```text
video
  +-> speech/transcript channel
  +-> visual/timeline channel
  +-> later chronological fusion
```

Partial success is valid.

Milestone 1 does not require a new heavy-video worker.

The contract is defined now so later FFmpeg/container processing can be added without changing the knowledge model.

If only direct multimodal fallback is available:
- mark method explicitly;
- do not label generated summary as verbatim transcript.

---

## 9. Text processor

Plain text/Markdown/code should use deterministic processing first:

- normalize encoding;
- preserve original content;
- detect headings/sections;
- create stable chunk/line anchors;
- avoid provider use unless semantic enrichment is requested.

This should be near-zero-cost.

---

## 10. Provider selection policy

Provider selection belongs in runtime/configuration policy, not in the data model.

Example milestone-1 routing:

```text
image extraction    -> existing Gemini image path
audio transcription -> existing dedicated transcription path
semantic generation -> existing Gemini generation path
```

The exact model name is recorded in provenance.

Core contracts should only care that the requested capability was satisfied.

---

## 11. Processing profile version

The processor owns a `processing_profile_version`.

It changes when output semantics materially change, for example:
- prompt/extraction contract changes;
- segmentation strategy changes;
- source-faithfulness rules change;
- artifact structure changes;
- fallback semantics change.

Changing only a provider credential does not change the processing profile.

Changing model/provider may or may not require a profile change depending on whether output compatibility is intended.

The actual provider/model is always recorded in provenance.

---

## 12. Provider error normalization

Provider-specific responses are mapped into normalized categories:

```text
RATE_LIMITED
TEMPORARY_UNAVAILABLE
AUTH_FAILED
UNSUPPORTED_INPUT
INPUT_TOO_LARGE
CONTENT_REJECTED
INVALID_RESPONSE
PROVIDER_ERROR
```

The job state machine decides retry/final behavior.

Processors should not contain HTTP status-code policy scattered throughout media-specific logic.

During migration, existing Apps Script behavior may be wrapped before it is physically refactored.

---

## 13. Fallback behavior

Fallbacks must preserve semantic meaning.

Examples:

### Image
Primary visual extraction fails:
- compatible visual fallback may run;
- record fallback provider/model;
- output remains image-extraction artifact.

### Audio
Dedicated transcription unavailable:
- a compatible transcription fallback may be used;
- extraction method must be explicit;
- do not silently substitute a summary for a transcript.

### PDF
Native extraction insufficient:
- visual fallback may augment missing content;
- preserve which pages/blocks came from deterministic text vs AI vision.

---

## 14. Provenance requirements

Every AI-backed artifact records:

```text
processor_name
processor_version
processing_profile_version
provider
model
request mode/profile
created_at
source_version_key
fallback_used?
warnings?
```

Where possible also record:
- input-size class;
- provider upload/file reference only if safe and non-secret;
- quota/cost class.

Temporary authorization URLs/tokens are never persisted as provenance.

---

## 15. Cost-first execution order

Use the cheapest valid path that preserves required fidelity:

```text
current cached artifact
-> deterministic/local extraction
-> existing credible derivative
-> specialized low-cost provider capability
-> richer multimodal/generative reasoning
```

This is a processing policy, not a quality downgrade.

High-cost reasoning should not be spent on mechanical extraction by default.

---

## 16. Current Gemini reuse

For milestone 1, the existing Apps Script provider implementation remains usable.

Already validated runtime assets include:
- current API key;
- image-model access;
- dedicated transcription-model access;
- free-only allowlist/guard;
- retry/backoff behavior;
- resumable upload behavior.

vNext does not require:
- a new key;
- a second AI account;
- a provider SDK migration;
- a new hosted API.

The first refactor goal is to put a narrow provider boundary around the working calls.

---

## 17. Provider independence without premature abstraction

Do not create dozens of interfaces now.

Milestone-1 minimum:

```text
vision_extract(...)
transcribe(...)
generate_structured(...)
```

Only split further when real implementations require it.

This keeps Career OS portable without building an abstraction framework larger than the application.

---

## 18. Quality checks

Processors should validate output before marking artifacts AVAILABLE.

Examples:

### transcript
- non-empty for non-silent substantial audio;
- source/version association present;
- method/provider provenance present;
- no accidental summary-only output when transcript required.

### image OCR
- valid textual/structured response;
- provenance present;
- generated-file ownership safe.

### PDF
- page anchors preserved;
- extraction methods distinguishable.

Failed quality validation creates INVALID/FAILED state rather than silently accepting bad evidence.

---

## 19. Semantic enrichment boundary

Processors create source-faithful evidence first.

Semantic enrichment may then create:
- digest;
- concepts/topics;
- entities;
- timeline;
- relations;
- promotion candidates.

Enrichment never overwrites the raw transcript/OCR/source-faithful artifact.

---

## Stage 7 decision gate

Approve or change:

1. processors own media behavior, providers own vendor mechanics;
2. reuse current Gemini implementation through narrow adapters;
3. deterministic/current artifacts are preferred before provider calls;
4. raw transcript/OCR remains distinct from semantic inference;
5. normalized provider errors feed the Stage-5 job state machine;
6. provenance records actual provider/model without coupling core identities to them;
7. no new API key/provider/service is required for milestone 1.

After approval, Stage 8 defines knowledge fusion, retrieval and learner-state behavior.
