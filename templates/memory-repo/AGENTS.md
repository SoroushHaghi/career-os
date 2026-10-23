# AGENTS.md — operating rules for every AI agent

This file is the single, vendor-neutral rulebook for every AI agent working in this repository
(Claude, Gemini, ChatGPT, Codex or any future tool). Replace every `<placeholder>`.

## 1. Source of truth
- This repository (`<owner>/<memory-repo>`) is the only source of truth for Career OS state.
- An agent's own chat memory, project memory or conversation history is a cache. If it conflicts
  with this repository, the repository wins.

## 2. Who may write
- An agent may write here only if it can read and commit to this repository directly by itself.
- Agents without direct write access are read-only. They must not produce state, deltas or
  patches for the user to copy in by hand. No human relay of state.

## 3. Read order (keep reads minimal)
1. `SYSTEM/CORE.md` — who the user is, goals, constraints (one page).
2. The `CURRENT_STATE.md` of the workspace that matches the task (see map below).
3. Anything else only when the task actually needs it.

Do not load full histories or anything under `ARCHIVE/` by default.

## 4. Project → folder map
| Project (chat host) | Workspace | Canonical owners it may also use |
|---|---|---|
| <Career> | `SYSTEM/`, `WORKSPACES/CAREER/<SEARCH>/` | `MODULES/CAREER/`, `CV/`, GitHub Issues |
| <Course A> | `WORKSPACES/ACADEMIC/<COURSE_A>/` | — |
| <Language> | `WORKSPACES/PROJECTS/<LANGUAGE>/` | `MODULES/CAREER/EDUCATION.md` (read-only) |

A new course gets one folder `WORKSPACES/ACADEMIC/<COURSE>/CURRENT_STATE.md` and one row here.
Nothing more. Closed areas are not given a project.

## 5. Writing rules
- `CURRENT_STATE.md` = the compressed present: status, what matters, exact next action.
  Target one page (about 4 KB). Rewrite it; do not append to it.
- Session history and detail go to `<workspace>/SESSIONS/YYYY-MM-DD_<topic>.md`.
- Candidate facts live only in `MODULES/CAREER/`. Workspaces reference them and never duplicate them.
- **Records live in GitHub Issues of this repo, not in files.** One issue per application, lead or
  scholarship. Status = exactly one `status: …` label; also one `type: …` and one `region: …` label.
  A status change = swap the label + add a dated comment (what happened, evidence source).
  Open issue = still active; close it when final (rejected/declined/not-suitable/no-response).
  New lead = new issue with `status: candidate`. Never track applications in files or sheets.
- `git pull` before writing. Small, focused commits. Commit message: `[<project>] <what changed>`.
- Never claim a write succeeded unless the commit was pushed.
- **Commit in the same turn.** When the user reports a status change or a decision, commit it to
  its single home in that same response. Never wait for an "update" request.
- **Preferences and corrections count too.** When the user says how they want something done, save
  it the same turn: workspace-specific → that workspace's `MEMORY.md`; general →
  `SYSTEM/USER_OPERATING_PROFILE.md` (and `SYSTEM/CORE.md` if it changes how every chat works).
- **Visible receipt.** Every reply that wrote to the repo or to Issues ends with one line:
  `📌 saved: <what> → <file or issue #>`. No line = nothing was saved. Only after a successful push.
- Repository files and commit messages: <English>. Chat with the user: <language>.
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

## 8. System-change rule
Do not spend a session improving the system itself unless a real task is blocked by it. Otherwise
add the idea to `SYSTEM/BACKLOG.md` and continue the task.
