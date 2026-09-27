# vNext Release Readiness

Status: READY FOR CONTROLLED IN-PLACE STAGING
Updated: 2026-09-27

## Current repository state

The vNext runtime is now module-only.

- transitional `src/baseline.gs`: retired;
- canonical source: `apps/apps-script-runtime/src/modules/**/*.gs`;
- generated deployment surface: `Code.gs` + `appsscript.json`;
- production Apps Script: unchanged;
- latest repository CI and Apps Script surface checks: passing.

## Completed engineering gates

- repository foundation and privacy gates;
- current-source preservation and characterization;
- core contracts / identities / state machines;
- Context Resolver and authorized-unclassified hold behavior;
- Drive registry projections;
- processor/provider boundaries including PDF document adapter;
- queue/retry/provider-cooldown behavior;
- modular Apps Script extraction;
- generated build identity;
- two-file deployment-surface enforcement;
- module function-uniqueness enforcement;
- cutover preflight diagnostics;
- non-secret runtime state snapshot/restore helper;
- staging/live-provider safety gates;
- in-place cutover runbook;
- manual release-candidate workflow.

## Remaining gates before production

These require access to the real Apps Script project and therefore are not repo-only work:

1. record current trigger configuration;
2. disable/freeze production triggers;
3. set `CAREER_OS_ENVIRONMENT=staging`;
4. replace the current Apps Script code with the repo-generated package;
5. verify Git SHA/build identity;
6. create the non-secret cutover runtime-state snapshot;
7. run shadow/config/metadata/registry probes;
8. run scoped image/audio/PDF provider parity on the test folder;
9. validate queue/retry/idempotency behavior;
10. validate rollback;
11. obtain explicit approval before production mode and triggers are restored.

## Hard boundary

No production cutover is authorized by this document.

The next transition changes the real Apps Script project and must be performed only with the user's explicit approval and participation.

## Rollback assets

- private pre-vNext source snapshot: Career Memory;
- current runtime state snapshot helper: repo runtime;
- Git commit/build identity: generated bundle;
- previous repository history: Git;
- trigger recreation: manual from the recorded trigger inventory (not automatically restored).
