# 06 — Connector Contracts

Status: APPROVED
Updated: 2026-09-26

## Goal

Define how source systems plug into Career OS without leaking provider-specific behavior into the core.

Google Drive remains the first active connector and must retain its proven runtime behavior.

A connector is responsible for source-system mechanics only.

It does not own OCR, transcription, semantic reasoning, promotion, or learner-state truth.

---

## 1. Connector responsibilities

A source connector may provide:

```text
detect_changes
list_sources
describe_source
get_source_version
read_content
read_range
list_parent_context_hints
write_connector_metadata
acknowledge_cursor
```

Not every connector must implement every optional capability.

---

## 2. Core source contract

Every connector normalizes source metadata into the same logical envelope:

```text
source_system
source_id
source_version
source_type
name
mime_type
size?
modified_at?
account_or_scope
content_locator
context_hints[]
privacy/authorization hints?
provenance
```

Provider-native fields remain adapter details.

---

## 3. Cursor/change contract

For connectors that support incremental changes:

```text
ChangeBatch {
  cursor_before
  events[]
  cursor_after
}
```

Rules:
- cursor state is connector-owned;
- cursor advancement must not depend on AI provider success;
- events must be normalized/registered/queued durably enough before advancing;
- replay of the same change batch must be idempotent.

For Google Drive:

```text
cursor = Drive Changes page token
```

The current behavior is retained.

---

## 4. Metadata contract

A connector must expose enough metadata to build source identity/version and context hints.

For Drive, reuse:
- File ID;
- MIME type;
- name;
- parent folder IDs;
- MD5 checksum when available;
- size;
- modified time;
- appProperties;
- ownership/scope details where needed.

The connector may carry additional native metadata inside an adapter-owned metadata map.

Core logic must not require it.

---

## 5. Content access contract

Processors request content through connector/storage ports rather than calling Drive APIs directly.

Supported patterns may include:

```text
read_all()
read_range(start,end)
stream()
temporary_download_locator()
provider_upload_bridge()
```

Milestone 1 may keep the existing Drive byte-range/resumable-upload code inside the Drive adapter/runtime.

The abstraction exists so audio/video processing is not permanently tied to Apps Script API calls.

---

## 6. Context-hint contract

Connectors emit context hints, not canonical context truth.

Drive examples:
- direct parent folder ID;
- ancestor folder IDs;
- folder labels;
- known workspace markers such as _AI_WORKSPACE;
- current session-pattern match if useful.

Normalized hint shape:

```text
ContextHint {
  native_container_id
  label
  relation
  confidence
  method
}
```

The Context Resolver decides whether the source maps to:
- session;
- module;
- course;
- project;
- reference;
- unclassified.

A folder-name regex is one hint only.

---

## 7. Connector metadata writes

A connector may support safe metadata writeback.

For Drive this includes:

```text
appProperties
```

Allowed uses:
- Career OS generated-artifact ownership;
- source/artifact relationship;
- fingerprint/version reference;
- processing status;
- processor/profile version;
- context binding reference where useful.

Rules:
- no secrets;
- no provider temporary upload URLs/tokens;
- no user-sensitive summary merely for convenience;
- metadata-only updates must not create self-trigger processing loops.

The existing content-fingerprint rule protects against modifiedTime-only loops.

---

## 8. Artifact-store separation

Google Drive currently acts as both:

```text
source connector
+
active artifact store
```

These are logically separate interfaces even if one adapter implements both.

This matters because future deployments may use:

```text
source = OneDrive
artifact store = local/S3/Drive
```

without changing processors.

Milestone 1 does not require splitting the implementation physically.

---

## 9. Drive adapter compatibility map

```text
CURRENT DRIVE BEHAVIOR             CONNECTOR CONTRACT

Changes API scanner              -> detect_changes()
page token                       -> connector cursor
Drive File ID                    -> source_id
MD5 checksum                     -> source_version
parent folders                   -> context hints
Drive byte-range read            -> read_range()
Drive appProperties              -> connector metadata writeback
_AI_WORKSPACE creation           -> Drive artifact-store behavior
generated sidecar files          -> artifact-store writes
```

---

## 10. Change detection vs processing

Connector flow:

```text
Drive change
  -> Drive adapter
  -> normalized source event
  -> policy/context
  -> registry
  -> processor planner
```

Forbidden coupling:

```text
Drive adapter -> Gemini OCR directly
Drive adapter -> Career Memory claim promotion
Drive adapter -> learner-state update
```

Current Apps Script code may still physically contain these functions during migration, but the vNext boundary requires them to be conceptually and then incrementally separated.

---

## 11. Connector capability declaration

Each connector should eventually advertise supported capabilities.

Example:

```json
{
  "incremental_changes": true,
  "range_read": true,
  "native_checksum": true,
  "metadata_writeback": true,
  "artifact_write": true
}
```

This avoids hard-coded assumptions.

No registry service is required to support this declaration in milestone 1.

---

## 12. Error model

Connector errors should be classified separately from processor/provider errors.

Examples:

```text
AUTH_ERROR
NOT_FOUND
PERMISSION_DENIED
RATE_LIMITED
TEMPORARY_UNAVAILABLE
CONTENT_READ_ERROR
CURSOR_INVALID
METADATA_WRITE_ERROR
```

A connector failure must not be misreported as an OCR/transcription failure.

---

## 13. Cursor recovery

If a change cursor becomes invalid or stale:

- do not silently reset and assume no data was missed;
- record a recovery event;
- perform a bounded re-scan/inventory reconciliation;
- re-establish a valid cursor;
- rely on source/version idempotency to avoid duplicate heavy processing.

This gives a future recovery path without requiring one now.

---

## 14. Privacy boundary

Detection scope and AI-processing scope are different.

A connector may observe metadata broadly while processing authorization remains narrower.

Example:

```text
Drive scanner detects file
-> normalize/register metadata
-> authorization says NO cloud AI
-> source remains known but no provider processing occurs
```

This separation is required before broadening automatic processing.

---

## 15. Future connectors

The contract should support later adapters such as:
- local import;
- web/URL;
- OneDrive;
- Dropbox;
- email;
- GitHub;
- direct upload.

No future connector is required for milestone 1.

Drive remains the only implementation target until its vNext path is stable.

---

## Stage 6 decision gate

Approve or change:

1. connectors own source-system mechanics only;
2. Drive cursor/page-token behavior is retained;
3. context hierarchy is emitted as hints, not truth;
4. Drive may implement both connector and artifact-store interfaces initially;
5. current Drive metadata/range-read/appProperties behavior is reused;
6. processing/provider logic is incrementally moved behind non-Drive contracts;
7. no additional connector is implemented before the Drive vNext path is stable.

After approval, Stage 7 defines processor and provider contracts.
