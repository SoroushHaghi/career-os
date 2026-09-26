const CAREER_OS_CONFIG = {
  // Hard policy: keep this automation on services/models that currently expose a Free Tier.
  // This is a code-path guard, not a billing-account detector. Keep project billing disabled for a strict zero-charge setup.
  FREE_ONLY_MODE: true,
  FREE_TIER_GEMINI_MODELS: [
    'gemini-3.8-flash',
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
  // 1) Dedicated Gemini 3.5 Transcribe produces the canonical verbatim transcript.
  // 2) Gemini 3.8 Flash creates a navigation index with approximate timestamps.
  // 3) If Transcribe cannot accept the file (for example >1 hour) or is unavailable,
  //    Gemini 3.8 Flash becomes the faithful timestamped-transcript fallback.
  GEMINI_AUDIO_TRANSCRIBE_MODEL: 'gemini-3.5-transcribe',
  GEMINI_AUDIO_FALLBACK_MODEL: 'gemini-3.8-flash',
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
  // Retry policy v7: 3.8 Flash handles visual/document extraction and audio
  // navigation/fallback; 3.5 Transcribe handles canonical speech-to-text.
  // Existing quota/backoff state is cleared once so the new routing starts clean.
  RETRY_POLICY_VERSION_PROPERTY: 'CAREER_OS_RETRY_POLICY_VERSION',
  RETRY_POLICY_VERSION: 'career-os-gemini-3.8-transcribe-3.5-v2',

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

  // Dedicated transcription plus optional 3.8 navigation can require two long
  // inference calls. Defer to the next worker run unless enough time remains.
  AUDIO_TRANSCRIBE_MIN_REMAINING_MS: 240000,

  MAX_AUDIO_QUEUE_LENGTH: 8,
  AUDIO_RETRY_MIN_MS: 60000,
  AUDIO_RETRY_MAX_MS: 15 * 60 * 1000,
  AUDIO_MAX_ATTEMPTS: 5,

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


function initializeDriveWatcher() {
  const props =
    PropertiesService.getScriptProperties();

  const existingToken =
    props.getProperty('DRIVE_PAGE_TOKEN');

  // Safety rule: initialization is idempotent. Once a watcher token exists,
  // this function MUST NOT silently reset it and skip unseen Drive changes.
  if (existingToken) {
    console.log(
      'WATCHER_ALREADY_INITIALIZED_NO_RESET: ' +
      existingToken
    );
    return;
  }

  const token =
    Drive.Changes
      .getStartPageToken()
      .startPageToken;

  props.setProperty(
    'DRIVE_PAGE_TOKEN',
    token
  );

  console.log('Watcher initialized.');
  console.log('Start token: ' + token);
}


function checkDriveChanges() {
  const lock = LockService.getScriptLock();

  if (!lock.tryLock(1000)) {
    console.log(
      'SCANNER_SKIP_LOCKED: another Career OS execution is already running.'
    );
    return;
  }

  try {
    assertFreeOnlyConfiguration_();
    migrateRetryPolicyState_();
    backfillSessionStatusMarkersOnce_();
    // Recover PDFs that were previously inventoried as DEFERRED before PDF
    // extraction existed. Process at most one existing INBOX PDF per scanner
    // run so the scanner remains bounded.
    backfillOneDeferredInboxPdf_();

    // Scanner only detects changes and enqueues work. Heavy AI work is
    // intentionally separated into processCareerOsQueues().
    scanDriveChanges_();
  } finally {
    try {
      ensureQueueWorkerTriggerIfNeeded_();
    } catch (error) {
      console.log(
        'QUEUE_WORKER_TRIGGER_WARNING: ' +
        String(error)
      );
    }

    lock.releaseLock();
  }
}


function processCareerOsQueues() {
  const lock = LockService.getScriptLock();

  if (!lock.tryLock(1000)) {
    console.log(
      'WORKER_SKIP_LOCKED: another Career OS execution is already running.'
    );
    return;
  }

  try {
    assertFreeOnlyConfiguration_();
    migrateRetryPolicyState_();

    const globalBackoffUntil =
      getGlobalGeminiBackoffUntil_();

    if (
      globalBackoffUntil >
      Date.now()
    ) {
      console.log(
        'GEMINI_GLOBAL_BACKOFF_ACTIVE_UNTIL: ' +
        new Date(globalBackoffUntil)
          .toISOString()
      );
      return;
    }

    processImageQueue_();

    // A 429 in the image queue means the same free-tier Gemini quota bucket
    // may also reject audio transcription. Respect the shared backoff before
    // making another Gemini generation request in the same execution.
    if (
      getGlobalGeminiBackoffUntil_() >
      Date.now()
    ) {
      console.log(
        'AUDIO_DEFERRED_BY_GEMINI_GLOBAL_BACKOFF'
      );
      return;
    }

    processAudioQueue_();
  } finally {
    try {
      removeQueueWorkerTriggerIfIdle_();
    } catch (error) {
      console.log(
        'QUEUE_WORKER_TRIGGER_CLEANUP_WARNING: ' +
        String(error)
      );
    }

    lock.releaseLock();
  }
}


function ensureQueueWorkerTriggerIfNeeded_() {
  if (!hasPendingCareerOsWork_()) {
    removeQueueWorkerTriggerIfIdle_();
    return;
  }

  const handler =
    CAREER_OS_CONFIG
      .QUEUE_WORKER_FUNCTION;

  const triggers =
    ScriptApp
      .getProjectTriggers()
      .filter(
        trigger =>
          trigger.getHandlerFunction() ===
          handler
      );

  // Keep exactly one worker trigger if duplicates ever occur.
  if (triggers.length > 1) {
    triggers
      .slice(1)
      .forEach(
        trigger =>
          ScriptApp.deleteTrigger(
            trigger
          )
      );
  }

  if (triggers.length >= 1) {
    return;
  }

  ScriptApp
    .newTrigger(handler)
    .timeBased()
    .everyMinutes(
      CAREER_OS_CONFIG
        .QUEUE_WORKER_EVERY_MINUTES
    )
    .create();

  console.log(
    'QUEUE_WORKER_TRIGGER_CREATED: every ' +
    CAREER_OS_CONFIG
      .QUEUE_WORKER_EVERY_MINUTES +
    ' minute(s)'
  );
}


function removeQueueWorkerTriggerIfIdle_() {
  if (hasPendingCareerOsWork_()) {
    return;
  }

  const handler =
    CAREER_OS_CONFIG
      .QUEUE_WORKER_FUNCTION;

  const triggers =
    ScriptApp
      .getProjectTriggers()
      .filter(
        trigger =>
          trigger.getHandlerFunction() ===
          handler
      );

  triggers.forEach(
    trigger =>
      ScriptApp.deleteTrigger(
        trigger
      )
  );

  if (triggers.length > 0) {
    console.log(
      'QUEUE_WORKER_TRIGGER_REMOVED: queues are empty.'
    );
  }

  clearExpiredGlobalGeminiBackoff_();
}


function hasPendingCareerOsWork_() {
  return (
    loadImageQueue_().length > 0 ||
    loadAudioQueue_().length > 0
  );
}


function getGlobalGeminiBackoffUntil_() {
  const raw =
    PropertiesService
      .getScriptProperties()
      .getProperty(
        CAREER_OS_CONFIG
          .GEMINI_GLOBAL_BACKOFF_PROPERTY
      );

  const value =
    Number(raw || 0);

  return Number.isFinite(value)
    ? value
    : 0;
}


function setGlobalGeminiBackoffUntil_(
  timestampMs
) {
  const value =
    Math.max(
      Number(timestampMs || 0),
      getGlobalGeminiBackoffUntil_()
    );

  PropertiesService
    .getScriptProperties()
    .setProperty(
      CAREER_OS_CONFIG
        .GEMINI_GLOBAL_BACKOFF_PROPERTY,
      String(value)
    );
}


function clearExpiredGlobalGeminiBackoff_() {
  const props =
    PropertiesService
      .getScriptProperties();

  const current =
    getGlobalGeminiBackoffUntil_();

  if (
    current > 0 &&
    current <= Date.now()
  ) {
    props.deleteProperty(
      CAREER_OS_CONFIG
        .GEMINI_GLOBAL_BACKOFF_PROPERTY
    );
  }
}


function getGeminiQuota429Streak_() {
  const raw =
    PropertiesService
      .getScriptProperties()
      .getProperty(
        CAREER_OS_CONFIG
          .GEMINI_QUOTA_429_STREAK_PROPERTY
      );

  const value = Number(raw || 0);

  return Number.isFinite(value)
    ? Math.max(0, value)
    : 0;
}


function getGeminiQuotaCircuitLevel_() {
  const raw =
    PropertiesService
      .getScriptProperties()
      .getProperty(
        CAREER_OS_CONFIG
          .GEMINI_QUOTA_CIRCUIT_LEVEL_PROPERTY
      );

  const value = Number(raw || 0);

  return Number.isFinite(value)
    ? Math.max(0, value)
    : 0;
}


function noteGeminiQuota429_() {
  const props =
    PropertiesService
      .getScriptProperties();

  const nextStreak =
    getGeminiQuota429Streak_() + 1;

  props.setProperty(
    CAREER_OS_CONFIG
      .GEMINI_QUOTA_429_STREAK_PROPERTY,
    String(nextStreak)
  );

  if (
    nextStreak <
    CAREER_OS_CONFIG
      .GEMINI_QUOTA_429_STREAK_THRESHOLD
  ) {
    console.log(
      'GEMINI_QUOTA_429_STREAK: ' +
      nextStreak + '/' +
      CAREER_OS_CONFIG
        .GEMINI_QUOTA_429_STREAK_THRESHOLD
    );
    return 0;
  }

  const nextLevel =
    getGeminiQuotaCircuitLevel_() + 1;

  const delayMs = Math.min(
    CAREER_OS_CONFIG
      .GEMINI_QUOTA_CIRCUIT_BREAKER_MAX_MS,
    CAREER_OS_CONFIG
      .GEMINI_QUOTA_CIRCUIT_BREAKER_MIN_MS *
      Math.pow(2, nextLevel - 1)
  );

  const until =
    Date.now() + delayMs;

  props.setProperty(
    CAREER_OS_CONFIG
      .GEMINI_QUOTA_429_STREAK_PROPERTY,
    '0'
  );

  props.setProperty(
    CAREER_OS_CONFIG
      .GEMINI_QUOTA_CIRCUIT_LEVEL_PROPERTY,
    String(nextLevel)
  );

  setGlobalGeminiBackoffUntil_(until);

  console.log(
    'GEMINI_QUOTA_CIRCUIT_OPEN: level=' +
    nextLevel +
    ' | pause_ms=' + delayMs +
    ' | until=' +
    new Date(until).toISOString()
  );

  return until;
}


function resetGeminiQuotaCircuitOnSuccess_() {
  const props =
    PropertiesService
      .getScriptProperties();

  const hadState =
    getGeminiQuota429Streak_() > 0 ||
    getGeminiQuotaCircuitLevel_() > 0;

  props.deleteProperty(
    CAREER_OS_CONFIG
      .GEMINI_QUOTA_429_STREAK_PROPERTY
  );

  props.deleteProperty(
    CAREER_OS_CONFIG
      .GEMINI_QUOTA_CIRCUIT_LEVEL_PROPERTY
  );

  clearExpiredGlobalGeminiBackoff_();

  if (hadState) {
    console.log(
      'GEMINI_QUOTA_CIRCUIT_RESET_AFTER_SUCCESS'
    );
  }
}


function isQuotaRetryErrorText_(text) {
  return /(?:\b429\b|quota exceeded|too_many_requests)/i
    .test(String(text || ''));
}


function migrateRetryPolicyState_() {
  const props =
    PropertiesService.getScriptProperties();

  const currentVersion =
    props.getProperty(
      CAREER_OS_CONFIG.RETRY_POLICY_VERSION_PROPERTY
    );

  if (
    currentVersion ===
    CAREER_OS_CONFIG.RETRY_POLICY_VERSION
  ) {
    return;
  }

  // The previous quota/backoff state belongs to the prior image-model policy.
  // Do not carry stale 429 history into the 3.8-primary / 3.5-fallback policy.
  // Preserve queued work and source fingerprints, but make quota-blocked
  // jobs immediately eligible for a clean attempt.
  const imageQueue = loadImageQueue_();
  const audioQueue = loadAudioQueue_();

  let resetImageJobs = 0;
  let resetAudioJobs = 0;

  imageQueue.forEach(function(job) {
    if (
      isQuotaRetryErrorText_(job.lastError) ||
      Number(job.attempts || 0) >=
        CAREER_OS_CONFIG.IMAGE_MAX_ATTEMPTS
    ) {
      job.attempts = 0;
      job.nextAttemptAt = 0;
      job.lastError = '';
      resetImageJobs += 1;
    }
  });

  audioQueue.forEach(function(job) {
    if (
      isQuotaRetryErrorText_(job.lastError) ||
      Number(job.attempts || 0) >=
        CAREER_OS_CONFIG.AUDIO_MAX_ATTEMPTS
    ) {
      job.attempts = 0;
      job.nextAttemptAt = 0;
      job.lastError = '';
      resetAudioJobs += 1;
    }
  });

  saveImageQueue_(imageQueue);
  saveAudioQueue_(audioQueue);

  props.deleteProperty(
    CAREER_OS_CONFIG.GEMINI_GLOBAL_BACKOFF_PROPERTY
  );
  props.deleteProperty(
    CAREER_OS_CONFIG.GEMINI_QUOTA_429_STREAK_PROPERTY
  );
  props.deleteProperty(
    CAREER_OS_CONFIG.GEMINI_QUOTA_CIRCUIT_LEVEL_PROPERTY
  );

  props.setProperty(
    CAREER_OS_CONFIG.RETRY_POLICY_VERSION_PROPERTY,
    CAREER_OS_CONFIG.RETRY_POLICY_VERSION
  );

  console.log(
    'RETRY_POLICY_MIGRATED_TO_GEMINI_3_8_TRANSCRIBE_3_5_V2: ' +
    'image_jobs_reset=' + resetImageJobs +
    ' | audio_jobs_reset=' + resetAudioJobs +
    ' | stale_backoff_cleared=true'
  );
}


function computeRetryDelayMs_(
  attemptNumber,
  serverRetryAfterMs,
  baseMs,
  maxMs
) {
  const attempt =
    Math.max(
      1,
      Number(attemptNumber || 1)
    );

  const exponential =
    Math.min(
      Number(maxMs),
      Number(baseMs) *
        Math.pow(2, attempt - 1)
    );

  const serverDelay =
    Math.max(
      0,
      Number(serverRetryAfterMs || 0)
    );

  const jitter =
    Math.floor(
      Math.random() *
      CAREER_OS_CONFIG
        .RETRY_JITTER_MAX_MS
    );

  // If Gemini explicitly supplies Retry-After, prefer that authoritative
  // hint, but never retry faster than our one-minute worker cadence.
  // Exponential backoff is the fallback only when no server hint exists.
  if (serverDelay > 0) {
    return (
      Math.max(
        Number(baseMs),
        serverDelay
      ) +
      jitter
    );
  }

  return exponential + jitter;
}


function scanDriveChanges_() {
  const props = PropertiesService.getScriptProperties();

  let pageToken =
    props.getProperty('DRIVE_PAGE_TOKEN');

  if (!pageToken) {
    throw new Error(
      'Watcher is not initialized. ' +
      'Run initializeDriveWatcher() first.'
    );
  }

  let newStartPageToken = null;

  do {
    const result = Drive.Changes.list(
      pageToken,
      {
        pageSize: 100,

        includeRemoved: true,

        restrictToMyDrive: true,

        fields:
          'nextPageToken,newStartPageToken,' +
          'changes(fileId,removed,time,' +
          'file(' +
          'id,' +
          'name,' +
          'mimeType,' +
          'modifiedTime,' +
          'parents,' +
          'trashed,' +
          'size,' +
          'md5Checksum,' +
          'sha1Checksum,' +
          'sha256Checksum,' +
          'appProperties' +
          '))'
      }
    );

    const changes =
      result.changes || [];

    changes.forEach(change => {
      handleDriveChange_(change);
    });

    if (result.newStartPageToken) {
      newStartPageToken =
        result.newStartPageToken;
    }

    pageToken =
      result.nextPageToken;

  } while (pageToken);

  if (newStartPageToken) {
    props.setProperty(
      'DRIVE_PAGE_TOKEN',
      newStartPageToken
    );
  }

  console.log(
    'Drive change check completed.'
  );
}


function handleDriveChange_(change) {
  if (change.removed) {
    console.log(
      'IGNORE_REMOVED: ' +
      change.fileId
    );

    return;
  }

  const file = change.file;

  if (!file || file.trashed) {
    console.log(
      'IGNORE_TRASHED: ' +
      change.fileId
    );

    return;
  }

  const route =
    classifyFile_(file);

  console.log({
    route: route,
    name: file.name,
    mimeType: file.mimeType,
    fileId: file.id,
    size: file.size || null,
    modifiedTime: file.modifiedTime,
    sourceFingerprint:
      getSourceFingerprintFromFileMeta_(file)
  });


  // Evidence processing is session-scoped. A top-level course folder (for
  // example SAMPLE_COURSE_A directly under My Drive) is a container, not a session.
  // This prevents course-level PDFs/project files from creating a fake
  // SESSION_MANIFEST or SESSION_STATUS marker.
  const sessionScopedRoutes = {
    TEXT_EVIDENCE: true,
    IMAGE_OCR: true,
    AUDIO_TRANSCRIBE: true,
    PDF_EXTRACT: true,
    DOCX_EXTRACT: true,
    GOOGLE_DOC_EXTRACT: true
  };

  if (
    sessionScopedRoutes[route] &&
    !isDriveFileInsideValidSession_(file.id)
  ) {
    console.log(
      'NON_SESSION_SOURCE_IGNORED: ' +
      file.name
    );
    return;
  }


  if (route === 'SESSION_FOLDER_EVENT') {
    handleSessionOrCourseFolderChange_(file);
    return;
  }


  if (route === 'TEXT_EVIDENCE') {
    handleTextEvidence_(file);
    return;
  }


  if (route === 'IMAGE_OCR') {
    const context =
      prepareSessionWorkspaceForSourceId_(
        file.id
      );

    const sourceFile =
      DriveApp.getFileById(
        file.id
      );

    const sourceFingerprint =
      getSourceFingerprintFromFileMeta_(file);

    if (
      hasCurrentGeneratedArtifactForSource_(
        sourceFile,
        context.workspaceFolder,
        sourceFingerprint,
        file.modifiedTime || ''
      )
    ) {
      console.log(
        'IMAGE_ALREADY_PROCESSED_FOR_VERSION: ' +
        file.name
      );

      updateSessionManifest_(
        context.sessionFolder
      );

      return;
    }

    if (
      reuseExactImageEvidenceIfAvailable_(
        sourceFile,
        context.workspaceFolder,
        sourceFingerprint,
        file.modifiedTime || ''
      )
    ) {
      updateSessionManifest_(
        context.sessionFolder
      );
      return;
    }

    enqueueImageJob_(
      Object.assign(
        {},
        file,
        { sourceFingerprint: sourceFingerprint }
      )
    );

    updateSessionManifest_(
      context.sessionFolder
    );

    return;
  }


  if (route === 'AUDIO_TRANSCRIBE') {
    const sourceFile =
      DriveApp.getFileById(
        file.id
      );

    const context =
      prepareSessionWorkspace_(
        sourceFile
      );

    const sourceFingerprint =
      getSourceFingerprintFromFileMeta_(file);

    const existingTranscript =
      findConfirmedTranscriptForAudio_(
        sourceFile,
        context.workspaceFolder,
        sourceFingerprint
      );

    if (existingTranscript) {
      markAudioSatisfiedByTranscript_(
        sourceFile,
        existingTranscript,
        sourceFingerprint
      );

      console.log(
        'AUDIO_TRANSCRIPTION_SATISFIED_BY_EXISTING_TEXT: ' +
        file.name +
        ' -> ' +
        existingTranscript.getName()
      );

      updateSessionManifest_(
        context.sessionFolder
      );

      return;
    }

    enqueueAudioJob_(
      Object.assign(
        {},
        file,
        { sourceFingerprint: sourceFingerprint }
      )
    );

    updateSessionManifest_(
      context.sessionFolder
    );

    return;
  }


  if (route === 'PDF_EXTRACT') {
    handlePdfEvidence_(file);
    return;
  }


  if (
    route === 'DOCX_EXTRACT' ||
    route === 'GOOGLE_DOC_EXTRACT'
  ) {
    prepareSessionWorkspaceForSourceId_(
      file.id
    );

    console.log(
      'DOCUMENT_DEFERRED: ' +
      'DOCX/Google Docs extraction will be added later.'
    );

    return;
  }
}


/* =========================================================
   PDF HYBRID EXTRACTION

   Primary: Drive PDF -> Google Doc conversion, then read Doc text.
   Fallback: Gemini Free Tier document input only when Drive conversion
   yields no usable text.
   ========================================================= */


function handlePdfEvidence_(fileMeta) {
  const sourceFile =
    DriveApp.getFileById(
      fileMeta.id
    );

  const context =
    prepareSessionWorkspace_(
      sourceFile
    );

  const sourceFingerprint =
    fileMeta.sourceFingerprint ||
    getSourceFingerprintFromFileMeta_(
      fileMeta
    );

  if (
    hasCurrentGeneratedArtifactForSource_(
      sourceFile,
      context.workspaceFolder,
      sourceFingerprint,
      fileMeta.modifiedTime || ''
    )
  ) {
    markPdfSourceProcessingStatus_(
      sourceFile.getId(),
      'DONE',
      sourceFingerprint,
      fileMeta.modifiedTime || '',
      'existing_artifact',
      ''
    );