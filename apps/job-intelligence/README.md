# Career OS — Job Intelligence (prototype 0.1)

A public-safe, Python-standard-library job-discovery pipeline. Candidate-specific preferences and all private job state belong in `career-memory`, not this public repository. No applications or employer messages are sent.

## What works

- Sources: Arbeitnow public API, supported Greenhouse / Lever / Ashby boards, optional Personio XML feed (when available and permitted).
- Page-level atomic JSON state checkpoints; distinct source observations; stable identity including location; no Top-N truncation of underlying records.
- Conservative internship-only / seniority / language / duration / technical-fit screening; *unknown* duration is never treated as confirmed suitable.
- Optional Groq JSON-scoring via `GROQ_API_KEY`; otherwise deterministic, auditable rule-based ranking. Uses environment variables, not embedded credentials.
- Optional sync of **only the automation-owned `Inbox` tab** in a new, dedicated native Google Sheet. It does not write the prior manual application monitors.
- Unit tests for seniority, minimum duration, same title in separate cities, Top-N retention, persistence and retry.

## Start

```sh
python -m unittest apps/job-intelligence/test_engine.py
python apps/job-intelligence/engine.py discover --config /private/profile.json --state /private/jobs.json
python apps/job-intelligence/engine.py evaluate --config /private/profile.json --state /private/jobs.json
python apps/job-intelligence/engine.py report --config /private/profile.json --state /private/jobs.json
```

On a private `career-memory` GitHub Actions runner, commit `jobs.json` **after discovery and before evaluating**; commit again after evaluation. Keep `GITHUB_TOKEN` write scope limited to the private memory repo. Set `concurrency` to avoid overlapping workflows.

For Google Sheets sync, configure GitHub repository secrets `GOOGLE_SERVICE_ACCOUNT_JSON` (service account credential JSON) and `JOB_SHEET_ID` (the dedicated *new* Sheet only), and share the Sheet with the service account's email. The runner installs `gspread` and `google-auth` for export. Until configured, automated discovery may run, but Sheets will not update itself. Secrets are never stored in Git or Drive documents.

For Groq optional enhancement, configure `GROQ_API_KEY` and optionally `GROQ_MODEL`; availability, quotas, pricing and external-processing permission remain provider-dependent.

## Limitations / non-claims

- No claim of exhaustive Germany-wide coverage or real-time refresh. Sources have independent availability and platform limits.
- Generic Arbeitnow pages are an initial discovery source, not a high-recall Germany-wide internship crawler. Official employer boards require board IDs to be sourced and verified individually.
- No fully reliable vacancy closure detection until official-board verification adapters are added.
- JSON git-backed state works at modest scale. Consider a private managed database and event log if the collection becomes large; GitHub runners are ephemeral.
- Version 0.1 does not yet implement semantic query expansion, Gemini fallback, geodesic rings, reviewer feedback synchronization, user status reconciliation, production schema migrations or automatic company registry discovery. These are follow-up enhancements, not shipped claims.
- Before writing real candidate data, check private-memory policy and never publish sensitive fields or CVs to public code.

Project uses original independently authored code informed by the high-level architecture of other job automation projects; does not copy third-party code with unclear licenses.
