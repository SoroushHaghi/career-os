---
name: import-from-other-ai
description: Bring durable information that still lives outside Career OS (old ChatGPT/Gemini/Claude chats, an AI's saved memory, a data export) into the user's memory repo — distilled, sorted to the right homes, nothing lost, no transcripts stored.
---

# Import from another AI

Use when the user wants knowledge from chats, AI memory or exports outside Career OS to become durable.

## Automatic by default
RULES.md "Catch-up" runs this skill on its own the first time an agent answers in a chat that has earlier,
not-yet-imported messages, and for the tool's saved memory. The user only opens an old chat in the right
project (or moves it there) and writes anything. The ways below are for material the agent cannot see.

## Three ways in (best first)
1. **The other AI harvests itself.** If that AI can write to the memory repo, open the old chat or project
   there and send: *"Harvest this chat into Career OS: read AGENTS.md in <memory repo>, then save only
   the durable facts, decisions, preferences, state and next actions to their homes, with receipts."*
   It follows RULES.md like any agent. Repeat per old chat/project. No copy-paste.
2. **Saved AI memory.** In the other tool's settings, open its saved memory list, copy it, and paste it
   into a Career OS chat with: *"Import this memory list."*
3. **Full export.** Download the tool's data export (e.g. ChatGPT: Settings → Data controls → Export)
   and attach the archive in a Career OS chat with: *"Import this export, workspace by workspace."*
   The archive itself is never committed.

## What the agent does with the material
1. **Sort** every item: fact about the user → `MODULES/CAREER/` or `SYSTEM/CORE.md`; preference →
   `SYSTEM/USER_OPERATING_PROFILE.md` or a workspace `MEMORY.md`; project state / next action → that
   workspace's `CURRENT_STATE.md`; decision → `SYSTEM/DECISION_LOG.md`; application or lead → its record;
   new area with no workspace → propose a new project (RULES.md §3). Small talk and one-off answers: drop.
2. **Compare with the repo first.** Already there → skip. Conflicts → the repo wins unless the imported
   item is clearly newer and the user confirms it; list every conflict for the user in one block.
3. **Label evidence honestly:** `USER_CONFIRMED` only for things the user stated; everything an AI
   concluded is `INFERRED`; add `source: imported from <tool>, <date of the chat>`.
4. **Private terms:** add new names, places, institutions or employers that appear to
   `SYSTEM/PRIVACY_DENYLIST.txt`.
5. **Never store** transcripts, raw exports, contact data or IDs (RULES.md §5). Optional: one short
   summary per imported chat in the workspace's `SESSIONS/`.
6. **Work in batches** (one workspace or one chat at a time), commit each batch, and end each reply with
   the status light. Keep a visible `⏳` list of chats or topics not yet imported until it is empty.
