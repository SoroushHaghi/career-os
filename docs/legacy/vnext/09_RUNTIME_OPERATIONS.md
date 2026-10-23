# 09 — Repo-Centric Runtime, Operations and Observability

Status: APPROVED
Updated: 2026-09-27

## Goal

Make the public `career-os` repository the canonical home of Career OS system behavior so system changes are made through one version-controlled surface, while keeping personal data and secrets out of public Git.

Core rule:

```text
career-os = system source of truth
runtime targets = deployments of that source
career-memory / Drive = private data and durable user state
secret stores = credentials
```

Apps Script, future workers, dashboards and orchestration tools are runtime targets, not places where unique system logic should live.

## 1. What belongs in career-os

The repository should eventually contain all reusable system material:
- source code;
- schemas and contracts;
- routing and policy logic;
- processor logic;
- provider adapters without credentials;
- connector adapters without account-specific IDs;
- configuration schemas and public defaults;
- migration code;
- deployment/build scripts;
- tests and synthetic fixtures;
- CI/CD workflows;
- monitor/control-plane code;
- documentation and ADRs;
- generated-runtime build instructions.

If a behavior change matters to Career OS, its canonical implementation or specification should be reviewable in this repository.

## 2. What must not be public

Never commit:
- API keys/tokens/passwords;
- private Drive IDs/account mappings when user-specific;
- raw personal files;
- transcripts/medical/private identity data;
- private learner state;
- private career evidence/state;
- live queue payloads;
- real private registry snapshots;
- provider temporary authorization URLs.

These remain in private runtime storage, approved Drive content, `career-memory`, or secret stores.

## 3. Repository as control plane

Desired change workflow:

```text
edit / approve in career-os
  -> tests
  -> build/package
  -> deploy/sync to runtime
  -> runtime reports version/health
```

The user should not need to manually maintain a second copy of system logic in Apps Script or another UI.

## 4. Apps Script transition

Current Apps Script remains the working runtime during migration.

Target:

```text
career-os/apps/apps-script-runtime/
  source modules
  generated bundle/build target
  tests/fixtures
  deployment metadata without secrets
```

Rules:
- repository copy becomes canonical code;
- Apps Script editor becomes deployment/debug surface, not source of truth;
- protected private snapshot in career-memory becomes recovery/reference only after parity is proven;
- manual source editing in Apps Script is retired once repo-based deployment is reliable.

## 5. Configuration layering

Use four layers:

```text
1. public schema/defaults      -> career-os
2. private non-secret config  -> private runtime / career-memory reference
3. secrets                    -> runtime secret store / Script Properties
4. per-run state              -> runtime storage
```

Public repository may contain examples such as:

```text
config/schema.json
config/defaults.yaml
config/example.user.yaml
.env.example
```

but never the user's real secret/private values.

## 6. Runtime version identity

Every deployed runtime should expose a build/version identity derived from Git:

```text
git commit SHA
build version
schema version
processing profile versions
```

This allows the monitor to answer which repository revision is actually running.

## 7. Orchestration

Milestone 1 keeps the current scanner/worker trigger model.

Dagster/n8n/other orchestrators are optional future runtimes, not architectural dependencies.

If a future orchestrator is introduced:
- definitions/config live in career-os;
- it invokes domain/application contracts;
- it does not become canonical knowledge storage;
- replacing it does not change source/evidence IDs.

## 8. Observability contract

Every runtime should emit structured operational events:

```text
event_id
runtime_version
source/version ref when safe
job/processor
status
started/finished timestamps
attempt
provider/model when relevant
error category
retry_at?
artifact refs when safe
cost/quota class
```

Private source identifiers are not exposed to the public monitor.

## 9. Public vs private monitoring

### Public development monitor

May show:
- architecture/design stage;
- branch/commit;
- CI status;
- test status;
- deployment version;
- generic component health where privacy-safe.

Must not show:
- filenames from private Drive;
- personal topics/learner state;
- source IDs;
- private queue payloads;
- transcript/knowledge contents.

### Private operational view

May later show source/job details after authenticated/private access is available.

It should consume the same observability/read-model contracts rather than introducing separate logic.

## 10. Health model

Component health states:

```text
UNKNOWN
HEALTHY
DEGRADED
BLOCKED
FAILED
DISABLED
```

Health should be derived from events/state, not manually typed when runtime data exists.

## 11. GitHub Actions role

GitHub Actions should own repository automation such as:
- lint/format/schema validation;
- unit/contract tests;
- synthetic integration tests;
- public Pages build;
- build artifacts;
- later controlled deployment.

GitHub Actions is not the normal ingestion worker.

## 12. Deployment safety

Deployment should eventually follow:

```text
vnext change
  -> CI
  -> build
  -> synthetic tests
  -> optional real-environment smoke test
  -> approval gate for production runtime
  -> deploy
  -> verify deployed commit SHA
```

No direct production overwrite without a recoverable prior version.

## 13. Rollback

Rollback target is a Git commit/tag plus compatible private state.

Runtime deployments should be reproducible enough that:

```text
known good commit -> rebuild -> redeploy
```

without reconstructing code from Apps Script history or chat messages.

## 14. Repo-centric invariant

At steady state:

```text
To understand or modify system behavior:
  start with career-os.

To understand the user's private durable state:
  read career-memory as authorized.

To inspect raw/active source material:
  use the approved source system.
```

This satisfies one-repository system maintenance without publishing personal information.

## Stage 9 decision gate

Approve or change:
1. career-os becomes canonical source for all reusable system behavior;
2. runtime editors are deployment/debug targets, not unique code stores;
3. configuration schemas/defaults live in repo, private values stay private;
4. every runtime reports Git-derived version identity;
5. public monitoring is privacy-safe;
6. current Apps Script orchestration is retained for milestone 1;
7. deployment/rollback becomes Git-based.

After approval, Stage 10 defines UI projections and monitoring surfaces.