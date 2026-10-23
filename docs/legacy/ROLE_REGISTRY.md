# Career OS Role Registry

Status: ACTIVE / v1
Updated: 2026-09-25

## Purpose

Career OS is organized around a small set of durable responsibilities, not around chat pages, tools, vendors, or one-off agents.

A **Role** is a stable organizational owner.
An **Ability** is a reusable capability.
A **Workflow** is an ordered combination of abilities.
A **Task Session** is one execution of work.
An **Agent** is the runtime intelligence executing a task session.
A **Workspace** is contextual state for a continuing initiative.
A **Tab** is only a UI view and is never an authority boundary.

Roles are stable. Abilities and workflows may evolve. Task sessions and agents are disposable.

## Runtime independence

Any role or workflow may be executed through:
- Normal Chat — default interactive runtime;
- Work mode — heavier multi-step/browser/computer execution;
- Automation — scheduled or event-driven execution;
- Script/service — deterministic repeated execution.

Runtime choice must not change canonical ownership.

## Core roles

### 1. CONTROL & STRATEGY

Owns:
- goals and priorities;
- cross-domain decisions;
- sequencing and trade-offs;
- active-work overview;
- system health review;
- conflict resolution;
- stop/continue decisions;
- exact next actions when multiple domains compete.

Does not own:
- detailed candidate evidence;
- job records;
- CV text;
- project source code.

Typical abilities:
- prioritize;
- compare alternatives;
- perform decision gates;
- identify blockers;
- reconcile stale state;
- route work;
- review system health.

Typical workflows:
- weekly/daily review;
- major decision review;
- backlog triage;
- system revision;
- priority reset.

Canonical private state:
- `career-memory/SYSTEM/CONTROL_CENTER.md`
- `career-memory/SYSTEM/DECISION_LOG.md`

### 2. PROFILE & EVIDENCE

Owns canonical candidate truth:
- identity-safe professional profile;
- education;
- experience;
- projects as evidence;
- skills and evidence state;
- certificates;
- academic knowledge relevant to career;
- provenance for professional claims.

Does not own:
- public wording merely because it appears on a website;
- opportunity/company truth;
- application-specific document wording.

Typical abilities:
- extract evidence;
- verify/bound claims;
- classify skill state;
- reconcile source conflicts;
- update education/experience/project records;
- preserve provenance.

Typical workflows:
- evidence recovery;
- new-certificate processing;
- project-to-career-evidence promotion;
- skill-state review;
- CV-claim validation.

Canonical private state:
- `career-memory/MODULES/CAREER/`
- `career-memory/SOURCES/`

### 3. OPPORTUNITIES & NETWORK

Owns the external opportunity graph:
- companies;
- roles;
- job/internship postings;
- application status;
- contacts/recruiters;
- events and networking opportunities;
- deadlines and freshness;
- search/radar state.

Does not own:
- candidate truth;
- final CV/cover-letter artifacts;
- public portfolio representation.

Typical abilities:
- job discovery;
- posting extraction;
- company/contact research;
- freshness checks;
- opportunity fit analysis;
- deadline tracking;
- networking-context capture.

Typical workflows:
- opportunity discovery;
- shortlist review;
- application funnel tracking;
- recontact review;
- event/networking preparation.

Canonical private state:
- `career-memory/MODULES/RADAR/`
- relevant `career-memory/WORKSPACES/CAREER/`

### 4. APPLICATIONS & DOCUMENTS

Owns application representation and document production:
- public/master CV representation;
- opportunity-specific CV variants;
- cover letters;
- application briefs;
- application-document QA;
- interview preparation artifacts when application-specific.

Does not own:
- underlying candidate truth;
- opportunity truth;
- public website state.

Typical abilities:
- CV tailoring;
- cover-letter drafting;
- ATS/readability QA;
- application-brief generation;
- consistency checking;
- interview story packaging.

