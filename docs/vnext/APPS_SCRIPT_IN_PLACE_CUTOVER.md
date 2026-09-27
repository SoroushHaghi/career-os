# Apps Script In-Place Cutover Runbook

Status: ACTIVE TARGET PATH
Updated: 2026-09-27

## Goal

Use the existing Career OS Apps Script project as the vNext runtime while keeping all reusable code, configuration defaults, tests, builds, and deployment control in `career-os`.

GitHub Actions deploys generated source to Apps Script. Do not maintain or paste a separate source loader in the Apps Script editor.

## Preconditions

Do not replace the runtime until repository CI/build checks pass.

Before staging deployment:
- preserve the current source snapshot and required private runtime-state backup;
- confirm the intended target Apps Script project ID;
- confirm the scanner and worker triggers are disabled;
- preserve Script Properties, Drive page cursor, queues, and source/artifact metadata;
- keep provider/live-test gates disabled;
- confirm rollback material is available.

Secrets remain outside Git.

## One-time GitHub deployment connection

Configure the GitHub environment `career-os-staging` with:

```text
APPS_SCRIPT_PROJECT_ID = intended Apps Script project ID
CLASPRC_JSON = clasp OAuth credential JSON
```

Enable the Apps Script API for the Google account/project used by clasp. Keep the Gemini key and all private Drive identifiers in Apps Script Script Properties, never GitHub.

In the target project's Script Properties, set:

```text
CAREER_OS_ENVIRONMENT=staging
```

Do not reset the Drive watcher baseline or clear existing queue/runtime state.

## Deploy from GitHub

From `SoroushHaghi/career-os`:

1. Open Actions → **Apps Script Runtime Deploy**.
2. Select branch `vnext`.
3. Choose target `staging`.
4. Wait for tests, privacy/configuration checks, build validation, and `clasp push` to complete.

The workflow deploys only the generated `Code.gs` and `appsscript.json`. The deployed code reports its Git SHA. Do not copy/paste source into Apps Script manually.

The staging profile is a guarded in-place runtime. Keep triggers disabled until the non-destructive checks and scoped parity/rollback gates pass.

## Non-destructive validation

Run these public top-level Apps Script commands in order:

1. `getCareerOsBuildInfo()` — verify the expected Git SHA and staging build profile.
2. `runCareerOsCutoverPhase1()` — create the non-secret state snapshot and run the shadow self-test. This must fail closed if any trigger is installed or provider work is enabled.
3. `runCareerOsVnextStagingConfigProbe()`.
4. `runCareerOsVnextStagingMetadataProbe()`.
5. Run `runCareerOsVnextStagingRegistryProbe()` to create the guarded registry projection.

These checks must not scan Drive, mutate triggers, write generated artifacts, or invoke Gemini.

## Scoped live parity

Live-provider work is a separate staging step. Keep it disabled until the non-destructive checks pass and the selected test scope is confirmed.

Then validate, one source at a time:
- image OCR;
- audio transcription/navigation;
- PDF path when selected;
- resolved and intentionally unclassified context handling;
- registry projections;
- queue deduplication, retries, idempotency, and sidecar safety.

Do not enable production triggers during this phase.

## Rollback and production release

Before production:
- confirm the previous source snapshot and private runtime-state backup are recoverable;
- rehearse restoring the prior source/state;
- verify staging behavior and performance;
- verify the exact production project/credentials/environment target.

Production deployment and trigger restoration require separate explicit user approval. After approval, deploy the production profile from GitHub, set `CAREER_OS_ENVIRONMENT=production`, restore the approved scanner trigger cadence, verify build SHA/health, and monitor the first runs.

## Repo-first invariant

After cutover, reusable behavior changes only in `career-os`:

```text
edit repo -> CI -> build -> GitHub deploy -> verify Apps Script build identity
```

Apps Script remains the execution runtime; GitHub remains the development and release control center.
