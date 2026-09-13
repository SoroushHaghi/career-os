# Local Inventory Agent Brief

## Mission

Inspect a legacy/local Career OS workspace and produce a migration manifest **without moving or uploading source files**.

## Safety mode

Operate in **READ-ONLY INVENTORY MODE**.

Do not:
- modify, rename, move, delete, compress, or reorganize source files;
- upload raw files to GitHub or any external service;
- copy secrets or personal identifiers into the manifest;
- infer proficiency or verification status beyond the evidence available.

## Inspect

For each relevant file/folder, record only the minimum metadata required for migration planning:
- synthetic `item_id`;
- relative path or safely redacted location label;
- file type;
- approximate size when useful;
- likely purpose;
- likely sensitivity level;
- whether it appears to contain personal/sensitive data;
- likely migration destination;
- likely action;
- duplicate/deprecation hints;
- extraction targets, if applicable.

## Privacy filter

Do not reproduce in the manifest:
- phone numbers;
- private email addresses;
- postal addresses;
- student/matriculation IDs;
- passwords, tokens, recovery codes, API keys;
- passport/residence/bank/tax identifiers;
- raw CV contact blocks;
- secret keys;
- other highly sensitive personal information.

If detected, mark the item `BLOCKED_PRIVACY` or `KEEP_LOCAL` and describe only the category, not the value.

## Classification targets

- `CAREER_OS`: generic system/framework material only.
- `CAREER_MEMORY`: sanitized AI-safe personal facts, evidence, decisions, state, and references.
- `LOCAL_ONLY`: raw documents, raw CVs, certificates, PDFs, official sources, heavy files, sensitive content.
- `LEGACY_ARCHIVE`: deprecated, duplicate, or history-only content.

## Required outputs

Produce:
1. `MIGRATION_MAP.yaml`
2. `LEGACY_INVENTORY.md`
3. `PRIVACY_EXCLUSIONS.md`
4. `MIGRATION_STATUS.md`

The outputs must contain no raw sensitive values.

## Stop condition

Do not perform migration itself. Stop after the inventory and classification package is complete and reviewable.
