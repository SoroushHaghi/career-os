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
`load approved opportunity + evidence -> application brief -> tailor_cv -> optional draft_cover_letter -> application_qa -> render_document -> closeout_task`

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
`privacy gate -> ingest_source -> fingerprint -> extract/OCR/transcribe if approved -> provenance manifest -> Promotion Router -> closeout_task`

Boundary:
Mechanical extraction remains separate from semantic career promotion.

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

## Workflow rule

Create a new Workflow when a sequence recurs and benefits from a stable contract. Do not create a Workflow for a one-off task that can be expressed as an existing Role + capabilities.
