# AGENTS.md — rules for AI agents editing `career-os`

`career-os` is the **public** framework (method, docs, templates). A user's actual state lives in
their own private memory repository, governed by that repository's `AGENTS.md`
(template: `templates/memory-repo/AGENTS.md`).

1. **Public repository — no personal data.** Never add names of real private contacts, e-mail
   addresses, phone numbers, Drive file IDs, grades, application details or any other user state.
   Follow `PRIVACY.md`. Use `<placeholders>` and synthetic examples.
2. **v2 is authoritative.** `README.md`, `docs/ARCHITECTURE.md`, `docs/SETUP.md`,
   `docs/WORKFLOWS.md` and `templates/memory-repo/` describe the current system. Keep them
   consistent with each other; a change to a rule changes the template `AGENTS.md` too.
3. **v1 is frozen.** `docs/legacy/`, `templates/legacy/` and the engine code (`apps/`, `packages/`,
   `scripts/`, `tests/`, `config/`, `examples/`) are kept for reference. Do not extend them; fix only
   what is needed to keep existing tests passing.
4. **Small and readable.** v2 documents are written for the user, not only for developers.
   Prefer one clear page over several partial ones.
5. Commit messages: `[career-os] <what changed>`.
6. Every change to `career-os` ends with a last commit line `Agent: <tool>`.

## Maintainer project ("Invention")
The maintainer's own AI project for developing Career OS as an open-source product. Only the
maintainer uses it; every other user works in their own memory repo as a user. Project instruction:
`Before replying, read AGENTS.md in <owner>/career-os and follow it exactly.`
- **Role of the AI:** system architect. Designs and changes the framework; agents in users' memory
  repos are workers that use it and report problems as issues instead of changing it.
- **Read order:** this file → `README.md` → `docs/ARCHITECTURE.md` → open Issues of this repo
  (feedback from all users) → open `type: system` Issues of the maintainer's own memory repo
  (read-only; private — never copy personal details from there into this repo).
- **Feedback loop:** every user-side system issue ends up here, either posted by a user (sanitized,
  public) or picked up from the maintainer's memory repo. Each one is decided: fix, decline, or keep
  open; close it with a comment naming the commit. A decision that changes a rule updates
  `templates/memory-repo/AGENTS.md` and the docs in the same commit, and the maintainer's own memory
  repo `AGENTS.md` right after.
- **Principles:** one home per fact; minimal reads; nothing lost; works for weak models too (explicit
  rules, no guessing); no new infrastructure without a demonstrated need; no personal data here.
