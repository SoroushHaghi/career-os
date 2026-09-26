# Career OS Operations Control Plane

Status: RECOMMENDED TARGET / v1
Updated: 2026-09-26

## Purpose

Career OS needs two different graph views that must not be conflated:

1. Knowledge Graph — concepts, sessions, sources, evidence, skills, learner state.
2. Operational/Data-Lineage Graph — connectors, processors, jobs, assets, retries, model/provider calls, derived artifacts and deployment state.

The first answers "what do I know and how is it related?"
The second answers "what is the system doing, what produced what, and where is it failing or slow?"

## Recommended orchestration layer

Use Dagster OSS as the primary data-pipeline orchestrator for the next architecture.

Why:
- Python-native;
- asset/data-lineage model fits source -> derivative -> synthesis pipelines;
- built-in UI for assets, lineage, runs, schedules, sensors, materializations and failures;
- versioning/caching model fits idempotent preprocessing;
- GraphQL/API access enables a later custom Career OS control-plane UI;
- code-first definitions remain version-controlled and testable.

Dagster is the operational graph, not the canonical knowledge graph.

## n8n role

n8n may be supported as an optional integration/edge-automation adapter:
- external API glue;
- webhook entrypoints;
- notifications;
- user-configurable low-code integrations.

Do not place canonical Career OS processing logic or knowledge state only in n8n workflows. Core processing should remain code-first and testable.

## Knowledge visualization

Obsidian is the recommended local-first human projection of the knowledge graph:
- generated Markdown;
- YAML properties;
- stable internal links/backlinks;
- local/global graph views.

Obsidian is not canonical storage. The canonical source/evidence/graph records remain in the private registry and durable Career Memory layers.

A public/private web knowledge map may use a force-directed graph such as react-force-graph-2d when presentation value matters.

## Custom Career OS Studio

Later, build a dedicated browser UI using React Flow.

It should read:
- Dagster run/asset lineage;
- source registry;
- knowledge graph;
- provider/connector registry;
- health/status events.

It can show live node status, retry/failure state, throughput, model/provider routing and editable non-secret configuration.

React Flow is a UI layer, not the workflow engine.

## Observability

Start with Dagster run/event metadata and structured application logs.

Add OpenTelemetry only when the runtime becomes distributed enough that cross-service traces/metrics materially help.

A later production observability stack may export OTel data to Grafana-compatible backends. Do not introduce Loki/Tempo/Prometheus before the complexity is justified.

## Repository and portability

Keep reusable code in the main `career-os` repository.

Recommended structure:

```text
career-os/
  apps/
    orchestrator/
    control-plane/
  packages/
    core/
    connectors/
    processors/
    providers/
    knowledge/
    obsidian-export/
  infra/
    docker-compose.yml
  .github/
    workflows/
```

Users clone the repository and provide their own:
- source connector credentials;
- AI provider keys;
- runtime configuration.

Secrets are never committed.

## CI/CD

CI is required now:
- formatting/lint;
- unit tests;
- type checks;
- schema/contract tests;
- processor fixtures;
- build validation.

CD should be controlled:
- development/local by Docker Compose;
- staging when needed;
- production deployment only after CI and an approval gate.

GitHub Actions environments should separate development/staging/production secrets and approvals.

## Migration from Apps Script

Treat the current Apps Script implementation as a working baseline, not the long-term orchestration core.

Target migration:
1. preserve current Drive change/fingerprint behavior;
2. move Drive ingestion behind a Python connector;
3. represent derived outputs as Dagster assets;
4. validate parity on real sessions;
5. keep Apps Script only as an optional thin Google-side adapter if it still provides a specific advantage;
6. retire manual Apps Script source editing.

## Live views

Recommended live surfaces:
- Dagster UI — pipeline state, runs, failures, lineage, schedules/sensors;
- Obsidian — knowledge graph and learner graph;
- GitHub Actions — CI/CD runs and deployment history;
- Career OS Studio (later) — unified custom control plane;
- optional n8n — edge integrations and user-authored API automations.
