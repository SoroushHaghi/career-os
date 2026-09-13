# Career OS Application Standard

This reusable standard is derived from the legacy Career OS application workflow. It contains no real user identity/contact data.

## General

- Use evidence-grounded content only. Opportunity-specific content is allowed and expected.
- A generic Master CV is not a required upstream artifact.
- Old CVs, LinkedIn profiles, websites, READMEs, and old cover letters are secondary references, not canonical truth.
- Career Memory / processed career evidence is authoritative for candidate truth; opportunity/Radar state is authoritative for opportunity truth.

## CV

- Default target: 2 pages. Never pad. If relevant evidence does not justify two pages, report a content gap instead of adding filler.
- Preserve an established professional visual baseline when useful, but never let template preference override readability, ATS usability, factual clarity, or opportunity fit.
- Keep sections modular and application-specific. Section order and content may change materially when the opportunity requires it.
- Resolve overflow through content selection, shorter bullets and modular section decisions before materially shrinking typography.
- Personal identity/contact details belong in the private/local rendering layer, not reusable system files.
- Date of birth: OFF by default.
- Photo: use only an approved asset and only when context supports it.
- QR: use only with an approved destination/asset.
- Text should remain selectable/searchable; links clickable where practical.
- Available sections may include Summary, Education, Skills, Experience, Projects, Relevant Coursework/Academic Knowledge, Languages and Interests. Include only sections that serve the application.
- Summary: concise and evidence-grounded; no unsupported professional titles.
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

Before final document generation, maintain an approved application brief when the task requires one. It should contain, as applicable:

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

## Versioning

- Use stable explicit filenames with opportunity/company/purpose/version identifiers.
- Never use ambiguous names such as `final`, `final2`, or `latest`.
- Never overwrite a version already sent externally.
- Historical review drafts remain historical; later approved/public versions supersede them for presentation purposes without rewriting history.

## Rendering and QA

Prefer deterministic, reproducible rendering. Rendering success alone is insufficient. Verify as applicable:

- page count, clipping and overflow;
- page balance and spacing;
- typography and mobile readability;
- ATS/text extraction and selectability;
- hyperlink behavior;
- approved photo/QR placement and destination;
- consistency with evidence and the approved application brief;
- absence of unsupported claims, metrics, titles or contribution scope.

## Public CV

Canonical public CV and opportunity-specific CV variants are different concepts. A tailored application CV must never automatically replace the public CV. Publication requires explicit user approval.

## External-action safety

Without explicit user approval, never send/upload an application document externally, submit an application, publish website/profile changes, replace the public CV, send email, contact a recruiter, or send a LinkedIn message.
