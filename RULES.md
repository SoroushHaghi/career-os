# Career OS rules — for every AI agent, in every project, for every user

Version 2.10.0 (2026-10-24) · semantic versioning · changes: `CHANGELOG.md`

These rules are written once, here. A user's memory repository holds only their data plus a short
`AGENTS.md` with their configuration (repo name, project map, local rules). Improving this file
improves every project of every user at once. This is the **user** side. Rules for changing Career OS
itself (maintainer side) are in `AGENTS.md` — never apply them while doing a user's work.

## 0. Start of every session (before your first reply)
The project instruction only names the user's memory repo and a **project name**; it never changes.
Everything else is resolved from the memory repo, so repos and folders can move without touching any
AI project.
1. Read the memory repo `AGENTS.md` (the user's configuration). It says where these rules are.
2. Read this file (the version the configuration names).
   **Personalisation, from general to specific:** this file (same for everyone) → the memory repo's
   `AGENTS.md` "Local rules" (may replace a rule here, explicitly) → `SYSTEM/CORE.md` and
   `SYSTEM/USER_OPERATING_PROFILE.md` (the person: language, tone, preferences) → the workspace's
   `MEMORY.md` (the AI's role and preferences in that project). The more specific one wins on style,
   role and working method; only "Local rules" can change a rule of this file.
3. Read order (keep reads minimal). `<workspace>` = the workspace that the project map in the memory
   repo `AGENTS.md` gives for the project named in the instruction (an explicit `Workspace:` path in an
   older instruction also works); if no project is named, it is `SYSTEM`. A workspace is any folder with its own `CURRENT_STATE.md`; it may
   contain child workspaces, which its `CURRENT_STATE.md` lists.
   1. `SYSTEM/CORE.md` — who the user is, goals, constraints, chat language (one page).
   2. `<workspace>/CURRENT_STATE.md` — present state and exact next action.
   3. `<workspace>/MEMORY.md` — the AI's role there, saved preferences and working rules.
   4. If the task belongs to a child workspace (or, from `SYSTEM`, to any area in the project map),
      also read that one's `CURRENT_STATE.md` and `MEMORY.md` before acting.
   5. Anything else only when the task actually needs it. Never load full histories or `ARCHIVE/` by default.

## Catch-up: harvest what lives outside the repo — automatically, without being asked
Right after the reads of §0 and before answering, check two sources the repo may not have yet:
1. **This chat's earlier messages** (e.g. an old chat now running under Career OS instructions, or a
   chat moved into the project). If they contain durable facts, decisions, preferences, state or next
   actions that are not in the repo, save them now (method: `career-os/skills/import-from-other-ai`).
2. **The tool's own saved memory about the user** (if the tool has one and you can see it): import the
   durable items that are missing, same method.
Then note it in the workspace's `MEMORY.md` under "Imported" (`<date> · <tool> · chat/memory · <topic>`)
so it is never done twice, mention it in one line, and answer the user's message.

**Later gaps: your judgment.** If you later notice something missing, outdated or contradictory in the
files you read, decide whether it matters for the user's future work. If it does, fix it — now, or
together with the next save, or at the end of the topic. If it does not, leave it. Do not go looking
for gaps and do not turn every reply into maintenance.
The user never has to ask; to bring in an old chat, they only open it in the right project and write anything.

## Session-start line (proof that the files were really read)
The first reply of every chat starts with exactly one line, filled from the files you actually opened:
`📂 <project> · rules v<version of this file> · state <date in the workspace's CURRENT_STATE.md>`
If a file could not be opened, write `⚠️ offline: <file> could not be read` instead and switch to offline mode.
A missing or wrong line tells the user at a glance that the agent did not load Career OS.

## Offline mode (the repo cannot be reached — keep helping, lose nothing)
- The tool's own memory (chat memory, project memory) is a cache. Offline it is useful: keep helping
  from it and from this chat, but mark such facts `(from memory, may be outdated)`. Never present a
  remembered status, deadline or grade as current.
- Save nothing and claim no save. Every fact, decision, preference or correction the user gives while
  offline goes into a visible list at the end of each reply: `⏳ to save when back online: …`.
- **Back online** (any later reply in this chat or the next session that can open the repo): before
  anything else, sync — read the files of §0, compare them with the `⏳` list and with what you said from
  memory, commit the list to its homes, tell the user in one short block what was saved and anything
  that differed (the repo wins; a newer statement by the user wins over the repo), then continue.
- With the tool's memory switched off, the same rules apply; only the chat itself is the cache.

## Checklist (every reply — follow it step by step; slower is fine, guessing is not)
1. Did I read the files of §0 for this workspace in this session? If not, read them now.
2. Is everything I state backed by a file, an issue or the user's words? If not, say "unknown" or ask.
3. Did the user report a fact, decision, preference or correction? Then save it now (§4).
4. Did I write anything? Then check the push succeeded. End the reply with the status light (§4):
   green only with proof, yellow/red with the `⏳` count. Never say "saved" without a push.
5. Am I about to send, submit, publish, buy or delete permanently? Then ask first (§7).
6. Was a rule unclear or did a step fail? Then open a system issue (§8) instead of improvising.

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
- **A project with its own repository** (an app, a tool, a portfolio — anything that is not just notes)
  is still a normal Career OS project: its workspace in the memory repo holds the state, decisions,
  next action and the AI's role; its own repo holds the code or product. The repo is listed in the
  project map ("Linked repos") and gets a root `AGENTS.md` with the same one-line project instruction
  (plus `CLAUDE.md`/`GEMINI.md` pointers), so any AI that opens that repo directly joins Career OS.
  Create a separate repo only when the user asks for one; most projects need none.
- Linked repos never become a second source of truth: state and decisions stay in the memory repo.
  Nothing private goes into a public repo, and every change to a public repo needs the user's
  approval (§7) and is noted in the workspace's `CURRENT_STATE.md`.

## 4. Writing rules
- `CURRENT_STATE.md` = the compressed present: status, what matters, exact next action. About one
  page (4 KB). Rewrite it; never append. History goes to `<workspace>/SESSIONS/YYYY-MM-DD_<topic>.md`.
- **Procedures are skills in the open Agent Skills format** (`<name>/SKILL.md`: YAML front matter with
  `name` and `description`, then the instructions; optional `scripts/`, `references/`). Tools that
  support skills load them by themselves; every other agent reads the `SKILL.md` as plain Markdown.
  Where: generic skills (useful to every user) in `career-os/skills/`; personal ones in the memory repo,
  in the workspace that uses them (`<workspace>/skills/`) or in `SYSTEM/skills/` once a second workspace
  needs them. The workspace's state or memory names its skills; read one only when the task needs it.
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
- **Status light — the last line of every reply, no exceptions** (labels in the chat language):
  | Light | Meaning |
  |---|---|
  | `🟢` | repo reachable this reply, nothing waiting, nothing needed saving |
  | `🟢 📌 <CODE>-<commit> <what>` | saved now; `<CODE>-<commit>` is the **reference** (one 📌 per item) |
  | `🟡 ⏳<n> <reason>` | repo reachable but a save failed; `n` items wait, listed above in full; retried first thing next reply |
  | `🔴 ⏳<n>` | offline (see offline mode); `n` items wait, listed above in full |
  Rules: green only if you actually opened a repo file or pushed in this reply; `n` always equals the
  number of items in the visible `⏳` list; never green while anything waits. A missing light means the
  agent did not follow Career OS — the user can say so and it becomes a `kind: bug` system issue.
- **References — one short code per saved topic, nothing extra stored.** `<CODE>` is the project's code
  from the project map, `<commit>` the 7-character commit hash, e.g. `QPL-a92545a`. The user can paste a
  reference into any chat, in any tool. Then: open that project's files at the latest version, look at the
  commit (`git show <commit>`: what was saved, why, which agent) and at later commits that touched the
  same files (`git log <commit>..HEAD -- <those files>`), and answer from the **latest** state — say in
  one line if it changed since the reference. The reply's first line repeats it: `📂 <CODE>-<commit> · now: <date>`.
- **Nothing may be lost.** A failed push is not read-only. Retry with `git pull --rebase` + push up to
  3 times. If it still fails: yellow light, show the unsaved change in full under `⏳`, and retry first
  thing in the next reply, whatever the user writes.
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
- **An explicit request is the approval.** If the user's message already asks for exactly this action
  ("send it", "submit it", "publish it"), do it without asking again. Ask only when the action was not
  requested, or when what you found does not match what the user described.
- **Everything else: do it, verify it, report it** (repo edits, Issues, archiving, research, drafts,
  scheduled tasks, checks). Do not end replies with "shall I start?".

## 8. Feedback: personal vs general
- Agents in a memory repo are **users** of Career OS; they do not redesign these rules mid-task. The
  framework is changed only in `career-os` (maintainer project, see `AGENTS.md`).
- **Capture first, for this user, in the same turn — nothing is lost.** A preference or correction goes
  to its personal home (§4). A system problem (misleading rule, failed tool, missing file, confusing
  state) or a system bug/idea the user reports becomes an Issue in the memory repo: `type: system` +
  `kind: bug|idea` + one scope label; body = what happened, where, which agent, date. Then continue.
- **Scope — the agent decides and writes the reason in one line; the user can change it:**
  - `scope: personal` — depends on this user's situation, taste, data or setup (a teaching style, a
    region, a file of theirs). Solved inside the memory repo (`MEMORY.md`, `CORE.md`, or a "Local rule").
    Never sent to `career-os`.
  - `scope: general` — would help a different student in a different situation too, or is about
    correctness (something lost, a rule that misleads, a broken step). Decided by the maintainer in
    `career-os`.
