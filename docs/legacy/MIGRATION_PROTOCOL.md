# Migration Protocol

This protocol governs migration from legacy/local Career OS workspaces into the current split architecture.

## Core rule

Migrate **validated knowledge and required protected system state**, not folder clutter.

Do not bulk-copy a legacy workspace into GitHub. Inventory, classify, sanitize, then selectively migrate.

## Migration phases

1. **Freeze legacy state**
   - treat legacy workspace as read-only during inventory;
   - do not rename/delete/reorganize sources first.

2. **Inventory only**
   - inspect names, paths, types, likely purpose, sensitivity, and authority;
   - do not upload raw sensitive source material merely to simplify migration.

3. **Classify destination**
   - `CAREER_OS` — reusable/public-safe framework material;
   - `CAREER_MEMORY` — sanitized durable private state/knowledge or explicitly protected safe internal snapshots;
   - `SOURCE_STORAGE` — raw/bulky/sensitive source evidence retained in Drive/local archival storage;
   - `LEGACY_ARCHIVE` — deprecated/duplicate/low-value historical material.

4. **Extract durable truth**
   - prefer canonical facts/evidence/decisions/state over copying entire documents;
   - preserve provenance;
   - do not silently upgrade inference/claims to verified fact.

5. **Verify and cut over**
   - test representative workflows/questions;
   - only after verification should the new system become canonical;
   - legacy workspace becomes archive, not a second live truth store.

## Ingestion artifacts are not automatically migration targets

Session OCR/transcripts and `SESSION_MANIFEST.md` are active source-processing artifacts. Their existence does not mean they should automatically be copied into `career-memory`.

Promote only durable outputs/state that materially improve continuity, retrieval, evidence, or recoverability.

## Privacy requirements

Never place credentials, raw highly sensitive originals, private identifiers, or public-unsafe source content into `career-os`.

`career-memory` is private but still follows data minimization. Raw source binaries and credentials remain outside Git unless a later explicit policy provides a justified exception.

## Status vocabulary

- `NOT_REVIEWED`
- `KEEP_SOURCE_STORAGE`
- `EXTRACT_TO_MEMORY`
- `MOVE_TO_SYSTEM`
- `ARCHIVE`
- `IGNORE`
- `BLOCKED_PRIVACY`
- `MIGRATED`
- `VERIFIED`

## Evidence states

Use explicit states where applicable:
- `VERIFIED`
- `USER_CONFIRMED`
- `INFERRED`
- `CLAIMED_UNVERIFIED`
- `DEVELOPING`
- `PLANNED`

AI inference must not become verified fact without evidence or explicit confirmation.

## Output expectation

A migration pass should produce a manifest/delta plan, not a blind bulk upload. Review it before selective migration.
