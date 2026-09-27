# Apps Script Runtime Modules

This directory is the preferred editing surface for reusable Apps Script runtime behavior.

The build recursively loads `**/*.gs` files in deterministic path order and emits one generated `Code.gs` for deployment.

## Target layout

```text
modules/
  10_scanner/
  20_context/
  30_queue/
  40_drive/
  50_processors/
  60_providers/
  70_persistence/
  80_runtime/
  90_bridge/
```

Numeric prefixes make bundle order explicit where Apps Script global-scope compatibility requires it.

## Rules

- New behavior goes into modules, not `../baseline.gs`.
- `baseline.gs` is transitional compatibility source.
- Extract legacy functions only after characterization tests protect their behavior.
- Do not duplicate a function in both baseline and modules.
- Keep provider-specific mechanics out of core/context/persistence modules.
- Keep credentials and private IDs out of source.
- The deployment target is generated; do not hand-edit deployed `Code.gs` as canonical source.

## Extraction sequence

For each legacy area:

1. identify the functions and dependencies;
2. add/confirm characterization tests;
3. move the functions into the correct module;
4. remove them from `baseline.gs`;
5. build and run CI/shadow tests;
6. verify the generated bundle remains behaviorally equivalent.

The final goal is to retire `baseline.gs` completely while keeping the external Apps Script package to `Code.gs` + `appsscript.json`.
