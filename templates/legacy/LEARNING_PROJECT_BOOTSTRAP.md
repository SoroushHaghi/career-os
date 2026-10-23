# Reusable Learning Project Bootstrap

Purpose: start a new learning/evidence-based project without rebuilding the workflow from zero.

This template consolidates durable reusable rules for evidence-grounded learning projects. It is generic and public-safe.

## 1. Minimum configuration

```yaml
project_code: "[SHORT_CODE]"
project_name: "[PROJECT_NAME]"
project_type: "learning" # learning | research | writing | mixed
primary_goal: "[CLEAR_OUTCOME]"
deadline: "[YYYY-MM-DD or NONE]"
high_stakes: "[YES/NO]"
source_root: "[CONNECTED_SOURCE_LOCATION]"
workspace_root: "[PROJECT_ROOT]/_AI_WORKSPACE"
stable_entrypoint: "[PROJECT_ROOT]/_AI_WORKSPACE/START_HERE.md"
teaching_language: "[TEACHING_LANGUAGE]"
technical_terms_language: "[TECHNICAL_TERMS_LANGUAGE]"
assumed_starting_point: "[ASSUMED_STARTING_POINT]"
```

Do not invent unknown values.

## 2. Core operating rules

- Evidence before memory: source evidence and explicit user statements outrank generated summaries or chat recollection.
- Keep one visible source of truth for current state and exact next action.
- Separate Source Coverage from Learner Mastery / Execution Readiness.
- Recognition or guided success is not independent retrieval.
- Preserve uncertainty, missingness, conflicts and truncated sources.
- Work in small source-grounded blocks.
- Begin independent production/retrieval during the first pass, not only at the end.
- Do not expand project scope silently.

## 3. Active-project architecture

An active project may keep its full ecosystem in its own Drive/project root.

Recommended structure:

```text
[PROJECT_ROOT]/
├── ORIGINAL_SOURCES/        # read-only user/official material when practical
└── _AI_WORKSPACE/
    ├── START_HERE.md
    ├── PROJECT_CORE.md
    ├── SOURCE_MAP.md
    ├── CURRENT_STATE.md
    ├── ROUTE.md
    ├── LEARNER_MODEL.md
    ├── TEACHING_PROTOCOL.md
    ├── TEACHER_BRIEF.md
    ├── CHANGELOG.md
    ├── SESSIONS/
    ├── LIVE_NOTES/
    ├── BUILDS/
    └── ARCHIVE/
```

Use only the files justified by project complexity. Do not create empty bureaucracy.

Career OS supervises the active project through a registry/pointer; it does not create a competing canonical copy of the project's internal state.

## 4. Stable entrypoint

`START_HERE.md` is the durable role router.

- Teacher/Domain Worker -> current `TEACHER_BRIEF.md` first.
- Manager -> `PROJECT_CORE.md`, `CURRENT_STATE.md`, `ROUTE.md`.
- Backend -> core/state/source map/route plus the relevant session delta and build protocols.

If required canonical files disagree, stop and report the conflict instead of reconstructing state from chat history.

## 5. Source hierarchy

Default authority order:

1. explicit user decisions and official administrative instructions;
2. official tasks/specifications/syllabi/rubrics;
3. primary evidence such as recordings, scans, photos, measurements or data;
4. direct transcripts aligned to primary evidence;
5. edited/reconstructed/secondary notes;
6. external references used only to clarify confirmed scope;
7. AI-generated notes/summaries/diagrams.

A generated summary cannot establish what the professor/owner actually covered.

## 6. Source ingestion

For each source:

- keep the original unchanged;
- identify filename/location/type/provenance;
- classify original vs duplicate vs derivative vs generated;
- record exact useful page/slide/timestamp/section when practical;
- link it to a route/task;
- preserve missing/conflicting evidence.

For mixed transcripts, segment direct transcript, duplicates, generated residue, mismatched-session content and unreadable sections. Never treat the whole mixed file as direct evidence without segmentation.

## 7. Two status axes

### Source Coverage

Examples: `not audited`, `in progress`, `partially covered`, `source-complete`, `excluded`, `uncertain`.

### Learner Mastery / Execution Readiness

Examples: `not introduced`, `introduced`, `seen with assistance`, `partial`, `conceptually understood`, `independent retrieval unverified`, `independently retrieved`, `exam-ready`, `delivery-ready`, `deferred`, `uncertain`.

Use `PASS`, `PARTIAL`, `NOT YET` for substantive checks and preserve evidence level: `independent`, `prompted`, `guided`, or `recognized`.

## 8. Exact next action

`CURRENT_STATE.md` must contain exactly one operative next-action block:

```text
Next: [specific source/task block]
Required output: [observable learner/worker output]
Stop condition: [observable completion condition]
```

Move historical/superseded state to session logs, changelog or archive.

## 9. Teaching rules

- Use the configured starting-point assumption for new material unless independent evidence proves otherwise.
- Teach before testing.
- Define new technical terms before using them heavily.
- Explain purpose before dense formal notation.
- Prefer a small concrete example before abstraction.
- Repair a local gap locally instead of restarting the entire course.
- Use source figures before inventing replacements.
- Do not promote assisted reconstruction to independent mastery.

## 10. End-of-session reconciliation

A useful session handoff should preserve only meaningful deltas:

- state delta;
- evidence/mastery delta;
- learner-model delta;
- domain/knowledge delta;
- source/resource delta;
- unresolved flags;
- exact next action.

Do not use chat history as the long-term database.

## 11. Closure and Career OS migration

When a project closes:

1. mark it closed in its canonical state;
2. preserve required raw/original material in the intended archive;
3. migrate durable processed text/structured knowledge into private durable memory;
4. record provenance and closure state;
5. verify the migrated representation can be retrieved;
6. only then remove the former Drive working copy if the user chooses.

## 12. Final quality test

At any point the project should be able to answer:

1. What is authoritative?
2. Where are we exactly?
3. What was covered vs independently demonstrated?
4. What remains uncertain/unfinished?
5. What is the single next action?

If it cannot, repair state before starting new substantive work.
