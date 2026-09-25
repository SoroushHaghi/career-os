# Universal Routing Protocol

Status: ACTIVE / v1
Updated: 2026-09-25

## Purpose

Every meaningful Career OS request must follow the same lifecycle regardless of whether it arrives through Normal Chat, Work mode, automation, a script, Drive ingestion, a file upload, email-derived context, URL input, or a future interface.

The user should not need to know which chat, agent, or backend component owns the work.

## Core flow

```text
INPUT
  ↓
PRIVACY / SAFETY GATE
  ↓
INTAKE ROUTER
  ↓
DECISION GATE (when material)
  ↓
WORKFLOW + ABILITIES + RUNTIME
  ↓
EXECUTION
  ↓
PROMOTION ROUTER
  ↓
CANONICAL PERSISTENCE
  ↓
STATE / NEXT-ACTION CLOSEOUT
```

## 1. Privacy / safety gate

Before AI-heavy processing or persistence, determine whether the source is allowed for the proposed operation.

Rules:
- source detection is not blanket permission for AI processing;
- secrets, credentials, sensitive identifiers, banking/tax records, private keys, and excluded sensitive material must not be promoted into Career OS memory;
- raw sensitive originals remain outside public repositories;
- broad Drive automation must use explicit processing scope/allowlist before automatic provider submission;
- generated OCR/transcript text inherits the source privacy class until intentionally sanitized.

If privacy classification is ambiguous and the action could expose sensitive data, stop and request user direction.

## 2. Intake Router

Classify the task using deterministic rules first, semantic classification second.

The router produces:
- Task ID when durable tracking is useful;
- intent;
- source/runtime;
- Primary Role;
- Contributor Roles;
- relevant Workspace;
- required abilities;
- required canonical reads;
- proposed output destinations;
- external-action status;
- confidence / ambiguity flag.

### Primary Role

Exactly one Primary Role owns orchestration of the task.

### Contributor Roles

Zero or more Contributor Roles may participate when the task crosses ownership boundaries.

Example:
```text
Input: photos from a career-related university/lab visit

Primary Role: Profile & Evidence
Contributors:
- Opportunities & Network
- Projects & Learning

Possible outputs:
- durable professional evidence -> Profile & Evidence
- people/organizations/opportunities -> Opportunities & Network
- technical learning themes -> Projects & Learning
- public-worthy material -> Portfolio & Public Profile, only after review
```

## 3. Decision Gate

Do not accelerate a bad decision.

Run the gate before substantial time/cost/commitment when any of these applies:
- architecture/system change;
- paid subscription or infrastructure choice;
- major project start;
- large application batch;
- destructive migration/deletion;
- long learning commitment;
- public positioning change;
- ambiguous high-effort task.

Minimum questions:
1. What problem are we solving?
2. Why now?
3. What are the credible alternatives?
4. What evidence/condition would cause us to stop, change course, or defer?

The gate may conclude:
- EXECUTE;
- EXECUTE MINIMALLY;
- DEFER;
- REFRAME;
- REQUEST MISSING EVIDENCE.

## 4. Ability and workflow selection

Roles do not imply a specific tool.

Select reusable abilities such as:
- evidence extraction;
- web research;
- file inspection;
- OCR/transcription;
- GitHub read/write;
- CV drafting;
- job-fit analysis;
- monitoring;
- scheduling;
- state persistence.

A Workflow is an ordered combination of abilities.

Example:
```text
Opportunity Evaluation
posting extraction
→ freshness/gating check
→ evidence lookup
→ fit/gap analysis
→ strategy decision
→ optional application document workflow
```

## 5. Runtime selection

Normal Chat is the default interactive runtime.

Use another runtime only when materially useful:
- Work mode for substantial browser/computer/multi-step execution;
- Automation for scheduled or future-condition work;
- Script/service for deterministic repeated operations.

Runtime is an execution detail. It must not change role ownership, evidence policy, or persistence rules.

## 6. Task envelope

A task may be represented internally as:

```yaml
task_id: TASK-YYYY-NNNN
source:
  runtime: normal_chat
  input_type: files
intent:
  - extract_evidence
primary_role: PROFILE_EVIDENCE
contributors:
  - OPPORTUNITIES_NETWORK
workspace: optional_workspace_id
abilities:
  - inspect_source
  - extract_entities
  - classify_evidence
privacy: private_source
external_action: none
persist:
  source: external_private_storage
  durable_facts: career-memory
  opportunity_deltas: radar
```

This is internal routing metadata. The user does not need to author it.

## 7. Promotion Router

Execution output must be routed by ownership rather than left only in chat.

For every material output ask:
- Is this a durable fact?
- Is this evidence/provenance?
- Is this opportunity/company/contact state?
- Is this a decision?
- Is this workspace continuity?
- Is this a public representation change?
- Is this only ephemeral reasoning?

Examples:
- new verified skill evidence -> Profile & Evidence;
- new job deadline -> Opportunities & Network;
- approved CV wording -> Applications & Documents;
- website copy -> Portfolio & Public Profile;
- learning gap -> Projects & Learning;
- system rule -> Systems & Automation;
- cross-domain priority decision -> Control & Strategy.

Do not promote:
- unsupported inference as fact;
- source coverage as mastery;
- public copy back into candidate truth;
- transient chat commentary with no durable value.

## 8. Persistence closeout

A meaningful Task Session is not complete until it evaluates persistence.

Required closeout:
1. What durable state changed?
2. Which canonical owner stores it?
3. Was it actually persisted?
4. Did a workspace/current-state/next-action file become stale?
5. What is the exact next action?

If nothing durable changed:
`NO UPDATE REQUIRED`

Do not require the user to remember to ask for documentation.

## 9. Disposable-session rule

Chats and task sessions are execution surfaces, not authoritative memory.

A Career OS task is resilient only if archiving/losing the chat does not destroy material state.

Therefore:
- important facts/decisions/deltas must be promoted;
- source artifacts must remain in their approved stores;
- exact next actions for continuing work must live in workspace/control state;
- chat history is a secondary historical source, not canonical storage.

## 10. External actions

Routing may prepare an external action but does not grant authority for it.

Sending emails/messages, submitting applications, publishing content, changing public profiles/websites, making purchases, or destructive actions require the applicable explicit user approval.

## 11. Deterministic routing examples

Default rules:
- job/internship posting -> Opportunities & Network;
- CV/cover-letter request -> Applications & Documents + Profile & Evidence contributor;
- candidate certificate/transcript/project evidence -> Profile & Evidence;
- website/GitHub/LinkedIn public presentation -> Portfolio & Public Profile;
- academic/personal technical learning project -> Projects & Learning;
- Career OS script/storage/privacy/automation -> Systems & Automation;
- cross-domain prioritization or architecture choice -> Control & Strategy.

If a request spans multiple domains, choose one Primary Role and add contributors rather than creating a new Role.

## 12. Ambiguity handling

Ask the user only when ambiguity materially changes:
- privacy;
- external action;
- cost;
- destructive behavior;
- canonical ownership;
- factual correctness.

Otherwise route with the best-supported interpretation and keep the result reviewable.
