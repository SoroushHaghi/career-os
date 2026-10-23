# Automation Operations Runbook

This is the safe operating guide for the Career OS ingestion automation.

## Normal mode

Normal operation should be automatic:

- permanent scanner trigger -> `checkDriveChanges()` approximately every 5 minutes;
- dynamic queue worker -> `processCareerOsQueues()` approximately every 1 minute only while work exists.

Do not manually run functions repeatedly just to make the system faster.

## Initialization warning

`initializeDriveWatcher()` is a **baseline/reset operation**, not a normal scan command.

It replaces the stored Drive Changes page token with a new start token. Running it again can skip unconsumed historical changes between the old token and the reset moment.

Therefore:

- run it only for first-time setup or an intentional watcher reset;
- do not run it for routine testing;
- do not use it as a repair step unless the reset consequence is understood.

## Safe manual scan

If a manual detection check is needed, use:

```text
checkDriveChanges()
```

A healthy no-op scan may log only that the Drive change check completed.

## Worker operation

`processCareerOsQueues()` is normally trigger-driven. A healthy worker may:

- complete one or more jobs;
- report that a retry is not due yet;
- report shared provider backoff and exit cleanly;
- receive HTTP 429, schedule a retry, and still finish with Apps Script status `Completed`.

`Completed` means the Apps Script execution itself did not crash. It does not necessarily mean all queued work finished.

## Useful log interpretations

Healthy examples:

- `SESSION_MANIFEST_UNCHANGED` — deterministic manifest did not need rewriting.
- `IMAGE_ALREADY_QUEUED` — duplicate queue insertion was prevented.
- `IMAGE_JOB_SKIPPED_ALREADY_DONE` — current source version already has a valid generated artifact.
- `IMAGE_OCR_DONE` / `IMAGE_JOB_COMPLETE` — image processing succeeded.
- `AUDIO_TRANSCRIPTION_SATISFIED_BY_EXISTING_TEXT` — credible existing transcript was reused.
- `GEMINI_GLOBAL_BACKOFF_ACTIVE_UNTIL` — worker correctly avoided another provider request during cooldown.
- `IMAGE_RETRY_SCHEDULED ... HTTP=429` — free-tier/rate quota caused a retry, not permanent failure.
- `QUEUE_WORKER_TRIGGER_REMOVED` — queues became empty and temporary worker trigger was cleaned up.

Investigate examples:

- repeated duplicate jobs for the same file ID + same fingerprint;
- worker trigger disappearing while queues remain non-empty;
- repeated manifest rewrites with no inventory/state change;
- source content change without a new fingerprint;
- ambiguous user-created text being overwritten;
- queue corruption errors;
- permanent errors on valid supported files without a clear non-retryable cause.

## Do not repair by deleting state first

Avoid deleting Script Properties, queues, source appProperties, or triggers as a first response. These objects contain resumable progress and deduplication state.

Preferred order:

1. read logs;
2. identify which layer failed: scanner, queue, provider, artifact write, manifest, or trigger lifecycle;
3. inspect current source fingerprint/state;
4. make the smallest correction;
5. allow the queue to resume;
6. verify resulting artifact and manifest.

## Quota behavior

Free-tier provider quota is an external availability constraint, not a source-data error.

On HTTP 429:
- keep the job;
- parse provider retry guidance when available;
- schedule retry with minimum worker-safe delay and jitter;
- set shared provider cooldown;
- do not immediately call another provider path in the same quota bucket.

Do not enable billing merely to make the documented baseline work. A paid configuration may be an optional future choice, not a requirement of the architecture.

## Testing old files

The Drive Changes API is incremental. A source that existed before the current page-token baseline and has not changed may not be rediscovered by the scanner.

To test ingestion, use a deliberate real source change or a new test source. Do not reset the watcher baseline just to rediscover old content.

## Safe shutdown / pause

If pausing the automation intentionally:
- preserve queue/script state unless a deliberate reset is required;
- disable triggers rather than deleting source/artifact metadata;
- document the pause reason and restart requirement if the pause is long-lived.

## Verification after code changes

After replacing runtime code:

1. save the script;
2. do not reinitialize the watcher unless the change explicitly requires a new baseline;
3. run one safe scanner check if needed;
4. observe the next trigger-driven worker execution;
5. verify generated files and `SESSION_MANIFEST.md` by read-back;
6. confirm no duplicate artifacts or repeated self-trigger loop appeared.
