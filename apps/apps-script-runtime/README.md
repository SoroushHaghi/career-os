# Apps Script Runtime

Status: SCAFFOLD / NO PRODUCTION REPLACEMENT YET

Purpose: repository-owned source/build/deployment surface for the existing Google Apps Script scanner/queue runtime.

Milestone-1 rules:
- current deployed Apps Script remains the working baseline until parity is proven;
- canonical reusable source moves here before refactoring;
- no secrets, private Drive IDs, queue dumps or user data are committed;
- runtime-specific private values are read from Script Properties or approved private config;
- future generated bundle must include a Git-derived build/version identifier.

Next: import and privacy-audit the protected current Apps Script source, then add characterization tests before architectural refactoring.

## Current baseline import state

The current reusable Apps Script baseline has been privacy-audited and recorded in `baseline-manifest.json`.

The full sanitized source is not yet committed because the current tool safety gate blocked the large source write. No partial baseline fragments are retained.

This is a tooling blocker only. The deployed Apps Script baseline has not been changed.

Until the full source import succeeds:
- do not treat this directory as a deployable replacement;
- continue using the existing production Apps Script runtime;
- use the repository for contracts/tests/new modules only.
