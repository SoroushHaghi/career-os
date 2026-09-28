// Canonical Apps Script milestone-1 runtime configuration.
// Public defaults only; secrets/private IDs remain in Script Properties.

const CAREER_OS_CONFIG = {
  // Hard policy: keep this automation on services/models that currently expose a Free Tier.
  // This is a code-path guard, not a billing-account detector. Keep project billing disabled for a strict zero-charge setup.
  FREE_ONLY_MODE: true,
  FREE_TIER_GEMINI_MODELS: [
    'gemini-3.8-flash',
    'gemini-3.5-flash',
    'gemini-3.5-flash-lite',
    'gemini-3.5-transcribe'
  ],

  // Visual/document extraction:
  // - Gemini 3.8 Flash is the strongest current Flash model and the primary path.
  // - High media resolution for images preserves small text/detail.
  // - The Interactions DocumentContent schema currently has no per-document
  //   `resolution` field; leaving PDF resolution unset uses the current Gemini 3
  //   default allocation, which matches the recommended medium-class budget.
  // - Low thinking is intentional for mechanical extraction; do not spend reasoning budget on OCR.
  GEMINI_IMAGE_MODEL_PRIMARY: 'gemini-3.8-flash',
  GEMINI_IMAGE_MODEL_FALLBACK: 'gemini-3.5-flash-lite',
  GEMINI_IMAGE_THINKING_LEVEL: 'low',
  GEMINI_IMAGE_MEDIA_RESOLUTION: 'high',
  GEMINI_PDF_THINKING_LEVEL: 'low',

  // Audio architecture:
  // 1) Gemini 3.8 Flash is the canonical long-audio transcription path.
  // 2) Upload stays resumable via Files API, while transcription runs as a
  //    background Interactions job that later worker runs poll by ID.
  // 3) This prevents provider latency from consuming the Apps Script runtime window.
  GEMINI_AUDIO_TRANSCRIBE_MODEL: 'gemini-3.8-flash',
  GEMINI_AUDIO_FALLBACK_MODEL: 'gemini-3.5-flash',
  GEMINI_AUDIO_NAVIGATION_MODEL: 'gemini-3.8-flash',
  GEMINI_AUDIO_NAVIGATION_THINKING_LEVEL: 'low',

  ARTIFACT_SCHEMA_VERSION: '1.1',
  SOURCE_FINGERPRINT_SCHEMA_VERSION: '1.0',
  AUDIO_TIMESTAMP_MODE: 'model_generated_navigation_segments',
  AUDIO_TIMESTAMP_NOTE:
    'Navigation timestamps are generated separately by Gemini 3.8 Flash for locating topics; the canonical transcript body is verbatim speech-to-text and timestamps are not forensic word-level timing.',

  AUDIO_QUEUE_PROPERTY: 'AUDIO_JOB_QUEUE',
  IMAGE_QUEUE_PROPERTY: 'IMAGE_JOB_QUEUE',

  // Image OCR is queued instead of executed inside the Drive change scan.
  // Benchmark on Session 10: ~30 seconds/image. Give one worker enough room for
  // three sequential OCR jobs while staying far below Apps Script's 6-minute limit.
  IMAGE_WORK_BUDGET_MS: 105000,
  MAX_IMAGE_JOBS_PER_RUN: 3,
  MAX_IMAGE_QUEUE_LENGTH: 40,
  IMAGE_RETRY_MIN_MS: 60000,
  IMAGE_RETRY_MAX_MS: 15 * 60 * 1000,
  IMAGE_MAX_ATTEMPTS: 5,

  // Queue worker is created only while work exists.
  QUEUE_WORKER_FUNCTION: 'processCareerOsQueues',
  // Apps Script recurring minute triggers only accept 1, 5, 10, 15, or 30.
  // Use 1 minute while queued work exists; LockService safely skips overlap and
  // the trigger is removed automatically when the queues become idle.
  QUEUE_WORKER_EVERY_MINUTES: 1,
  GEMINI_GLOBAL_BACKOFF_PROPERTY: 'GEMINI_GLOBAL_BACKOFF_UNTIL',
  GEMINI_QUOTA_429_STREAK_PROPERTY: 'GEMINI_QUOTA_429_STREAK',
  GEMINI_QUOTA_CIRCUIT_LEVEL_PROPERTY: 'GEMINI_QUOTA_CIRCUIT_LEVEL',
  GEMINI_QUOTA_429_STREAK_THRESHOLD: 3,
  GEMINI_QUOTA_CIRCUIT_BREAKER_MIN_MS: 90 * 1000,
  GEMINI_QUOTA_CIRCUIT_BREAKER_MAX_MS: 5 * 60 * 1000,
  RETRY_JITTER_MAX_MS: 10000,
  // Retry policy v10: 3.8 Flash long-audio transcription uses background
  // Interactions with persisted polling state instead of a blocking provider call.
  RETRY_POLICY_VERSION_PROPERTY: 'CAREER_OS_RETRY_POLICY_VERSION',
  RETRY_POLICY_VERSION: 'career-os-audio-primary-3.8-background-v5',

  // Every real lecture/session folder gets one Career OS workspace.
  // Raw evidence stays in the session folder; text evidence and the
  // mechanical manifest live inside this workspace.
  SESSION_WORKSPACE_FOLDER: '_AI_WORKSPACE',
  SESSION_MANIFEST_FILE: 'SESSION_MANIFEST.md',
  SESSION_MANIFEST_SCHEMA_VERSION: '1.2',
  SESSION_STATUS_FILE_PREFIX: 'SESSION_STATUS__',
  SESSION_STATUS_SCHEMA_VERSION: '1.0',
  // One-time migration: create/refresh status markers for sessions that already
  // had a manifest before status markers were introduced. No Gemini call is made.
  SESSION_STATUS_BACKFILL_VERSION_PROPERTY: 'CAREER_OS_SESSION_STATUS_BACKFILL_VERSION',
  SESSION_STATUS_BACKFILL_VERSION: 'status-marker-strict-session-v4',
  SESSION_STATUS_BACKFILL_MAX_PER_RUN: 25,

  GENERATED_APP_PROPERTY_KEY: 'careerOsGenerated',
  GENERATED_APP_PROPERTY_VALUE: 'true',

  // 8 MiB chunks:
  // safely below Apps Script's 50 MB URL Fetch limit.
  AUDIO_CHUNK_TARGET_BYTES: 8 * 1024 * 1024,

  // Keep below Apps Script's 6-minute execution limit while leaving enough
  // headroom for cleanup/status writes after up to two model calls.
  AUDIO_WORK_BUDGET_MS: 300000,

  // Background submit/poll calls are short; keep modest cleanup headroom.
  AUDIO_TRANSCRIBE_MIN_REMAINING_MS: 30000,

  MAX_AUDIO_QUEUE_LENGTH: 8,
  AUDIO_RETRY_MIN_MS: 60000,
  AUDIO_RETRY_MAX_MS: 15 * 60 * 1000,
  AUDIO_MAX_ATTEMPTS: 12,
  AUDIO_BACKGROUND_POLL_MS: 60000,

  // PDF ingestion: use Google Drive -> Google Docs conversion first. This is a
  // Workspace/Drive operation and does not consume Gemini quota. If the
  // converted Doc contains no usable text, fall back to Gemini 3.8 Flash
  // with the PDF as a multimodal document input.
  PDF_DRIVE_IMPORT_MIN_TEXT_CHARS: 40,
  // Apps Script URL Fetch has its own payload ceiling. Base64 adds ~33%, so
  // keep direct Gemini PDF fallback comfortably below that ceiling.
  PDF_GEMINI_INLINE_MAX_BYTES: 34 * 1024 * 1024,
  PDF_BACKFILL_VERSION_PROPERTY: 'CAREER_OS_PDF_BACKFILL_VERSION',
  PDF_BACKFILL_VERSION: 'pdf-hybrid-inbox-v1'
};
