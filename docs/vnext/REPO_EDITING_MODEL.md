# Repo-First Editing Model

Status: ACTIVE
Updated: 2026-09-27

## Goal

Make Career OS easiest to change from one place: the public `career-os` repository.

The runtime must not become a second implementation branch.

## Canonical editing rule

All reusable behavior is authored, reviewed and tested in `career-os`.

Apps Script is a deployment target only.

No reusable behavior should exist only in:
- the Apps Script editor;
- a local-only script;
- a browser-local setting;
- an ad-hoc external service.

## Minimal external runtime surface

Target Apps Script project:

```text
Code.gs
appsscript.json
```

`Code.gs` is generated from repository source modules.

`appsscript.json` is version-controlled in the repository.

Private runtime values stay outside public Git:

```text
Script Properties
  API keys
  private IDs/config
  queue/cursor/runtime state
```

The objective is minimum unique code/state outside the repo, not minimum deployed byte count.

Do not introduce remote-code loading or a separate hosted backend only to make Apps Script physically smaller.

## Repository source layout

Target:

```text
apps/apps-script-runtime/
  src/
    compatibility/
    scanner/
    context/
    queue/
    drive/
    processors/
    providers/
    persistence/
    runtime/
  appsscript.json
  build tooling
  tests
```

The current `src/baseline.gs` is transitional compatibility source.

New behavior belongs in modules.

Existing baseline behavior should be extracted incrementally only after characterization tests protect it.

## Build model

```text
repo modules
  -> unit/contract/privacy tests
  -> deterministic bundle
  -> Code.gs
  -> Apps Script
```

Every generated runtime exposes its Git SHA/build identity.

## Runtime editing rule

After repo-driven deployment is active:

- do not manually edit production Apps Script as source of truth;
- emergency edits must be reconciled back to the repo immediately, but the preferred path is repo -> build -> deploy;
- rollback uses a known-good Git commit/tag plus private runtime configuration.

## Current migration rule

Until parity is proven:
- the existing production project remains untouched;
- the latest pre-vNext source is privately snapshotted in Career Memory;
- vNext is built/tested from the repo;
- production cutover requires explicit approval.


## GitHub-controlled deployment

Normal code deployment should also start in GitHub.

Target:
```text
career-os edit
  -> CI
  -> staging/production build profile
  -> GitHub Actions deployment
  -> existing Apps Script project
```

The Apps Script editor is not part of the normal development loop after the one-time deployment credentials are configured.

The repository now defines:
- a staging build profile with cutover diagnostics;
- a production build profile that excludes staging/cutover-only modules;
- a manual GitHub Actions runtime-deployment workflow using protected environment secrets.

See `docs/vnext/GITHUB_CENTRIC_OPERATING_MODEL.md`.
