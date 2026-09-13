# Workspace Standard

This document defines the reusable project/workspace model used by Career OS. It contains no user-specific data.

## Purpose

Career OS coordinates career, academic, and technical-project work without creating competing operating systems. `career-os` contains the reusable framework; private operational state belongs in `career-memory` and active source/evidence work may live in Google Drive.

## Workspace layers

Career OS uses two different workspace concepts that must not be confused.

### 1. Durable private project workspace

Used for persistent operational continuity in `career-memory`, for example:

- `WORKSPACES/ACADEMIC/<workspace>/`
- `WORKSPACES/CAREER/<workspace>/`
- `WORKSPACES/PROJECTS/<workspace>/`

Recommended files, only when useful:
- `START_HERE.md`
- `CURRENT_STATE.md`
- `MEMORY.md`
- `SOURCE_INDEX.md`
- `NEXT_ACTIONS.md`
- `SESSIONS/`
- `OUTPUTS/`

### 2. Session source-processing workspace

Used inside an active Drive session folder for ingestion evidence:

```text
<session>/
  <raw sources>
  _AI_WORKSPACE/
    <source-derived text>
    SESSION_MANIFEST.md
    SESSION_SYNTHESIS.md   # later, optional AI-reviewed output
```

This `_AI_WORKSPACE` is not the same thing as a durable `career-memory/WORKSPACES/...` project workspace.

Its purpose is to keep session-local evidence and provenance close to active source files without polluting the session root.

## Session identity

For session-centric ingestion:

- session folder Drive ID = canonical identity;
- course/collection/session folder names = mutable labels;
- source file Drive ID = source identity;
- source content fingerprint = source version where available.

Renaming a session folder must not create a new session identity.

## Session manifest

`SESSION_MANIFEST.md` is a deterministic mechanical inventory. It may include:
- hierarchy labels and stable folder IDs;
- source file IDs/types/fingerprints;
- transcript associations;
- processing states;
- text-evidence provenance.

It is not:
- a lesson summary;
- proof of understanding;
- a career skill claim;
- final semantic knowledge.

## Session synthesis

`SESSION_SYNTHESIS.md` is a separate optional semantic layer created/reviewed by an AI agent after reading relevant evidence.

It should reconcile extraction uncertainty, avoid overstating source content, and clearly separate source facts from interpretation.

Mechanical ingestion should not auto-generate it merely because new source text exists.

## Source and memory separation

Raw originals and bulky derived source text normally remain in approved external/private source storage such as Drive/local archive.

The private memory repository stores references, state, durable conclusions, selected protected internal snapshots, and compact project/learning memory.

A transcript is source-derived evidence. A learner model, decision, next action, validated project conclusion, or consolidated note is memory/knowledge.

Do not silently convert:
- source coverage -> mastery;
- project exposure -> proficiency;
- generated interpretation -> verified fact;
- transcript text -> career evidence without evaluation.

## Cross-workspace promotion

Promotion between layers is controlled.

Examples:
- session OCR/transcript -> remains session evidence;
- validated learning delta -> may update academic workspace memory;
- career-relevant project evidence -> may be promoted to canonical career evidence when supported;
- reusable automation rule -> belongs in `career-os`;
- private implementation snapshot -> may be retained in private `career-memory` if safe.

## Public/private boundary

- framework, schemas, reusable rules/templates -> `career-os`;
- user-specific operational state and sanitized durable memory -> `career-memory`;
- raw/sensitive originals -> approved private source storage outside public GitHub;
- credentials/runtime secrets -> secret/configuration stores outside Git.
