# Career OS Workflow Registry

Status: ACTIVE / v1
Updated: 2026-09-25

## Purpose

A Workflow is an ordered, repeatable combination of capabilities across one Primary Role and optional Contributor Roles.

Workflows are reusable operating patterns, not dedicated chat pages.

## WF-001 — Opportunity Evaluation

Primary Role: Opportunities & Network
Contributors: Profile & Evidence; Control & Strategy when a material trade-off exists

Flow:
`extract_posting -> check_freshness -> analyze_fit -> identify_gates/gaps -> decision_gate if needed -> track_opportunity -> closeout_task`

Output:
- current opportunity state;
- fit/gap assessment;
- exact next action;
- no application document unless the opportunity proceeds.

## WF-002 — Application Package

Primary Role: Applications & Documents
Contributors: Profile & Evidence; Opportunities & Network

Flow:
`load approved opportunity + evidence + applicable canonical standards -> map requirements to evidence/gaps -> application brief -> tailor_cv -> optional draft_cover_letter -> application_qa -> render + visual QA -> standard-candidate capture -> closeout_task`

Boundary:
No submission/send/publication without explicit authorization.

## WF-003 — Career Evidence Promotion

Primary Role: Profile & Evidence
Contributors: Projects & Learning when source is academic/project work

Flow:
`inspect_source -> extract_evidence -> classify_evidence_state -> verify_claim -> promote_evidence -> closeout_task`

Boundary:
Course exposure does not automatically become demonstrated skill.

## WF-004 — Project / Course to Portfolio Evidence

Primary Role: Projects & Learning
Contributors: Profile & Evidence; Portfolio & Public Profile

Flow:
`inspect_source -> extract_course_artifact or close_project -> verify deliverable -> promote_evidence -> optional maintain_project_page -> public_release_qa -> closeout_task`

Boundary:
Do not create filler projects merely to populate a CV.

## WF-005 — Public Profile Synchronization

Primary Role: Portfolio & Public Profile
Contributors: Profile & Evidence; Applications & Documents

Flow:
`load approved candidate truth/representation -> update_public_copy -> consistency check -> public_release_qa -> explicit publication approval -> closeout_task`

Boundary:
Website/LinkedIn/public CV never become candidate-truth sources by themselves.

## WF-006 — Source Ingestion

Primary Role: Systems & Automation
Contributors: destination Role determined after extraction

Flow:
`privacy gate -> ingest_source -> normalize/register -> preprocess_source by media type -> enrich_source -> index_source -> staged knowledge artifacts -> Promotion Router -> closeout_task`

Boundary:
Automatic preprocessing and semantic staging are allowed only for approved processing scope. Source-faithful extraction remains distinguishable from AI inference, and canonical career promotion remains evidence-gated.

## WF-007 — Career OS Decision Review

Primary Role: Control & Strategy
Contributors: any affected Roles

Flow:
`define problem -> collect minimal state -> alternatives -> decision_gate -> choose/record decision -> route resulting tasks -> closeout_task`

Use for:
- subscriptions/infrastructure;
- architecture changes;
- major project starts;
- competing priorities;
- expensive/long commitments.

## WF-008 — Conditional Monitor

Primary Role: Systems & Automation
Contributor: domain owner of the monitored condition

Flow:
`define source/condition/cadence -> privacy/auth review -> monitor_condition -> compare state -> trigger approved notification/action -> log health/state -> closeout when condition resolves`

Boundary:
Monitoring authority does not automatically grant authority to message/send/publish.

## WF-009 — Control Review

Primary Role: Control & Strategy

Flow:
`read CONTROL_CENTER -> reconcile_state -> inspect deadlines/blockers -> prioritize_work -> update exact next actions -> closeout_task`

Purpose:
Keep system state current without requiring the user to manually remember every workspace.


## WF-010 — Standard Promotion

Primary Role: Systems & Automation
Contributor: the domain Role that owns the work being standardized

Flow:
`detect recurring pattern -> gather supporting corrections/artifacts -> classify scope -> find canonical standard owner -> compare existing standard -> promote durable delta -> record conflicts/anti-rules -> closeout_task`

Use for:
- turning repeated successful work into a reusable operating rule;
- recovering standards from older chats;
- preserving user-specific preferences without leaking them into the public framework;
- preventing each new chat from reconstructing the same workflow from scratch.

Boundary:
A one-off choice is not automatically a standard. Generic framework rules, user-specific preferences, canonical facts, task-specific decisions, and raw artifacts must remain in their separate owners. Follow `docs/STANDARD_PROMOTION_PROTOCOL.md`.


## WF-011 — CV Freshness & Publication

Primary Role: Applications & Documents
Contributors: Profile & Evidence; Portfolio & Public Profile; Systems & Automation

Trigger:
A canonical career-evidence delta is promoted and may affect the master CV.

Flow:
`career evidence delta -> signal_cv_freshness -> assess_cv_impact -> NO_CV_CHANGE or refresh_master_cv -> render_document -> application_qa + visual QA -> explicit user approval -> single release transaction (sync_current_cv + publish_current_cv fan-out) -> verify downstream state -> closeout_task`

Boundary:
- raw/unverified source changes do not directly rewrite the CV;
- every new evidence item is evaluated for materiality rather than appended automatically;
- no approved master, Drive current pair, or website `/cv` replacement occurs without explicit user approval;
- the same approved PDF must feed the Drive current master and website `/cv`;
- a dedicated persistent CV Builder worker is not required.

See `docs/CV_FRESHNESS_PROTOCOL.md`.

## Workflow rule

Create a new Workflow when a sequence recurs and benefits from a stable contract. Do not create a Workflow for a one-off task that can be expressed as an existing Role + capabilities.
