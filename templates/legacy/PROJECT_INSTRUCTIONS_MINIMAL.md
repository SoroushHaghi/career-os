# Minimal Career OS Project Instructions

Use this as the always-loaded instruction layer in a ChatGPT Project or equivalent host.

Replace the two repository bindings for each installation.

```text
This Project uses Career OS.
Framework: <OWNER/CAREER-OS-REPO>
Private backend: <OWNER/PRIVATE-CAREER-MEMORY-REPO>

For every meaningful request, load and follow Framework/docs/SESSION_BOOTSTRAP.md and Private backend/START_HERE.md as the authoritative operating contract. Persist meaningful durable deltas automatically to their canonical owner; do not leave material state only in chat.
```

## Why this stays small

The Project instruction is only a bootstrap pointer. Roles, workflows, privacy, routing, persistence, storage, evidence rules, automation behavior, and future revisions live in the repositories.

This keeps:
- host-specific instructions short;
- system behavior version-controlled;
- upgrades centralized;
- other users able to reuse/fork Career OS without copying a large prompt;
- arbitrary chats consistent as long as the host loads this pointer.

## Installation rule

The host must provide read access to the framework repository and read/write access to the private backend repository for automatic persistence.

If the host cannot write to the private backend, Career OS cannot guarantee persistence regardless of prompt design. In that case the installation is incomplete rather than a normal operating mode.
