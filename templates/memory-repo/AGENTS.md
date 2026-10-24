# AGENTS.md — operating rules for every AI agent

This file is the single, vendor-neutral rulebook for every AI agent working in this repository
(Claude, Gemini, ChatGPT, Codex or any future tool). Replace every `<placeholder>`.

## 1. Source of truth
- This repository (`<owner>/<memory-repo>`) is the only source of truth for Career OS state.
- An agent's own chat memory, project memory or conversation history is a cache. If it conflicts
  with this repository, the repository wins.
- Conflicts inside the repository: the single home in `SYSTEM/ARCHITECTURE.md` ("Where each fact
  lives") wins over any copy; between two dated user statements, the newer one wins.
  Fix or remove the stale copy in the same turn; if the right value is genuinely unclear, ask.

## 2. Who may write
- An agent may write here only if it can read and commit to this repository directly by itself.
- Agents without direct write access are read-only. They must not produce state, deltas or
  patches for the user to copy in by hand. No human relay of state.
- Work done in another AI reaches the repo the normal way: the user reports the outcome to a writer,
  which checks it against the repo and commits it like any other user report. A read-only agent says
  plainly that nothing it produced has been saved.

## 3. Read order (keep reads minimal) — do this before your first reply
`<workspace>` = the workspace named in the project instructions; if none is named, it is `SYSTEM`.
A workspace is any folder with its own `CURRENT_STATE.md`; it may contain child workspaces, which its
`CURRENT_STATE.md` lists. Start at the named workspace and go down to a child only when the task is about it.
1. `SYSTEM/CORE.md` — who the user is, goals, constraints, chat language (one page).
2. `<workspace>/CURRENT_STATE.md` — present state and exact next action.
3. `<workspace>/MEMORY.md` — the AI's role there, saved preferences and working rules, if it has entries.
4. If the task belongs to a child workspace (or, from `SYSTEM`, to any area in §4), also read that
   one's `CURRENT_STATE.md` and `MEMORY.md` before acting.
5. Anything else only when the task actually needs it.

Do not load full histories or anything under `ARCHIVE/` by default.

## 4. Project → folder map
| Project | Workspace | Also uses | Linked repos (public outputs) |
|---|---|---|---|
| Career OS (whole system) | `SYSTEM` | every workspace, `MODULES/CAREER/`, `CV/`, Issues | <website repo> |
| ↳ <Search> | `WORKSPACES/CAREER/<SEARCH>` | `MODULES/CAREER/`, `CV/`, Issues | — |
| <Course A> | `WORKSPACES/ACADEMIC/<COURSE_A>` | — | — |
| <Language> | `WORKSPACES/PROJECTS/<LANGUAGE>` | `MODULES/CAREER/EDUCATION.md` (read-only) | — |

**Linked repos** are outputs: content flows from this repo to them, never back. Nothing private goes
there; every change to a public repo needs the user's approval (§7) and is noted afterwards in the
workspace's `CURRENT_STATE.md`. Most projects need none; one is added only when the user asks.

**New project** (course, language, search, anything): the agent creates
`WORKSPACES/<AREA>/<NAME>/CURRENT_STATE.md` and `MEMORY.md` (first section: the AI's role there), adds one
row above, and in the same reply gives the user this one line to paste into the project instructions of
every AI tool they use. This line is the only canonical copy; nothing else goes into project
instructions — rules, read order and preferences all live in this repo:
```
Before replying, read AGENTS.md in <owner>/<memory-repo> and follow it exactly. Workspace: <workspace>
```
For the whole-system project leave out ` Workspace: …` (the default is `SYSTEM`).
Closed projects: move the folder to `ARCHIVE/`, remove the row, archive the AI project.

## 5. Writing rules
- `CURRENT_STATE.md` = the compressed present: status, what matters, exact next action.
  Target one page (about 4 KB). Rewrite it; do not append to it.
- Session history and detail go to `<workspace>/SESSIONS/YYYY-MM-DD_<topic>.md`.
- **Procedures (how to do a recurring task):** project-specific → in that workspace; used by more than
  one workspace → `SYSTEM/PROCEDURES/<NAME>.md`. The workspace's `CURRENT_STATE.md` or `MEMORY.md`
  names the procedures it uses; read one only when the task needs it.
- Candidate facts live only in `MODULES/CAREER/`. Workspaces reference them and never duplicate them.
- **Records live in GitHub Issues of this repo, not in files.** One issue per application, lead or
  scholarship. Status = exactly one `status: …` label; also one `type: …` and one `region: …` label.
  A status change = swap the label + add a dated comment (what happened, evidence source).
  Open issue = still active; close it when final (rejected/declined/not-suitable/no-response).
  New lead = new issue with `status: candidate`. Never track applications in files or sheets.
  System issues (§8) are the exception: `type: system` + `kind: bug` or `kind: idea` (open = to do).
- `git pull` before writing. Small, focused commits. Commit message: `[<project>] <what changed>`,
  with a last line `Agent: <tool>` so it is clear which AI wrote it.
- Never claim a write succeeded unless the commit was pushed.
- **A failed push is not read-only.** If a writer's commit or push fails (conflict, network, rejected
  push): `git pull --rebase` and push again, up to 3 times. If it still fails, end the reply with
  `⚠️ not saved: <what> — <reason> — your next message (any message) retries it` instead of the
  receipt, and show the unsaved change in full so it survives in the chat. At the start of the next
  reply, retry first and report the result. Nothing may be dropped silently.
- **Commit in the same turn.** When the user reports a status change or a decision, commit it to
  its single home in that same response. Never wait for an "update" request.
- **Preferences and corrections count too.** When the user says how they want something done, save
  it the same turn: workspace-specific → that workspace's `MEMORY.md`; general →
  `SYSTEM/USER_OPERATING_PROFILE.md` (and `SYSTEM/CORE.md` if it changes how every chat works).
- **Visible receipt.** Every reply that wrote to the repo or to Issues ends with one line:
  `📌 saved: <what> → <file or issue #>`. No line = nothing was saved. Only after a successful push.
- Repository files and commit messages: English. The chat language is set in `SYSTEM/CORE.md`.
- One private repository for everything. A separate repository only for code the user explicitly
  decides to publish.

## 6. Evidence and privacy
- Every push runs `.github/scripts/check_repo.py` (secrets, personal contact data, state size).
  Run it before committing large changes; fix errors, do not bypass them.
- Never fabricate achievements, grades, dates, experience or proficiency. Keep evidence labels
  explicit (`DEMONSTRATED`, `USER_CONFIRMED`, `DEVELOPING`, `PLANNED`, `INFERRED`, `UNVERIFIED`).
- Never store passwords, tokens, contact values, addresses, ID numbers, raw documents, recordings
  or full transcripts here. Raw sources stay in cloud storage and are referenced by ID.

## 7. When to ask, when to just act
- **Ask first only for:** sending a message, submitting an application, publishing or changing
  anything public, purchases, permanent deletion, and a decision that cannot be undone and could
  reasonably go either way.
- **Everything else: do it, verify it yourself, report it** (repo edits, Issues, archiving, research,
  drafts, scheduled tasks, checks). Do not end replies with "shall I start?".

## 8. System problems and the feedback loop
- Agents here are **users** of Career OS. The framework itself is designed in the public
  `career-os` repository by its maintainer; do not redesign the rules here mid-task.
- **Nothing gets lost:** when an agent hits a system problem (a rule that misled it, a failed tool, a
  missing file, a confusing state) or the user reports a bug or idea about the system, it opens an
  Issue in this repo in the same turn: labels `type: system` + `kind: bug|idea`; body = what happened,
  where (workspace), which agent, date. Then it continues the real task.
- If the problem is about Career OS in general (not this user's data), the agent offers a sanitized
  copy for the public `career-os` Issues — posting it is public, so only with the user's approval.
- If a real task is blocked, make the smallest local fix needed now and still open the issue.