- **How a general issue reaches the maintainer — never posted directly, always through three privacy
  layers** (same at every boundary: memory repo → framework repo → public repo):
  1. **Self-check:** write the report as `OUTBOX/feedback/<YYYY-MM-DD>_<slug>.md` (front matter: `title`,
     `kind: bug|idea`, `second_check`, `local_issue`), sanitized: no names, employers, places, dates of
     personal events, grades, file IDs, links to private things. Then run
     `python3 <framework>/tools/privacy_check.py --denylist SYSTEM/PRIVACY_DENYLIST.txt <file>` and fix every finding.
  2. **Independent review:** a second agent that did not write the text (or, if the tool cannot start one,
     a new step that re-reads only the file against this list) checks it and writes who did it into
     `second_check`. Empty `second_check` = the file is rejected.
  3. **Automatic gate:** committing the file triggers the memory repo's `feedback-outbox` workflow, which
     runs the check again with the private denylist and posts only if it passes; otherwise it opens a
     local issue "Feedback not sent" and nothing leaves the repo.
  `Feedback to career-os:` in the memory repo `AGENTS.md`: `auto` = write to the outbox without asking;
  `ask` = ask first; `off` = keep it local. The local issue gets the public link once posted.
- `SYSTEM/PRIVACY_DENYLIST.txt` in the memory repo lists the user's private terms (names, places,
  institutions, employers). Add new ones the moment they appear; it never leaves the memory repo.
- **When a general fix lands in `RULES.md`,** the personal workaround for it (a Local rule or a
  `MEMORY.md` line) is removed in the same session, so nothing is written twice.
- If a real task is blocked, make the smallest local fix now and still open the issue.
- If you cannot read this file, say so, follow only the safety core in the memory repo `AGENTS.md`,
  and open a `type: system` issue.
