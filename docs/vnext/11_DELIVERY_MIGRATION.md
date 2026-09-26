# 11 — Tests, CI/CD, Migration and Release Gates

Status: APPROVED
Updated: 2026-09-27

## Goal

Define how vNext becomes executable without risking the current working baseline, leaking private data, or creating another manually maintained runtime.

## 1. Test layers

Required layers:

```text
unit tests
contract/schema tests
synthetic processor tests
connector adapter tests
state-machine/idempotency tests
privacy/publication tests
integration tests
real-environment smoke tests
migration/parity tests
```

Real private data is not committed as a test fixture.

## 2. Synthetic fixtures

Public repository test fixtures must be synthetic or explicitly public-safe.

Examples:
- fake Drive metadata;
- generated image/document fixtures;
- short synthetic audio where needed;
- fake context hierarchy;
- fake learner-state records;
- fake career records.

Never sanitize a real personal dataset incompletely and assume it is safe enough.

## 3. Contract tests

Validate stable contracts for:
- Source / SourceVersion;
- Context / ContextBinding;
- Artifact / EvidenceUnit;
- ProcessingRecord state transitions;
- processor/provider results;
- registry projections;
- knowledge/learner separation;
- provenance fields.

## 4. State-machine tests

Required cases include:
- same source version is idempotent;
- modifiedTime-only update does not force heavy reprocessing when content is unchanged;
- retryable failure preserves job state;
- successful lower-level artifact survives higher-level failure;
- context unresolved does not discard authorized source;
- stale artifact cannot satisfy a new source version;
- existing credible transcript can satisfy transcription path;
- ambiguous user file is never overwritten.

## 5. Privacy tests

CI should fail public builds when known forbidden patterns appear in committed/generated public artifacts.

Checks should cover:
- credential patterns;
- private fixture directories;
- known private source IDs if intentionally registered in a denylist;
- accidental transcript/user-state snapshots;
- `.env`/secret files;
- runtime database/queue dumps.

Privacy tests complement, not replace, human review.

## 6. CI

GitHub Actions on `vnext` should eventually run:

```text
format/lint
schema validation
unit tests
contract tests
privacy checks
synthetic integration tests
public monitor build check
runtime bundle/build check
```

No production secret is required for ordinary pull-request CI.

## 7. Real-environment tests

Private smoke tests may run only with approved credentials/scope.

Initial real-environment parity test:

```text
one authorized image
one authorized audio source
optional PDF
known context + intentionally unclassified context
```

Verify:
- detection;
- source/version normalization;
- context resolution behavior;
- queue/state;
- existing Gemini paths;
- artifact provenance;
- manifest/registry projection;
- no public-data leak.

## 8. Migration strategy

Do not big-bang rewrite.

Migration sequence:

```text
1. freeze/document working baseline
2. move canonical reusable source into career-os
3. add tests around current behavior
4. introduce vNext contracts/adapters
5. run old/new paths in compatibility mode where useful
6. validate parity on real authorized sources
7. make repo-built runtime canonical
8. verify rollback
9. retire manual Apps Script source maintenance
10. merge/release only after acceptance gates
```

## 9. Current Apps Script code migration

The existing working Apps Script implementation should be preserved first, then modularized.

Target approach:
- reconstruct/restore the current protected source into a public-safe repo module with secrets removed;
- preserve behavior before refactoring;
- add a generated bundle for Apps Script runtime constraints;
- keep user-specific IDs/secrets in runtime properties, never source;
- compare generated bundle checksum/version against deployed runtime where practical.

## 10. Private snapshot transition

The protected automation snapshot currently stored in private career-memory remains a recovery artifact until repo-based canonical source has passed parity.

After parity:
- career-os becomes canonical implementation;
- private snapshot may remain as historical recovery evidence;
- it must not continue as a separately edited codebase.

## 11. Deployment

Milestone 1 deployment may remain manual/semi-automated if necessary, but deployment input must come from the repository build.

Later controlled deployment may use GitHub Actions after one-time authentication setup.

A deployment mechanism is optional; repository canonicality is not.

## 12. Release gate

vNext may replace main only when all required gates pass:

```text
architecture contracts approved
public/privacy boundary validated
baseline behavior regression tests pass
source/context idempotency tests pass
authorized real image/audio parity passes
rollback path verified
monitor/CI healthy
no unresolved P0 migration blocker
```

## 13. Merge strategy

Until release:

```text
main  = stable baseline
vnext = redesign + implementation
```

Use PR/review for the final merge.

Tag the old baseline before replacement.

Recommended release tags:

```text
v1-baseline
v2.0.0
```

Exact tag naming can be finalized at release.

## 14. Rollback acceptance

Before vNext production promotion, prove that a known-good previous runtime can be restored from repository/tag plus private runtime configuration.

The system must not rely on chat history for recovery.

## 15. Cost gate

Milestone 1 should retain current cost discipline:
- deterministic extraction first;
- cached/current artifacts first;
- existing provider account/key where valid;
- no new paid infrastructure requirement;
- higher-cost semantic work only when useful.

## 16. Definition of architecture-complete

Architecture design is complete when Stages 1–11 are approved and cross-validated.

That does not mean implementation is complete.

Implementation then begins from a version-controlled milestone plan in the same repository.

## Stage 11 decision gate

Approve or change:
1. incremental migration, not big-bang rewrite;
2. synthetic/public-safe CI fixtures only;
3. privacy checks are first-class CI gates;
4. current Apps Script behavior is test-protected before refactor;
5. repo source becomes canonical before manual runtime editing is retired;
6. real private smoke tests remain scoped/authorized;
7. main remains untouched until release gates pass.

After approval, create the implementation milestone plan and begin repository scaffolding.