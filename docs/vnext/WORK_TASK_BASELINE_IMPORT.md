# Work Task — Complete Apps Script Baseline Import

Status: READY
Branch: `vnext`

## Objective

Complete Phase 1 without changing the deployed production Apps Script.

The repository already contains:
- architecture/contracts;
- privacy checks;
- baseline audit manifest;
- safe import/build tooling;
- known-defect gate;
- tests/CI.

## Inputs

Use the latest current Apps Script source artifact supplied by the project/user.

Do not infer or recreate the source from docs when the source artifact is available.

## Procedure

1. Check out `SoroushHaghi/career-os` branch `vnext`.
2. Inspect the source for credentials, private URLs/IDs, user names, emails, filesystem paths and user-specific example labels.
3. Keep any needed sanitization values outside the public repository.
4. Run the repository import tool:
   `npm run import:apps-script -- <path-to-source.gs>`
   with `CAREER_OS_SANITIZE_TOKENS` supplied only in the private runtime when replacements are needed.
5. Run `npm test`, `npm run check:config`, `npm run check:architecture`, and `npm run check:privacy`.
6. Fix DEFECT-001 from `docs/vnext/KNOWN_BASELINE_DEFECTS.md` in the imported source, then rerun tests/checks.
7. Run `npm run build:apps-script`.
8. Verify the generated bundle has a Git-derived version header and no private values.
9. Commit only public-safe repository files to `vnext`.
10. Do not deploy to Apps Script and do not merge to `main`.

## Acceptance

- complete sanitized baseline exists at `apps/apps-script-runtime/src/baseline.gs`;
- import manifest records its checksum;
- known-defect CI gate passes;
- all vNext CI checks pass;
- repository build produces the Apps Script bundle;
- production remains unchanged.

## Stop gate

Stop after repository/build parity. Deployment is a separate explicit-approval step.
