# MASTER NOTES — Canonical Reusable Specification v1

**Purpose:** Define a reusable Master Notes standard for academic courses.

## 1. Document structure

A Master Notes document is a **cumulative, modular, source-audited course script**.

Required structure:

1. Cover page
   - Course title
   - `Master Notes`
   - Edition label (`Approved Edition` only after approval)
   - Author/student name
   - Semester
   - One-line scope/status statement if useful

2. Table of contents

3. One chapter per teaching session
   - `Session N`
   - descriptive session title
   - opening **Remark** stating:
     - the lecture sequence followed,
     - what evidence was used,
     - what is deliberately excluded or deferred,
     - whether any textbook clarification was required.

4. Numbered scientific sections/subsections
   - Follow the professor's actual teaching sequence wherever possible.
   - Do not reorganize primarily by textbook chronology.

5. Definitions, propositions/theorems, examples, proofs, figures/tables, and clarification boxes inserted exactly where needed.

6. End-of-session **Checkpoint**.

The cumulative Master must be built from modular approved session sources, not by concatenating finished PDFs.

---

## 2. Semantic box / callout taxonomy

Use boxes by **function**, not decoration.

### `Remark`
Use for:
- session scope and provenance;
- lecture-order notes;
- bounded qualifications;
- clarification that should not be mistaken for a theorem.

### `Definition`
Use for:
- formal mathematical objects or terminology;
- notation that will be reused later.

Definitions should be compact, exact, and numbered within the session/chapter when appropriate.

### `Key Principle`
Use for:
- one central conceptual statement that controls interpretation of a block;
- e.g. computability versus computational resources.

It should contain a principle, not a worked derivation.

### `Important Distinction`
Use when two ideas are easy to confuse and the distinction matters scientifically or for the exam.
Examples:
- computability vs. efficiency;
- entanglement vs. communication;
- state-vector size vs. readable classical output.

### `Proposition` / `Theorem`
Use only for a precise mathematical claim with explicit assumptions.
Add a proof when the lecture contained one or when a bounded reference-supported completion is necessary and provenance is explicit.

### `Example`
Use for a small concrete instance immediately after the relevant formal idea.
The example must illuminate the current concept, not introduce unrelated enrichment.

### Named clarification box
A short descriptive title may be used for a local structural fact, e.g.:
- `Basis-state factorization`
- `The basic quantum-computation model`

Use this only when a full theorem/definition environment would overstate the claim.

### `Checkpoint`
Reserved for the end of a session. Do not use it as a mid-session summary box.

---

## 3. Figure reconstruction standard

Figures are **scientific reconstructions**, not decorative illustrations.

Source priority:

1. professor/official source visual;
2. direct lecture/board evidence;
3. contemporaneous user note;
4. checked clean reconstruction;
5. supplementary external reference only when necessary.

Rules:

- Reconstruct the **meaning and geometry** of the original lecture figure, not its cosmetic appearance.
- Preserve source-supported labels, ordering, directions, relative geometry, cases, and semantic colour roles.
- Exact RGB values are editorial unless explicitly source-defined.
- Add redundant non-colour meaning (labels, solid/dashed lines, hatching, patterns) so the figure remains interpretable in grayscale.
- If a source figure contains an intermediate quantity, do not relabel it as the final physical/probabilistic result.
- A clean reconstruction must not silently add a stronger derivation than the lecture contained.
- Do not use community/legacy/generated graphics as scientific evidence.
- Every durable figure must have a known provenance record.
- Captions should state what the figure demonstrates and any important limitation.
- Figures should be reproducible/deterministic where possible (LaTeX/TikZ/native vector schematic preferred over free-form image generation).

---

## 4. Scientific reconstruction policy

The notes are reconstructed from multiple sources using an evidence hierarchy.

### Evidence hierarchy

- **A1 — Official instruction:** controls scope and requirements.
- **A2 — Official teaching material:** professor slides, handouts, exercises; primary scientific source.
- **A3 — Direct session evidence:** audio, raw transcript, contemporaneous board capture; reconstructs what was taught.
- **A4 — Reconstructed/cleaned note:** supporting evidence only; verify against A2/A3.
- **A5 — Textbook/reference:** clarification, notation checking, or bounded proof completion only.
- **A6 — Previous-student/community material:** structure/typography only unless independently upgraded.
- **U — Unverified:** do not use scientifically until resolved.

### Reconciliation rules

- Preserve the professor's sequence, examples, transitions, motivation, caveats, and outlook.
- Separate raw/direct evidence from duplicates, generated summaries, cleanup residue, and later enrichment.
- Transcript wording remains ASR unless audio-verified.
- Handwritten notes may corroborate but do not override stronger official/direct evidence.
- Textbooks may:
  - fix notation,
  - clarify a taught concept,
  - complete a narrowly missing proof step,
  - check mathematical correctness.
- Textbooks must **not** silently expand the course.
- If a lecture statement is imprecise, preserve the taught idea but make the minimum scientifically necessary correction.
- If sources conflict, record the conflict and follow authority/provenance rather than smoothing it over.
- Missing/uncertain evidence stays missing/uncertain.
- Do not import later-session material backward merely because it improves exposition.
- Explicitly exclude unsupported material rather than filling gaps from general knowledge.

