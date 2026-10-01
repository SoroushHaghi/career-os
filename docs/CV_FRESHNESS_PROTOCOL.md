# CV Freshness & Publication Protocol

Status: ACTIVE / v1
Updated: 2026-10-01

## Purpose

Keep one canonical master CV current as Career OS evidence changes, without relying on a dedicated long-lived CV Builder chat or Work session.

The CV should evolve from canonical evidence, follow the current Application Standard and user-specific presentation profile, generate a review candidate when a material change is justified, and publish only after explicit user approval.

## Trigger boundary

A CV freshness review is triggered by a **canonical career-evidence delta**, not by every source or conversation change.

Typical triggers:
- a course is completed/passed and the result is promoted into career evidence;
- a grade, certificate, project milestone, work experience, role/status, skill-evidence state, publication, award, or verified metric changes;
- a portfolio/project gains inspectable evidence that materially changes how it can be represented;
- an existing CV claim becomes stale, unsupported, or materially incomplete.

Raw course notes, unverified files, chat discussion, speculative skills, and task-local drafts do not trigger a CV rewrite by themselves.

## Decision gate

For every trigger, assess:

1. **Evidence quality** — is the delta canonical and sufficiently supported?
2. **Materiality** — does it improve accuracy, relevance, credibility, or recruiter understanding?
3. **Representation value** — does the master CV benefit from this delta now?
4. **Space cost** — what should be shortened, replaced, or omitted to keep the CV coherent?
5. **Consistency** — does the change require updates to profile, skills, projects, education, dates, links, or other sections?
6. **Public alignment** — if approved, should the website /cv artifact or related public copy also change?

Possible outcomes:
- `NO_CV_CHANGE` — record the reviewed evidence revision; keep the current CV unchanged.
- `CV_REVIEW_REQUIRED` — prepare a revised candidate using the canonical standard.
- `BLOCKED` — required evidence, clarification, rendering capability, or publication dependency is missing.

Do not add text merely because new evidence exists. The decision should optimize the CV as a whole.

## Canonical workflow

```text
source / user update
    ->
career evidence is verified and promoted
    ->
CV freshness signal
    ->
load canonical CV + Application Standard + user rendering profile
    ->
assess CV impact
    -> NO_CV_CHANGE: record review and stop
    -> CV_REVIEW_REQUIRED:
         update candidate representation
         -> render review DOCX/PDF when renderer is available
         -> factual + ATS + visual QA
         -> request user approval
         -> on approval only:
              promote candidate to CV/CV_CONTENT.md
              replace current Drive master pair
              publish the same approved PDF to website /cv
              verify Drive + live website state
              mark CV current
```


## Baseline-fidelity rule

A freshness update is a **controlled delta**, not a redesign.

Before generating a review candidate:
1. load the latest approved CV representation and, when practical, its rendered PDF;
2. preserve approved wording, tone, section naming, typography, geometry, spacing, header/photo/QR placement, hyperlink behavior, and page balance by default;
3. change only content that is materially affected by the new canonical evidence or by an explicitly requested improvement;
4. do not paraphrase already-approved prose merely to make it sound newer, more technical, or more keyword-dense;
5. do not introduce new section labels, skill taxonomies, or layout structures unless the user explicitly requested a redesign or the existing structure creates a concrete problem;
6. run a baseline-diff review covering wording, section placement, page flow, font scale, whitespace, links, and QR behavior.

If a material update cannot fit without broader restructuring, surface that as a review decision instead of silently redesigning the CV.

For image/QR links, visual similarity is not sufficient: verify the final PDF annotation/click target on both the visible caption and the image itself when that is part of the approved baseline.

## State model

A private CV freshness state should use the smallest useful state vocabulary:

- `CURRENT` — approved content, Drive master pair, and website /cv are aligned.
- `PENDING_IMPACT_REVIEW` — canonical evidence changed; CV impact not yet decided.
- `REVIEW_READY` — a revised candidate exists and awaits user approval.
- `APPROVED_SYNC_PENDING` — user approved the candidate; Drive/public synchronization remains.
- `BLOCKED` — an explicit dependency prevents completion.

A no-change decision returns the state to `CURRENT` and records the reviewed evidence revision.

## One-master rule

Maintain one comprehensive master CV as the default application and publication representation.

Active private Drive location:
- `CAREER/CV/HAGHI_CV_CURRENT.docx`
- `CAREER/CV/HAGHI_CV_CURRENT.pdf`

The active CV folder should contain the current master pair, not a growing sequence of `final`, `final2`, or company-specific canonical copies. If historical rendered versions must be retained, archive them outside the active-current location.

Do not delete or overwrite an externally sent application artifact merely to enforce the one-master rule.

## Approval and publication boundary

Automatic detection, impact analysis, drafting, rendering, and QA may happen without repeated permission when the runtime supports them.

Explicit user approval is required before:
- replacing the approved master representation;
- replacing the active Drive master pair;
- changing the public website /cv artifact;
- publishing any related public-profile change.

After approval, Drive and website must be synchronized from the **same approved master PDF**. The website is downstream output, never a source of candidate truth.

## Runtime model

A dedicated long-lived CV Builder worker is not required.

This workflow may run through:
- a normal Career OS chat/session;
- a scheduled/conditional agent automation;
- Work mode when document rendering or browser interaction materially benefits from it;
- deterministic scripts for freshness signaling or file synchronization.

GitHub/Career Memory is the durable state layer, not the reasoning engine. A GitHub change can create a pending freshness signal, but AI judgment still requires an authorized agent runtime. This design does not require a central paid LLM API.

## Source of truth

- candidate facts/evidence -> private `career-memory/MODULES/CAREER/`;
- approved editable master representation -> private `career-memory/CV/CV_CONTENT.md`;
- CV freshness status -> private `career-memory/CV/CV_REFRESH_STATE.md`;
- user-specific rendering/preferences -> private `career-memory/CV/CV_RENDERING_PROFILE.md`;
- reusable document rules -> `career-os/docs/APPLICATION_STANDARD.md`;
- final current DOCX/PDF -> approved private Drive output;
- website /cv -> downstream public copy of the same approved PDF.

## Closeout

Every completed CV freshness run should record:
- triggering evidence revision/change;
- outcome: no change / review ready / blocked;
- sections changed, if any;
- approval status;
- Drive synchronization status;
- website synchronization status;
- exact remaining next action.
