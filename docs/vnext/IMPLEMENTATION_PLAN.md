# Career OS vNext — Implementation Plan

Status: ACTIVE
Updated: 2026-09-27

## Objective

Implement the approved vNext architecture incrementally while preserving the current working Apps Script runtime and making `career-os` the canonical source of reusable system behavior.

Personal/private user data must never be required in the public repository.

## Guiding invariant

```text
career-os      = system code/spec/config schemas/tests/deployment logic
career-memory  = private durable user/system state
Google Drive   = active private source/artifact workspace
runtime secret store = credentials
```

## Implementation sequence

### Phase 0 — Repository foundation

Create the approved repository structure and common tooling without changing production runtime behavior.

Deliverables:
- `apps/apps-script-runtime/`
- `packages/core/`
- `packages/drive-adapter/`
- `packages/processing/`
- `packages/knowledge/`
- `packages/persistence/`
- `config/`
- `tests/`
- CI skeleton;
- privacy/publication checks.

Exit condition:
repository structure and build/test conventions exist; current production runtime untouched.

### Phase 1 — Canonicalize current Apps Script source

Restore the protected current Apps Script snapshot, inspect it for private constants/IDs, sanitize only configuration values, and commit the reusable source into `career-os`.

Rules:
- behavior first, refactor later;
- no secret values or private IDs committed;
- record original snapshot checksum and repo-import checksum;
- generated/deployed bundle must be reproducible.

Exit condition:
the working baseline source is version-controlled in `career-os` and can be rebuilt without chat history.

### Phase 2 — Baseline characterization tests

Add tests/fixtures around current behavior before changing architecture.

High-value cases:
- source identity and checksum behavior;
- modifiedTime self-loop avoidance;
- image/audio classification;
- queue deduplication;
- retry/backoff classes;
- safe sidecar ownership;
- existing transcript detection;
- valid and invalid context-name behavior as baseline characterization.

Exit condition:
critical existing behavior is protected by automated tests or explicit fixtures.

### Phase 3 — Core contracts

Implement stable types/schemas for:
- Source;
- SourceVersion;
- Context / ContextBinding;
- ProcessingAuthorization;
- Artifact;
- EvidenceUnit;
- ProcessingRecord;
- KnowledgeEntity / KnowledgeRelation;
- LearnerState;
- Provenance.

Use JSON-compatible schemas so contracts remain usable across future runtimes.

Exit condition:
contract tests pass and no Drive/Gemini runtime code is required by core.

### Phase 4 — Context Resolver and intake correction

Introduce the vNext Context Resolver while preserving current folder metadata as hints.

Behavior:
- authorized sources never fail only because a folder name misses a regex;
- unresolved sources become `UNCLASSIFIED_AUTHORIZED`;
- user confirmation is requested only for meaningful ambiguity;
- current session pattern matching remains one inference signal.

Exit condition:
the previous `test`-folder failure mode is eliminated in synthetic tests.

### Phase 5 — Registry projections

Add machine-readable context manifests and context-scoped registry projections.

Initial outputs:
- `SESSION_MANIFEST.json` / `CONTEXT_MANIFEST.json`;
- `REGISTRY/sources.jsonl`;
- `REGISTRY/artifacts.jsonl`;
- `REGISTRY/evidence.jsonl`;
- `REGISTRY/processing.jsonl`.

Exit condition:
the system can answer what source/version/artifact/job exists without reading raw logs.

### Phase 6 — Processor/provider boundaries

Wrap existing working provider calls behind narrow capabilities:
- `vision_extract`;
- `transcribe`;
- `generate_structured`.

Keep current Gemini key/model routing and free-only guard in runtime configuration.

Exit condition:
processors no longer depend on Drive/provider details as domain requirements.

### Phase 7 — Knowledge staging and retrieval

Implement bounded semantic profiles, concept/relation records, conflict records and retrieval bundles.

Start with deterministic/context-scoped retrieval before adding embeddings.

Exit condition:
an agent can retrieve a context package without re-reading all raw media.

### Phase 8 — Learner overlay and promotion

Implement private learner-state updates and controlled promotion routing.

Rules:
- learner state remains private;
- source truth never changes because learner state changes;
- promotion preserves provenance/evidence state.

Exit condition:
user-specific state can be updated without any public-repo data leak.

### Phase 9 — Repo-driven runtime build/deployment

Make repository source the deployment input.

Target:
- modular source in repo;
- generated Apps Script-compatible bundle;
- build version includes Git SHA;
- deployment can initially be manual/semi-automated;
- later GitHub Actions deployment after one-time auth setup.

Exit condition:
manual edits in the Apps Script editor are no longer needed for normal system changes.

### Phase 10 — End-to-end parity and release

Run authorized real-source validation:
- one image;
- one audio;
- optional PDF;
- one normal resolved context;
- one intentionally unclassified context.

Verify:
- detection;
- context behavior;
- provider processing;
- provenance;
- registry projections;
- privacy boundary;
- monitor/CI;
- rollback.

Exit condition:
all release gates in Stage 11 pass and vNext is eligible for PR/merge into `main`.

## Technology choice for milestone 1

Use the existing Google Apps Script runtime, but move canonical source into repository modules.

Repository-side implementation should favor TypeScript/JavaScript-compatible modules plus JSON-compatible schemas so the same contracts can later be reused by a Python/background worker without changing identity semantics.

Do not introduce a heavy framework merely to implement the first milestone.

## Privacy gate

Before any baseline source snapshot is moved into the public repository:
1. inspect for private Drive IDs, user-specific paths, emails and embedded tokens;
2. replace private configuration values with runtime-config references/placeholders;
3. verify no secret values are present;
4. run privacy checks;
5. only then commit.

## Current action

Phases 0–4 are complete, including latest-source compatibility validation and baseline characterization.

Continue in this order:
1. complete Phase 5 Drive-backed registry projection writes;
2. finish Phase 6 runtime wrapping so scanner/worker behavior uses vNext contracts without widening processing scope;
3. create the standalone Apps Script staging target and run non-destructive probes;
4. then run scoped image/audio/PDF parity and rollback validation before any production cutover.