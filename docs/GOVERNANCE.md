# Career OS Governance

This document defines reusable governance for Career OS. It must remain free of real user data.

## Authority order

Use the following order when sources disagree:

1. Explicit current user instruction
2. Approved system policy/directive
3. Canonical component state/data
4. Primary evidence
5. Secondary or historical records
6. Chat history
7. AI inference

If authoritative sources conflict, surface the conflict instead of silently reconciling it.

## Component ownership

- **System governance** owns architecture, policy, ownership boundaries, and conflict resolution.
- **Ingestion automation** owns source detection, content-version detection, extraction/transcription/OCR, queue/retry state, provenance tagging, and mechanical session inventory.
- **Career memory/profile** owns canonical candidate facts, evidence states, education, projects, experience, certificates, and provenance.
- **Opportunity/Radar** owns companies, opportunities, contacts, postings, market/search state, and application tracking.
- **Application system** owns CV/cover-letter generation, tailored variants, publication-ready artifacts, and application-document versioning.
- **Conversation/strategy layer** supports reasoning and decisions but is not canonical storage by itself.

## Persistence rules

- Persist only state that materially improves continuity, provenance, decision quality, recoverability, or avoidance of repeated work.
- `NO UPDATE REQUIRED` is valid.
- Each durable fact has one canonical owner; other components reference it.
- Prefer deltas once canonical state exists.
- Chat is not canonical storage when a writable memory backend is available.
- Inspect first, make the minimum safe change, then read back and verify.
- Do not claim a write/update succeeded unless the target was actually updated and, when important, read back.

## Ingestion governance

Source ingestion follows these rules:

- preserve original source files;
- do not delete originals merely because processing succeeded;
- source File ID is identity; content fingerprint is version where available;
- skip unchanged source content;
- keep mechanical ingestion separate from semantic interpretation;
- keep generated text provenance-linked to its exact source/version;
- never overwrite ambiguous user-created text when Career OS ownership cannot be proven;
- use session folder Drive ID as canonical session identity when session-centric routing applies;
- treat folder/file names as mutable labels, not canonical identity;
- use source folder hierarchy as a routing signal, but do not infer unsupported career meaning from location alone;
- raw/full transcripts remain source evidence, not automatic career-memory facts;
- provider/model choices are replaceable adapters;
- transient provider quota/rate failures are retry states, not source-content failures;
- low-confidence extraction or ambiguous classification must remain reviewable rather than silently canonicalized;
- `SESSION_MANIFEST.md` is mechanical inventory, not a lesson summary or mastery record;
- semantic synthesis should be separately AI-reviewed when needed.

See `docs/INGESTION_AUTOMATION.md` and `docs/AUTOMATION_RUNTIME.md`.

## Evidence discipline

Keep these distinct:

- source fact
- user-confirmed fact
- demonstrated evidence
- developing capability
- planned learning
- inference
- unverified claim

Unknown remains unknown. Inference does not become verified fact without evidence or explicit confirmation.

Extracted text, OCR, transcription, generated notes, and coursework exposure do not automatically become professional proficiency claims.

## Provenance

Preserve enough provenance to recover:

- what source supported a material claim;
- where the source is stored;
- which source version/fingerprint was processed when available;
- when it was reviewed;
- what exact claim it supports;
- what limitations or extraction uncertainty were observed.

Avoid duplicating raw source files when a stable reference or compact processed proof is sufficient.

## Storage boundaries

- reusable/public-safe system material -> `career-os`;
- private sanitized durable memory/state -> `career-memory`;
- raw/sensitive originals and bulky source evidence -> approved private source storage such as Drive/local archive;
- active project/session evidence may remain in Drive while the project is active.

Do not create competing canonical copies without an explicit ownership rule.

## Application flow

`RAW/PRIMARY SOURCES -> CAREER MEMORY -> OPPORTUNITY -> STRATEGY DECISION -> APPLICATION BRIEF -> APPLICATION SYSTEM -> APPLICATION ARTIFACT`

A generic Master CV is not mandatory. Tailoring may be minimal, moderate, or strong. Opportunity-specific variants must not silently replace the canonical public CV.

## External-action safety

Explicit user approval is required before:

- submitting applications/forms;
- sending email or recruiter messages;
- LinkedIn messaging or connection actions;
- publishing content or changing public profiles/websites;
- uploading application documents externally;
- destructive actions or commitments.

Internal memory maintenance and approved source-ingestion processing that follow these policies do not require repeated approval.
