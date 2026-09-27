# Apps Script In-Place Cutover Runbook

Status: ACTIVE TARGET PATH
Updated: 2026-09-27

## Goal

Use the existing Career OS Apps Script project as the eventual vNext runtime without maintaining a second long-lived staging project.

The existing project is temporarily frozen and used as a controlled staging-in-place target before production triggers are re-enabled.

## Preconditions

Do not replace code until all repository CI/build checks pass.

Before cutover, capture:
- current deployed source snapshot (already preserved privately);
- Script Properties names and values in a private backup;
- installed triggers;
- current Drive change cursor / queue/runtime state needed for rollback;
- current project ID and permissions.

Secrets remain outside public Git.

## Freeze

1. Disable installed production triggers.
2. Confirm no scanner/worker execution is still running.
3. Record the existing installed triggers before deleting/disabling them; trigger schedules are not auto-restored by the repo runtime.
4. If `CAREER_OS_ENVIRONMENT` does not already exist in Script Properties, add a new Script Property named `CAREER_OS_ENVIRONMENT` with value `staging`. Do not replace or rename any existing property.
5. Replace the code with the repo-built package.
6. Immediately run `careerOsCreateCutoverStateSnapshot_()` before any live staging worker/provider execution. This snapshots only allowlisted non-secret runtime state inside Script Properties and records trigger metadata; it never copies `GEMINI_API_KEY`.
7. Keep `CAREER_OS_CUTOVER_RESTORE` disabled unless an explicit rollback is required.
8. Restrict vNext processing scope to the intended test folder/source allowlist.
9. Keep live provider gate disabled initially.

## Replace runtime code

Replace the Apps Script source with the generated repository package only:

```text
Code.gs
appsscript.json
```

Do not hand-edit generated code in Apps Script.

Verify `getCareerOsBuildInfo()` reports the expected Git SHA.

## Non-destructive validation

Run:
1. `runCareerOsVnextShadowSelfTest()`
2. `runCareerOsVnextStagingConfigProbe()`
3. `runCareerOsVnextStagingMetadataProbe()`
4. guarded registry projection probe

Do not enable production triggers yet.

## Scoped live parity

Enable provider testing only for the test scope.

Verify:
- image OCR;
- audio transcription/navigation;
- PDF path when selected;
- context resolution;
- registry projections;
- queue/idempotency/retry behavior;
- no processing outside the explicit allowlist.

## Rollback validation

The repo runtime contains a gated `careerOsRestoreCutoverStateSnapshot_()` helper for allowlisted non-secret runtime state. It requires `CAREER_OS_CUTOVER_RESTORE=ENABLED` and deliberately does not recreate triggers.

Before production mode:
1. confirm the previous source snapshot is recoverable;
2. confirm private runtime state backup is available;
3. rehearse restoration steps;
4. verify no destructive migration makes the old runtime unusable.

## Production cutover

Requires explicit user approval.

Then:
1. switch `CAREER_OS_ENVIRONMENT=production`;
2. configure the approved production processing scope;
3. re-enable required scanner/worker triggers;
4. verify runtime Git SHA/health;
5. monitor first production runs.

## Repo-first invariant

After cutover, all reusable code changes happen in `career-os`.

Apps Script remains a generated deployment/debug surface only.

A separate staging project remains optional for future high-risk experiments, not required for normal updates.
