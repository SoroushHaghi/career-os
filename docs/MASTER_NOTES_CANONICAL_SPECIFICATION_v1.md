# MASTER NOTES — Canonical Reusable Specification v1

**Purpose:** Define a reusable Master Notes standard and execution contract so any capable AI can turn the same complete lecture-source bundle into a source-faithful, scientifically checked, visually stable course script with minimal user-driven rework.

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
   - opening **Remark** only when it helps the learner, for example:
     - the conceptual sequence of the lecture,
     - an important scope limitation,
     - a scientifically necessary caveat,
     - material deliberately deferred because the lecturer deferred it.
   - Do **not** expose routine provenance, ASR status, source-audit procedure, normalization disputes, or verification workflow in the learner-facing book unless that information is itself necessary for scientific understanding. Keep those records in the backend/session provenance record.

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
- Treat orientation, grid shape, relative placement, input/output direction, energy-level spacing/order, axes, arrows, and panel ordering as semantic evidence. If the lecture source is 3×2, do not transpose it to 2×3; if a beam splitter or circuit has a particular input/output orientation, preserve it.
- Do not redesign a lecture figure merely to make it prettier or more compact.
- When an important concept has no useful source figure, a supplementary **memory-support figure** may be added. It should be scientifically correct, very simple, glance-recognizable, and understandable without replacing or altering any original lecture figure.
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

### Default source roles

Before authoring, assign each supplied source a role instead of treating all inputs as interchangeable:

- **Best transcript:** primary source for spoken sequence, explanations, motivation, transitions, examples, caveats, and lecturer emphasis.
- **Handwritten PDF / contemporaneous board notes:** primary source for equations, notation, board diagrams, energy-level sketches, arrows, and spatial organization.
- **Lecture photos / screenshots / slide captures:** direct visual evidence. Preserve the original panel/grid orientation and ordering when that arrangement carries meaning.
- **Original audio:** spoken ground truth for resolving ambiguous ASR, technical terms, numbers, equation wording, or source conflicts. If the supplied transcript is already strong, do not retranscribe the full lecture merely for duplication; use audio selectively where it can change correctness.
- **Official teaching material:** primary scientific authority for content it explicitly supports.
- **Generated summaries / generated notes:** secondary checklist or structure aid only. They are not scientific authority and may not silently override direct evidence.
- **External references:** verification/clarification only when required for correctness; never use them to silently expand the lecture.

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

## 5. One-pass session build contract

The default target is **one strong Review Edition**, not a chain of user-discovered QA failures.

Before the first Review PDF is shown to the user, the executing AI must complete all of the following internally.

### 5.1 Source inventory and alignment

1. Inventory every supplied session source before drafting.
2. Segment the lecture in its actual teaching order.
3. Align transcript blocks with handwritten pages, lecture images, and official material by topic and sequence.
4. Build an internal coverage ledger of every source-grounded:
   - topic;
   - equation/relationship;
   - example;
   - lecturer motivation/transition/caveat;
   - table;
   - energy diagram;
   - device/circuit sketch;
   - phase-space/Wigner/geometry figure;
   - spatial arrangement that contributes meaning.
5. Missing or unreadable material stays explicitly unresolved in the backend; do not guess it into the learner-facing text.

### 5.2 Scientific reconstruction

1. Write enough connective explanation for the lecture to be understandable as a course script, not merely a summary.
2. Preserve the lecture's intended depth. Do not compress away the reasoning bridge that makes the next topic understandable.
3. Check every formula and scientific statement for:
   - internal convention consistency;
   - compatibility with surrounding lecture content;
   - correct terminology;
   - correct limiting cases/interpretation where relevant.
4. If a lecture statement is imprecise, write the **correct scientific version** in the learner-facing note while preserving the taught idea and scope.
5. Use bounded authoritative references only when needed to settle correctness; keep the verification process out of the learner-facing book unless pedagogically relevant.

### 5.3 Completeness and revision stability

Before layout finalization, compare the draft against **all primary sources** and against any earlier accepted/reviewed version of the same session.

Revision policy is additive/repair-oriented:
- preserve justified content;
- correct wrong content in place;
- add missing content;
- remove content only when there is an explicit source/scientific reason.

Never silently delete a source-grounded item merely to shorten, simplify, prettify, or repaginate the document.

### 5.4 Figure completeness

Every lecturer-drawn/source-supported figure with explanatory purpose must be represented.

For each figure, verify:
- orientation;
- grid dimensions;
- panel order;
- labels;
- arrows;
- axes;
- input/output directions;
- relative geometry;
- energy-level structure;
- the specific concept the lecturer used the figure to convey.

