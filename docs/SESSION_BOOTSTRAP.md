# Career OS Session Bootstrap

Status: ACTIVE / v1
Updated: 2026-09-25

## Purpose

This is the mandatory bootstrap contract for any interactive Career OS session.

It exists because repository architecture alone does not guarantee that a newly opened chat will automatically read or write Career OS state. The Project/session instruction layer must explicitly invoke the backend contract.

## Mandatory startup behavior

For any meaningful Career OS request, regardless of chat title or topic:

1. Treat Career OS as the persistent backend.
2. Load only the minimum required canonical context.
3. Start from private `career-memory/START_HERE.md`.
4. For broad/cross-domain/managerial work, also read `career-memory/SYSTEM/CONTROL_CENTER.md`.
5. Apply:
   - `career-os/docs/ROLE_REGISTRY.md`
   - `career-os/docs/CAPABILITY_REGISTRY.md`
   - `career-os/docs/WORKFLOW_REGISTRY.md`
   - `career-os/docs/ROUTING_PROTOCOL.md`
   - `career-os/docs/SESSION_HARVEST_PROTOCOL.md`
6. If this is the first meaningful request in the conversation, run the new-session harvest over the current conversation content available to the runtime.
7. Route the task to one Primary Role plus optional Contributor Roles.
8. Read the relevant canonical module/workspace before relying on chat memory alone.

## Mandatory closeout behavior

Before the final answer of a meaningful task:

1. run the Required Capture Pass and Agent Insight Pass from `SESSION_HARVEST_PROTOCOL.md`;
2. identify durable facts, decisions, evidence deltas, status changes, next actions, workflow changes, and any role-specific required fields;
3. persist them to the correct canonical owner when write access exists;
4. refresh any materially stale workspace/current-state/next-action file;
5. verify important writes by read-back when practical;
6. if nothing durable changed, conclude internally `NO UPDATE REQUIRED`;
7. never tell the user that information was saved unless the write actually succeeded.

The user should not need to ask "save this", "document this", or "update the backend" for meaningful Career OS deltas.

## Persistence failure behavior

Automatic persistence is the normal path. Manual handoff is not part of the standard workflow.

If a write fails:
1. distinguish transient failure from unavailable/misconfigured backend;
2. retry transient failures when safe;
3. if an approved durable pending-persistence queue is available, enqueue the delta automatically;
4. do not ask the user to copy/paste a handoff between chats;
5. do not treat the chat as canonical storage;
6. never claim persistence succeeded unless the write or durable enqueue actually succeeded.

Only when no approved write-capable backend or durable queue is available may the session end with a concise persistence-outage notice. Do not generate a manual handoff unless the user explicitly asks for one.

## Runtime rule

Normal Chat is the default interactive runtime.
Work mode, automations, and scripts are alternate executors.
The same routing and persistence contract applies to all runtimes.

## External-action boundary

Internal backend reads/writes that maintain Career OS state are not external publication actions.

Still require explicit user approval for:
- sending messages/emails;
- submitting applications/forms;
- publishing public content;
- changing public profiles/websites;
- purchases;
- destructive external actions.

## Project-instruction requirement

The always-loaded Project instruction layer should stay minimal and point here rather than duplicating this specification.

It only needs enough information to:
- identify the framework repository;
- identify the private memory/backend repository;
- require loading this bootstrap and the private `START_HERE.md`;
- require automatic persistence.

See `templates/PROJECT_INSTRUCTIONS_MINIMAL.md`.

A file existing only in GitHub is not sufficient to make arbitrary new chats obey it automatically; the host Project must contain the minimal pointer/binding.
