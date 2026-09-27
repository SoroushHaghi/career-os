# Apps Script Runtime

Status: BASELINE IMPORTED / PRODUCTION NOT REPLACED

Purpose: repository-owned source/build/deployment surface for the existing Google Apps Script scanner/queue runtime.

Milestone-1 rules:
- current deployed Apps Script remains the working production baseline until parity is proven and deployment is explicitly approved;
- canonical reusable source is now present in this repository;
- no secrets, private Drive IDs, queue dumps or user data are committed;
- runtime-specific private values are read from Script Properties or approved private config;
- generated bundles include a Git-derived build/version identifier.

## Current baseline state

The complete reusable Apps Script baseline is committed at:

`apps/apps-script-runtime/src/baseline.gs`

Integrity metadata is recorded in:
- `baseline-manifest.json`
- `baseline-import.json`

The public import passed privacy scanning. User-specific course examples were replaced with generic placeholders before import.

DEFECT-001, the image-queue status-helper mismatch, has been fixed in the repository baseline and is enforced by CI.

## Production boundary

The deployed Apps Script runtime has not been changed.

Repository source is now the canonical development baseline, but production cutover remains gated on:
1. repository build verification;
2. characterization/parity checks;
3. rollback verification;
4. explicit deployment approval.

Do not edit production Apps Script as a separate source of truth after repo-driven deployment is enabled.


## Repo-first editing model

The Apps Script project is a deployment target, not the canonical editing surface.

Canonical edits happen in `career-os`.

Target external runtime surface:

```text
Code.gs
appsscript.json
```

`Code.gs` is generated from repository modules. Private values remain in Script Properties.

The current `src/baseline.gs` is transitional compatibility source. New behavior should be added to repository modules, and legacy behavior should be extracted from the monolith incrementally under characterization tests.

See `docs/vnext/REPO_EDITING_MODEL.md`.
