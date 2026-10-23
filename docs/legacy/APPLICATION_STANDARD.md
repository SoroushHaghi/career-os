# Career OS Application Standard

This reusable standard is derived from the legacy Career OS application workflow. It contains no real user identity/contact data.

## General

- Use evidence-grounded content only. Opportunity-specific content is allowed and expected.
- A generic Master CV is not a required upstream artifact.
- Old CVs, LinkedIn profiles, websites, READMEs, and old cover letters are secondary references, not canonical truth.
- Career Memory / processed career evidence is authoritative for candidate truth; opportunity/Radar state is authoritative for opportunity truth.

## CV

### Baseline and evidence discipline

- Start from the latest approved or explicitly user-edited representation for the task; do not silently revert unrelated manual edits by rebuilding from an older draft.
- Before tailoring, map opportunity requirements to explicit candidate evidence. Unsupported requirements remain gaps rather than being converted into claims.
- Keep academic knowledge, project exposure, practical implementation, laboratory work, industrial experience, and professional proficiency distinct.
- Historical CV/cover-letter wording may guide representation, but it cannot upgrade evidence state.
- Do not infer participant counts, rankings, percentages, performance metrics, or other numbers from incomplete information. Publish numeric claims only when their provenance and meaning are clear.

### Content and representation

- Default target: 2 pages. Never pad. If relevant evidence does not justify two pages, report a content gap instead of adding filler.
- Preserve the latest approved wording and visual baseline by default. A normal update should be a minimal controlled delta, not a wholesale rewrite or redesign. Depart from approved wording/layout only when the user explicitly requests redesign or a concrete evidence/fit/readability problem requires it.
- Keep sections modular and application-specific. Section order and content may change materially when the opportunity requires it.
- Resolve overflow through content selection, shorter bullets and modular section decisions before materially shrinking typography.
- Personal identity/contact details belong in the private/local rendering layer, not reusable system files.
- Date of birth: OFF by default.
- Photo: use only an approved asset and only when context supports it.
- QR: use only with an approved destination/asset.
- Text should remain selectable/searchable; links clickable where practical.
- Available sections may include Summary, Education, Skills, Experience, Projects, Relevant Coursework/Academic Knowledge, Languages and Interests. Include only sections that serve the application.
- Summary: concise and evidence-grounded; no unsupported professional titles. Preserve a previously approved tone/voice unless a specific reason justifies changing it; avoid turning a balanced profile into a keyword-heavy skills list.
- Education: transcript-authoritative; failed/incomplete/ongoing coursework must not appear as completed.
- Skills: evidence-backed and relevant; avoid keyword walls.
- Projects: distinguish training, inference, integration, deployment, testing, architecture and implementation accurately.
- Metrics: verified only.
- Experience: verified or explicitly bounded user-confirmed scope only.
- Relevant Coursework: selective and opportunity-specific.
- Languages: current evidence/status only.
- Tailoring levels: `MINIMAL`, `MODERATE`, `STRONG`; stronger tailoring is not automatically better.

## CV architecture

Separate:

1. durable career facts/evidence;
2. sanitized AI-editable CV content;
3. final private/local DOCX/PDF artifact with contact details/assets.

The final CV artifact is a publication output, not the source of truth.

## Cover letter

Create only when required, requested, or strategically useful.

- Default target: maximum 1 page.
- Company/role specific.
- Use the strongest 1–3 evidence-backed bridges.
- Do not repeat CV prose or use unsupported company claims.
- Photo and QR are normally OFF.

## Application brief gate

Before final document generation, maintain an approved application brief when the task requires one. Build it after a requirement-to-evidence pass so role requirements, supporting evidence, and unresolved gaps are explicit. It should contain, as applicable:

- Opportunity ID
- Company / role / purpose
- Language
- Tailoring level
- Page target
- Photo/QR settings
- Cover-letter requirement
- Selected positioning, experience, projects, skills and coursework
- Approved and excluded claims
- Open questions and user confirmations
- Special instructions

Do not build final application artifacts from vague context when a brief is needed.

An opportunity-specific `APPLICATION/` workspace should be created only when the opportunity is explicitly selected or its state indicates that document building is authorized (for example, `READY_FOR_CV_BUILDER = YES`). Do not create application-output clutter for every Radar item.

