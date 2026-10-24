# Career OS rules — for every AI agent, in every project, for every user

These rules are written once, here. A user's memory repository holds only their data plus a short
`AGENTS.md` with their configuration (repo name, project map, local rules). Improving this file
improves every project of every user at once. Rules for editing `career-os` itself: `AGENTS.md`.

## 0. Start of every session (before your first reply)
1. Read this file.
2. Read the user's memory repo `AGENTS.md` (their configuration). Where it explicitly says a local
   rule replaces a rule here, the local rule wins; otherwise this file wins.
3. Read order (keep reads minimal). `<workspace>` = the workspace named in the project instructions;
   if none is named, it is `SYSTEM`. A workspace is any folder with its own `CURRENT_STATE.md`; it may
   contain child workspaces, which its `CURRENT_STATE.md` lists.
   1. `SYSTEM/CORE.md` — who the user is, goals, constraints, chat language (one page).
   2. `<workspace>/CURRENT_STATE.md` — present state and exact next action.
   3. `<workspace>/MEMORY.md` — the AI's role there, saved preferences and working rules.
   4. If the task belongs to a child workspace (or, from `SYSTEM`, to any area in the project map),
      also read that one's `CURRENT_STATE.md` and `MEMORY.md` before acting.
   5. Anything else only when the task actually needs it. Never load full histories or `ARCHIVE/` by default.

## 1. Source of truth
- The user's memory repo is the only source of truth for their state. An agent's chat memory,
  project memory or conversation history is a cache; if it conflicts with the repo, the repo wins.
- Conflicts inside the repo: the single home in `SYSTEM/ARCHITECTURE.md` ("Where each fact lives")
  wins over any copy; between two dated user statements, the newer one wins. Fix or remove the stale
  copy in the same turn; if the right value is genuinely unclear, ask.

## 2. Who may write
- An agent may write only if it can read and commit to the memory repo directly by itself. Others are
  read-only: they never produce state, deltas or patches for the user to copy in by hand.
- Work done in another AI reaches the repo the normal way: the user reports the outcome to a writer,
  which checks it and commits it. A read-only agent says plainly that nothing it produced was saved.

## 3. Projects and workspaces
- The project map (project → workspace → linked repos) is in the memory repo `AGENTS.md`.
- **New project:** the agent creates `WORKSPACES/<AREA>/<NAME>/CURRENT_STATE.md` and `MEMORY.md` (first
  section: the AI's role there), adds one row to the project map, and in the same reply gives the user
  the one-line project instruction (format: `templates/memory-repo/PROJECT_INSTRUCTIONS.md`) to paste
  into every AI tool they use. Nothing else goes into project instructions.
- Closed projects: move the folder to `ARCHIVE/`, remove the row, archive the AI project.
- **Linked repos** are outputs: content flows from the memory repo to them, never back. Nothing private
  goes there; every change needs the user's approval (§7) and is noted in the workspace's state.

## 4. Writing rules
- `CURRENT_STATE.md` = the compressed present: status, what matters, exact next action. About one
  page (4 KB). Rewrite it; never append. History goes to `<workspace>/SESSIONS/YYYY-MM-DD_<topic>.md`.
- **Procedures** (how to do a recurring task): in the workspace that uses it; in
  `SYSTEM/PROCEDURES/<NAME>.md` once a second workspace needs it. The workspace's state or memory names
  its procedures; read one only when the task needs it.
- **Role per project:** first section of the workspace's `MEMORY.md`; behaviour everywhere: `SYSTEM/CORE.md`.
- Candidate facts live only in `MODULES/CAREER/`; workspaces reference them, never copy them.
- **Records are GitHub Issues of the memory repo, never files or sheets.** One issue per application,
  lead or scholarship: exactly one `status: …`, one `type: …` and one `region: …` label. A status
  change = swap the label + dated comment (what happened, evidence). Open = active; close when final.
  New lead = `status: candidate`. System issues: `type: system` + `kind: bug|idea` (open = to do).
- `git pull` before writing. Small commits: `[<project>] <what changed>`, last line `Agent: <tool>`.
- **Commit in the same turn** when the user reports a status change, a decision, a preference or a
  correction (workspace-specific → its `MEMORY.md`; general → `SYSTEM/USER_OPERATING_PROFILE.md`, and
  `SYSTEM/CORE.md` if it changes how every chat works). The user never has to ask for an update.
- **Receipt:** every reply that wrote ends with one line in the chat language, e.g.
  `📌 saved: <what> → <file or issue #>` — only after a successful push. No line = nothing saved.
- **Nothing may be lost.** A failed push is not read-only. Retry with `git pull --rebase` + push up to
  3 times. If it still fails, end the reply with `⚠️ not saved: <what> — <reason> — your next message
  (any message) retries it`, show the unsaved change in full, and retry first thing in the next reply.
- Repository files and commits: English. Chat language: `SYSTEM/CORE.md`.

## 5. Evidence and privacy
- Every push runs the repo check (secrets, personal contact data, state size); fix errors, never bypass.
- Never fabricate achievements, grades, dates, experience or proficiency. Keep evidence labels
  explicit: `DEMONSTRATED`, `USER_CONFIRMED`, `DEVELOPING`, `PLANNED`, `INFERRED`, `UNVERIFIED`.
- Never store passwords, tokens, contact values, addresses, ID numbers, raw documents, recordings or
  full transcripts. Raw sources stay in the user's cloud storage, referenced by ID.

## 6. Honesty
- Tell the user plainly when their plan, request or assumption has a flaw, and why — and when your own
  earlier answer or design was wrong. Correct it instead of defending it.

## 7. When to ask, when to just act
- **Ask first only for:** sending a message, submitting an application, publishing or changing anything
  public, purchases, permanent deletion, and a decision that cannot be undone and could go either way.
- **Everything else: do it, verify it, report it** (repo edits, Issues, archiving, research, drafts,
  scheduled tasks, checks). Do not end replies with "shall I start?".

## 8. System problems and the feedback loop
- Agents in a memory repo are **users** of Career OS; they do not redesign these rules mid-task. The
  framework is changed only in `career-os` (maintainer project, see `AGENTS.md`).
- When an agent hits a system problem (a misleading rule, a failed tool, a missing file, a confusing
  state) or the user reports a system bug or idea, it opens an Issue in the memory repo in the same
  turn (`type: system` + `kind: bug|idea`; what happened, where, which agent, date) and continues the
  task. General problems may be posted, sanitized and with the user's approval, to `career-os` Issues.
- If a real task is blocked, make the smallest local fix now and still open the issue.
- If you cannot read this file, say so, follow only the safety core in the memory repo `AGENTS.md`,
  and open a `type: system` issue.
