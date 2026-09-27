# GitHub-Centric Operating Model

Status: ACTIVE
Updated: 2026-09-27

## Goal

Make GitHub the primary development, control, release, and recovery surface for Career OS without reducing ingestion speed or introducing unnecessary infrastructure.

The target is GitHub-centric, not GitHub-only.

## North-star rule

If a reusable system behavior changes, the change starts in GitHub.

Normal maintenance should not require editing code or reusable configuration in Apps Script, Google Drive, a local machine, or another dashboard.

## Ownership

### `career-os`

Owns:
- reusable source code;
- schemas/contracts;
- deterministic routing/policy;
- provider/connector adapters without credentials;
- public-safe defaults;
- tests and synthetic fixtures;
- build/package logic;
- CI/CD workflows;
- deployment manifests;
- release metadata;
- operational documentation;
- public-safe monitoring.

### `career-memory`

Owns:
- private durable processed user state;
- private decisions/status/workspace continuity;
- private deployment references when appropriate;
- protected recovery snapshots that are safe to keep in GitHub.

### External services

Google Drive:
- active source/working storage;
- no reusable Career OS logic.

Gemini/provider APIs:
- compute providers only;
- no canonical system policy.

Apps Script:
- generated runtime adapter;
- no manual reusable-code authoring;
- may retain runtime secrets/private identifiers/cursors/queues where required.

## Why not GitHub Actions-only for the scanner

GitHub Actions remains the preferred CI/CD and manual-control runtime.

It is not the preferred low-latency Drive scanner for milestone 1 because scheduled Actions have a minimum five-minute interval and may be delayed under load.

The existing Apps Script time-driven trigger can run as frequently as every minute and executes under the user's Google authorization context.

Therefore keep the near-Drive trigger path while it provides a measurable latency/authentication advantage.

## Apps Script target

Apps Script should converge toward a thin generated runtime.

It may contain:
- the minimum scanner/worker entrypoints;
- Google-native Drive/trigger/Properties adapters;
- provider-call adapters where execution is still best colocated;
- generated build/version identity;
- minimal health/rollback hooks.

It should not contain:
- duplicated architecture/policy definitions;
- staging-only probes in production builds;
- migration/backfill code after migration is complete;
- documentation;
- manually maintained behavioral configuration;
- source-of-truth business logic that is absent from GitHub.

Physical line count is a secondary metric.

The primary metric is zero unique reusable logic outside GitHub.

## Configuration rule

Use these layers:

```text
career-os
  reusable behavior + public-safe defaults

GitHub workflow/environment configuration
  deployment target selection + release controls

Apps Script Script Properties
  secrets
  private source/runtime identifiers
  cursors / queues / mutable runtime state
```

A non-secret setting that changes reusable behavior should move to `career-os`.

Do not keep behavioral settings in Script Properties merely because they historically lived there.

## Deployment model

Normal change flow:

```text
edit career-os
  -> pull/branch review
  -> CI/tests/privacy gates
  -> deterministic Apps Script build
  -> release manifest / Git SHA
  -> GitHub-controlled deployment
  -> runtime health/version verification
```

After the one-time deployment authentication is configured, normal code updates should not require manual copy/paste into Apps Script.

Production deployment remains approval-gated.

## Performance rule

Do not move work away from Apps Script solely to make the deployed file visually smaller.

Move a runtime responsibility only if at least one of these is true:
- Apps Script execution limits materially block the workload;
- another runtime gives a clear latency/reliability improvement;
- authentication becomes simpler/safer;
- testing/deployment becomes materially easier;
- the operational dependency cost is lower than the benefit.

## Production build profiles

Use separate generated profiles:
- `staging`: includes cutover diagnostics/probes;
- `production`: excludes staging/cutover/migration-only modules.

Both are produced from the same repository source and tests.

## Development experience target

A normal future change should look like:

1. edit one or more files in `career-os`;
2. run/observe CI;
3. trigger/approve deployment from GitHub;
4. verify runtime version/health.

No Apps Script editor work should be required for ordinary development.

## Current migration

The existing Apps Script trigger is currently frozen.

Do not cut over merely to satisfy a line-count goal.

Next engineering work:
1. classify runtime modules as production-required vs staging/migration-only;
2. add production/staging build profiles;
3. add GitHub-controlled deployment to the existing Apps Script project;
4. preserve one-time external setup only for credentials/private runtime state;
5. run in-place staging parity;
6. restore production trigger only after approval.