Typical workflows:
- job -> evidence mapping -> CV;
- application package generation;
- pre-send QA;
- interview preparation.

Canonical state/output:
- sanitized approved CV content in `career-memory/CV/`;
- opportunity-specific working outputs under the selected application workspace;
- final private rendered artifacts outside public repositories.

### 5. PORTFOLIO & PUBLIC PROFILE

Owns public representation:
- personal website;
- public project pages;
- GitHub portfolio presentation;
- LinkedIn positioning/content;
- public CV publication;
- cross-channel consistency.

Does not own:
- candidate truth;
- raw evidence;
- application status.

Typical abilities:
- website/project-page maintenance;
- public-copy drafting;
- GitHub repository presentation;
- LinkedIn alignment;
- link/QR validation;
- public-profile consistency checks.

Typical workflows:
- project evidence -> public portfolio;
- approved CV -> website synchronization;
- LinkedIn refresh;
- public release QA.

Canonical truth source:
- references Profile & Evidence and approved CV representation;
- public repositories/websites are outputs, not candidate-truth authorities.

### 6. PROJECTS & LEARNING

Owns capability development and project/learning continuity:
- active academic learning workspaces;
- personal technical projects;
- semester/course planning when career-relevant;
- skill-gap learning plans;
- turning learning into demonstrable artifacts;
- project closure and promotion of durable results.

Does not automatically own:
- a skill claim merely because a course was studied;
- final public representation;
- opportunity status.

Typical abilities:
- study/project planning;
- source synthesis;
- artifact design;
- gap-to-learning mapping;
- project scoping;
- completion/closure review.

Typical workflows:
- job gap -> learning plan;
- course -> artifact extraction;
- personal project execution;
- project closure -> evidence promotion.

Canonical private state:
- `career-memory/WORKSPACES/ACADEMIC/`
- `career-memory/WORKSPACES/PROJECTS/`
- `career-memory/PROJECTS/`

### 7. SYSTEMS & AUTOMATION

Owns Career OS itself:
- architecture;
- routing;
- automation;
- ingestion;
- storage policy;
- privacy/security boundaries;
- runtime health;
- backup/recovery;
- cost/quotas;
- scripts and deterministic tooling.

Does not own:
- career facts merely because a script processed them;
- external-action authority.

Typical abilities:
- workflow automation;
- monitoring;
- storage routing;
- health checks;
- backup/recovery;
- privacy classification;
- source ingestion;
- deterministic transformations.

Typical workflows:
- source ingestion;
- conditional monitoring;
- automation maintenance;
- privacy/cost audit;
- system migration;
- backup/restore verification.

Canonical state:
- reusable framework in `career-os/`;
- private runtime/system state in `career-memory/SYSTEM/`;
- secrets outside Git.

## Ownership rule

Every durable object has exactly one primary canonical owner.

A task may involve multiple roles, but routing must assign:
- one **Primary Role**;
- zero or more **Contributor Roles**.

Contributor roles may read or produce deltas for their own stores, but they must not create competing copies of primary-owned truth.

## Role-creation gate

Create a new core Role only if all are true:
1. it has a distinct durable responsibility;
2. it owns persistent state not naturally owned by an existing Role;
3. it has recurring workflows;
4. folding it into an existing Role creates a real ownership conflict.

Do not create core roles for:
- a chat;
- a tool/provider;
- one company;
- one course;
- one visit/event;
- one file type;
- one application;
- one website;
- one project.

Those are abilities, workspaces, sources, or task sessions.

## Examples

- `CV Builder` = workflow under Applications & Documents.
- `LinkedIn` = public channel under Portfolio & Public Profile.
- `Internship Search 2026` = workspace under Opportunities & Network.
- `Hannover Visit` = workspace/event routed across Profile & Evidence + Opportunities & Network + Projects & Learning.
- `GitHub` = tool/storage/publication channel, not a Role.
- `Email` = source/communication channel, not a Role.
