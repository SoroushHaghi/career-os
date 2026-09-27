# Apps Script Staging Runbook

Status: READY FOR ONE-TIME GITHUB DEPLOYMENT SETUP
Updated: 2026-09-27

## Purpose

Deploy and validate repository-built Career OS code in the existing Apps Script project under a guarded staging profile, then decide separately whether to restore production operation.

The existing Apps Script execution path remains in place for low-latency Drive scanning and processing. GitHub builds and deploys the runtime; Apps Script executes the generated bundle. Do not load source dynamically from GitHub on each trigger run.

## Current migration boundary

- The existing project is the deployment target for the controlled in-place staging phase.
- The pre-vNext Apps Script source remains recoverable in private Career Memory.
- Triggers must remain disabled during source replacement and non-destructive staging probes.
- Production mode and trigger restoration require a separate explicit approval after staging parity and rollback checks.
- The production profile excludes staging and cutover-only modules.

## One-time GitHub deployment connection

The active workflow is:

`.github/workflows/apps-script-runtime-deploy.yml`

Run it from branch `vnext` with target `staging`. It builds, tests, validates, and pushes the staging bundle to the Apps Script project selected by the protected `career-os-staging` environment.

Configure these GitHub environment secrets under `career-os-staging`:

```text
APPS_SCRIPT_PROJECT_ID = target Apps Script project ID
CLASPRC_JSON = clasp OAuth credential JSON
```

The same secret names may exist in the separate `career-os-production` environment for a later production release. Keep the two environments mapped to the intended project and use environment protection for production.

Do not paste OAuth tokens, API keys, or private IDs into chat or commit them to Git. Do not store Gemini credentials in GitHub Actions; they remain in Apps Script Script Properties.

After these secrets are configured, ordinary code changes follow:

```text
edit career-os -> CI -> run Apps Script Runtime Deploy (staging) -> verify build and probes
```

No Apps Script source paste or remote-code loader is part of this flow. The workflow deploys the generated `Code.gs` and `appsscript.json`; Apps Script then runs them directly, with no GitHub fetch added to each scan.

## Staging configuration and non-destructive validation

Before deployment, set `CAREER_OS_ENVIRONMENT=staging` in the target project's Script Properties. Preserve all existing secret and runtime-state properties. Do not reset the Drive cursor or clear queues.

After the workflow completes, run these public commands in order:

1. `getCareerOsBuildInfo()` — confirm the reported Git SHA and staging profile.
2. `runCareerOsCutoverPhase1()` — create the non-secret state snapshot and run the shadow test; this requires no installed triggers and keeps provider work disabled.
3. `runCareerOsVnextStagingConfigProbe()`.
4. `runCareerOsVnextStagingMetadataProbe()`.
5. Run the guarded registry projection probe if the previous probes pass.

The metadata probe must remain read-only: it must not create artifacts, install triggers, or call Gemini.

Keep `CAREER_OS_STAGING_LIVE_PROVIDER_TEST` unset or disabled during these steps. Real image/audio/PDF parity is a later, explicitly gated staging test. Production triggers remain disabled throughout staging.

## Completion gates

Before production operation can resume:

- scoped image/audio/PDF and context-resolution parity passes;
- retry, idempotency, and registry behavior are checked;
- rollback is rehearsed against the preserved source and runtime-state snapshot;
- the user explicitly approves production deployment and trigger restoration.

A passing repository CI run or staging build alone does not authorize production deployment.