For every session, keep a source/provenance record with:
source → location/time → evidence class → topic status → normalization/correction → textbook use → unresolved uncertainty → approval decision.

---

## 5. Quality bar for `Approved Edition`

`Approved Edition` is a release status, not a styling label.

A session reaches Approved Edition only when all of the following are true:

1. Source reconstruction is complete for the claimed scope.
2. Unsupported/generated/duplicate material has been removed or clearly separated.
3. Scientific claims and equations have been checked.
4. Figures have been provenance-checked and visually inspected.
5. The session has passed Manager/Backend scientific QA.
6. The LaTeX build completes cleanly:
   - no compilation errors;
   - no unresolved references;
   - no unacceptable overflow/overfull content;
   - only explicitly accepted minor underfull warnings.
7. Every page of the produced PDF is visually inspected for:
   - clipping,
   - page breaks,
   - equations,
   - captions,
   - fonts/glyphs,
   - tables,
   - figure placement,
   - readability.
8. The user explicitly approves the scientific/content edition.
9. The approved editable source is frozen/preserved.
10. The standalone session and the cumulative Master contain the same scientific text; differences may only be layout-level metadata, headers, page numbers, or whitespace.
11. Publication metadata is changed from review/release wording to `Approved Edition`.
12. Provenance and contribution/change records are updated.

---

## 6. Typography and layout principles

The visual style is an academic course script, not a slide deck.

Use:

- A4 portrait;
- clean serif body typography;
- conventional mathematical typesetting;
- restrained, consistent hierarchy;
- numbered sections/subsections;
- numbered definitions/propositions/examples where useful;
- standard display equations with generous enough vertical separation;
- numbered tables and figures with descriptive captions;
- cumulative table of contents;
- course/Master Notes running identity in headers/footers;
- session opening on a clear chapter boundary;
- moderate whitespace, avoiding both dense textbook walls and presentation-style empty pages.

Typography must remain secondary to scientific structure.

Colour:
- restrained;
- semantic rather than decorative;
- figures must remain meaningful in grayscale.

The portable standard is the hierarchy and spacing discipline above. Exact font package, margin dimensions, box colours, and TeX measurements are implementation details inherited from the project's `preamble.tex` / macros and may be changed only if the resulting document preserves the same visual hierarchy and QA standard.

---

## 7. End-of-session Checkpoint standard

Every session ends with:

### `Checkpoint`

Opening sentence:

> After this session, one should be able to:

Then a short list of **observable capabilities**, normally 5–8 items.

Each item should use an action verb such as:

- define;
- distinguish;
- construct;
- derive;
- compute;
- explain;
- justify;
- translate;
- formulate;
- identify limitations.

Checkpoint rules:

- cover the session's conceptual spine, not every minor fact;
- test relationships and distinctions, not only vocabulary;
- include at least one mathematical/operational capability where relevant;
- include important limitations/caveats where misunderstanding would be dangerous;
- do not claim learner mastery;
- do not introduce new material;
- keep it usable both as a revision checklist and as an oral-exam prompt list.

---

## 8. LaTeX / generation workflow

Recommended source architecture:

```text
LATEX/
├── preamble.tex
├── macros.tex
├── visual_macros*.tex        # when session-specific figures require it
├── main.tex                  # cumulative Master
├── SESSIONS/
│   ├── session_01_final.tex
│   ├── session_02_final.tex
│   └── ...
├── standalone_session_01*.tex
├── standalone_session_02*.tex
└── ...
```

Workflow:

```text
raw/official sources
        ↓
source audit + segmentation
        ↓
session provenance/source record
        ↓
scientific reconstruction
        ↓
modular session .tex
        ↓
standalone review build
        ↓
scientific QA + figure QA + full-page visual QA
        ↓
user review / requested revisions
        ↓
approved final session .tex
        ↓
standalone Approved Edition
        ↓
import same approved module into main.tex
        ↓
rebuild cumulative Master
        ↓
compare standalone vs Master scientific content
        ↓
publish + preserve prior versions + log change
```

Compilation should be multi-pass when needed for TOC/references; release QA should verify that cross-references and the table of contents have converged.

Never overwrite the historical approved source while experimenting. New revisions are versioned; the previously approved edition remains preserved until a newer revision is explicitly approved.

---

## Non-negotiable Master Notes principles

1. **Source-faithful before comprehensive.**
2. **Professor/course evidence outranks textbook elegance.**
3. **Clarify; do not silently expand.**
4. **Preserve uncertainty and exclusions.**
5. **Figures reconstruct meaning, not decoration.**
6. **Scientific correctness may require minimal qualification, but not a rewritten course.**
7. **Approval requires content QA + visual QA + explicit user approval.**
8. **The Master is modular: one approved session source, reused consistently in standalone and cumulative publication.**
9. **Checkpoint states what the session enables; it is not a mastery claim.**
10. **Each course should reuse this process while keeping course-specific scientific content and provenance outside the reusable public specification.**
