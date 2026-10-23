# Source Registry Contract

Status: TARGET CONTRACT / v1
Updated: 2026-09-26

## Purpose

The Source Registry is the fast lookup layer between raw inputs and Career OS reasoning. It records which sources exist, which content version was processed, which derivatives are ready, where they live, and what compact semantic profile is available. It does not store raw private media.

## Identity

Logical source identity:
`source_system + source_id`

Processing identity additionally includes:
`source_version + processor_version`

## Record fields

- source_system
- source_id
- source_version
- source_type
- mime_type
- name
- normalized parent/workspace/session context
- privacy class and processing authorization
- ingestion/preprocessing/enrichment/promotion status
- references to transcript/text/timeline/visual-notes/synthesis artifacts
- compact semantic digest
- topics/entities/dates
- promotion candidates
- uncertainty/conflict flags
- processing provenance and timestamps

## Rules

1. Registry metadata may be durable while raw source artifacts remain in Drive or another source system.
2. Never store credentials or temporary provider authorization material in the registry.
3. Raw transcript/media content is referenced rather than copied into the public system repository.
4. User-specific semantic fields belong only in an approved private registry implementation.
5. Updates are idempotent by source and version.
6. Registry presence does not imply a verified career claim.
7. Agents should consult registry/semantic-profile retrieval before reopening raw media.

## Backend boundary

The contract is backend-neutral. Initial operational state may remain in Apps Script/Drive while a durable private registry implementation is introduced. The interface must allow a later move to a database without changing connector or processor contracts.