## Output organization

Opportunity-specific working outputs should stay grouped under the selected opportunity. A reusable conceptual structure is:

```text
<Opportunity_ID>/APPLICATION/
    APPLICATION_BRIEF.md
    CV/
    COVER_LETTER/
    OTHER/
```

Create only the subfolders actually needed. Do not create a Cover Letter folder when no Cover Letter is being built.

Durable candidate truth and reusable system rules remain outside this opportunity-output tree.

## Versioning and artifact state

Track document state explicitly. At minimum distinguish:

`DRAFT -> REVIEW -> APPROVED -> SENT / PUBLISHED`

A document can be approved without being sent, and sent without being the canonical public CV. Do not collapse these states.

- Use stable explicit filenames with opportunity/company/purpose/version identifiers.
- Never use ambiguous working names such as `final2` or `latest` as the only version identity.
- Never overwrite a version already sent externally.
- Historical review drafts remain historical; later approved/public versions supersede them for presentation purposes without rewriting history.
- When an application is reported as sent, do not infer that a particular local/review file was the uploaded file unless that exact artifact is confirmed.

## Rendering and QA

Prefer deterministic, reproducible rendering. Rendering success alone is insufficient.

After any material content or layout change, render the actual deliverable and inspect the result rather than relying only on source/XML/text changes. Preserve unrelated approved edits unless the task explicitly changes them.

Verify as applicable:

- page count, clipping and overflow;
- page balance and spacing;
- typography and mobile readability;
- ATS/text extraction and selectability;
- hyperlink behavior and actual targets, including image-level click targets when the approved baseline uses them;
- approved photo/QR placement and destination;
- consistency with evidence and the approved application brief;
- absence of unsupported claims, metrics, titles or contribution scope;
- no residual text from prior roles/companies/versions;
- consistency between CV and cover letter;
- visual inspection of every rendered page at readable scale when producing a release candidate;
- baseline-diff check against the latest approved CV for wording drift, section-label drift, typography/font-scale changes, whitespace/page-flow changes, QR behavior, and accidental compression/expansion.

## Public CV

Canonical public CV and opportunity-specific CV variants are different concepts. A tailored application CV must never automatically replace the public CV. Publication requires explicit user approval.

The canonical master CV is **continuously maintained from canonical career-evidence deltas** rather than rebuilt only when an application happens. Use `docs/CV_FRESHNESS_PROTOCOL.md`.

A new course, grade, certificate, project milestone, skill-evidence change, or experience update does not automatically become CV text. First verify/promote the evidence, then run the CV-impact decision gate. Only material, evidence-supported changes should generate a review candidate.

After approval, update the active Drive master pair and the website `/cv` from the same approved master PDF.


## Standard ownership and learning loop

Application work should improve the next application instead of leaving useful rules trapped in one chat.

Before drafting:
1. load canonical candidate evidence;
2. load current opportunity state when relevant;
3. load this reusable Application Standard;
4. load the user's private CV rendering/profile rules when available;
5. load any opportunity-specific application brief.

During and after review:
- repeated user corrections become standard candidates;
- explicitly approved recurring patterns become standard candidates;
- rejected layouts/phrasing may become anti-rules;
- one-off company/role choices remain opportunity-specific.

Promotion destinations:
- reusable application rules -> this file;
- user-specific CV presentation/QA preferences -> private `CV/CV_RENDERING_PROFILE.md`;
- approved editable CV representation -> private `CV/CV_CONTENT.md`;
- user-specific cover-letter preferences -> private `CV/COVER_LETTER_PROFILE.md` once such preferences are established;
- candidate truth/evidence -> private career evidence modules;
- opportunity-specific choices -> the selected application workspace.

Historical CVs and cover letters may support a style/process rule, but they must not silently become candidate truth.

When recovering an older chat that contains accumulated document know-how, use `templates/STANDARD_DISCOVERY_PACKET.md` and promote only validated deltas through `docs/STANDARD_PROMOTION_PROTOCOL.md`.

## External-action safety

Without explicit user approval, never send/upload an application document externally, submit an application, publish website/profile changes, replace the public CV, send email, contact a recruiter, or send a LinkedIn message.
