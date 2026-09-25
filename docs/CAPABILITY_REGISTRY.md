# Career OS Capability Registry

Status: ACTIVE / v1
Updated: 2026-09-25

## Purpose

Capabilities are reusable abilities that Roles and Workflows may invoke. They are not organizational owners and they are not tied to one runtime/provider.

A capability may be executed through Normal Chat, Work mode, an automation, or a deterministic script depending on the task.

## Capability groups

### Reasoning & control
- `route_task` — classify intent, Primary Role, Contributor Roles, workspace and required context.
- `decision_gate` — test whether a material task should execute, defer, reframe or request evidence.
- `prioritize_work` — order active work using goals, deadlines, risk, cost and dependency.
- `reconcile_state` — detect stale/conflicting state and restore one canonical view.
- `harvest_session` — extract required durable fields plus additional model insights from the live conversation and route meaningful deltas to canonical storage.
- `closeout_task` — identify durable deltas, persist them, update next actions or record no update.

### Evidence & knowledge
- `inspect_source` — read source material without silently filling gaps.
- `extract_evidence` — identify career-relevant facts/deliverables from source material.
- `classify_evidence_state` — VERIFIED/DEMONSTRATED/USER_CONFIRMED/ACADEMIC_KNOWLEDGE/DEVELOPING/PLANNED/INFERRED/UNVERIFIED.
- `verify_claim` — compare a proposed claim against supporting evidence.
- `reconcile_sources` — resolve or surface conflicts between sources by authority rules.
- `promote_evidence` — move a supported durable conclusion into its canonical Career Memory owner.
- `extract_entities` — identify relevant people, organizations, topics, dates and artifacts.

### Opportunity & network
- `discover_opportunities` — find relevant roles/events/contacts.
- `extract_posting` — structure responsibilities, qualifications, constraints and deadlines.
- `check_freshness` — verify that a posting/opportunity remains current.
- `analyze_fit` — map role requirements to demonstrated evidence and gaps.
- `track_opportunity` — update canonical opportunity/application status.
- `prepare_network_context` — organize bounded context for a contact/event/recontact.

### Documents & applications
- `draft_cv` — generate evidence-grounded CV content from approved candidate truth.
- `tailor_cv` — adapt representation to a specific opportunity without upgrading evidence.
- `draft_cover_letter` — produce role-specific letter when useful/required.
- `application_qa` — validate role/company/requisition/dates/claims/links/artifact consistency.
- `prepare_interview` — package supported stories, technical evidence and gaps for interview use.
- `render_document` — create final application artifact through an approved rendering path.

### Portfolio & public profile
- `update_public_copy` — draft public-facing representation from approved truth.
- `maintain_project_page` — create/update project presentation without changing underlying evidence.
- `maintain_repository_presentation` — improve README/link/presentation layers.
- `align_linkedin` — keep LinkedIn representation consistent with approved profile evidence.
- `public_release_qa` — verify links, claims, privacy and consistency before publication.

### Projects & learning
- `plan_learning` — convert a verified skill gap into a bounded learning plan.
- `scope_project` — define a technical project around a concrete evidence goal.
- `extract_course_artifact` — identify useful deliverables from coursework without presenting homework as professional evidence.
- `synthesize_learning` — create durable understanding from source evidence.
- `close_project` — preserve raw-source authority, durable results, provenance and next use.
- `map_gap_to_evidence` — connect job gaps to courses/projects/deliverables.

### Systems & automation
- `monitor_condition` — repeatedly evaluate a bounded condition.
- `schedule_task` — execute a future/recurring internal task.
- `ingest_source` — detect/fingerprint/route/extract supported source material.
- `ocr_image` — create source-derived text from approved image sources.
- `transcribe_audio` — create source-derived transcript from approved audio sources.
- `classify_privacy` — determine processing/storage boundary before automation.
- `route_storage` — choose Drive/local/career-memory/career-os according to authority rules.
- `check_automation_health` — inspect triggers, state, failures, quotas and stale execution.
- `backup_restore` — preserve/verify recoverable system artifacts without exposing secrets.
- `manage_runtime_cost` — evaluate provider/subscription/runtime cost against actual need.

## Capability rules

1. Capabilities do not own canonical truth; Roles do.
2. Capability names describe purpose, not vendor.
3. Adding a new tool normally maps to an existing capability instead of creating a new Role.
4. An ability may require explicit authorization even if the capability exists.
5. External actions remain separately gated.
6. A capability may be marked unavailable/partial by `docs/IMPLEMENTATION_STATUS.md`; registry presence does not mean automatic implementation in every runtime.

## Tool-adapter examples

- GitHub connector -> may implement `inspect_source`, `maintain_repository_presentation`, or persistence operations.
- Web/browser -> may implement `discover_opportunities`, `check_freshness`, or `monitor_condition`.
- OCR/transcription provider -> implements source-extraction capabilities.
- Document renderer -> implements `render_document`.
- Scheduler -> implements `schedule_task`.

Providers are replaceable adapters; capabilities remain stable.
