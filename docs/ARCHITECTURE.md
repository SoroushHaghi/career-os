# Career OS — Architecture (v2)

This document explains how the system is built and why. It is meant to be readable by the person
who uses the system, not only by developers.

## 1. The problem it solves

A student using several AI assistants and tools at once runs into the same failures again and again:

- a chat forgets what was decided last week;
- the same fact (e.g. "application X was submitted") lives in a spreadsheet, a chat and a note,
  and the copies drift apart;
- status changes are lost because nobody wrote them down at the moment they happened;
- automation runs somewhere in the background, but nobody sees its output.

## 2. The design in five ideas

1. **One private repository is the memory.** Everything durable lives there. AI chats, project
   memories and apps are caches or windows; when they disagree with the repository, the
   repository wins.
2. **Agents work on the repository directly.** An AI agent that can read and commit to the
   repository is a *writer*. Any other agent is *read-only*. Nobody — including the user — copies
   state by hand between tools.
3. **Two kinds of information, two storage forms.**
   - **Documents** (things you read): Markdown files in the repository.
   - **Records** (things with a status that changes): GitHub Issues in the same repository,
     classified by labels.
4. **Small present, separate past.** Each area has one page describing *now* and the *exact next
   action*. History is kept, but in a separate folder that is not read by default. This keeps every
   new chat cheap and focused.
5. **Visible, enforced rules.** A handful of rules in one file (`AGENTS.md`), checked by automation
   where possible, and a visible receipt whenever something is saved.

## 3. Layers

```
INTERFACE    AI projects (one per area) · GitHub Issues on web/phone · weekly plan
AGENTS       any AI that can commit directly to the memory repo — rules in AGENTS.md
STATE        memory repo: documents (files) + records (Issues)
AUTOMATION   GitHub Actions (checks on every push) · scheduled AI tasks (weekly plan, scans)
EXTERNAL     Google Drive (raw files, final PDFs) · website repo · calendar
```

Only two runtimes exist: **AI agent sessions** and **GitHub Actions**. Nothing else needs to be
deployed, kept alive or given secrets.

## 4. Structure of the private memory repository

```
career-memory/
├─ AGENTS.md                 rules for every AI agent (from templates/memory-repo/AGENTS.md)
├─ CLAUDE.md / GEMINI.md …   one-line pointers to AGENTS.md (each tool reads its own file name)
├─ README.md                 short map of the repository
├─ SYSTEM/
│  ├─ CORE.md                one page: who the user is, goals, constraints, how to work with them
│  ├─ ARCHITECTURE.md        the instance's own design notes
│  ├─ USER_OPERATING_PROFILE.md   detailed preferences (reference, read on demand)
│  ├─ DECISION_LOG.md        decisions with reasons
│  ├─ PLAN.md / BACKLOG.md   approved system work / parked ideas
├─ MODULES/CAREER/           candidate evidence: education, skills, projects, experience
├─ CV/                       CV content without contact data
├─ WORKSPACES/
│  └─ <AREA>/<NAME>/
│     ├─ CURRENT_STATE.md    one page: status, what matters, exact next action
│     ├─ MEMORY.md           durable working preferences for this area
│     └─ SESSIONS/           dated history, never read by default
├─ SOURCES/                  references to raw material (Drive IDs), never the raw files
├─ ARCHIVE/                  superseded material, read-only
└─ .github/                  automated checks
```

Issues of the same repository hold the records, each with exactly one `status:` label plus
`type:` and `region:` labels (see `templates/memory-repo/labels.json`).

## 5. Where each kind of fact lives

| Fact | Single home |
|---|---|
| Who the user is, goals, constraints | `SYSTEM/CORE.md` |
| Detailed preferences | `SYSTEM/USER_OPERATING_PROFILE.md` |
| Preferences for one area | `WORKSPACES/<…>/MEMORY.md` |
| Candidate evidence (degrees, grades, skills, projects) | `MODULES/CAREER/` |
| Applications, inquiries, leads, scholarships | **GitHub Issues** |
| Present state of a course / language / search | `WORKSPACES/<…>/CURRENT_STATE.md` |
| History of an area | `WORKSPACES/<…>/SESSIONS/` |
| Decisions and their reasons | `SYSTEM/DECISION_LOG.md` |
| Raw files, recordings, final PDFs | Google Drive (referenced by file ID) |
| Anything superseded | `ARCHIVE/` |

If you are about to write the same fact in two places, one of them is wrong.

## 6. How a chat works

1. The AI project's instruction (four lines) points the agent to the memory repository.
2. The agent reads `AGENTS.md`, then `SYSTEM/CORE.md`, then the `CURRENT_STATE.md` of its area.
   It reads anything else only if the task needs it.
3. The agent does the work.
4. Whenever something durable happened (a status change, a decision, a preference, a correction),
   it commits **in the same reply** and ends with `📌 saved: <what> → <where>`.

## 7. Automation

| Automation | Trigger | Visible output |
|---|---|---|
| Repository checks (secrets, personal contact data, state size) | every push | green/red mark on the commit |
| Weekly plan | scheduled AI task, once a week | a plan file + notification |
| Opportunity scan | scheduled AI task, once a week | new Issues labelled `status: candidate` |

Rule: if an automation produces nothing the user actually sees, it is removed.

## 8. Privacy model

- The memory repository is private, but it still never holds passwords, tokens, personal contact
  data, ID numbers, raw documents, recordings or full transcripts. Those stay in Drive or locally.
- `career-os` is public and holds no personal data at all (`PRIVACY.md`).
- The automated check blocks common secret formats, private-mail-domain addresses and mobile numbers.

## 9. Lessons from v1

v1 was built quickly with many good ideas, but the parts did not form a working chain. Each flaw
below maps to one v2 principle.

| v1 flaw | Symptom | v2 principle |
|---|---|---|
| Same fact stored in many places | One application status in five places; audits just to reconcile them | One home per fact |
| State files used as append-only logs | 50–130 KB state files, expensive and confusing for every chat | One-page state, history separate |
| Process written as long prose for the AI (multi-step protocols, roles) | Agents skipped steps; behaviour depended on model attention | Few rules, enforced by structure and checks |
| Saving only when the user said "update" | Facts silently lost | Save in the same turn, with a visible receipt |
| Automation without delivery | A job feed ran for weeks; its results never reached the user | Every automation produces something visible |
| No single view | The user could not tell what was running or what came next | Records as Issues + weekly plan |
| Built as a product for everyone first | Every change had to be made twice (framework + instance) | Personal system first; framework kept small |
| Meta-work next to real work | More audit and migration files than content | Active vs archive separation |
| Many runtimes (chat app, Apps Script, Actions, Workers) | Each needed secrets, deployment and monitoring | Two runtimes only |
