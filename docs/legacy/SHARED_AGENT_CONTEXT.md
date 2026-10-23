# Shared Agent Context

Career OS treats AI clients as interchangeable executors around one persistent private state layer.

The goal is continuity: switching from one AI runtime to another should not require replaying an entire conversation history or re-explaining the current project.

## Model

```text
AI client A ─┐
AI client B ─┼── read bounded context bundle ──> work
AI client C ─┘                                  │
                                                ↓
                                      private event / task state
                                                │
                                                ↓
                                      distilled canonical state
```

The reusable framework remains public-safe. Private events, task content, user state, source material, and generated personal artifacts remain outside the public repository.

## Three private layers

### 1. Interaction / event history

An append-only event log preserves recoverability across runtimes. The public contract stores references and provenance, not private message text.

Typical event kinds:
- message;
- decision;
- status change;
- artifact creation;
- task update;
- observation.

History is not canonical truth by itself.

### 2. Canonical state

Current priorities, decisions, project status, evidence state, and next actions are distilled projections. Superseded history remains recoverable without forcing every new runtime to read it.

### 3. Task ledger

A shared task ledger prevents duplicate work across executors. A task records:
- stable task ID;
- executor;
- stage/status;
- dependencies;
- inputs/outputs;
- waiting reason;
- current action;
- result reference;
- timestamps.

The Apps Script runtime already maintains a private operational task ledger. The core contract in `packages/core/src/shared-context.mjs` provides a runtime-neutral representation for future clients.

## Context bundle

A new AI runtime should receive a small, task-scoped context package rather than the whole private repository.

A bundle contains:
- current objective;
- compressed current state;
- top priorities;
- active tasks;
- selected knowledge references;
- selected evidence references;
- a bounded set of recent event references.

The client may resolve only the references required for the current task.

## Privacy boundary

The public repository may contain:
- contracts;
- schemas;
- routing logic;
- synthetic tests;
- documentation.

It must not contain:
- private message bodies;
- real contact data;
- private source documents;
- private Drive identifiers;
- user-specific task state;
- credentials or runtime secrets.

## Provider independence

The shared-context layer does not require a central LLM API. Reasoning may happen inside whichever authorized AI client is currently in use. Career OS owns continuity, provenance, coordination, and retrieval.

This separation keeps the system useful even when model APIs are unavailable, rate-limited, or uneconomical.
