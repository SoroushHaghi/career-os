# Setting up your own Career OS

Time: about one hour. Cost: free (GitHub free plan; any AI assistant that can work with GitHub).

## 1. Create the private memory repository
1. On GitHub, create a **private** repository, e.g. `career-memory`.
2. Copy everything from [`templates/memory-repo/`](../templates/memory-repo/) into it, keeping the
   folder structure (`AGENTS.md`, `CLAUDE.md`, `SYSTEM/CORE.md`, `.github/…`, `WORKSPACES/…`).
3. Replace every `<placeholder>` in `AGENTS.md` and `SYSTEM/CORE.md`.

## 2. Fill in the one-page context
Edit `SYSTEM/CORE.md`: who you are, your current goals, constraints and how an AI should work with
you. Keep it to one page — it is read at the start of every chat.

## 3. Create one workspace per active area
For each course, language or search you are working on, create
`WORKSPACES/<AREA>/<NAME>/CURRENT_STATE.md` from
[`templates/memory-repo/WORKSPACES/_TEMPLATE/CURRENT_STATE.md`](../templates/memory-repo/WORKSPACES/_TEMPLATE/CURRENT_STATE.md),
and add one row to the project map in `AGENTS.md`. Closed areas get no workspace (or move to `ARCHIVE/`).

## 4. Create the record labels
Create the labels from [`templates/memory-repo/labels.json`](../templates/memory-repo/labels.json)
in the repository's Issues settings — or let your AI agent create them through the GitHub API.
Then create one Issue per application, inquiry or lead.

## 5. Turn on the automated checks
The template already contains `.github/workflows/repo-checks.yml` and
`.github/scripts/check_repo.py`. After the first push, open the **Actions** tab and confirm the
check is green.

## 6. Connect your AI assistant
1. Give the assistant access to the private repository (e.g. Claude's GitHub integration).
2. Create one **AI project** per workspace. Leave the project's knowledge files empty — the
   repository is the knowledge. Paste the instruction from
   [`templates/memory-repo/PROJECT_INSTRUCTIONS.md`](../templates/memory-repo/PROJECT_INSTRUCTIONS.md),
   changing the project name and path.
3. Optional: connect Google Drive (raw files) and a calendar.

Do **not** add the repository as synced project knowledge: a synced copy goes stale and becomes a
second source of truth. The agent should read the live repository instead.

## 7. Check that it works
In a new chat inside one project, say something that changes state, e.g. "I submitted the
application to X today". The reply must end with a `📌` receipt line, and the change must be visible
on GitHub (a commit, or a label/comment on the Issue).

## 8. Weekly loop (optional, recommended)
Create a scheduled AI task that runs once a week, reads `SYSTEM/CORE.md`, all `CURRENT_STATE.md`
files, open Issues and the calendar, and writes the week's top tasks. See `WORKFLOWS.md`.
