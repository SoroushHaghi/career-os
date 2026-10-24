# Everyday workflows

Each workflow names what you do, what the agent does, and where the result lives.
"Agent" means an AI assistant working inside the matching project with write access to the
memory repository.

## You report something that happened
*"I submitted the application to X." · "Y rejected me." · "I passed the exam."*
- **Agent:** updates the single home of that fact in the same reply — for an application, swaps
  the Issue's `status:` label and adds a dated comment; for a grade, updates `MODULES/CAREER/`.
- **You see:** `📌 saved: … → …`

## You state a preference or a correction
*"I prefer shorter explanations." · "Don't suggest jobs in city Z." · "That was wrong."*
- **Agent:** saves it the same turn — area-specific to that workspace's `MEMORY.md`, general to
  `SYSTEM/USER_OPERATING_PROFILE.md` (and `CORE.md` if it changes every chat).

## A new opportunity is found
- **Agent:** creates an Issue with `status: candidate`, `type:` and `region:` labels, the official
  link and what still needs verification. Nothing is sent anywhere.

## You apply
1. Agent verifies the official posting (duration, language, location, fit).
2. You decide to pursue → agent prepares documents as drafts.
3. **You** review and press Submit/Send.
4. You tell the agent → label becomes `status: submitted`, comment with date.

## A new course starts
- Tell the agent. It creates `WORKSPACES/ACADEMIC/<COURSE>/` (`CURRENT_STATE.md`, `MEMORY.md` with the
  AI's role), adds one row to the `AGENTS.md` project map and gives you the one-line instruction for a new
  AI project. Nothing else.

## A course or area ends
- Move its workspace folder to `ARCHIVE/`, remove its row from the project map, archive the AI project.

## A study session
- Agent reads the workspace state, teaches or produces the material, and at the end rewrites
  `CURRENT_STATE.md` (where you are, exact next step) and adds a dated file in `SESSIONS/` if the
  detail is worth keeping.

## Weekly review (scheduled)
- Agent reads `CORE.md`, every `CURRENT_STATE.md`, open Issues and the calendar, and writes the
  week's top tasks (deadlines, follow-ups due, next study steps). You read one page.

## You have an idea to improve the system
- The agent opens an Issue (`type: system` + `kind: bug|idea`) in the same turn and continues the real
  task; a blocked task gets the smallest local fix now. General problems can be posted (sanitized, with
  your approval) to the public `career-os` Issues, where the maintainer decides on them.
