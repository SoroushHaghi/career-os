# Career OS Session Harvest Protocol

Status: ACTIVE / v1
Updated: 2026-09-25

## Purpose

Make every meaningful Career OS chat self-harvesting.

A chat is an execution surface, not memory. New information that matters should be extracted from the live conversation and promoted automatically to the private Career Memory backend without requiring the user to say "save this" or manually transfer context.

This protocol complements the Universal Routing Protocol. Routing decides who owns the work; harvesting decides what durable information must not be lost.

## New-session detection

On the first meaningful request in a conversation:

1. If the current conversation has no active Career OS session binding/bootstrap state, treat it as a **NEW TASK SESSION**.
2. Load the normal Session Bootstrap and private START_HERE.
3. Inspect the current conversation content available to the runtime, not only the latest user message.
4. Harvest any durable Career OS deltas already present in the conversation and not yet represented canonically.
5. Route those deltas to their canonical owners before or alongside the current task when safe.

Do not require the user to identify the correct Role, workspace, or storage destination.

If the host exposes a stable conversation/session identifier, it may be used for provenance. If not, do not invent one as authoritative identity; use normal source/date/context provenance instead.

## Continuous harvest

Do not wait for an explicit session close.

After each meaningful user turn, and before the assistant's final response when durable state may have changed:

1. run the Required Capture Pass;
2. run the Agent Insight Pass;
3. compare candidates against canonical state;
4. persist only meaningful deltas;
5. refresh affected workspace/current-state/next-action files when needed.

This makes abrupt chat abandonment safer: important state should already have been promoted.

## Two-pass extraction

### Pass A — Required Capture Pass

The model must explicitly check all applicable categories below even if they are not the points it would naturally choose to summarize.

Capture when present:

- **Facts** — new user-confirmed or source-supported facts.
- **Decisions** — choices, approvals, rejections, changed strategy, stop/continue decisions.
- **Status changes** — submitted, rejected, completed, passed, failed, pending, blocked, active, closed, deprecated, superseded.
- **Dates and deadlines** — exact dates, windows, expected response dates, event dates, application deadlines.
- **Entities** — companies, institutes, projects, courses, people/contacts when appropriate and privacy-safe.
- **Artifacts and sources** — files, repositories, URLs, certificates, transcripts, project pages, evidence locations.
- **Evidence claims** — what a source supports, contribution scope, evidence state, limitations, conflicts.
- **Commitments** — things the user has agreed to do, attend, submit, build, reply to, or review.
- **Constraints and preferences** — location, timing, language, role scope, cost, privacy, availability, user workflow preferences.
- **Risks and blockers** — missing evidence, eligibility constraints, stale posting, deadline pressure, privacy concern, technical blocker.
- **Open questions** — unresolved items that materially affect the next decision.
- **Next actions** — exact next step, owner/workspace, and dependency where known.
- **System/workflow deltas** — new Career OS operating rules, routing defects, automation requirements, architecture decisions.

Unknown stays unknown. Do not fill missing required fields with guesses.

### Pass B — Agent Insight Pass

After the required capture, the executing model may add useful observations it considers important, such as:
- patterns across applications;
- strategic implications;
- likely duplicate work;
- emerging skill themes;
- quality concerns;
- suggested reframing;
- potential cross-role connections.

Agent-originated observations must be clearly separated from source/user facts and stored as INFERRED, recommendation, or analysis unless later confirmed.

The Required Capture Pass prevents omission.
The Agent Insight Pass preserves model judgment and serendipitous value.

## Role-specific capture overlays

Use the generic pass above plus the applicable Role overlay.

### Profile & Evidence

Check:
- proposed claim;
- evidence/source;
- contribution scope;
- evidence state;
- limitations/exclusions;
- dates/version where relevant;
- whether the delta changes CV/portfolio eligibility.

### Opportunities & Network

Check:
- company/organization;
- role/opportunity/event;
- posting/requisition ID;
- location;
- deadline/freshness;
- status;
- contacts;
- gating constraints;
- source;
- exact next action.

### Applications & Documents

Check:
- target opportunity;
- artifact type/version;
- approved positioning/claims;
- excluded or unresolved claims;
- QA issues;
- external-action approval state;
- sent/submitted status only when explicitly confirmed.

### Portfolio & Public Profile

Check:
- channel/destination;
- source evidence;
- approved public wording/state;
- links/assets;
- publication approval state;
- consistency impacts.

### Projects & Learning

Check:
- project/course/workspace;
- current stage;
- artifact/deliverable;
- demonstrated vs academic/developing state;
- blockers;
- evidence-promotion candidate;
- exact next action.

### Control & Strategy

Check:
- decision being made;
- alternatives considered;
- rationale;
- priority/urgency;
- dependencies;
- stop/change conditions;
- affected workstreams.

### Systems & Automation

Check:
- automation/system objective;
- trigger/cadence;
- runtime;
- input scope;
- privacy boundary;
- output/action;
- external-action authority;
- implementation/health state;
- cost/quota/dependency;
- next engineering action.

## Persistence policy

Do not store a verbatim dump of every chat by default.

Persist:
- canonical facts to their owning module;
- operational continuity to the relevant workspace;
- decisions to the decision owner/log;
- important cross-cutting system events to the event log when useful;
- source/provenance references where needed.

Avoid:
- duplicate summaries of information already canonical;
- transient emotional/reaction text unless it materially affects a decision or workflow;
- speculative claims as fact;
- raw sensitive content prohibited by policy;
- copying whole conversations merely for completeness.

The goal is **information preservation, not chat archival**.

## Conflict and duplicate handling

Before writing:
1. search/read the relevant canonical record;
2. compare the new candidate delta;
3. append/update only what is new or changed;
4. if authoritative information conflicts, surface and record the conflict rather than silently overwriting;
5. preserve evidence state and provenance.

Repeated mention of an unchanged fact is not a new memory delta.

## Persistence priority

When a turn contains many deltas, persist in this order:

1. external commitments / submitted actions / deadlines;
2. decisions and status changes;
3. evidence and claim-boundary changes;
4. blockers and exact next actions;
5. durable preferences/constraints;
6. useful inferred strategic observations.

## User-facing behavior

Harvesting should normally be silent.

Do not clutter ordinary replies with:
- routing metadata;
- memory bookkeeping;
- "I saved X" confirmations for every turn.

Mention persistence only when:
- the user asks;
- a write fails;
- a material conflict needs confirmation;
- persistence itself is the task.

## Limitations

This protocol governs information visible to the executing runtime.

It cannot retroactively read arbitrary other chats that the host does not expose. Reliability comes from requiring every Career OS chat to harvest its own meaningful deltas continuously from now on.
