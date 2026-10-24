# Changelog — Career OS rules (`RULES.md`)

Format: [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) · versions: [SemVer](https://semver.org/)
(major = a memory repo must change something; minor = new rule; patch = wording).

## [2.6.0] — 2026-10-24
### Changed
- One status light ends every reply (🟢 / 🟢 📌 … · commit / 🟡 ⏳n / 🔴 ⏳n); it replaces the separate
  receipt and "not saved" lines and shows connection, saves with proof, and what is still waiting.

## [2.5.0] — 2026-10-24
### Added
- Offline mode: when the repo cannot be reached, keep helping from the tool's memory (marked as possibly
  outdated), save nothing, keep a visible `⏳ to save` list, and sync first when back online.
### Changed
- Project instruction line 2 follows offline mode instead of refusing to answer.

## [2.4.0] — 2026-10-24
### Added
- Session-start line `📂 <project> · rules v… · state …` as visible proof that the files were read.
- Four-line project instruction: address, fail-closed if unreachable, start line, safety core.

## [2.3.0] — 2026-10-24
### Added
- Three privacy layers at every boundary (self-check, independent review, automatic gate):
  `tools/privacy_check.py`, memory-repo `feedback-outbox` workflow + `tools/feedback_outbox.py`,
  `publish-public.yml`, `scan-issues.yml`, and a private `SYSTEM/PRIVACY_DENYLIST.txt` in each memory repo.
### Changed
- Agents never post feedback directly; they write to `OUTBOX/feedback/` (RULES.md §8).

## [2.2.0] — 2026-10-24
### Changed
- Project instruction names only the memory repo and a project name (resolved in the memory repo's
  project map), so it never has to change. Explicit `Workspace:` paths in older instructions still work.

## [2.1.0] — 2026-10-24
### Added
- `RULES.md` as the single rulebook; memory repos keep only configuration (`templates/memory-repo/AGENTS.md`).
- Per-reply checklist for weaker models; personalisation layers; projects with their own repository.
- Feedback loop with `scope: personal|general` and the `Feedback to career-os` setting.
- Procedures as skills in the open Agent Skills format.
- "An explicit request is the approval" (§7).
### Changed
- Project instruction is one line and always names the workspace.

## [2.0.0] — 2026-10-23
- v2 method: one private memory repo, one-page states, same-turn saves with receipts.
