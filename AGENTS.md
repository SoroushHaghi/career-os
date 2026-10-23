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
