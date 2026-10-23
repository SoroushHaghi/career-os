# Career OS Installation and Host Binding

Status: ACTIVE / v1
Updated: 2026-09-25

## Design goal

A user should not need to understand Career OS internals, choose the correct chat, or manually transfer state between agents.

The host environment only needs a small binding to:
1. the reusable Career OS framework;
2. the user's private Career Memory backend.

All detailed behavior remains version-controlled in the repositories.

## Required components

### 1. Framework repository

A public-safe Career OS repository containing:
- architecture;
- session bootstrap;
- role/capability/workflow registries;
- routing/persistence protocol;
- privacy/governance rules;
- reusable automation documentation/templates.

The upstream example is this repository. A user may also fork it.

### 2. Private memory repository

A private writable repository containing user-specific sanitized durable state.

Recommended logical name:
`career-memory`

Required entrypoint:
`START_HERE.md`

Recommended per-user operating defaults:
`SYSTEM/USER_OPERATING_PROFILE.md`

A reusable example is available at `templates/PRIVATE_OPERATING_PROFILE.example.md`.

The private backend should expose canonical state modules/workspaces and must not contain secrets or raw sensitive originals contrary to policy.

### 3. Host binding

The ChatGPT Project or other interactive host should contain only the minimal pointer in:
`templates/PROJECT_INSTRUCTIONS_MINIMAL.md`

The host binding identifies the framework and private backend repositories. It should not duplicate the full architecture prompt.

### 4. Connectors / permissions

For full automatic operation the runtime needs:
- read access to the framework repository;
- read/write access to the private backend repository;
- optional source connectors such as Drive only when a workflow needs them.

Automatic persistence is impossible if the runtime has no writable durable backend. That is an installation/configuration failure, not something solved by generating manual handoffs.

## Startup

A meaningful session:
1. loads the framework Session Bootstrap;
2. loads the private backend START_HERE;
3. routes the task;
4. reads only required canonical context;
5. executes through the appropriate runtime;
6. persists durable deltas automatically.

The user may organize chats by topic for convenience, but chat titles are not ownership boundaries.

## Upgrade model

System behavior should be upgraded by editing repository specifications, not by repeatedly rewriting every Project prompt.

The always-loaded Project instruction should remain stable unless:
- repository bindings change;
- the host/tooling changes;
- the bootstrap mechanism changes.

## Reuse by another person

A new user should be able to:
1. use or fork the framework repository;
2. create their own private Career Memory repository and fill a private operating profile from `templates/PRIVATE_OPERATING_PROFILE.example.md`;
3. connect both repositories to their host;
4. paste the minimal Project instruction with their two bindings;
5. work normally.

They should not need to know the internal Role/Router/Persistence architecture to use the system.

## Current limitation

The protocol can require automatic routing and persistence, but actual automation still depends on host capabilities and connector permissions. The framework must not claim a write happened when the host did not provide a writable backend.
