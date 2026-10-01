# Apps Script Runtime

Status: MODULAR REPO SOURCE / PRODUCTION NOT REPLACED

Purpose: repository-owned source/build/deployment surface for the Google Apps Script scanner/queue runtime.

## Canonical source

All reusable Apps Script behavior is now authored under:

`apps/apps-script-runtime/src/modules/`

The transitional monolithic `src/baseline.gs` has been retired after exact behavior-preserving extraction into modules.

Historical import provenance remains in:
- `baseline-manifest.json`
- `baseline-import.json`

The protected latest pre-vNext source remains privately recoverable in Career Memory.

## Editing model

Normal changes happen only in `career-os`.

The Apps Script editor is a generated deployment/debug surface, not a source-of-truth editing surface.

Target deployed project:

```text
Code.gs
appsscript.json
```

`Code.gs` is generated from the recursively ordered repository modules.

Private values remain outside public Git in Script Properties/private runtime storage.

## Module layout

Current source areas include:
- config;
- scanner/intake;
- context/workspace compatibility;
- queue/runtime control;
- Drive transport/helpers;
- image/audio/PDF/text processors;
- Gemini/provider transport and retry policy;
- artifact/manifest/status persistence;
- runtime health/diagnostics;
- vNext bridge/staging probes.

Function uniqueness, bundle syntax, privacy, known defects, shadow behavior and the two-file deployment surface are enforced in CI.

## Production boundary

The deployed production Apps Script has not been changed.

Before in-place cutover:
1. snapshot private Script Properties/runtime state and installed triggers;
2. disable production triggers;
3. deploy the repo-built package to the existing project in restricted staging mode;
4. run non-destructive and scoped live parity;
5. verify rollback;
6. require explicit user approval before production mode/triggers are restored.

See:
- `docs/vnext/REPO_EDITING_MODEL.md`
- `docs/vnext/APPS_SCRIPT_IN_PLACE_CUTOVER.md`
