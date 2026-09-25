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
6. Route the task to one Primary Role plus optional Contributor Roles.
7. Read the relevant canonical module/workspace before relying on chat memory alone.

## Mandatory closeout behavior

Before the final answer of a meaningful task:

1. identify durable facts, decisions, evidence deltas, status changes, next actions, or workflow changes;
2. persist them to the correct canonical owner when write access exists;
3. refresh any materially stale workspace/current-state/next-action file;
4. verify important writes by read-back when practical;
5. if nothing durable changed, conclude internally `NO UPDATE REQUIRED`;
6. never tell the user that information was saved unless the write actually succeeded.

The user should not need to ask "save this", "document this", or "update the backend" for meaningful Career OS deltas.

## Failure behavior

If the session cannot access the required backend or lacks write capability:

- do not pretend persistence happened;
- clearly state that the backend could not be updated;
- preserve a compact structured handoff/delta in the response so another Career OS session can persist it;
- do not treat the chat as canonical storage.

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

This bootstrap must be referenced by the Career OS Project instructions (or equivalent always-loaded instruction layer). A file existing only in GitHub is not sufficient to make arbitrary new chats obey it automatically.
