---
name: reconcile-email
description: Match new employer/university emails (Outlook, Gmail …) with the application records in the memory repo and update them one by one — small steps, no guessing, no duplicates, nothing lost.
---

# Reconcile email with application records

Use when the user asks to check mail, or mail mentions an application, inquiry or interview.
Never reply to, send or delete any email (RULES.md §7).

## 1. Keep it small
- Read the cursor line `Email checked until: <date time>` in the search workspace's `CURRENT_STATE.md`.
  Look only at emails after it (first run: the last 14 days).
- Load only the **active** records: open issues labelled `status: inquiry`, `status: submitted`,
  `status: in-review` or `status: interview` (filter by label; never page through all issues).
- Skip newsletters, job alerts and your own sent mail unless it is an application or inquiry.

## 2. One email at a time, oldest first
1. **Match** by employer name (and reference number if any) against the active issue titles.
   Exactly one match → continue. None or several → put it on the "unclear" list; do not guess.
2. **Duplicate check:** if the issue already has a comment with this email's date and subject, skip it.
3. **Write:** add one dated comment: `<YYYY-MM-DD HH:MM> — <what happened> (email, subject: "<subject>")`.
   Change the status label only if the email clearly says so:
   rejection → `status: rejected` + close · invitation/test → `status: interview` · forwarded to a team →
   `status: in-review` · auto-reply or "please use the portal" → no status change; write the required
   next step in the comment.
4. **Verify:** re-read the issue; only then count it as done.

## 3. Finish
- Move the cursor line to the newest processed email and commit it.
- Reply with a short table: done (issue, change) · skipped (why) · unclear (email, what is missing),
  then the status light. Unclear items go into the `⏳` list until the user answers.
- If the tool cannot write issues, do not stop silently: give the user the done/unclear table and say
  plainly that nothing was saved (RULES.md §2), so a writer can record it.
