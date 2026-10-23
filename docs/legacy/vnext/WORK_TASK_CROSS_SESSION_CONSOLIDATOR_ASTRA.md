# Work Task — Cross-Session Knowledge Consolidator (ASTRA)

Status: READY FOR PARALLEL IMPLEMENTATION
Base: latest `vnext` after Knowledge Compiler core/runtime merge
Suggested branch: `work/cross-session-consolidator-astra`

## Objective

Implement the next knowledge stage after per-session synthesis:

`SESSION_SYNTHESIS.json[] -> course/module-level consolidated knowledge -> COURSE_KNOWLEDGE.md + structured JSON`

This task must be independent of the active runtime-convergence work. Do not edit the Apps Script knowledge runtime modules or the current session compiler core unless absolutely necessary for a tiny shared contract fix.

## Scope

Build package-level, provider-agnostic cross-session consolidation logic that:
- accepts multiple verified/unverified session synthesis artifacts with provenance;
- groups the same concept across sessions without flattening all source text;
- deduplicates repeated explanations;
- preserves per-session evidence/session refs;
- records genuinely new details as additions rather than overwriting history;
- keeps conflicts and uncertainties explicit;
- distinguishes source-supported statements from inference;
- produces a stable course-level concept graph/read model;
- supports incremental reruns without duplicating already-integrated session material;
- produces a human-readable `COURSE_KNOWLEDGE.md` renderer plus structured JSON representation.

## Input contract

Input should be session-level structured synthesis, not raw media. Each session item must carry at least:
- session/context id;
- synthesis version/id;
- topic blocks;
- evidence refs or source session refs;
- uncertainties/conflicts;
- verification state when available.

Generated course outputs must self-exclude from future session compilation.

## Required output model

At minimum support:
- course/module title or context;
- concepts[] with stable concept id/key;
- canonical explanation;
- definitions[];
- formulas[];
- examples[];
- lecturer_emphasis[];
- source_sessions[];
- evidence/session refs;
- additions_by_session[] or equivalent lineage;
- uncertainties[];
- conflicts[];
- unresolved_questions[];
- coverage;
- consolidation metadata/version.

## Incremental behavior

A rerun with the same session synthesis versions must be idempotent.
A new session may enrich an existing concept, add a new concept, or create a conflict.
Do not silently replace an earlier supported statement when a later source disagrees.

## Provider boundary

Package-level logic should be provider-agnostic. It may expose a bounded semantic consolidation request/schema, but do not add credentials or direct live API calls in this task.
Prefer one strong semantic consolidation pass per bounded batch and deterministic validation afterward.

## Files

Prefer new files such as:
- `packages/knowledge/src/cross-session.mjs` or equivalent;
- `packages/knowledge/src/course-renderer.mjs` if useful;
- `tests/cross-session-knowledge.test.mjs`;
- a short generic doc under `docs/vnext/` if needed.

Avoid editing:
- `apps/apps-script-runtime/src/modules/94_knowledge_provider_adapter.gs`;
- `apps/apps-script-runtime/src/modules/98_knowledge_compiler_staging.gs`;
- `packages/knowledge/src/compiler.mjs`;
- `packages/knowledge/src/quality.mjs`;
unless a very small compatibility fix is unavoidable.

## Tests

Use only synthetic public-safe fixtures. Cover:
- same concept across 3 sessions merges once;
- new details are appended with lineage;
- duplicate session/version is idempotent;
- conflicting claims remain explicit;
- uncertain session content stays uncertain;
- source/session refs survive consolidation;
- generated course artifact does not become session evidence;
- stable ordering/IDs across reruns.

## Hard boundaries

Do not touch `main` or production.
Do not deploy.
Do not redesign ingestion, audio, image, scanner, queues, dashboard, or provider backoff.
Do not put real user/course data in the public repo.
Do not implement career-memory promotion in this task.

## Deliverable

Open a PR against `vnext` and report:
- branch;
- commit SHA(s);
- changed files;
- tests/CI;
- exact input/output contract;
- remaining blocker before wiring this stage into staging;
- confirmation that `main` and production are untouched.

Do not stop for routine engineering decisions. Stop only for credentials, production/main changes, or a true architecture conflict.