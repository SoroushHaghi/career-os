# Work Task — Knowledge Compiler Vertical Slice

Status: READY FOR IMPLEMENTATION
Branch: vnext
Scope: bounded implementation only

## Objective

Implement the smallest real vertical slice that turns already-extracted source-faithful session artifacts into a useful, structured session knowledge artifact.

Target flow:
existing session artifacts -> bounded evidence bundle -> strong semantic synthesis -> selective verification -> SESSION_SYNTHESIS.md + machine-readable companion

This task is intentionally downstream of ingestion. Do not redesign or optimize raw-media ingestion.

## Hard scope boundaries

Do NOT:
- modify main;
- deploy to production;
- change scanner cadence, audio chunking, image queue, dashboard polling, provider backoff, or raw-media extraction;
- add a new orchestration platform;
- add a vector database;
- move personal/raw session content into the public repository;
- auto-run the compiler from permanent triggers yet.

Use only synthetic fixtures in the public repository.

## Existing architecture to reuse

Read before editing:
- docs/vnext/08_KNOWLEDGE_MODEL.md
- docs/vnext/09_RUNTIME_OPERATIONS.md
- packages/knowledge/src/enrichment.mjs
- packages/knowledge/src/verified-synthesis.mjs
- packages/knowledge/src/fusion.mjs
- packages/knowledge/src/retrieval.mjs
- current Apps Script staging/runtime adapter and existing provider abstraction

Preserve the invariant: source-faithful evidence != derived synthesis.
The synthesis must reference evidence rather than silently replacing it.

## Required input

A manual/staging-only entrypoint should accept or resolve one session/context and consume already-generated textual artifacts for that context, such as transcript text, OCR text, extracted PDF text, notes, or other source-faithful artifacts.

The selector/packer must:
- remain context-scoped;
- exclude generated synthesis from its own next input unless explicitly versioned as prior synthesis;
- keep source/artifact identity and anchors;
- enforce a bounded context budget;
- record exclusions and coverage.

## Stage A — synthesis

Create one bounded evidence bundle and use one strong semantic provider call where feasible to produce structured session synthesis.

The semantic result must support at least:
- title
- executive_summary
- topic_blocks[] with title, explanation, definitions[], formulas[], examples[], lecturer_emphasis[], evidence_refs[]
- uncertainties[]
- conflicts[]
- coverage

Requirements:
- organize by concepts/topics, not by raw file concatenation;
- deduplicate repeated explanations;
- preserve course/source terminology;
- do not silently correct unsupported source content;
- mark likely ASR/OCR corruption or uncertain interpretation;
- every material topic/claim should retain evidence references;
- keep inferred content distinguishable from source-supported content.

Generate:
- SESSION_SYNTHESIS.md for human use;
- a machine-readable structured companion JSON following existing runtime conventions where practical.

## Stage B — selective verification

Use the existing verified-synthesis contracts where practical.
A second provider call is allowed for verification, but do not perform a full second rewrite.
Verification should focus on material claims and:
- check evidence refs;
- identify unsupported/partially supported/contradicted claims;
- qualify uncertain claims;
- produce a verification state/report that can later gate promotion.

If deterministic checks are sufficient, do not spend a provider call.

## Provider/runtime rule

Reuse the existing Gemini/provider path and private runtime configuration. Do not introduce credentials into Git.
Model choice must be configurable. Prefer the strongest already-available model for synthesis; extraction-speed defaults do not need to dictate synthesis-model choice.
Do not remove or bypass existing free-only/cost safety gates. If the selected strong model cannot legally run under current runtime policy, surface that as a clear staging blocker rather than weakening the safety gate.

## Manual-only execution

Expose a clear staging/manual invocation path for one context/session.
Do not attach the compiler to the permanent scanner/worker loop in this task.
The manual path should make it possible to run a real session after deployment without changing production behavior.

## Acceptance criteria

Implementation is acceptable only if:
1. public CI/tests pass;
2. no raw/private user content is committed;
3. one synthetic multi-source fixture demonstrates actual fusion rather than concatenation;
4. the output is materially cleaner than source text;
5. repeated content is merged;
6. uncertain/corrupt input remains visibly uncertain;
7. material output statements retain evidence references;
8. source coverage/exclusions are visible;
9. the compiler can be invoked manually on staging for one real session;
10. no production/main changes are made.

## Tests

Add focused tests with synthetic evidence for:
- multi-source topic fusion;
- duplicate explanation merge;
- evidence-ref preservation;
- unsupported-reference rejection;
- ASR/OCR uncertainty preservation;
- generated-artifact self-exclusion;
- bounded context behavior;
- verification status.

Do not build a giant generalized test framework.

## Deliverable report

When finished, report only:
- what was implemented;
- changed files;
- tests/CI result;
- commit SHA(s);
- exact staging/manual invocation;
- what model/provider path is used;
- any remaining blocker before running one real session;
- confirmation that production and main were untouched.

## Stop condition

Stop after the vertical slice is implementation-ready for one real staging session.
Do not continue into cross-session consolidation, automatic career promotion, learner-state updates, or production deployment in this task.
