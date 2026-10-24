# AGENTS.md — rules for AI agents editing `career-os`

> **Two roles, two files.** This file = the **maintainer** side (changing Career OS itself).
> `RULES.md` = the **user** side (working in a memory repo). If you were sent here to help a user with
> their work, stop and follow `RULES.md` instead. Never apply maintainer rules in a user's memory repo.

`career-os` is the **public** framework (method, docs, templates). **`RULES.md` is the one rulebook
every user's agents follow.** A user's state lives in their own private memory repository, whose short
`AGENTS.md` holds only their configuration (template: `templates/memory-repo/AGENTS.md`).

1. **Public repository — no personal data.** Never add names of real private contacts, e-mail
   addresses, phone numbers, Drive file IDs, grades, application details or any other user state.
   Follow `PRIVACY.md`. Use `<placeholders>` and synthetic examples.
2. **v2 is authoritative.** `README.md`, `docs/ARCHITECTURE.md`, `docs/SETUP.md`,
   `docs/WORKFLOWS.md`, `RULES.md` and `templates/memory-repo/` describe the current system. Keep them
   consistent; a rule is written only in `RULES.md`, never copied into templates or memory repos.
3. **v1 is frozen.** `docs/legacy/`, `templates/legacy/` and the engine code (`apps/`, `packages/`,
   `scripts/`, `tests/`, `config/`, `examples/`) are kept for reference. Do not extend them; fix only
   what is needed to keep existing tests passing.
4. **Small and readable.** v2 documents are written for the user, not only for developers.
   Prefer one clear page over several partial ones.
5. Commit messages: `[career-os] <what changed>`.
6. Every change to `career-os` ends with a last commit line `Agent: <tool>`.

## Maintainer project ("Inventory")
The maintainer's own AI project for developing Career OS as an open-source product. Only the
maintainer uses it; every other user works in their own memory repo as a user. Project instruction:
```
Career OS — Inventory (maintainer)
1. Before replying, open AGENTS.md in the GitHub repo <owner>/career-os and follow it exactly.
2. If you cannot open it, say so in your first sentence and do not answer from memory.
3. Never say something was changed unless the commit was pushed. Nothing personal goes into career-os.
```
The maintainer project needs no access to anyone's memory repo, the maintainer's own included.
- **Status light and references** work as in `RULES.md` §4, with the code `OS` (e.g. `🟢 📌 OS-a92545a …`).
- **Role of the AI:** system architect. Designs and changes the framework; agents in users' memory
  repos are workers that use it and report problems as issues instead of changing it.
- **Read order:** this file → `RULES.md` → `README.md` → `docs/ARCHITECTURE.md` → open Issues of this repo.
  These Issues are the only feedback inbox: every user's agents post general problems here (RULES.md §8),
  the maintainer's own memory repo the same way as everyone else's.
- **Feedback loop:** every general user-side problem arrives here as a sanitized public issue. Each one is decided: fix, decline, or keep
  open; close it with a comment naming the commit. A decision that changes a rule updates `RULES.md`
  (and the docs) in one commit; every memory repo gets it automatically on its next session.
  A breaking change to `RULES.md` needs a short migration note in the commit message.
- **Decisions** about how Career OS works are recorded here: in `CHANGELOG.md` and in the issue that led
  to them — never in a user's memory repo, whose decision log is for that user's own life decisions.
- **Change control for `RULES.md` (USER_EXPLICIT 2026-10-25: rules are not changed every hour).**
  1. *Proposal:* every change starts as an issue labelled `rules-change` with: the observed problem and
     its evidence (where it happened), the proposed text, the impact (does any project instruction or
     memory repo have to change?), and how it will be tested in a real project.
  2. *Collect, don't apply:* accepted proposals are written under `## [Unreleased]` in `CHANGELOG.md` and
     on a branch, not on `main`.
  3. *Release on a rhythm:* at most one release a week, as one pull request using the PR template
     (checklist, second-agent review, privacy check). Only a patch for data loss, privacy or a broken
     save may go out sooner.
  4. *Automatic check:* `rules-change-check.yml` fails any push or PR that changes `RULES.md` without a
     new version line, a matching `CHANGELOG.md` entry and an issue reference (`#n`).
  5. *Project instructions are frozen:* they change only with a major version and a migration note.
- **Releases:** tagged automatically from the version line (`release-rules.yml`) so users can pin one.
- **Publishing to the public repo uses the same three privacy layers:** run `tools/privacy_check.py` with
  the maintainer's denylist; have a second agent review the release and add `Privacy-Review: passed by
  <agent>` to the release commit; `publish-public.yml` re-checks and blocks on any finding.
- **Principles:** prefer established open standards (AGENTS.md, Agent Skills, SemVer, Keep a Changelog,
  JSON Schema, JSON Resume) over home-made formats; one home per fact; minimal reads; nothing lost; works for weak models too (explicit
  rules, no guessing); no new infrastructure without a demonstrated need; no personal data here.