Supplementary memory-support figures may be added only after the original lecture figure set is preserved.

### 5.5 Publication and preflight

Build the session with the canonical Master Notes style plus the course-specific visual exemplar defined by the active workspace.

Do **not** show the first Review PDF until:
- scientific QA is complete;
- completeness audit is complete;
- figure audit is complete;
- multi-pass build has converged;
- every rendered page has been visually inspected at readable scale.

The user should not be used as the primary detector for clipping, overflow, broken equations, bad page breaks, split semantic boxes, accidental large blank areas, transposed figures, missing captions, or obvious visual defects.

---

## 6. Quality bar for `Approved Edition`

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
7. Every page of the produced PDF is rendered and visually inspected at readable scale for:
   - clipping or overflow;
   - page breaks;
   - equations and mathematical glyphs;
   - captions and figure/caption separation;
   - fonts/glyphs;
   - tables;
   - figure placement and source-faithful orientation;
   - semantic-box splitting;
   - accidental large blank regions;
   - readability.
   A contact sheet may be used for overview, but it does not replace readable-scale page inspection.
8. The user explicitly approves the scientific/content edition.
9. The approved editable source is frozen/preserved.
10. The standalone session and the cumulative Master contain the same scientific text; differences may only be layout-level metadata, headers, page numbers, or whitespace.
11. Publication metadata is changed from review/release wording to `Approved Edition`.
12. Provenance and contribution/change records are updated.

---

## 7. Typography and layout principles

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

## 8. End-of-session Checkpoint standard

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

## 9. LaTeX / generation workflow

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
source inventory + role assignment
        ↓
segmentation + transcript/page/image alignment
        ↓
coverage ledger + provenance/source record
        ↓
scientific reconstruction
        ↓
completeness audit + formula/claim check
        ↓
figure reconstruction + figure audit
        ↓
modular session .tex
        ↓
standalone review build
        ↓
full-page visual QA + final scientific preflight
        ↓
first user review / requested revisions
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

## 10. AI execution protocol

When an AI is handed a complete session bundle and this specification, it should execute in this order without requiring the user to restate the workflow:

1. **Ground the session.** Identify the exact course/session and all available files.
2. **Classify source roles.** Transcript = spoken semantics; handwritten note = equations/notation/board geometry; images = direct visual evidence; audio = ambiguity fallback; generated summaries = secondary only.
3. **Reconstruct lecture order.** Build the content spine from the professor's sequence, not from textbook chapter order.
4. **Create an internal coverage map.** Track every meaningful topic, equation, figure, example, caveat, and visual relationship.
5. **Draft scientifically.** Preserve the taught idea and depth while correcting only what must be corrected for scientific accuracy.
6. **Reconstruct figures faithfully.** Preserve original orientation and geometry; add only supplementary glanceable teaching figures where useful.
7. **Audit for omissions.** Compare draft against every primary source and earlier accepted/reviewed content.
8. **Audit scientific consistency.** Check formulas, conventions, terminology, and claims; use targeted audio or bounded reference verification only where needed.
9. **Build in the locked course style.** Reuse the active workspace's established visual exemplar; do not invent a new document aesthetic.
10. **Run page-by-page visual QA.** Repair all obvious defects before surfacing the file.
11. **Surface one Review Edition.** The first user-facing review should already be near-final.
12. **Ask only for unresolved judgment.** User intervention is reserved for genuine source conflicts, ambiguous evidence that cannot be resolved, presentation choices with multiple legitimate answers, and final approval.
13. **After approval, clean the reader-facing prose.** Remove routine process/provenance commentary that does not help learning, run one final preflight, then publish the Approved Edition.
14. **Persist continuity.** Freeze the approved editable source, update provenance/change records, and update the cumulative Master from the same approved module.

### Course adapter rule

This specification is generic. Each course workspace may define:
- exact folder structure;
- naming convention;
- visual exemplar;
- preferred transcript source;
- session-ready trigger phrase;
- course-specific source priorities.

Those local rules may specialize this workflow but may not weaken its scientific, completeness, figure-fidelity, revision-stability, or visual-QA requirements.

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
11. **Do not silently delete justified content across revisions. Correct or extend it; remove it only for an explicit source/scientific reason.**
12. **Do not expose routine backend/process commentary in the learner-facing book unless it materially helps scientific understanding.**
13. **Preserve lecture geometry as content: orientation, grid shape, panel order, arrows, axes, and input/output direction are not disposable styling.**
14. **The first surfaced Review Edition should already have passed scientific, completeness, figure, and full-page visual QA.**
15. **Use strong transcripts for semantics and original audio selectively for ambiguity resolution; avoid redundant full retranscription when it does not improve correctness.**
