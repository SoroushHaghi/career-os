# Career OS

Career OS is a **privacy-first shared context and evidence-processing framework for AI-assisted work**.

It addresses two practical problems:

1. **AI continuity** — different AI clients should be able to continue the same project without replaying the full conversation history or creating competing state stores.
2. **Evidence-to-knowledge** — heterogeneous sources such as audio, images, transcripts, documents, and notes should become structured knowledge without losing provenance, uncertainty, or conflicts.

The public repository contains reusable system logic, contracts, tests, automation code, and documentation only. **Real user data, private source material, credentials, and runtime state are intentionally excluded.**

## Core architecture

```text
AI clients / agents
        │
        │ bounded context bundles
        ▼
shared private state
  ├── interaction/event history
  ├── canonical current state
  ├── task ledger
  └── knowledge/evidence references
        │
        ▼
active source workspace
  ├── audio / images / documents / text
  ├── extraction / transcription
  ├── session synthesis
  └── cross-session knowledge
```

Career OS separates **reasoning** from **continuity**. The active AI client may perform inference; Career OS owns state, routing, provenance, coordination, and retrieval.

See:
- `docs/SHARED_AGENT_CONTEXT.md`
- `docs/ARCHITECTURE.md`
- `docs/MASTER_NOTES_CANONICAL_SPECIFICATION_v1.md`

## Evidence-to-knowledge pipeline

The implemented vNext work follows this model:

```text
source
  ↓
identity + content fingerprint
  ↓
privacy / authorization gate
  ↓
queue + retry-safe processing
  ↓
source-faithful evidence
  ↓
SESSION_SYNTHESIS
  ↓
cross-session reconciliation
  ↓
COURSE_KNOWLEDGE
```

The design preserves:
- source/version lineage;
- duplicate suppression;
- uncertainty;
- conflicting statements;
- model/provider metadata;
- verification state;
- separation between extracted evidence and inferred knowledge.

## Engineering highlights

Current vNext includes reusable implementations and tests for:

- source identity and content-version fingerprints;
- connector-independent core contracts;
- context resolution;
- privacy/authorization decisions;
- resumable and retry-aware processing;
- asynchronous queue workers;
- provider abstraction and free-tier fallback policies;
- provenance-aware evidence records;
- bounded retrieval bundles;
- session-level structured synthesis;
- selective verification;
- cross-session concept reconciliation and deduplication;
- stable lineage across regenerated knowledge artifacts;
- private operational task-ledger contracts;
- provider-neutral shared-agent context contracts;
- GitHub-driven Apps Script build/deployment profiles;
- public-tree and Git-history privacy checks.

## Runtime model

The current concrete runtime is Google Apps Script near Google Drive because it provides low-overhead event-driven source processing without requiring an always-on local machine.

The architecture itself is provider-neutral:

```text
external source
    ↓
adapter
    ↓
normalized source envelope
    ↓
processing core
    ↓
evidence / knowledge / private state
```

A new source system or AI client should integrate through an adapter rather than redefine identity, provenance, or state semantics.

## Public / private boundary

### Public: this repository

Allowed:
- reusable code;
- generic schemas and contracts;
- synthetic fixtures/tests;
- architecture and operating rules;
- deployment/build logic with no secret values.

Forbidden:
- personal contact details;
- private identifiers;
- private Drive IDs or URLs;
- credentials/tokens;
- raw CVs, transcripts, certificates, contracts, audio, images, or private generated notes;
- private task or conversation content;
- user-specific runtime state.

### Private backend

A separate private state store owns durable personal context and processed memory. Raw or sensitive source material remains in approved private source storage.

See `PRIVACY.md`.

## Repository entrypoint for an AI agent

A compatible client should:

1. read this README;
2. load `docs/SESSION_BOOTSTRAP.md`;
3. apply `docs/ROUTING_PROTOCOL.md` and `docs/SESSION_HARVEST_PROTOCOL.md`;
4. request only the private context needed for the current task;
5. work against bounded references instead of loading the entire history;
6. persist meaningful deltas to the private backend.

The public framework never contains the user's private memory.

## Status

Career OS is in **vNext stabilization**.

The repository contains substantial working framework/runtime components, but not every architectural target is production-complete. Runtime-dependent features are classified in `docs/IMPLEMENTATION_STATUS.md` as **WORKING**, **PARTIAL**, **PLANNED**, or **DEFERRED**.

Important boundary: a passing synthetic or staging test does **not** imply that a production deployment is enabled.

## Development

Requirements:
- Node.js 20+

Run the public test suite:

```bash
npm test
```

Run privacy checks:

```bash
npm run check:privacy
node scripts/privacy-history-check.mjs
```

Build the Apps Script runtime:

```bash
npm run build:apps-script
```

No private credentials or personal data are required to run the public tests.

## Design principles

1. **One canonical owner per durable fact.**
2. **Chats and agents are execution surfaces, not truth stores.**
3. **History remains recoverable; current state remains compact.**
4. **Evidence and inference stay distinct.**
5. **Unknown and conflicting information are preserved rather than silently repaired.**
6. **Provider/model choice is an adapter concern.**
7. **Idempotency and provenance are first-class.**
8. **Privacy boundaries are enforced before convenience.**
9. **Automation should remove repeated work, not create infrastructure for its own sake.**
