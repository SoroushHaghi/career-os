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