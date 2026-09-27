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
    sessionScopedRoutes[route]
  ) {
    const vnextContextDecision =
      careerOsVnextResolveProcessingContextForFile_(
        file
      );

    if (
      vnextContextDecision.status ===
      'UNCLASSIFIED_AUTHORIZED'
    ) {
      careerOsVnextRegisterHeldSource_(
        file,
        vnextContextDecision
      );
      return;
    }

    if (
      vnextContextDecision.status ===
      'BLOCKED_POLICY'
    ) {
      console.log(
        'SOURCE_OUTSIDE_AUTHORIZED_SCOPE_SKIPPED: ' +
        file.name
      );
      return;
    }
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

    console.log(
      'PDF_ALREADY_PROCESSED_FOR_VERSION: ' +
      sourceFile.getName()
    );

    updateSessionManifest_(
      context.sessionFolder
    );
    return;
  }

  markPdfSourceProcessingStatus_(
    sourceFile.getId(),
    'PROCESSING',
    sourceFingerprint,
    fileMeta.modifiedTime || '',
    '',
    ''
  );

  let extractedText = '';
  let extractionMethod = '';
  let extractionModel = '';

  try {
    const driveResult =
      extractPdfTextViaDriveImport_(
        sourceFile,
        context.workspaceFolder
      );

    extractedText =
      String(
        driveResult.text || ''
      ).trim();

    if (
      extractedText.length >=
      CAREER_OS_CONFIG
        .PDF_DRIVE_IMPORT_MIN_TEXT_CHARS
    ) {
      extractionMethod =
        'google_drive_to_docs';
      extractionModel =
        'google-drive-docs-import';

      console.log(
        'PDF_DRIVE_TEXT_EXTRACTED: ' +
        sourceFile.getName() +
        ' | chars=' +
        extractedText.length
      );
    } else {
      console.log(
        'PDF_DRIVE_TEXT_INSUFFICIENT_FALLBACK_TO_GEMINI: ' +
        sourceFile.getName() +
        ' | chars=' +
        extractedText.length
      );

      const geminiResult =
        extractPdfTextViaGemini_(
          sourceFile
        );

      extractedText =
        String(
          geminiResult.text || ''
        ).trim();

      extractionMethod =
        'gemini_pdf_document_fallback';
      extractionModel =
        geminiResult.model || '';
    }

    if (
      !extractedText ||
      extractedText ===
        '[NO_TEXT_FOUND]'
    ) {
      throw new Error(
        'No readable text could be extracted from PDF.'
      );
    }

    const sourceMetadata =
      getDriveFileMetadataSafe_(
        sourceFile.getId()
      );

    const portableText =
      buildPortableArtifact_(
        sourceFile,
        extractedText,
        {
          artifactType:
            'pdf_text_extraction',

          sourceMimeType:
            'application/pdf',

          sourceSizeBytes:
            sourceMetadata.size ||
            fileMeta.size ||
            '',

          sourceModifiedUtc:
            sourceMetadata.modifiedTime ||
            fileMeta.modifiedTime ||
            '',

          sourceFingerprint:
            sourceFingerprint,

          model:
            extractionModel,

          timestampMode:
            'not_applicable',

          timestampNote:
            'PDF text extraction; no media timestamps.',

          extractionMethod:
            extractionMethod
        }
      );

    createOrUpdateTxtSidecar_(
      sourceFile,
      portableText
    );

    markPdfSourceProcessingStatus_(
      sourceFile.getId(),
      'DONE',
      sourceFingerprint,
      sourceMetadata.modifiedTime ||
        fileMeta.modifiedTime || '',
      extractionMethod,
      ''
    );

    updateSessionManifest_(
      context.sessionFolder
    );

    console.log(
      'PDF_TEXT_DONE: ' +
      sourceFile.getName() +
      ' | method=' +
      extractionMethod +
      ' | chars=' +
      extractedText.length
    );

  } catch (error) {
    markPdfSourceProcessingStatus_(
      sourceFile.getId(),
      'ERROR',
      sourceFingerprint,
      fileMeta.modifiedTime || '',
      extractionMethod,
      String(error)
    );

    updateSessionManifest_(
      context.sessionFolder
    );

    console.log(
      'PDF_TEXT_ERROR: ' +
      sourceFile.getName() +
      ' | ' +
      String(error)
    );
  }
}


function extractPdfTextViaDriveImport_(
  sourceFile,
  workspaceFolder
) {
  let tempDocId = '';

  try {
    const tempName =
      '_CAREER_OS_TMP_PDF__' +
      sourceFile.getId();

    // Convert the PDF by importing its binary content as a Google Doc.
    // This uses the Drive API import path (free/standard Drive operation),
    // which can expose embedded text and can OCR image-based PDF pages.
    const sourceBlob =
      sourceFile.getBlob();

    const converted =
      Drive.Files.create(
        {
          name: tempName,
          mimeType:
            'application/vnd.google-apps.document',
          parents: [
            workspaceFolder.getId()
          ]
        },
        sourceBlob,
        {
          fields:
            'id,name,mimeType'
        }
      );

    tempDocId =
      converted.id;

    updateAppPropertiesIfChanged_(
      tempDocId,
      {
        careerOsGenerated: 'true',
        careerOsTemporary: 'true',
        careerOsSourceId:
          sourceFile.getId()
      },
      'PDF_TEMP_DOC_MARK_WARNING'
    );

    // Conversion/OCR can finish slightly after the Drive file is created.
    // Poll a few times rather than assuming the Doc body is immediately ready.
    let lastText = '';

    for (let attempt = 0; attempt < 5; attempt++) {
      if (attempt > 0) {
        Utilities.sleep(1000);
      }

      try {
        const doc =
          DocumentApp.openById(
            tempDocId
          );

        lastText =
          String(
            doc.getBody().getText() || ''
          );

        if (
          lastText.trim().length >=
          CAREER_OS_CONFIG
            .PDF_DRIVE_IMPORT_MIN_TEXT_CHARS
        ) {
          break;
        }
      } catch (openError) {
        if (attempt === 4) {
          throw openError;
        }
      }
    }

    return {
      text: lastText
    };

  } finally {
    if (tempDocId) {
      try {
        Drive.Files.update(
          { trashed: true },
          tempDocId
        );
      } catch (cleanupError) {
        console.log(
          'PDF_TEMP_DOC_CLEANUP_WARNING: ' +
          String(cleanupError)
        );
      }
    }
  }
}


function extractPdfTextViaGemini_(
  sourceFile
) {
  assertFreeOnlyConfiguration_();

  const blob =
    sourceFile.getBlob();

  const bytes =
    blob.getBytes();

  if (
    bytes.length >
    CAREER_OS_CONFIG
      .PDF_GEMINI_INLINE_MAX_BYTES
  ) {
    throw new Error(
      'PDF is too large for safe inline Gemini fallback in Apps Script: ' +
      bytes.length + ' bytes.'
    );
  }

  const base64Data =
    Utilities.base64Encode(
      bytes
    );

  const prompt =
    'Extract all readable text from this PDF. ' +
    'Return only the extracted text. ' +
    'Preserve page order and useful line breaks. ' +
    'Do not summarize, explain, translate, or omit readable text. ' +
    'If there is no readable text, return exactly [NO_TEXT_FOUND].';

  return callGeminiDocument_(
    getGeminiApiKey_(),
    base64Data,
    'application/pdf',
    prompt
  );
}


function callGeminiDocument_(
  apiKey,
  base64Data,
  mimeType,
  prompt
) {
  const primaryModel =
    CAREER_OS_CONFIG
      .GEMINI_IMAGE_MODEL_PRIMARY;

  const fallbackModel =
    CAREER_OS_CONFIG
      .GEMINI_IMAGE_MODEL_FALLBACK;

  try {
    return callGeminiDocumentWithModel_(
      apiKey,
      base64Data,
      mimeType,
      prompt,
      primaryModel
    );
  } catch (primaryError) {
    if (
      !shouldFallbackGeminiImageError_(
        primaryError
      ) ||
      !fallbackModel ||
      fallbackModel === primaryModel
    ) {
      throw primaryError;
    }

    console.log(
      'GEMINI_PDF_PRIMARY_FAILED_FALLBACK: ' +
      primaryModel +
      ' -> ' +
      fallbackModel +
      ' | status=' +
      Number(
        primaryError.httpStatus || 0
      )
    );

    return callGeminiDocumentWithModel_(
      apiKey,
      base64Data,
      mimeType,
      prompt,
      fallbackModel
    );
  }
}


function callGeminiDocumentWithModel_(
  apiKey,
  base64Data,
  mimeType,
  prompt,
  model
) {
  const url =
    'https://generativelanguage.googleapis.com/v1beta/interactions';

  const payload = {
    model: model,
    input: [
      {
        type: 'text',
        text: prompt
      },
      {
        type: 'document',
        data: base64Data,
        mime_type: mimeType
      }
    ]
  };

  applyGemini38ThinkingConfig_(
    payload,
    model,
    CAREER_OS_CONFIG.GEMINI_PDF_THINKING_LEVEL
  );

  const response =
    UrlFetchApp.fetch(
      url,
      {
        method: 'post',
        contentType: 'application/json',
        headers: {
          'x-goog-api-key': apiKey
        },
        payload:
          JSON.stringify(payload),
        muteHttpExceptions: true
      }
    );

  const status =
    response.getResponseCode();

  const body =
    response.getContentText();

  if (
    status < 200 ||
    status >= 300
  ) {
    console.log(
      'GEMINI_PDF_HTTP_ERROR: ' +
      status +
      ' | model=' +
      model
    );

    throw createRetryAwareHttpError_(
      'Gemini PDF request failed for model ' +
      model + '.',
      status,
      response,
      body
    );
  }

  const data =
    JSON.parse(body);

  return {
    text:
      extractGeminiText_(data),
    model:
      model
  };
}


function markPdfSourceProcessingStatus_(
  fileId,
  status,
  sourceFingerprint,
  modifiedTime,
  method,
  errorMessage
) {
  updateAppPropertiesIfChanged_(
    fileId,
    {
      careerOsPdfStatus:
        String(status || ''),
      careerOsPdfProcessedSourceFingerprint:
        String(sourceFingerprint || ''),
      careerOsPdfProcessedSourceModifiedTime:
        String(modifiedTime || ''),
      careerOsPdfExtractionMethod:
        String(method || ''),
      careerOsPdfLastError:
        errorMessage
          ? String(errorMessage)
              .substring(0, 500)
          : ''
    },
    'PDF_STATUS_TAG_WARNING'
  );
}


function backfillOneDeferredInboxPdf_() {
  const props =
    PropertiesService
      .getScriptProperties();

  const key =
    CAREER_OS_CONFIG
      .PDF_BACKFILL_VERSION_PROPERTY;

  const targetVersion =
    CAREER_OS_CONFIG
      .PDF_BACKFILL_VERSION;

  if (
    props.getProperty(key) ===
    targetVersion
  ) {
    return;
  }

  const manifests =
    DriveApp.getFilesByName(
      CAREER_OS_CONFIG
        .SESSION_MANIFEST_FILE
    );

  while (manifests.hasNext()) {
    const manifest =
      manifests.next();

    const workspaceParents =
      manifest.getParents();

    if (!workspaceParents.hasNext()) {
      continue;
    }

    const workspace =
      workspaceParents.next();

    if (
      workspace.getName() !==
      CAREER_OS_CONFIG
        .SESSION_WORKSPACE_FOLDER
    ) {
      continue;
    }

    const sessionParents =
      workspace.getParents();

    if (!sessionParents.hasNext()) {
      continue;
    }

    const sessionFolder =
      sessionParents.next();

    if (
      !isValidSessionFolder_(
        sessionFolder
      )
    ) {
      continue;
    }

    const hierarchy =
      resolveCourseHierarchyForSessionFolder_(
        sessionFolder
      );

    if (
      !hierarchy.courseFolder ||
      hierarchy.courseFolder.getName() !==
        'INBOX'
    ) {
      continue;
    }

    const sourceFiles =
      sessionFolder.getFilesByType(
        MimeType.PDF
      );

    while (sourceFiles.hasNext()) {
      const sourceFile =
        sourceFiles.next();

      const metadata =
        getDriveFileMetadataSafe_(
          sourceFile.getId()
        );

      const fingerprint =
        buildSourceFingerprintFromMetadata_(
          metadata
        );

      if (
        hasCurrentGeneratedArtifactForSource_(
          sourceFile,
          workspace,
          fingerprint,
          metadata.modifiedTime || ''
        )
      ) {
        continue;
      }

      console.log(
        'PDF_BACKFILL_PROCESSING_ONE: ' +
        sourceFile.getName()
      );

      handlePdfEvidence_(
        {
          id: sourceFile.getId(),
          name: sourceFile.getName(),
          mimeType:
            'application/pdf',
          size:
            metadata.size || '',
          modifiedTime:
            metadata.modifiedTime ||
            sourceFile
              .getLastUpdated()
              .toISOString(),
          sourceFingerprint:
            fingerprint
        }
      );

      // Exactly one legacy/deferred PDF per scanner run.
      return;
    }
  }

  props.setProperty(
    key,
    targetVersion
  );

  console.log(
    'PDF_BACKFILL_COMPLETE: ' +
    targetVersion
  );
}



function isSupportedImageMime_(
  mimeType
) {
  const mime =
    String(mimeType || '')
      .toLowerCase();

  return [
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/heic',
    'image/heif'
  ].includes(mime);
}


function classifyFile_(file) {
  const mime =
    (file.mimeType || '')
      .toLowerCase();

  const appProperties =
    file.appProperties || {};


  // Ignore Career OS-generated artifacts. Their source changes are
  // handled through the original file or explicit session refreshes.
  if (
    appProperties[
      CAREER_OS_CONFIG
        .GENERATED_APP_PROPERTY_KEY
    ] ===
    CAREER_OS_CONFIG
      .GENERATED_APP_PROPERTY_VALUE
  ) {
    return 'IGNORE';
  }


  // Folder rename/move events matter because the folder ID is the
  // canonical session identity while the human-readable name may change.
  if (
    mime ===
    'application/vnd.google-apps.folder'
  ) {
    return 'SESSION_FOLDER_EVENT';
  }


  // Ignore Apps Script projects.
  if (
    mime ===
    'application/vnd.google-apps.script'
  ) {
    return 'IGNORE';
  }


  const supportedImages = [
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/heic',
    'image/heif'
  ];


  if (
    supportedImages.includes(mime)
  ) {
    return 'IMAGE_OCR';
  }


  if (
    mime.startsWith('image/')
  ) {
    return 'IMAGE_UNSUPPORTED';
  }


  if (
    mime.startsWith('audio/')
  ) {
    return 'AUDIO_TRANSCRIBE';
  }


  if (
    mime === 'application/pdf'
  ) {
    return 'PDF_EXTRACT';
  }


  // A TXT/MD file is already text. It is evidence, not something that
  // needs another extraction pass. TXT files are organized into the
  // session workspace automatically.
  if (
    mime.startsWith('text/')
  ) {
    return 'TEXT_EVIDENCE';
  }


  if (
    mime ===
    'application/vnd.google-apps.document'
  ) {
    return 'GOOGLE_DOC_EXTRACT';
  }


  if (
    mime ===
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ) {
    return 'DOCX_EXTRACT';
  }


  if (
    mime.startsWith('video/')
  ) {
    return 'VIDEO_DEFERRED';
  }


  return 'IGNORE';
}


/* =========================================================
   SOURCE CONTENT FINGERPRINTS + IDEMPOTENT METADATA

   File ID = source identity.
   Content checksum = source version.
   modifiedTime is informational only and is NOT used as the
   primary version key for binary Drive files.
   ========================================================= */


function buildSourceFingerprintFromMetadata_(
  metadata
) {
  const meta = metadata || {};

  const md5 =
    String(meta.md5Checksum || '')
      .trim()
      .toLowerCase();

  if (md5) {
    return 'md5:' + md5;
  }

  const sha256 =
    String(meta.sha256Checksum || '')
      .trim()
      .toLowerCase();

  if (sha256) {
    return 'sha256:' + sha256;
  }

  const sha1 =
    String(meta.sha1Checksum || '')
      .trim()
      .toLowerCase();

  if (sha1) {
    return 'sha1:' + sha1;
  }

  const mime =
    String(meta.mimeType || '')
      .toLowerCase();

  // Folders have stable identity but no content checksum.
  if (
    mime ===
    'application/vnd.google-apps.folder'
  ) {
    return 'folder-id:' +
      String(meta.id || '');
  }

  // Native Google Docs/Sheets/Slides do not expose md5Checksum.
  // They are not deeply extracted yet; until that adapter is added,
  // modifiedTime remains only a fallback for those native resources.
  if (
    mime.indexOf(
      'application/vnd.google-apps.'
    ) === 0
  ) {
    return (
      'native-modified:' +
      String(meta.modifiedTime || '')
    );
  }

  // Stored binary files normally have MD5. If Drive does not expose one,
  // fall back conservatively rather than loading a large file into memory.
  return (
    'fallback:' +
    String(meta.size || '') +
    ':' +
    String(meta.modifiedTime || '')
  );
}


function getSourceFingerprintFromFileMeta_(
  fileMeta
) {
  const meta = fileMeta || {};

  if (
    meta.md5Checksum ||
    meta.sha1Checksum ||
    meta.sha256Checksum ||
    meta.mimeType ===
      'application/vnd.google-apps.folder'
  ) {
    return buildSourceFingerprintFromMetadata_(
      meta
    );
  }

  if (meta.id) {
    const fresh =
      getDriveFileMetadataSafe_(
        meta.id
      );

    return buildSourceFingerprintFromMetadata_(
      fresh
    );
  }

  return buildSourceFingerprintFromMetadata_(
    meta
  );
}


function getSourceFingerprintById_(
  fileId
) {
  const metadata =
    getDriveFileMetadataSafe_(
      fileId
    );

  return buildSourceFingerprintFromMetadata_(
    metadata
  );
}


function shortFingerprint_(
  value
) {
  const text =
    String(value || '');

  if (text.length <= 28) {
    return text;
  }

  return (
    text.substring(0, 12) +
    '…' +
    text.substring(
      text.length - 12
    )
  );
}


function updateAppPropertiesIfChanged_(
  fileId,
  desiredProperties,
  warningPrefix
) {
  try {
    const metadata =
      Drive.Files.get(
        fileId,
        {
          fields:
            'id,appProperties'
        }
      );

    const existing =
      metadata.appProperties || {};

    const desired =
      desiredProperties || {};

    let changed = false;

    Object.keys(desired)
      .forEach(key => {
        const nextValue =
          String(
            desired[key] === undefined ||
            desired[key] === null
              ? ''
              : desired[key]
          );

        if (
          String(existing[key] || '') !==
          nextValue
        ) {
          changed = true;
        }
      });

    if (!changed) {
      return false;
    }

    const merged = {};

    Object.keys(existing)
      .forEach(key => {
        merged[key] =
          String(existing[key]);
      });

    Object.keys(desired)
      .forEach(key => {
        merged[key] =
          String(
            desired[key] === undefined ||
            desired[key] === null
              ? ''
              : desired[key]
          );
      });

    Drive.Files.update(
      {
        appProperties: merged
      },
      fileId
    );

    return true;

  } catch (error) {
    console.log(
      String(
        warningPrefix ||
        'APP_PROPERTY_UPDATE_WARNING'
      ) +
      ': ' +
      String(error)
    );

    return false;
  }
}


function chooseBetterMigratedQueueJob_(
  current,
  candidate,
  queueType
) {
  if (!current) {
    return candidate;
  }

  if (queueType === 'audio') {
    const rank = {
      QUEUED: 1,
      UPLOADING: 2,
      READY_TO_TRANSCRIBE: 3
    };

    const currentRank =
      rank[current.status] || 0;

    const candidateRank =
      rank[candidate.status] || 0;

    if (candidateRank > currentRank) {
      return candidate;
    }

    if (
      candidateRank === currentRank &&
      Number(candidate.offset || 0) >
        Number(current.offset || 0)
    ) {
      return candidate;
    }
  }

  if (
    Number(candidate.attempts || 0) >
    Number(current.attempts || 0)
  ) {
    return candidate;
  }

  return current;
}


function migrateQueueFingerprints_(
  queue,
  queueType
) {
  const sourceQueue =
    Array.isArray(queue)
      ? queue
      : [];

  let changed = false;
  const result = [];
  const indexByKey = {};

  sourceQueue.forEach(job => {
    if (!job || !job.fileId) {
      changed = true;
      return;
    }

    const metadata =
      getDriveFileMetadataSafe_(
        job.fileId
      );

    const fingerprint =
      buildSourceFingerprintFromMetadata_(
        metadata
      );

    const hadFingerprint =
      Boolean(job.sourceFingerprint);

    if (!hadFingerprint) {
      // Legacy queue migration: old jobs did not store a content fingerprint.
      // Adopt the current content fingerprint once, then future content changes
      // are handled by refreshQueued*Version_() rather than silently mutating
      // an in-progress upload job.
      job.sourceFingerprint =
        fingerprint;
      changed = true;
    }

    const sameContent =
      String(job.sourceFingerprint || '') ===
      String(fingerprint || '');

    if (sameContent) {
      if (metadata.modifiedTime) {
        job.modifiedTime =
          metadata.modifiedTime;
      }

      if (metadata.name) {
        job.name = metadata.name;
      }

      if (metadata.mimeType) {
        job.mimeType =
          queueType === 'audio'
            ? normalizeAudioMimeType_(
                metadata.mimeType
              )
            : metadata.mimeType;
      }

      if (metadata.size) {
        job.size =
          Number(metadata.size);
      }
    }

    const newKey =
      String(job.fileId) +
      '|' +
      String(job.sourceFingerprint || fingerprint);

    if (job.jobKey !== newKey) {
      job.jobKey = newKey;
      changed = true;
    }

    if (
      Object.prototype.hasOwnProperty.call(
        indexByKey,
        newKey
      )
    ) {
      const index =
        indexByKey[newKey];

      result[index] =
        chooseBetterMigratedQueueJob_(
          result[index],
          job,
          queueType
        );

      changed = true;
      return;
    }

    indexByKey[newKey] =
      result.length;

    result.push(job);
  });

  return {
    queue: result,
    changed: changed
  };
}


function refreshQueuedImageVersion_(
  job
) {
  const metadata =
    getDriveFileMetadataSafe_(
      job.fileId
    );

  const currentFingerprint =
    buildSourceFingerprintFromMetadata_(
      metadata
    );

  if (
    !job.sourceFingerprint ||
    job.sourceFingerprint ===
      currentFingerprint
  ) {
    return false;
  }

  job.sourceFingerprint =
    currentFingerprint;

  job.jobKey =
    String(job.fileId) +
    '|' +
    currentFingerprint;

  job.modifiedTime =
    metadata.modifiedTime ||
    job.modifiedTime ||
    '';

  job.name =
    metadata.name ||
    job.name;

  job.mimeType =
    metadata.mimeType ||
    job.mimeType;

  job.size =
    Number(
      metadata.size ||
      job.size ||
      0
    );

  job.attempts = 0;
  job.nextAttemptAt = 0;
  job.lastError = '';

  console.log(
    'IMAGE_JOB_CONTENT_VERSION_REFRESHED: ' +
    job.name +
    ' | ' +
    shortFingerprint_(
      currentFingerprint
    )
  );

  return true;
}


function refreshQueuedAudioVersion_(
  job
) {
  const metadata =
    getDriveFileMetadataSafe_(
      job.fileId
    );

  const currentFingerprint =
    buildSourceFingerprintFromMetadata_(
      metadata
    );

  if (
    !job.sourceFingerprint ||
    job.sourceFingerprint ===
      currentFingerprint
  ) {
    return false;
  }

  // The queued source content changed. Any in-progress Gemini upload belongs
  // to the old version and must not be transcribed as if it were current.
  deleteGeminiUploadedFile_(
    job.geminiFileName
  );

  job.sourceFingerprint =
    currentFingerprint;

  job.jobKey =
    String(job.fileId) +
    '|' +
    currentFingerprint;

  job.name =
    metadata.name ||
    job.name;

  job.mimeType =
    normalizeAudioMimeType_(
      metadata.mimeType ||
      job.mimeType
    );

  job.size =
    Number(
      metadata.size ||
      job.size ||
      0
    );

  job.modifiedTime =
    metadata.modifiedTime ||
    job.modifiedTime ||
    '';

  job.status = 'QUEUED';
  job.uploadUrl = '';
  job.offset = 0;
  job.fileUri = '';
  job.geminiFileName = '';
  job.attempts = 0;
  job.nextAttemptAt = 0;
  job.lastError = '';

  console.log(
    'AUDIO_JOB_CONTENT_VERSION_REFRESHED: ' +
    job.name +
    ' | ' +
    shortFingerprint_(
      currentFingerprint
    )
  );

  return true;
}


/* =========================================================
   IMAGE OCR QUEUE

   Drive Changes scanning only ENQUEUES image work. Gemini calls happen
   after the page token has safely advanced. A Gemini 429 therefore never
   causes the Drive watcher to replay the same change batch.
   ========================================================= */



function stripPortableArtifactHeader_(
  text
) {
  const raw =
    String(text || '');

  const endMarker =
    '=== END CAREER OS ARTIFACT METADATA ===';

  const index =
    raw.indexOf(endMarker);

  if (index < 0) {
    return raw.trim();
  }

  return raw
    .substring(
      index + endMarker.length
    )
    .replace(
      /^\s+/,
      ''
    )
    .trim();
}


function findGeneratedTextBySourceFingerprint_(
  workspaceFolder,
  sourceFingerprint,
  excludeSourceId
) {
  if (
    !workspaceFolder ||
    !sourceFingerprint
  ) {
    return null;
  }

  const files =
    workspaceFolder.getFiles();

  while (files.hasNext()) {
    const candidate =
      files.next();

    if (
      !/\.txt$/i.test(
        candidate.getName()
      )
    ) {
      continue;
    }

    const metadata =
      getDriveFileMetadataSafe_(
        candidate.getId()
      );

    const props =
      metadata.appProperties ||
      {};

    if (
      props.careerOsGenerated !==
        'true' ||
      props.careerOsSourceFingerprint !==
        String(sourceFingerprint)
    ) {
      continue;
    }

    if (
      excludeSourceId &&
      props.careerOsSourceId ===
        String(excludeSourceId)
    ) {
      continue;
    }

    return candidate;
  }

  return null;
}


function reuseExactImageEvidenceIfAvailable_(
  sourceFile,
  workspaceFolder,
  sourceFingerprint,
  sourceModifiedUtc
) {
  const existing =
    findGeneratedTextBySourceFingerprint_(
      workspaceFolder,
      sourceFingerprint,
      sourceFile.getId()
    );

  if (!existing) {
    return false;
  }

  let body = '';

  try {
    body =
      stripPortableArtifactHeader_(
        existing
          .getBlob()
          .getDataAsString()
      );
  } catch (error) {
    return false;
  }

  if (!body) {
    return false;
  }

  const sourceMetadata =
    getDriveFileMetadataSafe_(
      sourceFile.getId()
    );

  const reusedArtifact =
    buildPortableArtifact_(
      sourceFile,
      body,
      {
        artifactType:
          'image_ocr_reused_exact_content',

        sourceMimeType:
          sourceFile.getMimeType(),

        sourceSizeBytes:
          sourceMetadata.size || '',

        sourceModifiedUtc:
          sourceModifiedUtc ||
          sourceMetadata.modifiedTime ||
          '',

        sourceFingerprint:
          sourceFingerprint,

        model:
          'reused-existing-exact-fingerprint',

        timestampMode:
          'not_applicable',

        timestampNote:
          'Not applicable to still-image OCR.',

        extractionMethod:
          'exact_content_fingerprint_reuse'
      }
    );

  createOrUpdateTxtSidecar_(
    sourceFile,
    reusedArtifact
  );

  markImageSourceProcessingStatus_(
    sourceFile.getId(),
    'DONE',
    sourceFingerprint,
    sourceModifiedUtc ||
      sourceMetadata.modifiedTime ||
      '',
    ''
  );

  console.log(
    'IMAGE_OCR_REUSED_EXACT_CONTENT: ' +
    sourceFile.getName() +
    ' <- ' +
    existing.getName()
  );

  return true;
}


function enqueueImageJob_(fileMeta) {
  const queue =
    loadImageQueue_();

  const sourceFingerprint =
    String(
      fileMeta.sourceFingerprint ||
      getSourceFingerprintFromFileMeta_(
        fileMeta
      )
    );

  const jobKey =
    String(fileMeta.id) +
    '|' +
    sourceFingerprint;

  const alreadyQueued =
    queue.some(
      job =>
        job.jobKey ===
        jobKey
    );

  if (alreadyQueued) {
    console.log(
      'IMAGE_ALREADY_QUEUED: ' +
      fileMeta.name
    );
    return;
  }

  if (
    queue.length >=
    CAREER_OS_CONFIG
      .MAX_IMAGE_QUEUE_LENGTH
  ) {
    throw new Error(
      'Image queue is full. Current limit: ' +
      CAREER_OS_CONFIG
        .MAX_IMAGE_QUEUE_LENGTH
    );
  }

  markImageSourceProcessingStatus_(
    fileMeta.id,
    'QUEUED',
    sourceFingerprint,
    fileMeta.modifiedTime || '',
    ''
  );

  queue.push({
    jobKey: jobKey,
    fileId: fileMeta.id,
    name: fileMeta.name,
    mimeType: fileMeta.mimeType || '',
    size: Number(fileMeta.size || 0),
    modifiedTime: fileMeta.modifiedTime || '',
    sourceFingerprint: sourceFingerprint,
    attempts: 0,
    nextAttemptAt: 0,
    lastError: '',
    createdAt: new Date().toISOString()
  });

  saveImageQueue_(queue);

  console.log(
    'IMAGE_QUEUED: ' +
    fileMeta.name
  );
}


function processImageQueue_() {
  const deadline =
    Date.now() +
    CAREER_OS_CONFIG
      .IMAGE_WORK_BUDGET_MS;

  let queue =
    loadImageQueue_();

  if (queue.length === 0) {
    return;
  }

  let completedThisRun = 0;

  while (
    queue.length > 0 &&
    Date.now() < deadline &&
    completedThisRun <
      CAREER_OS_CONFIG
        .MAX_IMAGE_JOBS_PER_RUN
  ) {
    // Fair-queue selection: do not let queue[0] block every later image
    // merely because its retry window has not arrived yet.
    const now = Date.now();
    let selectedIndex = -1;
    let queueChanged = false;
    let earliestNextAttemptAt = 0;

    for (
      let i = 0;
      i < queue.length;
      i += 1
    ) {
      const candidate = queue[i];

      if (
        refreshQueuedImageVersion_(
          candidate
        )
      ) {
        queueChanged = true;
      }

      const candidateNextAttemptAt =
        Number(
          candidate.nextAttemptAt || 0
        );

      if (
        candidateNextAttemptAt <= now
      ) {
        selectedIndex = i;
        break;
      }

      if (
        earliestNextAttemptAt === 0 ||
        candidateNextAttemptAt <
          earliestNextAttemptAt
      ) {
        earliestNextAttemptAt =
          candidateNextAttemptAt;
      }
    }

    if (queueChanged) {
      saveImageQueue_(queue);
    }

    if (selectedIndex < 0) {
      console.log(
        'IMAGE_QUEUE_NO_JOB_DUE_YET' +
        (
          earliestNextAttemptAt > 0
            ? ': next=' +
              new Date(
                earliestNextAttemptAt
              ).toISOString()
            : ''
        )
      );
      return;
    }

    const job =
      queue[selectedIndex];

    try {
      const sourceFile =
        DriveApp.getFileById(
          job.fileId
        );

      const context =
        prepareSessionWorkspace_(
          sourceFile
        );

      if (
        hasCurrentGeneratedArtifactForSource_(
          sourceFile,
          context.workspaceFolder,
          job.sourceFingerprint || '',
          job.modifiedTime || ''
        )
      ) {
        console.log(
          'IMAGE_JOB_SKIPPED_ALREADY_DONE: ' +
          job.name
        );

        queue.splice(
          selectedIndex,
          1
        );
        saveImageQueue_(queue);
        completedThisRun += 1;
        continue;
      }

      if (
        reuseExactImageEvidenceIfAvailable_(
          sourceFile,
          context.workspaceFolder,
          job.sourceFingerprint || '',
          job.modifiedTime || ''
        )
      ) {
        queue.splice(
          selectedIndex,
          1
        );
        saveImageQueue_(queue);
        completedThisRun += 1;
        continue;
      }

      processImageOcr_({
        id: job.fileId,
        name: job.name,
        mimeType: job.mimeType,
        size: job.size,
        modifiedTime: job.modifiedTime,
        sourceFingerprint:
          job.sourceFingerprint || ''
      });

      resetGeminiQuotaCircuitOnSuccess_();

      markImageSourceProcessingStatus_(
        job.fileId,
        'DONE',
        job.sourceFingerprint || '',
        job.modifiedTime || '',
        ''
      );

      queue.splice(
        selectedIndex,
        1
      );
      saveImageQueue_(queue);
      completedThisRun += 1;

      console.log(
        'IMAGE_JOB_COMPLETE: ' +
        job.name
      );

    } catch (error) {
      const status =
        Number(
          error && error.httpStatus
            ? error.httpStatus
            : 0
        );

      const retryable =
        status === 429 ||
        status === 408 ||
        status === 500 ||
        status === 502 ||
        status === 503 ||
        status === 504 ||
        status === 0;

      job.attempts =
        Number(job.attempts || 0) + 1;

      job.lastError =
        String(
          error && error.message
            ? error.message
            : error
        );

      const keepRetrying =
        retryable &&
        job.attempts <
          CAREER_OS_CONFIG
            .IMAGE_MAX_ATTEMPTS;

      if (keepRetrying) {
        const retryDelay =
          computeRetryDelayMs_(
            Math.min(
              job.attempts,
              CAREER_OS_CONFIG
                .IMAGE_MAX_ATTEMPTS
            ),
            Number(
              error && error.retryAfterMs
                ? error.retryAfterMs
                : 0
            ),
            CAREER_OS_CONFIG
              .IMAGE_RETRY_MIN_MS,
            CAREER_OS_CONFIG
              .IMAGE_RETRY_MAX_MS
          );

        job.nextAttemptAt =
          Date.now() +
          retryDelay;

        let quotaCircuitUntil = 0;

        if (status === 429) {
          setGlobalGeminiBackoffUntil_(
            job.nextAttemptAt
          );

          quotaCircuitUntil =
            noteGeminiQuota429_();
        }

        // Fair retry rotation: a rate-limited/retry-waiting image goes to
        // the tail so that, after the shared Gemini backoff expires, another
        // due image gets the next opportunity instead of the same head job
        // repeatedly monopolizing the queue.
        queue.splice(
          selectedIndex,
          1
        );
        queue.push(job);
        saveImageQueue_(queue);

        markImageSourceProcessingStatus_(
          job.fileId,
          'RETRY_WAIT',
          job.sourceFingerprint || '',
          job.modifiedTime || '',
          status === 429
            ? 'Gemini quota/rate limit (HTTP 429); retry scheduled.'
            : job.lastError
        );

        console.log(
          'IMAGE_RETRY_SCHEDULED_AND_ROTATED: ' +
          job.name +
          ' | HTTP=' + status +
          ' | attempt=' + job.attempts +
          ' | retry_after_ms=' + retryDelay +
          (
            quotaCircuitUntil > 0
              ? ' | circuit_until=' +
                new Date(quotaCircuitUntil).toISOString()
              : ''
          )
        );

        // Respect the shared Gemini quota gate for the rest of this worker
        // execution. The next worker run will choose the next due image.
        return;
      }

      markImageSourceProcessingStatus_(
        job.fileId,
        'ERROR',
        job.sourceFingerprint || '',
        job.modifiedTime || '',
        job.lastError
      );

      try {
        const failedSource =
          DriveApp.getFileById(
            job.fileId
          );

        const failedContext =
          resolveSessionContext_(
            failedSource,
            false
          );

        if (
          failedContext &&
          failedContext.sessionFolder
        ) {
          updateSessionManifest_(
            failedContext.sessionFolder
          );
        }
      } catch (statusRefreshError) {
        console.log(
          'IMAGE_ERROR_STATUS_REFRESH_WARNING: ' +
          String(statusRefreshError)
        );
      }

      console.log(
        'IMAGE_JOB_PERMANENT_ERROR: ' +
        job.name +
        ' | HTTP=' + status +
        ' | attempts=' + job.attempts +
        ' | ' + job.lastError
      );

      // One malformed image must not block later images forever.
      queue.splice(
        selectedIndex,
        1
      );
      saveImageQueue_(queue);
      completedThisRun += 1;
    }
  }
}


function loadImageQueue_() {
  const raw =
    PropertiesService
      .getScriptProperties()
      .getProperty(
        CAREER_OS_CONFIG
          .IMAGE_QUEUE_PROPERTY
      );

  if (!raw) {
    return [];
  }

  try {
    const queue =
      JSON.parse(raw);

    const parsed =
      Array.isArray(queue)
        ? queue
        : [];

    const migrated =
      migrateQueueFingerprints_(
        parsed,
        'image'
      );

    if (migrated.changed) {
      PropertiesService
        .getScriptProperties()
        .setProperty(
          CAREER_OS_CONFIG
            .IMAGE_QUEUE_PROPERTY,
          JSON.stringify(
            migrated.queue
          )
        );

      console.log(
        'IMAGE_QUEUE_FINGERPRINT_MIGRATED'
      );
    }

    return migrated.queue;
  } catch (error) {
    throw new Error(
      'IMAGE_JOB_QUEUE is corrupted.'
    );
  }
}


function saveImageQueue_(queue) {
  const props =
    PropertiesService
      .getScriptProperties();

  if (!queue || queue.length === 0) {
    props.deleteProperty(
      CAREER_OS_CONFIG
        .IMAGE_QUEUE_PROPERTY
    );
    return;
  }

  props.setProperty(
    CAREER_OS_CONFIG
      .IMAGE_QUEUE_PROPERTY,
    JSON.stringify(queue)
  );
}


function markImageSourceProcessingStatus_(
  fileId,
  status,
  sourceFingerprint,
  modifiedTime,
  errorMessage
) {
  updateAppPropertiesIfChanged_(
    fileId,
    {
      careerOsImageStatus:
        String(status || ''),

      careerOsImageProcessedSourceFingerprint:
        String(sourceFingerprint || ''),

      // Kept only for human diagnostics/backward compatibility.
      // It is not the source-version key anymore.
      careerOsImageProcessedSourceModifiedTime:
        String(modifiedTime || ''),

      careerOsImageLastError:
        errorMessage
          ? String(errorMessage)
              .substring(0, 500)
          : ''
    },
    'IMAGE_STATUS_TAG_WARNING'
  );
}


function hasCurrentGeneratedArtifactForSource_(
  sourceFile,
  workspaceFolder,
  sourceFingerprint,
  sourceModifiedUtc
) {
  if (!sourceFile || !workspaceFolder) {
    return false;
  }

  const sourceId =
    String(sourceFile.getId());

  const expectedFingerprint =
    String(sourceFingerprint || '');

  const expectedModified =
    String(sourceModifiedUtc || '');

  const files =
    workspaceFolder.getFiles();

  while (files.hasNext()) {
    const candidate =
      files.next();

    let metadata;

    try {
      metadata =
        Drive.Files.get(
          candidate.getId(),
          {
            fields:
              'id,appProperties'
          }
        );
    } catch (error) {
      continue;
    }

    const props =
      metadata.appProperties || {};

    if (
      props.careerOsGenerated !== 'true' ||
      props.careerOsSourceId !== sourceId
    ) {
      continue;
    }

    // Primary rule from this version onward: compare source CONTENT.
    if (
      expectedFingerprint &&
      props.careerOsSourceFingerprint ===
        expectedFingerprint
    ) {
      return true;
    }

    // Backward compatibility for artifacts generated before fingerprinting.
    // Only trust the old modifiedTime match when it exactly matches; then
    // upgrade the artifact metadata so future checks use content fingerprint.
    if (
      expectedModified &&
      props.careerOsSourceModifiedTime ===
        expectedModified
    ) {
      if (expectedFingerprint) {
        updateAppPropertiesIfChanged_(
          candidate.getId(),
          {
            careerOsSourceFingerprint:
              expectedFingerprint,
            careerOsFingerprintSchemaVersion:
              CAREER_OS_CONFIG
                .SOURCE_FINGERPRINT_SCHEMA_VERSION
          },
          'SIDECAR_FINGERPRINT_UPGRADE_WARNING'
        );
      }

      return true;
    }

    // Portable header fallback for legacy artifacts.
    try {
      const head =
        candidate
          .getBlob()
          .getDataAsString()
          .substring(0, 8000);

      const sourceMatches =
        head.indexOf(
          'source_drive_id: ' + sourceId
        ) >= 0;

      const fingerprintMatches =
        expectedFingerprint &&
        head.indexOf(
          'source_content_fingerprint: ' +
          expectedFingerprint
        ) >= 0;

      const modifiedMatches =
        expectedModified &&
        head.indexOf(
          'source_modified_utc: ' +
          expectedModified
        ) >= 0;

      if (
        sourceMatches &&
        (fingerprintMatches || modifiedMatches)
      ) {
        if (expectedFingerprint) {
          updateAppPropertiesIfChanged_(
            candidate.getId(),
            {
              careerOsSourceFingerprint:
                expectedFingerprint,
              careerOsFingerprintSchemaVersion:
                CAREER_OS_CONFIG
                  .SOURCE_FINGERPRINT_SCHEMA_VERSION
            },
            'SIDECAR_FINGERPRINT_UPGRADE_WARNING'
          );
        }

        return true;
      }
    } catch (error) {
      // Continue searching.
    }
  }

  return false;
}


function parseRetryAfterMs_(response, body) {
  try {
    const headers =
      response.getAllHeaders();

    const retryAfter =
      getHeaderCaseInsensitive_(
        headers,
        'retry-after'
      );

    if (retryAfter) {
      const seconds =
        Number(retryAfter);

      if (
        Number.isFinite(seconds) &&
        seconds > 0
      ) {
        return Math.ceil(seconds * 1000);
      }
    }
  } catch (error) {
    // Fall back to response-body parsing.
  }

  const match =
    String(body || '')
      .match(
        /retry in\s+([0-9.]+)s/i
      );

  if (match) {
    const seconds =
      Number(match[1]);

    if (
      Number.isFinite(seconds) &&
      seconds > 0
    ) {
      return Math.ceil(seconds * 1000);
    }
  }

  return 0;
}


function createRetryAwareHttpError_(
  message,
  status,
  response,
  body
) {
  const error =
    new Error(
      String(message) +
      ' HTTP ' +
      String(status)
    );

  error.httpStatus =
    Number(status || 0);

  error.retryAfterMs =
    parseRetryAfterMs_(
      response,
      body || ''
    );

  return error;
}


function processImageOcr_(fileMeta) {
  const apiKey =
    getGeminiApiKey_();

  const sourceFile =
    DriveApp.getFileById(
      fileMeta.id
    );

  const blob =
    sourceFile.getBlob();

  const base64Data =
    Utilities.base64Encode(
      blob.getBytes()
    );

  const mimeType =
    fileMeta.mimeType ||
    blob.getContentType();


  const prompt =
    'Extract all readable text from this image. ' +
    'Return only the extracted text. ' +
    'Preserve useful line breaks. ' +
    'Do not describe the image. ' +
    'If there is no readable text, ' +
    'return exactly [NO_TEXT_FOUND].';


  const ocrResult =
    callGeminiImage_(
      apiKey,
      base64Data,
      mimeType,
      prompt
    );


  const outputText =
    ocrResult && ocrResult.text;


  if (!outputText) {
    throw new Error(
      'Gemini returned no text for ' +
      fileMeta.name
    );
  }


  const portableOcr =
    buildPortableArtifact_(
      sourceFile,
      outputText.trim(),
      {
        artifactType:
          'image_ocr',

        sourceMimeType:
          fileMeta.mimeType ||
          blob.getContentType(),

        sourceSizeBytes:
          fileMeta.size ||
          blob.getBytes().length,

        sourceModifiedUtc:
          fileMeta.modifiedTime ||
          '',

        sourceFingerprint:
          fileMeta.sourceFingerprint ||
          getSourceFingerprintFromFileMeta_(
            fileMeta
          ),

        model:
          ocrResult.model,

        timestampMode:
          'not_applicable',

        timestampNote:
          'Not applicable to still-image OCR.'
      }
    );


  createOrUpdateTxtSidecar_(
    sourceFile,
    portableOcr
  );


  console.log(
    'IMAGE_OCR_DONE: ' +
    fileMeta.name
  );
}


function callGeminiImage_(
  apiKey,
  base64Data,
  mimeType,
  prompt
) {
  const primaryModel =
    CAREER_OS_CONFIG.GEMINI_IMAGE_MODEL_PRIMARY;

  const fallbackModel =
    CAREER_OS_CONFIG.GEMINI_IMAGE_MODEL_FALLBACK;

  try {
    return callGeminiImageWithModel_(
      apiKey,
      base64Data,
      mimeType,
      prompt,
      primaryModel
    );
  }
  catch (primaryError) {
    if (
      !shouldFallbackGeminiImageError_(primaryError) ||
      !fallbackModel ||
      fallbackModel === primaryModel
    ) {
      throw primaryError;
    }

    console.log(
      'GEMINI_IMAGE_PRIMARY_FAILED_FALLBACK: ' +
      primaryModel + ' -> ' + fallbackModel +
      ' | status=' + Number(primaryError.httpStatus || 0)
    );

    return callGeminiImageWithModel_(
      apiKey,
      base64Data,
      mimeType,
      prompt,
      fallbackModel
    );
  }
}


function shouldFallbackGeminiImageError_(error) {
  const status =
    Number(error && error.httpStatus || 0);

  // Fallback for model/input availability, quota/capacity, and transient server errors.
  // Authentication/authorization failures should surface immediately instead.
  return (
    status === 0 ||
    status === 400 ||
    status === 404 ||
    status === 408 ||
    status === 409 ||
    status === 429 ||
    status >= 500
  );
}


function callGeminiImageWithModel_(
  apiKey,
  base64Data,
  mimeType,
  prompt,
  model
) {
  const url =
    'https://generativelanguage.googleapis.com/v1beta/interactions';

  const payload = {
    model: model,

    input: [
      {
        type: 'text',
        text: prompt
      },
      {
        type: 'image',
        data: base64Data,
        mime_type: mimeType,
        resolution:
          CAREER_OS_CONFIG
            .GEMINI_IMAGE_MEDIA_RESOLUTION
      }
    ]
  };

  applyGemini38ThinkingConfig_(
    payload,
    model,
    CAREER_OS_CONFIG.GEMINI_IMAGE_THINKING_LEVEL
  );

  const response =
    UrlFetchApp.fetch(
      url,
      {
        method: 'post',
        contentType: 'application/json',
        headers: {
          'x-goog-api-key': apiKey
        },
        payload: JSON.stringify(payload),
        muteHttpExceptions: true
      }
    );

  const status =
    response.getResponseCode();

  const body =
    response.getContentText();

  if (
    status < 200 ||
    status >= 300
  ) {
    console.log(
      'GEMINI_IMAGE_HTTP_ERROR: ' + status +
      ' | model=' + model
    );
    console.log(body);

    throw createRetryAwareHttpError_(
      'Gemini image request failed for model ' + model + '.',
      status,
      response,
      body
    );
  }

  const data =
    JSON.parse(body);

  return {
    text: extractGeminiText_(data),
    model: model
  };
}


/* =========================================================
   GEMINI 3.8 THINKING CONFIG + STACK ACCESS TESTS
   ========================================================= */


function applyGemini38ThinkingConfig_(
  payload,
  model,
  thinkingLevel
) {
  if (String(model || '') !== 'gemini-3.8-flash') {
    return payload;
  }

  const level =
    String(thinkingLevel || '')
      .trim()
      .toLowerCase();

  const allowedLevels = {
    low: true,
    medium: true,
    high: true
  };

  if (!allowedLevels[level]) {
    throw new Error(
      'Invalid Gemini 3.8 thinking level: ' +
      String(thinkingLevel) +
      '. Allowed: low, medium, high.'
    );
  }

  payload.generation_config =
    Object.assign(
      {},
      payload.generation_config || {},
      {
        thinking_level: level
      }
    );

  return payload;
}


// Tests Gemini 3.8 Flash with the existing API key.
function testCareerOsGemini38() {
  assertFreeOnlyConfiguration_();

  const apiKey =
    getGeminiApiKey_();

  const model =
    CAREER_OS_CONFIG
      .GEMINI_IMAGE_MODEL_PRIMARY;

  const url =
    'https://generativelanguage.googleapis.com/v1beta/interactions';

  const payload = {
    model: model,
    input: 'Return exactly CAREER_OS_GEMINI_38_OK.'
  };

  applyGemini38ThinkingConfig_(
    payload,
    model,
    'low'
  );

  const response =
    UrlFetchApp.fetch(
      url,
      {
        method: 'post',
        contentType: 'application/json',
        headers: {
          'x-goog-api-key': apiKey
        },
        payload: JSON.stringify(payload),
        muteHttpExceptions: true
      }
    );

  const status =
    response.getResponseCode();

  const body =
    response.getContentText();

  if (status < 200 || status >= 300) {
    console.log(
      'GEMINI_3_8_ACCESS_TEST_FAILED: HTTP ' +
      status +
      ' | ' +
      body
    );

    throw createRetryAwareHttpError_(
      'Gemini 3.8 access test failed.',
      status,
      response,
      body
    );
  }

  const data =
    JSON.parse(body);

  const outputText =
    extractGeminiText_(data);

  console.log(
    'GEMINI_3_8_ACCESS_TEST_OK: ' +
    String(outputText || '').trim()
  );

  return String(outputText || '').trim();
}


// Build a tiny valid PCM WAV entirely in memory.
// Silence is enough for an access/format smoke test; HTTP 2xx is the success criterion.
function buildCareerOsSilentWavBase64_() {
  const sampleRate = 16000;
  const seconds = 1;
  const channels = 1;
  const bitsPerSample = 16;
  const bytesPerSample =
    bitsPerSample / 8;
  const dataLength =
    sampleRate *
    seconds *
    channels *
    bytesPerSample;

  const bytes = [];

  function pushAscii(value) {
    String(value)
      .split('')
      .forEach(
        char => bytes.push(
          char.charCodeAt(0)
        )
      );
  }

  function pushLe16(value) {
    bytes.push(
      value & 0xff,
      (value >>> 8) & 0xff
    );
  }

  function pushLe32(value) {
    bytes.push(
      value & 0xff,
      (value >>> 8) & 0xff,
      (value >>> 16) & 0xff,
      (value >>> 24) & 0xff
    );
  }

  pushAscii('RIFF');
  pushLe32(36 + dataLength);
  pushAscii('WAVE');
  pushAscii('fmt ');
  pushLe32(16);
  pushLe16(1);
  pushLe16(channels);
  pushLe32(sampleRate);
  pushLe32(
    sampleRate *
    channels *
    bytesPerSample
  );
  pushLe16(
    channels *
    bytesPerSample
  );
  pushLe16(bitsPerSample);
  pushAscii('data');
  pushLe32(dataLength);

  for (
    let i = 0;
    i < dataLength;
    i += 1
  ) {
    bytes.push(0);
  }

  return Utilities.base64Encode(
    bytes.map(
      value =>
        value > 127
          ? value - 256
          : value
    )
  );
}


// Tests dedicated Gemini 3.5 Transcribe with a generated one-second silent WAV.
// The model may legitimately return empty text for silence; HTTP 2xx proves access.
function testCareerOsGemini35Transcribe() {
  assertFreeOnlyConfiguration_();

  const apiKey =
    getGeminiApiKey_();

  const url =
    'https://generativelanguage.googleapis.com/v1beta/interactions';

  const payload = {
    model:
      CAREER_OS_CONFIG
        .GEMINI_AUDIO_TRANSCRIBE_MODEL,
    input: [
      {
        type: 'audio',
        data:
          buildCareerOsSilentWavBase64_(),
        mime_type: 'audio/wav'
      }
    ],
    generation_config: {
      transcription_config: {
        language_codes: [],
        mode: {
          type: 'verbatim'
        }
      }
    }
  };

  const response =
    UrlFetchApp.fetch(
      url,
      {
        method: 'post',
        contentType: 'application/json',
        headers: {
          'x-goog-api-key': apiKey
        },
        payload: JSON.stringify(payload),
        muteHttpExceptions: true
      }
    );

  const status =
    response.getResponseCode();

  const body =
    response.getContentText();

  if (status < 200 || status >= 300) {
    console.log(
      'GEMINI_3_5_TRANSCRIBE_ACCESS_TEST_FAILED: HTTP ' +
      status +
      ' | ' +
      body
    );

    throw createRetryAwareHttpError_(
      'Gemini 3.5 Transcribe access test failed.',
      status,
      response,
      body
    );
  }

  console.log(
    'GEMINI_3_5_TRANSCRIBE_ACCESS_TEST_OK: HTTP ' +
    status
  );

  return true;
}


// One function to run after pasting this version.
// Expected final line:
// CAREER_OS_GEMINI_STACK_OK: 3.8 Flash + 3.5 Transcribe
function testCareerOsGeminiStack() {
  assertFreeOnlyConfiguration_();

  testCareerOsGemini38();
  testCareerOsGemini35Transcribe();

  console.log(
    'CAREER_OS_GEMINI_STACK_OK: ' +
    '3.8 Flash + 3.5 Transcribe'
  );

  return true;
}


/* =========================================================
   GEMINI RESPONSE PARSER
   ========================================================= */


function extractGeminiText_(data) {

  if (data.output_text) {
    return data.output_text;
  }


  if (
    data.interaction &&
    data.interaction.output_text
  ) {
    return (
      data.interaction.output_text
    );
  }


  if (
    data.interaction &&
    data.interaction.outputText
  ) {
    return (
      data.interaction.outputText
    );
  }


  // Current Interactions API structure.
  if (
    Array.isArray(data.steps)
  ) {
    const texts = [];


    data.steps.forEach(
      step => {

        if (
          step.type ===
            'model_output' &&
          Array.isArray(
            step.content
          )
        ) {

          step.content.forEach(
            item => {

              if (
                item.type ===
                  'text' &&
                item.text
              ) {
                texts.push(
                  item.text
                );
              }

            }
          );

        }

      }
    );


    if (texts.length > 0) {
      return texts
        .join('\n')
        .trim();
    }
  }


  // Older generateContent-style fallback.
  if (
    data.candidates &&
    data.candidates[0] &&
    data.candidates[0].content &&
    Array.isArray(
      data.candidates[0]
        .content.parts
    )
  ) {

    return (
      data.candidates[0]
        .content.parts
        .map(
          part =>
            part.text || ''
        )
        .join('\n')
        .trim()
    );
  }


  console.log(
    'Unexpected Gemini response: ' +
    JSON.stringify(data)
  );


  return '';
}



function markAudioSourceProcessingStatus_(
  fileId,
  status,
  sourceFingerprint,
  modifiedTime,
  errorMessage
) {
  updateAppPropertiesIfChanged_(
    fileId,
    {
      careerOsAudioStatus:
        String(status || ''),

      careerOsAudioProcessedSourceFingerprint:
        String(sourceFingerprint || ''),

      careerOsAudioProcessedSourceModifiedTime:
        String(modifiedTime || ''),

      careerOsAudioLastError:
        errorMessage
          ? String(errorMessage)
              .substring(0, 500)
          : ''
    },
    'AUDIO_STATUS_TAG_WARNING'
  );
}


/* =========================================================
   AUDIO QUEUE
   ========================================================= */


function enqueueAudioJob_(fileMeta) {
  const queue =
    loadAudioQueue_();


  const sourceFingerprint =
    String(
      fileMeta.sourceFingerprint ||
      getSourceFingerprintFromFileMeta_(
        fileMeta
      )
    );

  const jobKey =
    String(fileMeta.id) +
    '|' +
    sourceFingerprint;


  const alreadyQueued =
    queue.some(
      job =>
        job.jobKey ===
        jobKey
    );


  if (alreadyQueued) {
    console.log(
      'AUDIO_ALREADY_QUEUED: ' +
      fileMeta.name
    );

    return;
  }


  if (
    queue.length >=
    CAREER_OS_CONFIG
      .MAX_AUDIO_QUEUE_LENGTH
  ) {
    throw new Error(
      'Audio queue is full. ' +
      'Current limit: ' +
      CAREER_OS_CONFIG
        .MAX_AUDIO_QUEUE_LENGTH
    );
  }


  const size =
    Number(
      fileMeta.size || 0
    );


  if (!size || size <= 0) {
    throw new Error(
      'Audio file size is unavailable for ' +
      fileMeta.name
    );
  }


  queue.push({
    jobKey: jobKey,

    fileId:
      fileMeta.id,

    name:
      fileMeta.name,

    mimeType:
      normalizeAudioMimeType_(
        fileMeta.mimeType
      ),

    size:
      size,

    modifiedTime:
      fileMeta.modifiedTime ||
      '',

    sourceFingerprint:
      sourceFingerprint,

    status:
      'QUEUED',

    uploadUrl:
      '',

    offset:
      0,

    chunkSize:
      CAREER_OS_CONFIG
        .AUDIO_CHUNK_TARGET_BYTES,

    fileUri:
      '',

    geminiFileName:
      '',

    attempts:
      0,

    nextAttemptAt:
      0,

    lastError:
      '',

    createdAt:
      new Date()
        .toISOString()
  });


  saveAudioQueue_(queue);


  console.log(
    'AUDIO_QUEUED: ' +
    fileMeta.name +
    ' (' +
    size +
    ' bytes)'
  );
}


/* =========================================================
   AUDIO JOB PROCESSOR
   ========================================================= */


function processAudioQueue_() {
  const startedAt =
    Date.now();

  const deadline =
    startedAt +
    CAREER_OS_CONFIG
      .AUDIO_WORK_BUDGET_MS;

  let queue =
    loadAudioQueue_();

  if (
    queue.length === 0
  ) {
    return;
  }

  while (
    queue.length > 0 &&
    Date.now() < deadline
  ) {
    const job =
      queue[0];

    if (
      refreshQueuedAudioVersion_(
        job
      )
    ) {
      saveAudioQueue_(queue);
    }

    if (
      Number(job.nextAttemptAt || 0) >
      Date.now()
    ) {
      console.log(
        'AUDIO_RETRY_NOT_DUE_YET: ' +
        job.name +
        ' | due=' +
        new Date(
          Number(job.nextAttemptAt)
        ).toISOString()
      );
      return;
    }

    try {
      if (
        job.status ===
        'QUEUED'
      ) {
        startGeminiResumableUpload_(
          job
        );

        job.nextAttemptAt = 0;

        saveAudioQueue_(
          queue
        );
      }

      if (
        job.status ===
        'UPLOADING'
      ) {
        syncGeminiUploadOffset_(
          job
        );

        job.nextAttemptAt = 0;

        saveAudioQueue_(
          queue
        );

        while (
          job.status ===
            'UPLOADING' &&
          Date.now() <
            deadline
        ) {
          uploadNextAudioChunk_(
            job
          );

          saveAudioQueue_(
            queue
          );
        }
      }

      if (
        job.status ===
        'READY_TO_TRANSCRIBE'
      ) {
        const remaining =
          deadline -
          Date.now();

        if (
          remaining <
          CAREER_OS_CONFIG
            .AUDIO_TRANSCRIBE_MIN_REMAINING_MS
        ) {
          console.log(
            'AUDIO_TRANSCRIBE_DEFERRED_TO_NEXT_RUN: ' +
            job.name
          );
          return;
        }

        transcribeUploadedAudio_(
          job
        );

        resetGeminiQuotaCircuitOnSuccess_();

        queue.shift();

        saveAudioQueue_(
          queue
        );

        console.log(
          'AUDIO_JOB_COMPLETE: ' +
          job.name
        );

        continue;
      }

      if (
        job.status !==
          'QUEUED' &&
        job.status !==
          'UPLOADING' &&
        job.status !==
          'READY_TO_TRANSCRIBE'
      ) {
        throw new Error(
          'Unknown audio job status: ' +
          job.status
        );
      }

      if (
        Date.now() >=
        deadline
      ) {
        return;
      }

    } catch (error) {
      const status =
        Number(
          error && error.httpStatus
            ? error.httpStatus
            : 0
        );

      const retryable =
        status === 429 ||
        status === 408 ||
        status === 500 ||
        status === 502 ||
        status === 503 ||
        status === 504 ||
        status === 0;

      job.attempts =
        Number(
          job.attempts || 0
        ) + 1;

      job.lastError =
        String(
          error &&
          error.message
            ? error.message
            : error
        );

      const keepRetrying =
        retryable &&
        job.attempts <
          CAREER_OS_CONFIG
            .AUDIO_MAX_ATTEMPTS;

      if (keepRetrying) {
        const retryDelay =
          computeRetryDelayMs_(
            Math.min(
              job.attempts,
              CAREER_OS_CONFIG
                .AUDIO_MAX_ATTEMPTS
            ),
            Number(
              error && error.retryAfterMs
                ? error.retryAfterMs
                : 0
            ),
            CAREER_OS_CONFIG
              .AUDIO_RETRY_MIN_MS,
            CAREER_OS_CONFIG
              .AUDIO_RETRY_MAX_MS
          );

        job.nextAttemptAt =
          Date.now() +
          retryDelay;

        let quotaCircuitUntil = 0;

        if (status === 429) {
          setGlobalGeminiBackoffUntil_(
            job.nextAttemptAt
          );

          quotaCircuitUntil =
            noteGeminiQuota429_();
        }

        saveAudioQueue_(
          queue
        );

        markAudioSourceProcessingStatus_(
          job.fileId,
          'RETRY_WAIT',
          job.sourceFingerprint || '',
          job.modifiedTime || '',
          status === 429
            ? 'Gemini quota/rate limit (HTTP 429); retry scheduled.'
            : job.lastError
        );

        console.log(
          'AUDIO_RETRY_SCHEDULED: ' +
          job.name +
          ' | HTTP=' + status +
          ' | attempt=' + job.attempts +
          ' | retry_after_ms=' + retryDelay +
          (
            quotaCircuitUntil > 0
              ? ' | circuit_until=' +
                new Date(quotaCircuitUntil).toISOString()
              : ''
          )
        );

        return;
      }

      markAudioSourceProcessingStatus_(
        job.fileId,
        'ERROR',
        job.sourceFingerprint || '',
        job.modifiedTime || '',
        job.lastError
      );

      try {
        const failedSource =
          DriveApp.getFileById(
            job.fileId
          );

        const failedContext =
          resolveSessionContext_(
            failedSource,
            false
          );

        if (
          failedContext &&
          failedContext.sessionFolder
        ) {
          updateSessionManifest_(
            failedContext.sessionFolder
          );
        }
      } catch (statusRefreshError) {
        console.log(
          'AUDIO_ERROR_STATUS_REFRESH_WARNING: ' +
          String(statusRefreshError)
        );
      }

      console.log(
        'AUDIO_JOB_PERMANENT_ERROR: ' +
        job.name +
        ' | HTTP=' + status +
        ' | attempts=' + job.attempts +
        ' | ' +
        job.lastError
      );

      // Do not leave a finalized temporary Gemini file behind after a
      // non-retryable/permanent audio failure.
      deleteGeminiUploadedFile_(
        job.geminiFileName
      );

      // Do not let one permanently failing source keep the one-minute worker
      // alive forever. The original source remains untouched and can be
      // retriggered later by a real content change.
      queue.shift();
      saveAudioQueue_(queue);
    }
  }
}


/* =========================================================
   GEMINI RESUMABLE FILE UPLOAD
   ========================================================= */


function startGeminiResumableUpload_(
  job
) {
  const apiKey =
    getGeminiApiKey_();


  const url =
    'https://generativelanguage.googleapis.com/upload/v1beta/files';


  const response =
    UrlFetchApp.fetch(
      url,
      {
        method:
          'post',

        contentType:
          'application/json',

        headers: {
          'x-goog-api-key':
            apiKey,

          'X-Goog-Upload-Protocol':
            'resumable',

          'X-Goog-Upload-Command':
            'start',

          'X-Goog-Upload-Header-Content-Length':
            String(
              job.size
            ),

          'X-Goog-Upload-Header-Content-Type':
            job.mimeType
        },

        payload:
          JSON.stringify({
            file: {
              display_name:
                job.name
            }
          }),

        muteHttpExceptions:
          true
      }
    );


  const status =
    response.getResponseCode();

  const body =
    response.getContentText();


  if (
    status < 200 ||
    status >= 300
  ) {

    console.log(
      'GEMINI_UPLOAD_START_ERROR: ' +
      status
    );

    console.log(body);


    throw createRetryAwareHttpError_(
      'Could not start Gemini resumable upload.',
      status,
      response,
      body
    );
  }


  const headers =
    response.getAllHeaders();


  const uploadUrl =
    getHeaderCaseInsensitive_(
      headers,
      'x-goog-upload-url'
    );


  if (!uploadUrl) {
    throw new Error(
      'Gemini did not return ' +
      'X-Goog-Upload-URL.'
    );
  }


  const granularityHeader =
    getHeaderCaseInsensitive_(
      headers,
      'x-goog-upload-chunk-granularity'
    );


  const granularity =
    Number(
      granularityHeader || 0
    );


  let chunkSize =
    CAREER_OS_CONFIG
      .AUDIO_CHUNK_TARGET_BYTES;


  if (granularity > 0) {

    chunkSize =
      Math.floor(
        chunkSize /
        granularity
      ) *
      granularity;


    if (
      chunkSize <
      granularity
    ) {
      chunkSize =
        granularity;
    }
  }


  // Keep safely below Apps Script POST limits.
  if (
    chunkSize >
    32 * 1024 * 1024
  ) {

    throw new Error(
      'Gemini upload chunk granularity ' +
      'is too large for Apps Script.'
    );
  }


  job.uploadUrl =
    String(uploadUrl);

  job.offset =
    0;

  job.chunkSize =
    chunkSize;

  job.status =
    'UPLOADING';

  job.lastError =
    '';


  console.log(
    'AUDIO_UPLOAD_SESSION_STARTED: ' +
    job.name +
    ' | chunk=' +
    job.chunkSize
  );
}


/* =========================================================
   RESUME / OFFSET RECOVERY
   ========================================================= */


function syncGeminiUploadOffset_(
  job
) {

  if (!job.uploadUrl) {

    job.status =
      'QUEUED';

    job.offset =
      0;

    return;
  }


  const response =
    UrlFetchApp.fetch(
      job.uploadUrl,
      {
        method:
          'post',

        headers: {
          'X-Goog-Upload-Command':
            'query'
        },

        payload:
          '',

        muteHttpExceptions:
          true
      }
    );


  const status =
    response.getResponseCode();


  if (
    status < 200 ||
    status >= 300
  ) {

    throw createRetryAwareHttpError_(
      'Could not query Gemini upload offset.',
      status,
      response,
      response.getContentText()
    );
  }


  const headers =
    response.getAllHeaders();


  const uploadStatus =
    String(
      getHeaderCaseInsensitive_(
        headers,
        'x-goog-upload-status'
      ) ||
      'active'
    )
      .toLowerCase();


  const received =
    Number(
      getHeaderCaseInsensitive_(
        headers,
        'x-goog-upload-size-received'
      ) ||
      0
    );


  if (
    uploadStatus !==
    'active'
  ) {

    if (!job.fileUri) {

      console.log(
        'AUDIO_UPLOAD_SESSION_NOT_ACTIVE_RESTARTING: ' +
        job.name
      );


      job.status =
        'QUEUED';

      job.uploadUrl =
        '';

      job.offset =
        0;

      return;
    }
  }


  job.offset =
    received;


  console.log(
    'AUDIO_UPLOAD_RESUME_AT: ' +
    job.name +
    ' | offset=' +
    job.offset
  );
}


/* =========================================================
   UPLOAD ONE AUDIO CHUNK
   ========================================================= */


function uploadNextAudioChunk_(
  job
) {

  if (
    job.offset >=
    job.size
  ) {

    if (job.fileUri) {

      job.status =
        'READY_TO_TRANSCRIBE';

      return;
    }


    throw new Error(
      'Upload offset reached file size ' +
      'but Gemini file URI is missing.'
    );
  }


  const start =
    Number(
      job.offset
    );


  const endExclusive =
    Math.min(
      start +
      Number(
        job.chunkSize
      ),

      Number(
        job.size
      )
    );


  const endInclusive =
    endExclusive -
    1;


  const expectedLength =
    endExclusive -
    start;


  const isFinal =
    endExclusive >=
    Number(
      job.size
    );


  const bytes =
    readDriveByteRange_(
      job.fileId,
      start,
      endInclusive
    );


  if (
    bytes.length !==
    expectedLength
  ) {

    throw new Error(
      'Drive returned ' +
      bytes.length +
      ' bytes, expected ' +
      expectedLength +
      '.'
    );
  }


  const response =
    UrlFetchApp.fetch(
      job.uploadUrl,
      {
        method:
          'post',

        contentType:
          job.mimeType,

        headers: {

          'X-Goog-Upload-Offset':
            String(start),

          'X-Goog-Upload-Command':
            isFinal
              ? 'upload, finalize'
              : 'upload'
        },

        payload:
          bytes,

        muteHttpExceptions:
          true
      }
    );


  const status =
    response.getResponseCode();

  const body =
    response.getContentText();


  if (
    status < 200 ||
    status >= 300
  ) {

    console.log(
      'GEMINI_AUDIO_CHUNK_UPLOAD_ERROR: ' +
      status
    );

    console.log(body);


    throw createRetryAwareHttpError_(
      'Gemini chunk upload failed.',
      status,
      response,
      body
    );
  }


  job.offset =
    endExclusive;

  job.lastError =
    '';


  if (isFinal) {

    const data =
      body
        ? JSON.parse(body)
        : {};


    const file =
      data.file ||
      data;


    job.fileUri =
      file.uri ||
      '';


    job.geminiFileName =
      file.name ||
      '';


    if (!job.fileUri) {

      throw new Error(
        'Gemini finalized the upload ' +
        'but returned no file URI.'
      );
    }


    job.status =
      'READY_TO_TRANSCRIBE';


    console.log(
      'AUDIO_UPLOAD_COMPLETE: ' +
      job.name
    );


    return;
  }


  const percent =
    Math.floor(
      (
        job.offset /
        job.size
      ) *
      100
    );


  console.log(
    'AUDIO_UPLOAD_PROGRESS: ' +
    job.name +
    ' | ' +
    percent +
    '%'
  );
}


/* =========================================================
   READ ONLY A BYTE RANGE FROM GOOGLE DRIVE

   Important:
   we do NOT load the whole 60–100 MB file into Apps Script.
   ========================================================= */


function readDriveByteRange_(
  fileId,
  start,
  endInclusive
) {

  const url =
    'https://www.googleapis.com/drive/v3/files/' +
    encodeURIComponent(
      fileId
    ) +
    '?alt=media';


  const response =
    UrlFetchApp.fetch(
      url,
      {
        method:
          'get',

        headers: {

          Authorization:
            'Bearer ' +
            ScriptApp
              .getOAuthToken(),

          Range:
            'bytes=' +
            start +
            '-' +
            endInclusive
        },

        muteHttpExceptions:
          true
      }
    );


  const status =
    response.getResponseCode();


  if (
    status !== 206 &&
    status !== 200
  ) {

    throw createRetryAwareHttpError_(
      'Drive partial download failed.',
      status,
      response,
      response.getContentText()
    );
  }


  const bytes =
    response
      .getBlob()
      .getBytes();


  const expectedLength =
    endInclusive -
    start +
    1;


  if (
    status === 200 &&
    bytes.length !==
      expectedLength
  ) {

    throw new Error(
      'Drive ignored the Range request; ' +
      'refusing to load the whole large file.'
    );
  }


  return bytes;
}


/* =========================================================
   TRANSCRIBE THE RECONSTRUCTED GEMINI FILE
   ========================================================= */


function shouldFallbackGeminiAudioTranscribeError_(
  error
) {
  const status =
    Number(
      error &&
      error.httpStatus ||
      0
    );

  // Authentication/authorization failures should surface immediately.
  // Model/input limits, quota/capacity and transient failures may safely
  // fall back to Gemini 3.8 Flash audio understanding.
  return (
    status === 0 ||
    status === 400 ||
    status === 404 ||
    status === 408 ||
    status === 409 ||
    status === 429 ||
    status >= 500
  );
}


function callGemini35Transcribe_(
  apiKey,
  fileUri,
  mimeType
) {
  const model =
    CAREER_OS_CONFIG
      .GEMINI_AUDIO_TRANSCRIBE_MODEL;

  const url =
    'https://generativelanguage.googleapis.com/v1beta/interactions';

  const payload = {
    model: model,
    input: [
      {
        type: 'audio',
        uri: fileUri,
        mime_type: mimeType
      }
    ],
    generation_config: {
      transcription_config: {
        // Empty language list intentionally enables automatic detection and
        // code-switching. Verbatim is canonical raw evidence.
        language_codes: [],
        mode: {
          type: 'verbatim'
        }
      }
    }
  };

  const response =
    UrlFetchApp.fetch(
      url,
      {
        method: 'post',
        contentType: 'application/json',
        headers: {
          'x-goog-api-key': apiKey
        },
        payload:
          JSON.stringify(payload),
        muteHttpExceptions: true
      }
    );

  const status =
    response.getResponseCode();

  const body =
    response.getContentText();

  if (
    status < 200 ||
    status >= 300
  ) {
    console.log(
      'GEMINI_3_5_TRANSCRIBE_HTTP_ERROR: ' +
      status
    );

    throw createRetryAwareHttpError_(
      'Gemini 3.5 Transcribe request failed.',
      status,
      response,
      body
    );
  }

  const data =
    JSON.parse(body);

  return {
    text:
      extractGeminiText_(data),
    model:
      model,
    method:
      'gemini_3_5_transcribe_verbatim'
  };
}


function callGemini38AudioNavigation_(
  apiKey,
  fileUri,
  mimeType
) {
  const model =
    CAREER_OS_CONFIG
      .GEMINI_AUDIO_NAVIGATION_MODEL;

  const url =
    'https://generativelanguage.googleapis.com/v1beta/interactions';

  const prompt =
    'Create a compact navigation index for this audio, not a full transcript. ' +
    'Keep the original spoken language for topic labels. ' +
    'Cover the entire recording in chronological order. ' +
    'Start every line with an approximate segment start timestamp in exactly [HH:MM:SS] format. ' +
    'After the timestamp, add a short speaker label only when reasonably distinguishable ' +
    '(Lecturer, Student, Speaker 1, Speaker 2, etc.; never invent real names), ' +
    'then a concise topic/contents label for that segment. ' +
    'Use enough segments to make the recording easy to navigate, normally around 30 to 120 seconds apart ' +
    'and whenever the topic or speaker clearly changes. ' +
    'Return plain text only; no introduction or conclusion.';

  const payload = {
    model: model,
    input: [
      {
        type: 'text',
        text: prompt
      },
      {
        type: 'audio',
        uri: fileUri,
        mime_type: mimeType
      }
    ]
  };

  applyGemini38ThinkingConfig_(
    payload,
    model,
    CAREER_OS_CONFIG
      .GEMINI_AUDIO_NAVIGATION_THINKING_LEVEL
  );

  const response =
    UrlFetchApp.fetch(
      url,
      {
        method: 'post',
        contentType: 'application/json',
        headers: {
          'x-goog-api-key': apiKey
        },
        payload:
          JSON.stringify(payload),
        muteHttpExceptions: true
      }
    );

  const status =
    response.getResponseCode();

  const body =
    response.getContentText();

  if (
    status < 200 ||
    status >= 300
  ) {
    throw createRetryAwareHttpError_(
      'Gemini 3.8 audio navigation request failed.',
      status,
      response,
      body
    );
  }

  const data =
    JSON.parse(body);

  return {
    text:
      extractGeminiText_(data),
    model:
      model
  };
}


function callGemini38AudioTranscriptFallback_(
  apiKey,
  fileUri,
  mimeType
) {
  const model =
    CAREER_OS_CONFIG
      .GEMINI_AUDIO_FALLBACK_MODEL;

  const url =
    'https://generativelanguage.googleapis.com/v1beta/interactions';

  const prompt =
    'Create a faithful timestamped transcript of this audio. ' +
    'Keep the original spoken language. ' +
    'Do not translate, summarize, or omit substantive speech. ' +
    'Return plain text only. ' +
    'Split the transcript into coherent segments and start every segment with ' +
    'an approximate source timestamp in exactly [HH:MM:SS] format. ' +
    'Add a generic speaker label when reasonably distinguishable, but never invent real names. ' +
    'Preserve technical terms, equations, acronyms, names, and course terminology as accurately as possible.';

  const payload = {
    model: model,
    input: [
      {
        type: 'text',
        text: prompt
      },
      {
        type: 'audio',
        uri: fileUri,
        mime_type: mimeType
      }
    ]
  };

  applyGemini38ThinkingConfig_(
    payload,
    model,
    CAREER_OS_CONFIG
      .GEMINI_AUDIO_NAVIGATION_THINKING_LEVEL
  );

  const response =
    UrlFetchApp.fetch(
      url,
      {
        method: 'post',
        contentType: 'application/json',
        headers: {
          'x-goog-api-key': apiKey
        },
        payload:
          JSON.stringify(payload),
        muteHttpExceptions: true
      }
    );

  const status =
    response.getResponseCode();

  const body =
    response.getContentText();

  if (
    status < 200 ||
    status >= 300
  ) {
    throw createRetryAwareHttpError_(
      'Gemini 3.8 audio transcript fallback failed.',
      status,
      response,
      body
    );
  }

  const data =
    JSON.parse(body);

  return {
    text:
      extractGeminiText_(data),
    model:
      model,
    method:
      'gemini_3_8_audio_timestamped_fallback'
  };
}


function transcribeUploadedAudio_(
  job
) {
  const apiKey =
    getGeminiApiKey_();

  const sourceFile =
    DriveApp.getFileById(
      job.fileId
    );

  let transcriptResult = null;
  let navigationResult = null;
  let usedFallback = false;

  try {
    transcriptResult =
      callGemini35Transcribe_(
        apiKey,
        job.fileUri,
        job.mimeType
      );

    const transcriptText =
      String(
        transcriptResult.text || ''
      ).trim();

    if (!transcriptText) {
      throw new Error(
        'Gemini 3.5 Transcribe returned no transcript text.'
      );
    }

    console.log(
      'AUDIO_VERBATIM_TRANSCRIBE_DONE: ' +
      job.name +
      ' | model=' +
      transcriptResult.model
    );

  } catch (transcribeError) {
    if (
      !shouldFallbackGeminiAudioTranscribeError_(
        transcribeError
      )
    ) {
      throw transcribeError;
    }

    console.log(
      'AUDIO_TRANSCRIBE_PRIMARY_FAILED_FALLBACK_TO_3_8: ' +
      job.name +
      ' | status=' +
      Number(
        transcribeError.httpStatus || 0
      )
    );

    transcriptResult =
      callGemini38AudioTranscriptFallback_(
        apiKey,
        job.fileUri,
        job.mimeType
      );

    usedFallback = true;
  }

  const transcriptText =
    String(
      transcriptResult &&
      transcriptResult.text ||
      ''
    ).trim();

  if (!transcriptText) {
    throw new Error(
      'Gemini returned no transcript for ' +
      job.name
    );
  }

  // When dedicated Transcribe succeeded, create a separate long-audio
  // navigation index with Gemini 3.8. Navigation failure must not destroy
  // an otherwise valid verbatim transcript.
  if (!usedFallback) {
    try {
      navigationResult =
        callGemini38AudioNavigation_(
          apiKey,
          job.fileUri,
          job.mimeType
        );

      if (
        !containsNavigationTimestamp_(
          navigationResult.text || ''
        )
      ) {
        console.log(
          'AUDIO_NAVIGATION_TIMESTAMP_WARNING: ' +
          job.name
        );
      } else {
        console.log(
          'AUDIO_NAVIGATION_DONE: ' +
          job.name +
          ' | model=' +
          navigationResult.model
        );
      }

    } catch (navigationError) {
      console.log(
        'AUDIO_NAVIGATION_WARNING_TRANSCRIPT_PRESERVED: ' +
        job.name +
        ' | ' +
        String(
          navigationError &&
          navigationError.message
            ? navigationError.message
            : navigationError
        )
      );

      navigationResult = null;
    }
  }

  let artifactBody = '';

  if (
    navigationResult &&
    String(navigationResult.text || '').trim()
  ) {
    artifactBody =
      '=== NAVIGATION INDEX ===\n' +
      String(navigationResult.text).trim() +
      '\n\n' +
      '=== VERBATIM TRANSCRIPT ===\n' +
      transcriptText;
  } else if (
    usedFallback
  ) {
    artifactBody =
      '=== TIMESTAMPED TRANSCRIPT (3.8 FALLBACK) ===\n' +
      transcriptText;
  } else {
    artifactBody =
      '=== VERBATIM TRANSCRIPT ===\n' +
      transcriptText;
  }

  const modelSummary =
    usedFallback
      ? CAREER_OS_CONFIG
          .GEMINI_AUDIO_FALLBACK_MODEL
      : (
          CAREER_OS_CONFIG
            .GEMINI_AUDIO_TRANSCRIBE_MODEL +
          (
            navigationResult
              ? '+' +
                CAREER_OS_CONFIG
                  .GEMINI_AUDIO_NAVIGATION_MODEL
              : ''
          )
        );

  const extractionMethod =
    usedFallback
      ? 'gemini_3_8_audio_timestamped_fallback'
      : (
          navigationResult
            ? 'gemini_3_5_transcribe_verbatim_plus_gemini_3_8_navigation'
            : 'gemini_3_5_transcribe_verbatim'
        );

  const portableTranscript =
    buildPortableArtifact_(
      sourceFile,
      artifactBody,
      {
        artifactType:
          'audio_transcript',

        sourceMimeType:
          job.mimeType,

        sourceSizeBytes:
          job.size,

        sourceModifiedUtc:
          job.modifiedTime ||
          '',

        sourceFingerprint:
          job.sourceFingerprint ||
          getSourceFingerprintById_(
            job.fileId
          ),

        model:
          modelSummary,

        extractionMethod:
          extractionMethod,

        timestampMode:
          navigationResult || usedFallback
            ? CAREER_OS_CONFIG
                .AUDIO_TIMESTAMP_MODE
            : 'none',

        timestampNote:
          navigationResult || usedFallback
            ? CAREER_OS_CONFIG
                .AUDIO_TIMESTAMP_NOTE
            : 'Canonical verbatim transcript created without navigation timestamps.'
      }
    );

  const transcriptFile =
    createOrUpdateTxtSidecar_(
      sourceFile,
      portableTranscript
    );

  if (transcriptFile) {
    markAudioSatisfiedByTranscript_(
      sourceFile,
      transcriptFile,
      job.sourceFingerprint ||
        getSourceFingerprintById_(
          job.fileId
        )
    );
  }

  markAudioSourceProcessingStatus_(
    job.fileId,
    'DONE',
    job.sourceFingerprint ||
      getSourceFingerprintById_(
        job.fileId
      ),
    job.modifiedTime || '',
    ''
  );

  try {
    const completedContext =
      resolveSessionContext_(
        sourceFile,
        false
      );

    if (
      completedContext &&
      completedContext.sessionFolder
    ) {
      updateSessionManifest_(
        completedContext.sessionFolder
      );
    }
  } catch (manifestRefreshError) {
    console.log(
      'AUDIO_COMPLETE_STATUS_REFRESH_WARNING: ' +
      String(manifestRefreshError)
    );
  }

  console.log(
    'AUDIO_TRANSCRIBE_DONE: ' +
    job.name +
    ' | model=' +
    modelSummary
  );

  // Remove temporary Gemini file only after all requested analysis is complete.
  deleteGeminiUploadedFile_(
    job.geminiFileName
  );
}



function containsNavigationTimestamp_(
  text
) {

  return (
    /\[\d{2}:\d{2}:\d{2}\]/
      .test(
        String(
          text || ''
        )
      )
  );
}



/* =========================================================
   DELETE GEMINI TEMP FILE AFTER TRANSCRIPTION
   ========================================================= */


function deleteGeminiUploadedFile_(
  geminiFileName
) {

  if (!geminiFileName) {
    return;
  }


  try {

    const apiKey =
      getGeminiApiKey_();


    const name =
      String(
        geminiFileName
      )
        .replace(
          /^\//,
          ''
        );


    const url =
      'https://generativelanguage.googleapis.com/v1beta/' +
      name;


    const response =
      UrlFetchApp.fetch(
        url,
        {
          method:
            'delete',

          headers: {
            'x-goog-api-key':
              apiKey
          },

          muteHttpExceptions:
            true
        }
      );


    const status =
      response.getResponseCode();


    if (
      status >= 200 &&
      status < 300
    ) {

      console.log(
        'GEMINI_TEMP_FILE_DELETED: ' +
        name
      );

    } else {

      console.log(
        'GEMINI_TEMP_FILE_DELETE_WARNING: HTTP ' +
        status
      );

    }

  } catch (error) {

    console.log(
      'GEMINI_TEMP_FILE_DELETE_WARNING: ' +
      String(error)
    );

  }
}


/* =========================================================
   AUDIO MIME NORMALIZATION
   ========================================================= */


function normalizeAudioMimeType_(
  mimeType
) {

  const mime =
    (mimeType || '')
      .toLowerCase();


  const map = {

    'audio/x-wav':
      'audio/wav',

    'audio/x-m4a':
      'audio/m4a',

    'audio/mp4':
      'audio/m4a',

    'audio/x-mpeg':
      'audio/mpeg'
  };


  return (
    map[mime] ||
    mime
  );
}


/* =========================================================
   AUDIO QUEUE STORAGE
   ========================================================= */


function loadAudioQueue_() {

  const raw =
    PropertiesService
      .getScriptProperties()
      .getProperty(
        CAREER_OS_CONFIG
          .AUDIO_QUEUE_PROPERTY
      );


  if (!raw) {
    return [];
  }


  try {

    const queue =
      JSON.parse(raw);

    const parsed =
      Array.isArray(queue)
        ? queue
        : [];

    const migrated =
      migrateQueueFingerprints_(
        parsed,
        'audio'
      );

    if (migrated.changed) {
      PropertiesService
        .getScriptProperties()
        .setProperty(
          CAREER_OS_CONFIG
            .AUDIO_QUEUE_PROPERTY,
          JSON.stringify(
            migrated.queue
          )
        );

      console.log(
        'AUDIO_QUEUE_FINGERPRINT_MIGRATED'
      );
    }

    return migrated.queue;

  } catch (error) {

    throw new Error(
      'AUDIO_JOB_QUEUE is corrupted.'
    );

  }
}


function saveAudioQueue_(
  queue
) {

  const props =
    PropertiesService
      .getScriptProperties();


  if (
    !queue ||
    queue.length === 0
  ) {

    props.deleteProperty(
      CAREER_OS_CONFIG
        .AUDIO_QUEUE_PROPERTY
    );

    return;
  }


  props.setProperty(
    CAREER_OS_CONFIG
      .AUDIO_QUEUE_PROPERTY,

    JSON.stringify(
      queue
    )
  );
}


/* =========================================================
   HTTP HEADER HELPER
   ========================================================= */


function getHeaderCaseInsensitive_(
  headers,
  targetName
) {

  const target =
    String(
      targetName
    )
      .toLowerCase();


  for (
    const key in headers
  ) {

    if (
      String(key)
        .toLowerCase() ===
      target
    ) {

      const value =
        headers[key];


      if (
        Array.isArray(value)
      ) {

        return (
          value.length
            ? value[0]
            : ''
        );
      }


      return value;
    }
  }


  return '';
}


/* =========================================================
   PORTABLE ARTIFACT METADATA

   This visible header travels with the .txt file if it is
   downloaded, moved to GitHub, indexed by another AI system,
   or detached from Google Drive metadata.
   ========================================================= */


function buildPortableArtifact_(
  sourceFile,
  bodyText,
  options
) {

  const opts =
    options || {};


  const context =
    resolveSessionContext_(
      sourceFile,
      false
    );


  const identity =
    context
      ? {
          course:
            context.courseFolderName ||
            'UNKNOWN',

          session:
            context.sessionFolderName ||
            'UNKNOWN',

          basis:
            'drive_folder_id'
        }
      : inferCourseSessionFromFilename_(
          sourceFile.getName()
        );


  const parentFolderName =
    getParentFolderNameSafe_(
      sourceFile
    );


  const lines = [
    '=== CAREER OS ARTIFACT METADATA ===',

    'schema_version: ' +
      sanitizeMetadataValue_(
        CAREER_OS_CONFIG
          .ARTIFACT_SCHEMA_VERSION
      ),

    'artifact_type: ' +
      sanitizeMetadataValue_(
        opts.artifactType ||
        'text_artifact'
      ),

    'source_name: ' +
      sanitizeMetadataValue_(
        sourceFile.getName()
      ),

    'source_drive_id: ' +
      sanitizeMetadataValue_(
        sourceFile.getId()
      ),

    'source_parent_folder: ' +
      sanitizeMetadataValue_(
        parentFolderName
      ),

    'source_mime_type: ' +
      sanitizeMetadataValue_(
        opts.sourceMimeType ||
        ''
      ),

    'source_size_bytes: ' +
      sanitizeMetadataValue_(
        opts.sourceSizeBytes ||
        ''
      ),

    'source_modified_utc: ' +
      sanitizeMetadataValue_(
        opts.sourceModifiedUtc ||
        ''
      ),

    'source_content_fingerprint: ' +
      sanitizeMetadataValue_(
        opts.sourceFingerprint ||
        getSourceFingerprintById_(
          sourceFile.getId()
        )
      ),

    'source_fingerprint_schema_version: ' +
      sanitizeMetadataValue_(
        CAREER_OS_CONFIG
          .SOURCE_FINGERPRINT_SCHEMA_VERSION
      ),

    'course: ' +
      sanitizeMetadataValue_(
        identity.course
      ),

    'session: ' +
      sanitizeMetadataValue_(
        identity.session
      ),

    'course_session_basis: ' +
      sanitizeMetadataValue_(
        identity.basis
      ),

    'course_folder_drive_id: ' +
      sanitizeMetadataValue_(
        context
          ? context.courseFolderId
          : ''
      ),

    'session_folder_drive_id: ' +
      sanitizeMetadataValue_(
        context
          ? context.sessionFolderId
          : ''
      ),

    'course_name_at_generation: ' +
      sanitizeMetadataValue_(
        context
          ? context.courseFolderName
          : identity.course
      ),

    'session_name_at_generation: ' +
      sanitizeMetadataValue_(
        context
          ? context.sessionFolderName
          : identity.session
      ),

    'generated_utc: ' +
      new Date()
        .toISOString(),

    'generated_by: Career OS Automation',

    'model: ' +
      sanitizeMetadataValue_(
        opts.model ||
        CAREER_OS_CONFIG
          .GEMINI_AUDIO_TRANSCRIBE_MODEL
      ),

    'extraction_method: ' +
      sanitizeMetadataValue_(
        opts.extractionMethod ||
        ''
      ),

    'timestamp_mode: ' +
      sanitizeMetadataValue_(
        opts.timestampMode ||
        'none'
      ),

    'timestamp_note: ' +
      sanitizeMetadataValue_(
        opts.timestampNote ||
        ''
      ),

    '=== END CAREER OS ARTIFACT METADATA ===',

    '',

    String(
      bodyText || ''
    )
      .trim()
  ];


  return lines
    .join(
      '\n'
    )
    .trim() +
    '\n';
}


function inferCourseSessionFromFilename_(
  filename
) {

  const raw =
    String(
      filename || ''
    );


  const dot =
    raw.lastIndexOf(
      '.'
    );


  const base =
    (
      dot > 0
        ? raw.substring(
            0,
            dot
          )
        : raw
    )
      .trim();


  /*
   * Conservative filename parser.
   *
   * Examples:
   *   SAMPLE_COURSE_A L8        -> course=SAMPLE_COURSE_A, session=L8
   *   SAMPLE_COURSE_B R03       -> course=SAMPLE_COURSE_B, session=R03
   *   SAMPLE_COURSE_A Lecture 8 -> course=SAMPLE_COURSE_A, session=Lecture 8
   *   SAMPLE_COURSE_A Session 8 -> course=SAMPLE_COURSE_A, session=Session 8
   *
   * If the filename does not match one of these deterministic
   * patterns, we deliberately return UNKNOWN instead of guessing.
   */

  let match =
    base.match(
      /^(.*?)\s+((?:L|R)\d{1,3})\b/i
    );


  if (match) {
    return {
      course:
        cleanInferredLabel_(
          match[1]
        ),

      session:
        match[2]
          .toUpperCase(),

      basis:
        'filename_deterministic'
    };
  }


  match =
    base.match(
      /^(.*?)\s+(Lecture|Session)\s*[-_ ]*(\d{1,3})\b/i
    );


  if (match) {
    return {
      course:
        cleanInferredLabel_(
          match[1]
        ),

      session:
        capitalizeFirst_(
          match[2]
        ) +
        ' ' +
        match[3],

      basis:
        'filename_deterministic'
    };
  }


  return {
    course:
      'UNKNOWN',

    session:
      'UNKNOWN',

    basis:
      'unresolved'
  };
}



function cleanInferredLabel_(
  value
) {

  const cleaned =
    String(
      value || ''
    )
      .replace(
        /[_-]+$/g,
        ''
      )
      .trim();


  return (
    cleaned ||
    'UNKNOWN'
  );
}



function capitalizeFirst_(
  value
) {

  const text =
    String(
      value || ''
    )
      .toLowerCase();


  if (!text) {
    return '';
  }


  return (
    text.charAt(0)
      .toUpperCase() +
    text.slice(1)
  );
}



function getParentFolderNameSafe_(
  file
) {

  try {

    const parents =
      file.getParents();


    if (
      parents.hasNext()
    ) {
      return (
        parents.next()
          .getName()
      );
    }

  } catch (error) {

    console.log(
      'PARENT_FOLDER_METADATA_WARNING: ' +
      String(error)
    );
  }


  return 'UNKNOWN';
}



function sanitizeMetadataValue_(
  value
) {

  return String(
    value === undefined ||
    value === null
      ? ''
      : value
  )
    .replace(
      /[\r\n\t]+/g,
      ' '
    )
    .trim();
}


/* =========================================================
   CREATE / UPDATE SAME-NAME TXT
   ========================================================= */


function createOrUpdateTxtSidecar_(
  sourceFile,
  text
) {
  const context =
    prepareSessionWorkspace_(
      sourceFile
    );

  const folder =
    context.workspaceFolder;

  const sourceId =
    sourceFile.getId();

  const preferredName =
    buildTxtName_(
      sourceFile.getName()
    );

  // 1) Prefer the normal same-name .txt only when it is
  //    clearly owned by Career OS for this exact source file.
  let preferredExists = false;

  const preferredFiles =
    folder.getFilesByName(
      preferredName
    );

  while (
    preferredFiles.hasNext()
  ) {
    preferredExists = true;

    const candidate =
      preferredFiles.next();

    if (
      isCareerOsSidecarForSource_(
        candidate.getId(),
        sourceId
      )
    ) {
      candidate.setContent(
        text
      );

      markAsCareerOsGenerated_(
        candidate.getId(),
        sourceId,
        context.sessionFolderId
      );

      console.log(
        'UPDATED_TXT: ' +
        preferredName
      );

      updateSessionManifest_(
        context.sessionFolder
      );

      return candidate;
    }
  }

  // 2) If no same-name .txt exists at all, create the normal one.
  if (!preferredExists) {
    const txtFile =
      folder.createFile(
        preferredName,
        text,
        MimeType.PLAIN_TEXT
      );

    markAsCareerOsGenerated_(
      txtFile.getId(),
      sourceId,
      context.sessionFolderId
    );

    console.log(
      'CREATED_TXT: ' +
      preferredName
    );

    updateSessionManifest_(
      context.sessionFolder
    );

    return txtFile;
  }

  // 3) A same-name .txt exists, but Career OS cannot prove ownership.
  //    Preserve it. This protects manual transcripts, NotebookLM output,
  //    notes, and other user-created files from being overwritten.
  console.log(
    'SIDECAR_CONFLICT_PRESERVED: ' +
    preferredName
  );

  const fallbackName =
    buildCareerOsTxtName_(
      sourceFile.getName()
    );

  let fallbackExists = false;

  const fallbackFiles =
    folder.getFilesByName(
      fallbackName
    );

  while (
    fallbackFiles.hasNext()
  ) {
    fallbackExists = true;

    const candidate =
      fallbackFiles.next();

    if (
      isCareerOsSidecarForSource_(
        candidate.getId(),
        sourceId
      )
    ) {
      candidate.setContent(
        text
      );

      markAsCareerOsGenerated_(
        candidate.getId(),
        sourceId,
        context.sessionFolderId
      );

      console.log(
        'UPDATED_TXT_SAFE: ' +
        fallbackName
      );

      updateSessionManifest_(
        context.sessionFolder
      );

      return candidate;
    }
  }

  // 4) If the standard fallback name is also occupied by a file
  //    Career OS does not own, use a stable source-ID suffix.
  const finalName =
    fallbackExists
      ? buildUniqueCareerOsTxtName_(
          sourceFile.getName(),
          sourceId
        )
      : fallbackName;

  const txtFile =
    folder.createFile(
      finalName,
      text,
      MimeType.PLAIN_TEXT
    );

  markAsCareerOsGenerated_(
    txtFile.getId(),
    sourceId,
    context.sessionFolderId
  );

  console.log(
    'CREATED_TXT_SAFE: ' +
    finalName
  );

  updateSessionManifest_(
    context.sessionFolder
  );

  return txtFile;
}


function buildCareerOsTxtName_(
  filename
) {
  const dot =
    filename.lastIndexOf(
      '.'
    );

  const base =
    dot > 0
      ? filename.substring(
          0,
          dot
        )
      : filename;

  return (
    base +
    '.career-os.txt'
  );
}


function buildUniqueCareerOsTxtName_(
  filename,
  sourceId
) {
  const dot =
    filename.lastIndexOf(
      '.'
    );

  const base =
    dot > 0
      ? filename.substring(
          0,
          dot
        )
      : filename;

  const suffix =
    String(sourceId)
      .slice(-8);

  return (
    base +
    '.career-os-' +
    suffix +
    '.txt'
  );
}


function isCareerOsSidecarForSource_(
  fileId,
  sourceId
) {
  try {
    const metadata =
      Drive.Files.get(
        fileId,
        {
          fields:
            'id,appProperties'
        }
      );

    const props =
      metadata.appProperties ||
      {};

    return (
      props.careerOsGenerated ===
        'true' &&
      props.careerOsSourceId ===
        String(sourceId)
    );

  } catch (error) {
    console.log(
      'SIDECAR_OWNERSHIP_CHECK_WARNING: ' +
      String(error)
    );

    // Fail closed: never overwrite when ownership cannot be proven.
    return false;
  }
}


function markAsCareerOsGenerated_(
  fileId,
  sourceId,
  sessionFolderId
) {
  try {
    const appProperties = {
      careerOsGenerated:
        'true',

      careerOsSourceId:
        String(sourceId),

      careerOsFingerprintSchemaVersion:
        CAREER_OS_CONFIG
          .SOURCE_FINGERPRINT_SCHEMA_VERSION
    };

    if (sessionFolderId) {
      appProperties.careerOsSessionFolderId =
        String(sessionFolderId);
    }

    try {
      const sourceMetadata =
        getDriveFileMetadataSafe_(
          String(sourceId)
        );

      if (
        sourceMetadata.modifiedTime &&
        sourceMetadata.mimeType !==
          'application/vnd.google-apps.folder'
      ) {
        appProperties.careerOsSourceModifiedTime =
          String(sourceMetadata.modifiedTime);
      }

      const sourceFingerprint =
        buildSourceFingerprintFromMetadata_(
          sourceMetadata
        );

      if (sourceFingerprint) {
        appProperties.careerOsSourceFingerprint =
          String(sourceFingerprint);
      }
    } catch (sourceMetadataError) {
      // Optional provenance fields only; ownership safety does not depend on them.
    }

    updateAppPropertiesIfChanged_(
      fileId,
      appProperties,
      'SIDECAR_MARK_WARNING'
    );

  } catch (error) {
    console.log(
      'SIDECAR_MARK_WARNING: ' +
      String(error)
    );
  }
}


/* =========================================================
   SESSION-CENTRIC WORKSPACE

   Canonical identity = Google Drive folder ID.
   Folder names are mutable human labels and may be corrected later.
   ========================================================= */



function looksLikeSessionFolderLabel_(
  name
) {
  const value =
    String(name || '')
      .trim();

  if (!value) {
    return false;
  }

  // Conservative canonical session labels.
  // Examples:
  //   8
  //   L8 / R03 / S12
  //   Session 8 / SESSION_08
  //   Lecture 8 / Chapter 16 / Week 3 / Block 2
  //
  // A folder that does not look like a session label is NOT auto-promoted
  // merely because it happens to be two levels deep in Drive.
  return (
    /^\d{1,4}$/i.test(value) ||
    /^(?:L|R|S)\s*[-_]?\s*\d{1,4}$/i.test(value) ||
    /^(?:SESSION|LECTURE|CHAPTER|WEEK|BLOCK|UNIT|MODULE)\s*[-_]?\s*\d{1,4}$/i.test(value)
  );
}


function isReservedNonSessionFolderName_(
  name
) {
  const value =
    String(name || '')
      .trim()
      .toUpperCase();

  return (
    value ===
      CAREER_OS_CONFIG
        .SESSION_WORKSPACE_FOLDER
        .toUpperCase() ||
    value === 'TEACHING_VISUALS'
  );
}


function isValidSessionFolder_(
  folder
) {
  if (!folder) {
    return false;
  }

  try {
    const folderName =
      String(
        folder.getName() || ''
      ).trim();

    // A real session must have an explicit session-like label.
    // This is the main architectural boundary preventing arbitrary nested
    // evidence folders (TEACHING_VISUALS, exports, screenshots, etc.) from
    // becoming fake sessions.
    if (
      isReservedNonSessionFolderName_(
        folderName
      ) ||
      !looksLikeSessionFolderLabel_(
        folderName
      )
    ) {
      return false;
    }

    const parents =
      folder.getParents();

    if (!parents.hasNext()) {
      return false;
    }

    const immediateParent =
      parents.next();

    // Prevent nested support/evidence folders from becoming fake sessions.
    // Example:
    //   SESSION_08 / TEACHING_VISUALS
    // Here SESSION_08 already looks like the session label, so its child
    // TEACHING_VISUALS must not become another session.
    if (
      looksLikeSessionFolderLabel_(
        immediateParent.getName()
      )
    ) {
      return false;
    }

    // A real session may be directly under a course (Course / Session) or
    // under a collection (Course / L / Session). In both cases its immediate
    // parent itself has a parent. A top-level course directly under My Drive
    // does not satisfy this test and must never be treated as a session.
    const upperParents =
      immediateParent.getParents();

    return upperParents.hasNext();

  } catch (error) {
    return false;
  }
}


function isDriveFileInsideValidSession_(
  fileId
) {
  try {
    const file =
      DriveApp.getFileById(
        fileId
      );

    const parents =
      file.getParents();

    if (!parents.hasNext()) {
      return false;
    }

    let parent =
      parents.next();

    let sessionFolder =
      parent;

    if (
      parent.getName() ===
      CAREER_OS_CONFIG
        .SESSION_WORKSPACE_FOLDER
    ) {
      const sessionParents =
        parent.getParents();

      if (!sessionParents.hasNext()) {
        return false;
      }

      sessionFolder =
        sessionParents.next();
    }

    return isValidSessionFolder_(
      sessionFolder
    );

  } catch (error) {
    return false;
  }
}


function prepareSessionWorkspaceForSourceId_(
  fileId
) {
  const sourceFile =
    DriveApp.getFileById(
      fileId
    );

  return prepareSessionWorkspace_(
    sourceFile
  );
}


function prepareSessionWorkspace_(
  sourceFile
) {
  const context =
    resolveSessionContext_(
      sourceFile,
      true
    );

  if (!context) {
    throw new Error(
      'Could not resolve session folder for ' +
      sourceFile.getName()
    );
  }

  organizeSessionTxtFiles_(
    context.sessionFolder,
    context.workspaceFolder
  );

  tagSessionWorkspaceFolder_(
    context.workspaceFolder,
    context.sessionFolderId
  );

  updateSessionManifest_(
    context.sessionFolder
  );

  return context;
}


function resolveSessionContext_(
  file,
  createWorkspace
) {
  try {
    const parents =
      file.getParents();

    if (!parents.hasNext()) {
      return null;
    }

    let parent =
      parents.next();

    let sessionFolder;
    let workspaceFolder = null;

    if (
      parent.getName() ===
      CAREER_OS_CONFIG
        .SESSION_WORKSPACE_FOLDER
    ) {
      workspaceFolder =
        parent;

      const sessionParents =
        parent.getParents();

      if (!sessionParents.hasNext()) {
        return null;
      }

      sessionFolder =
        sessionParents.next();

    } else {
      sessionFolder =
        parent;
    }

    if (!workspaceFolder) {
      workspaceFolder =
        getOrCreateSessionWorkspaceFolder_(
          sessionFolder,
          Boolean(createWorkspace)
        );
    }

    const hierarchy =
      resolveCourseHierarchyForSessionFolder_(
        sessionFolder
      );

    const courseFolder =
      hierarchy.courseFolder;

    const collectionFolder =
      hierarchy.collectionFolder;

    return {
      sessionFolder:
        sessionFolder,

      sessionFolderId:
        sessionFolder.getId(),

      sessionFolderName:
        sessionFolder.getName(),

      workspaceFolder:
        workspaceFolder,

      workspaceFolderId:
        workspaceFolder
          ? workspaceFolder.getId()
          : '',

      courseFolder:
        courseFolder,

      courseFolderId:
        courseFolder
          ? courseFolder.getId()
          : '',

      courseFolderName:
        courseFolder
          ? courseFolder.getName()
          : 'UNKNOWN',

      collectionFolder:
        collectionFolder,

      collectionFolderId:
        collectionFolder
          ? collectionFolder.getId()
          : '',

      collectionFolderName:
        collectionFolder
          ? collectionFolder.getName()
          : ''
    };

  } catch (error) {
    console.log(
      'SESSION_CONTEXT_WARNING: ' +
      String(error)
    );

    return null;
  }
}


function resolveCourseHierarchyForSessionFolder_(
  sessionFolder
) {
  let immediateParent = null;

  try {
    const parents =
      sessionFolder.getParents();

    if (parents.hasNext()) {
      immediateParent =
        parents.next();
    }
  } catch (error) {
    return {
      courseFolder: null,
      collectionFolder: null
    };
  }

  if (!immediateParent) {
    return {
      courseFolder: null,
      collectionFolder: null
    };
  }

  const immediateName =
    String(
      immediateParent.getName() || ''
    ).trim();

  // Structural containers are not course identities.
  // SAMPLE_COURSE_A / L / 10 => course=SAMPLE_COURSE_A, collection=L, session=10.
  const isCollectionFolder =
    /^(?:l|lectures?|sessions?|classes?|weeks?|meetings?|recordings?)$/i
      .test(immediateName);

  if (isCollectionFolder) {
    const grandparents =
      immediateParent.getParents();

    if (grandparents.hasNext()) {
      return {
        courseFolder:
          grandparents.next(),
        collectionFolder:
          immediateParent
      };
    }
  }

  return {
    courseFolder:
      immediateParent,
    collectionFolder:
      null
  };
}


function getOrCreateSessionWorkspaceFolder_(
  sessionFolder,
  createIfMissing
) {
  const folders =
    sessionFolder.getFoldersByName(
      CAREER_OS_CONFIG
        .SESSION_WORKSPACE_FOLDER
    );

  if (folders.hasNext()) {
    return folders.next();
  }

  if (!createIfMissing) {
    return null;
  }

  const workspace =
    sessionFolder.createFolder(
      CAREER_OS_CONFIG
        .SESSION_WORKSPACE_FOLDER
    );

  console.log(
    'SESSION_WORKSPACE_CREATED: ' +
    sessionFolder.getName()
  );

  return workspace;
}


function tagSessionWorkspaceFolder_(
  workspaceFolder,
  sessionFolderId
) {
  if (!workspaceFolder) {
    return;
  }

  updateAppPropertiesIfChanged_(
    workspaceFolder.getId(),
    {
      careerOsGenerated:
        'true',

      careerOsWorkspace:
        'true',

      careerOsSessionFolderId:
        String(sessionFolderId)
    },
    'SESSION_WORKSPACE_TAG_WARNING'
  );
}


function organizeSessionTxtFiles_(
  sessionFolder,
  workspaceFolder
) {
  const files =
    sessionFolder.getFiles();

  while (files.hasNext()) {
    const file =
      files.next();

    const name =
      file.getName();

    if (
      !/\.txt$/i.test(name)
    ) {
      continue;
    }

    file.moveTo(
      workspaceFolder
    );

    tagExternalTextEvidence_(
      file,
      sessionFolder.getId()
    );

    console.log(
      'SESSION_TXT_MOVED: ' +
      name +
      ' -> ' +
      CAREER_OS_CONFIG
        .SESSION_WORKSPACE_FOLDER
    );
  }
}


function handleTextEvidence_(
  fileMeta
) {
  const file =
    DriveApp.getFileById(
      fileMeta.id
    );

  const context =
    resolveSessionContext_(
      file,
      true
    );

  if (!context) {
    console.log(
      'TEXT_EVIDENCE_UNROUTED: ' +
      file.getName()
    );

    return;
  }

  if (
    /\.txt$/i.test(
      file.getName()
    ) &&
    getParentFolder_(file)
      .getId() !==
      context.workspaceFolderId
  ) {
    file.moveTo(
      context.workspaceFolder
    );

    console.log(
      'TEXT_EVIDENCE_MOVED_TO_SESSION_WORKSPACE: ' +
      file.getName()
    );
  }

  tagExternalTextEvidence_(
    file,
    context.sessionFolderId
  );

  updateSessionManifest_(
    context.sessionFolder
  );

  console.log(
    'TEXT_EVIDENCE_READY: ' +
    file.getName()
  );
}


function tagExternalTextEvidence_(
  file,
  sessionFolderId
) {
  try {
    const metadata =
      Drive.Files.get(
        file.getId(),
        {
          fields:
            'id,appProperties'
        }
      );

    const existing =
      metadata.appProperties || {};

    if (
      existing.careerOsGenerated ===
      'true'
    ) {
      return;
    }

    updateAppPropertiesIfChanged_(
      file.getId(),
      {
        careerOsSessionFolderId:
          String(sessionFolderId),

        careerOsEvidenceType:
          'external_text'
      },
      'TEXT_EVIDENCE_TAG_WARNING'
    );

  } catch (error) {
    console.log(
      'TEXT_EVIDENCE_TAG_WARNING: ' +
      String(error)
    );
  }
}


function findConfirmedTranscriptForAudio_(
  sourceFile,
  workspaceFolder,
  sourceFingerprint
) {
  if (!workspaceFolder) {
    return null;
  }

  const sourceId =
    sourceFile.getId();

  const currentSourceFingerprint =
    String(
      sourceFingerprint ||
      getSourceFingerprintById_(
        sourceId
      )
    );

  const sourceBase =
    normalizeEvidenceBasename_(
      sourceFile.getName()
    );

  const audioMetadata =
    getDriveFileMetadataSafe_(
      sourceId
    );

  const audioProps =
    audioMetadata.appProperties || {};

  const previousLinkedTranscriptId =
    String(
      audioProps.careerOsTranscriptFileId ||
      ''
    );

  const previousAudioFingerprint =
    String(
      audioProps.careerOsTranscriptSourceFingerprint ||
      ''
    );

  const previousTranscriptFingerprint =
    String(
      audioProps.careerOsTranscriptEvidenceFingerprint ||
      ''
    );

  const files =
    workspaceFolder.getFiles();

  while (files.hasNext()) {
    const candidate =
      files.next();

    const name =
      candidate.getName();

    if (
      !/\.txt$/i.test(name)
    ) {
      continue;
    }

    const metadata =
      getDriveFileMetadataSafe_(
        candidate.getId()
      );

    const props =
      metadata.appProperties || {};

    const candidateFingerprint =
      buildSourceFingerprintFromMetadata_(
        metadata
      );

    // Strongest signal: Career OS-generated transcript explicitly points to
    // this audio AND to the same content fingerprint.
    if (
      props.careerOsSourceId ===
        String(sourceId) &&
      props.careerOsSourceFingerprint &&
      props.careerOsSourceFingerprint ===
        currentSourceFingerprint
    ) {
      return candidate;
    }

    // Portable artifacts may preserve the exact source/fingerprint in text.
    try {
      const head =
        candidate
          .getBlob()
          .getDataAsString()
          .substring(0, 8000);

      if (
        head.indexOf(
          'source_drive_id: ' +
          String(sourceId)
        ) >= 0 &&
        head.indexOf(
          'source_content_fingerprint: ' +
          currentSourceFingerprint
        ) >= 0
      ) {
        return candidate;
      }
    } catch (error) {
      // Continue with conservative external-transcript matching.
    }

    // Obvious notes/summaries must never satisfy an audio transcript.
    const lower =
      name.toLowerCase();

    if (
      /\b(summary|notes?|outline|flashcards?)\b/i.test(
        lower
      )
    ) {
      continue;
    }

    const candidateBase =
      normalizeEvidenceBasename_(
        name
      );

    if (
      !candidateBase ||
      candidateBase !==
        sourceBase ||
      !looksLikeTranscriptText_(
        candidate
      )
    ) {
      continue;
    }

    // If this exact external transcript was previously linked to an older
    // CONTENT version of the audio and the transcript itself has not changed,
    // it is stale and must not suppress re-transcription.
    if (
      candidate.getId() ===
        previousLinkedTranscriptId &&
      previousAudioFingerprint &&
      currentSourceFingerprint &&
      previousAudioFingerprint !==
        currentSourceFingerprint &&
      previousTranscriptFingerprint &&
      candidateFingerprint ===
        previousTranscriptFingerprint
    ) {
      console.log(
        'EXTERNAL_TRANSCRIPT_STALE_FOR_NEW_AUDIO_CONTENT: ' +
        candidate.getName()
      );

      continue;
    }

    return candidate;
  }

  return null;
}


function normalizeEvidenceBasename_(
  filename
) {
  let base =
    String(
      filename || ''
    )
      .replace(
        /\.[^.]+$/,
        ''
      )
      .toLowerCase()
      .replace(
        /(?:[\s._-]+)(?:career[\s._-]*os)$/i,
        ''
      )
      .replace(
        /(?:[\s._-]+)(?:transcript|transcription)$/i,
        ''
      )
      .replace(
        /[\s._-]+/g,
        ' '
      )
      .trim();

  return base;
}


function looksLikeTranscriptText_(
  file
) {
  try {
    const text =
      file.getBlob()
        .getDataAsString();

    if (
      text.length < 500
    ) {
      return false;
    }

    if (
      /\[\d{2}:\d{2}(?::\d{2})?\]/
        .test(text)
    ) {
      return true;
    }

    if (
      /\b(lecturer|speaker\s*\d*|student|professor|teacher)\s*:/i
        .test(text)
    ) {
      return true;
    }

    // For same-basename external files (e.g. NotebookLM transcript), a
    // substantial prose body is enough unless the filename says notes/summary.
    return (
      text.length >=
      2000
    );

  } catch (error) {
    console.log(
      'TRANSCRIPT_SHAPE_CHECK_WARNING: ' +
      String(error)
    );

    return false;
  }
}


function visibleMetadataReferencesSource_(
  file,
  sourceId
) {
  try {
    const text =
      file.getBlob()
        .getDataAsString();

    const head =
      text.substring(
        0,
        8000
      );

    return (
      head.indexOf(
        'source_drive_id: ' +
        String(sourceId)
      ) >= 0
    );

  } catch (error) {
    return false;
  }
}


function markAudioSatisfiedByTranscript_(
  audioFile,
  transcriptFile,
  sourceFingerprint
) {
  try {
    const context =
      resolveSessionContext_(
        audioFile,
        false
      );

    const audioFingerprint =
      String(
        sourceFingerprint ||
        getSourceFingerprintById_(
          audioFile.getId()
        )
      );

    const transcriptFingerprint =
      getSourceFingerprintById_(
        transcriptFile.getId()
      );

    const audioMetadata =
      getDriveFileMetadataSafe_(
        audioFile.getId()
      );

    updateAppPropertiesIfChanged_(
      audioFile.getId(),
      {
        careerOsTranscriptStatus:
          'confirmed_existing_text',

        careerOsTranscriptFileId:
          transcriptFile.getId(),

        careerOsTranscriptSourceFingerprint:
          audioFingerprint,

        careerOsTranscriptEvidenceFingerprint:
          transcriptFingerprint,

        careerOsSessionFolderId:
          context
            ? context.sessionFolderId
            : ''
      },
      'AUDIO_TRANSCRIPT_LINK_WARNING'
    );

    markAudioSourceProcessingStatus_(
      audioFile.getId(),
      'DONE',
      audioFingerprint,
      audioMetadata.modifiedTime || '',
      ''
    );

  } catch (error) {
    console.log(
      'AUDIO_TRANSCRIPT_LINK_WARNING: ' +
      String(error)
    );
  }
}


function handleSessionOrCourseFolderChange_(
  fileMeta
) {
  try {
    const folder =
      DriveApp.getFolderById(
        fileMeta.id
      );

    // Case 1: the changed folder itself is a session workspace.
    if (
      folder.getName() ===
      CAREER_OS_CONFIG
        .SESSION_WORKSPACE_FOLDER
    ) {
      const parents =
        folder.getParents();

      if (parents.hasNext()) {
        const candidateSession =
          parents.next();

        if (
          isValidSessionFolder_(
            candidateSession
          )
        ) {
          updateSessionManifest_(
            candidateSession
          );
        } else {
          console.log(
            'NON_SESSION_WORKSPACE_EVENT_IGNORED: ' +
            candidateSession.getName()
          );
        }
      }

      return;
    }

    // Case 2: changed folder is a session folder that already has a workspace.
    const ownWorkspace =
      folder.getFoldersByName(
        CAREER_OS_CONFIG
          .SESSION_WORKSPACE_FOLDER
      );

    if (
      ownWorkspace.hasNext() &&
      isValidSessionFolder_(folder)
    ) {
      updateSessionManifest_(
        folder
      );

      console.log(
        'SESSION_FOLDER_LABEL_REFRESHED: ' +
        folder.getName()
      );

      return;
    }

    // Case 3: changed folder may be a course/container folder. Refresh
    // participating sessions up to two levels below it (e.g. SAMPLE_COURSE_A / L / 10).
    const refreshed =
      refreshSessionManifestsUnderFolder_(
        folder,
        2
      );

    if (refreshed > 0) {
      console.log(
        'COURSE_OR_COLLECTION_LABEL_REFRESHED_SESSION_MANIFESTS: ' +
        refreshed
      );
    }

  } catch (error) {
    console.log(
      'FOLDER_CHANGE_HANDLER_WARNING: ' +
      String(error)
    );
  }
}


function refreshSessionManifestsUnderFolder_(
  rootFolder,
  maxDepth
) {
  let refreshed = 0;

  function visit(folder, depth) {
    if (depth > maxDepth) {
      return;
    }

    const workspace =
      folder.getFoldersByName(
        CAREER_OS_CONFIG
          .SESSION_WORKSPACE_FOLDER
      );

    if (
      workspace.hasNext() &&
      isValidSessionFolder_(folder)
    ) {
      updateSessionManifest_(folder);
      refreshed += 1;
      return;
    }

    if (depth === maxDepth) {
      return;
    }

    const children =
      folder.getFolders();

    while (children.hasNext()) {
      visit(
        children.next(),
        depth + 1
      );
    }
  }

  const children =
    rootFolder.getFolders();

  while (children.hasNext()) {
    visit(
      children.next(),
      1
    );
  }

  return refreshed;
}


/* =========================================================
   SESSION MANIFEST

   This file is deterministic inventory only. It is NOT the final lesson
   synthesis. Final synthesis should be created/reviewed by an AI agent that
   reads the evidence and can reconcile OCR/transcription errors.
   ========================================================= */


function normalizeManifestForComparison_(
  text
) {
  return String(text || '')
    .replace(
      /^updated_utc: .*$/m,
      'updated_utc: <normalized>'
    )
    .trim();
}


function updateSessionManifest_(
  sessionFolder
) {
  if (!sessionFolder) {
    return;
  }

  if (!isValidSessionFolder_(sessionFolder)) {
    console.log(
      'NON_SESSION_MANIFEST_SKIPPED: ' +
      sessionFolder.getName()
    );
    return;
  }

  const workspace =
    getOrCreateSessionWorkspaceFolder_(
      sessionFolder,
      true
    );

  const hierarchy =
    resolveCourseHierarchyForSessionFolder_(
      sessionFolder
    );

  const courseFolder =
    hierarchy.courseFolder;

  const collectionFolder =
    hierarchy.collectionFolder;

  const sourceRows = [];
  const sourceFiles =
    sessionFolder.getFiles();

  while (sourceFiles.hasNext()) {
    const file =
      sourceFiles.next();

    const metadata =
      getDriveFileMetadataSafe_(
        file.getId()
      );

    const appProps =
      metadata.appProperties || {};

    const currentFingerprint =
      buildSourceFingerprintFromMetadata_(
        metadata
      );

    const sourceMime =
      String(
        file.getMimeType() || ''
      ).toLowerCase();

    const isPdfSource =
      sourceMime ===
      'application/pdf';

    const isAudioSource =
      sourceMime.startsWith(
        'audio/'
      );

    let processingStatus =
      isPdfSource
        ? (appProps.careerOsPdfStatus || '')
        : (
            isAudioSource
              ? (appProps.careerOsAudioStatus || '')
              : (appProps.careerOsImageStatus || '')
          );

    const processingFingerprint =
      String(
        isPdfSource
          ? (appProps.careerOsPdfProcessedSourceFingerprint || '')
          : (
              isAudioSource
                ? (appProps.careerOsAudioProcessedSourceFingerprint || '')
                : (appProps.careerOsImageProcessedSourceFingerprint || '')
            )
      );

    if (
      processingStatus &&
      processingFingerprint &&
      currentFingerprint &&
      processingFingerprint !==
        currentFingerprint
    ) {
      processingStatus =
        'STALE_' +
        processingStatus;
    }

    // One-time recovery for jobs that the previous version marked ERROR
    // only because the free-tier quota returned HTTP 429.
    if (
      appProps.careerOsImageStatus ===
        'ERROR' &&
      /HTTP 429/i.test(
        String(
          appProps.careerOsImageLastError ||
          ''
        )
      )
    ) {
      enqueueImageJob_(
        {
          id: file.getId(),
          name: file.getName(),
          mimeType: file.getMimeType(),
          size: metadata.size || 0,
          modifiedTime:
            metadata.modifiedTime ||
            file.getLastUpdated()
              .toISOString(),
          sourceFingerprint:
            currentFingerprint
        }
      );

      markImageSourceProcessingStatus_(
        file.getId(),
        'RETRY_WAIT',
        currentFingerprint,
        metadata.modifiedTime || '',
        'Recovered legacy HTTP 429 quota error; queued for retry.'
      );

      processingStatus =
        'RETRY_WAIT';
    }

    sourceRows.push({
      type:
        manifestTypeFromMime_(
          file.getMimeType(),
          file.getName()
        ),

      name:
        file.getName(),

      id:
        file.getId(),

      mime:
        file.getMimeType(),

      modified:
        file.getLastUpdated()
          .toISOString(),

      fingerprint:
        currentFingerprint,

      transcriptStatus:
        appProps.careerOsTranscriptStatus ||
        '',

      transcriptFileId:
        appProps.careerOsTranscriptFileId ||
        '',

      processingStatus:
        processingStatus
    });
  }

  const textRows = [];
  const workspaceFiles =
    workspace.getFiles();

  while (workspaceFiles.hasNext()) {
    const file =
      workspaceFiles.next();

    if (
      file.getName() ===
        CAREER_OS_CONFIG
          .SESSION_MANIFEST_FILE ||
      file.getName().startsWith(
        CAREER_OS_CONFIG
          .SESSION_STATUS_FILE_PREFIX
      )
    ) {
      continue;
    }

    const metadata =
      getDriveFileMetadataSafe_(
        file.getId()
      );

    const props =
      metadata.appProperties || {};

    textRows.push({
      name:
        file.getName(),

      id:
        file.getId(),

      generated:
        props.careerOsGenerated ===
        'true'
          ? 'yes'
          : 'no',

      evidenceType:
        props.careerOsEvidenceType ||
        (
          props.careerOsGenerated ===
          'true'
            ? 'career_os_generated_text'
            : 'external_text'
        ),

      sourceId:
        props.careerOsSourceId ||
        '',

      sourceFingerprint:
        props.careerOsSourceFingerprint ||
        '',

      fingerprint:
        buildSourceFingerprintFromMetadata_(
          metadata
        ),

      modified:
        file.getLastUpdated()
          .toISOString()
    });
  }

  sourceRows.sort(
    (a, b) =>
      a.name.localeCompare(
        b.name
      )
  );

  textRows.sort(
    (a, b) =>
      a.name.localeCompare(
        b.name
      )
  );

  const ingestionStatus =
    buildSessionIngestionStatus_(
      sourceRows,
      textRows
    );

  syncSessionStatusMarker_(
    workspace,
    sessionFolder,
    ingestionStatus
  );

  const lines = [
    '# Career OS Session Manifest',
    '',
    '> Mechanical inventory generated by the ingestion automation. ' +
      'This is not the final lesson synthesis.',
    '',
    'schema_version: ' +
      CAREER_OS_CONFIG
        .SESSION_MANIFEST_SCHEMA_VERSION,
    '',
    'session_folder_name_current: ' +
      sanitizeMetadataValue_(
        sessionFolder.getName()
      ),
    '',
    'session_folder_drive_id: ' +
      sessionFolder.getId(),
    '',
    'course_folder_name_current: ' +
      sanitizeMetadataValue_(
        courseFolder
          ? courseFolder.getName()
          : 'UNKNOWN'
      ),
    '',
    'course_folder_drive_id: ' +
      (
        courseFolder
          ? courseFolder.getId()
          : ''
      ),
    '',
    'collection_folder_name_current: ' +
      sanitizeMetadataValue_(
        collectionFolder
          ? collectionFolder.getName()
          : ''
      ),
    '',
    'collection_folder_drive_id: ' +
      (
        collectionFolder
          ? collectionFolder.getId()
          : ''
      ),
    '',
    'workspace_folder_name: ' +
      CAREER_OS_CONFIG
        .SESSION_WORKSPACE_FOLDER,
    '',
    'workspace_folder_drive_id: ' +
      workspace.getId(),
    '',
    'ingestion_status: ' +
      ingestionStatus.status,
    '',
    'free_only_mode: ' +
      String(
        CAREER_OS_CONFIG
          .FREE_ONLY_MODE
      ),
    '',
    'updated_utc: ' +
      new Date()
        .toISOString(),
    '',
    '## Source evidence',
    '',
    '| Type | Name | Drive ID | MIME | Content fingerprint | Modified UTC | Transcript status | Transcript file ID | Processing status |',
    '|---|---|---|---|---|---|---|---|---|'
  ];

  if (
    sourceRows.length === 0
  ) {
    lines.push(
      '| — | No source files found | — | — | — | — | — | — | — |'
    );
  } else {
    sourceRows.forEach(row => {
      lines.push(
        '| ' +
        escapeMarkdownCell_(
          row.type
        ) +
        ' | ' +
        escapeMarkdownCell_(
          row.name
        ) +
        ' | ' +
        escapeMarkdownCell_(
          row.id
        ) +
        ' | ' +
        escapeMarkdownCell_(
          row.mime
        ) +
        ' | ' +
        escapeMarkdownCell_(
          row.fingerprint
        ) +
        ' | ' +
        escapeMarkdownCell_(
          row.modified
        ) +
        ' | ' +
        escapeMarkdownCell_(
          row.transcriptStatus
        ) +
        ' | ' +
        escapeMarkdownCell_(
          row.transcriptFileId
        ) +
        ' | ' +
        escapeMarkdownCell_(
          row.processingStatus
        ) +
        ' |'
      );
    });
  }

  lines.push(
    '',
    '## Text evidence',
    '',
    '| Name | Drive ID | Generated by Career OS | Evidence type | Content fingerprint | Source Drive ID | Source content fingerprint | Modified UTC |',
    '|---|---|---|---|---|---|---|---|'
  );

  if (
    textRows.length === 0
  ) {
    lines.push(
      '| No text evidence yet | — | — | — | — | — | — | — |'
    );
  } else {
    textRows.forEach(row => {
      lines.push(
        '| ' +
        escapeMarkdownCell_(
          row.name
        ) +
        ' | ' +
        escapeMarkdownCell_(
          row.id
        ) +
        ' | ' +
        escapeMarkdownCell_(
          row.generated
        ) +
        ' | ' +
        escapeMarkdownCell_(
          row.evidenceType
        ) +
        ' | ' +
        escapeMarkdownCell_(
          row.fingerprint
        ) +
        ' | ' +
        escapeMarkdownCell_(
          row.sourceId
        ) +
        ' | ' +
        escapeMarkdownCell_(
          row.sourceFingerprint
        ) +
        ' | ' +
        escapeMarkdownCell_(
          row.modified
        ) +
        ' |'
      );
    });
  }

  lines.push(
    '',
    '## AI handoff',
    '',
    '- Canonical session identity is `session_folder_drive_id`, not the folder name.',
    '- Session/course/collection folder names are mutable labels and may be corrected later.',
    '- Read source-derived text evidence before producing a final synthesis.',
    '- Treat OCR/transcription as evidence that may contain extraction errors.',
    '- Final durable synthesis should be created/reviewed by an AI agent, not by this ingestion script.',
    '- Recommended final file: `SESSION_SYNTHESIS.md`.',
    ''
  );

  const content =
    lines.join(
      '\n'
    );

  const existing =
    workspace.getFilesByName(
      CAREER_OS_CONFIG
        .SESSION_MANIFEST_FILE
    );

  let manifest;

  if (existing.hasNext()) {
    manifest =
      existing.next();

    let currentContent = '';

    try {
      currentContent =
        manifest
          .getBlob()
          .getDataAsString();
    } catch (error) {
      // If reading fails, fall back to writing the deterministic manifest.
    }

    if (
      normalizeManifestForComparison_(
        currentContent
      ) !==
      normalizeManifestForComparison_(
        content
      )
    ) {
      manifest.setContent(
        content
      );

      console.log(
        'SESSION_MANIFEST_UPDATED: ' +
        sessionFolder.getName()
      );
    } else {
      console.log(
        'SESSION_MANIFEST_UNCHANGED: ' +
        sessionFolder.getName()
      );
    }

  } else {
    manifest =
      workspace.createFile(
        CAREER_OS_CONFIG
          .SESSION_MANIFEST_FILE,
        content,
        MimeType.PLAIN_TEXT
      );
  }

  markAsCareerOsGenerated_(
    manifest.getId(),
    sessionFolder.getId(),
    sessionFolder.getId()
  );
}


function cleanupInvalidSessionArtifacts_(
  workspace,
  sessionFolder
) {
  if (
    !workspace ||
    !sessionFolder ||
    isValidSessionFolder_(sessionFolder)
  ) {
    return 0;
  }

  let cleaned = 0;
  const files =
    workspace.getFiles();

  while (files.hasNext()) {
    const file =
      files.next();

    const name =
      file.getName();

    if (
      name !==
        CAREER_OS_CONFIG
          .SESSION_MANIFEST_FILE &&
      !name.startsWith(
        CAREER_OS_CONFIG
          .SESSION_STATUS_FILE_PREFIX
      )
    ) {
      continue;
    }

    try {
      const metadata =
        Drive.Files.get(
          file.getId(),
          {
            fields: 'id,appProperties'
          }
        );

      const props =
        metadata.appProperties || {};

      if (
        props.careerOsGenerated === 'true' &&
        props.careerOsSessionFolderId ===
          String(sessionFolder.getId())
      ) {
        file.setTrashed(true);
        cleaned += 1;

        console.log(
          'INVALID_SESSION_ARTIFACT_TRASHED: ' +
          name +
          ' | container=' +
          sessionFolder.getName()
        );
      }
    } catch (error) {
      console.log(
        'INVALID_SESSION_ARTIFACT_CLEANUP_WARNING: ' +
        String(error)
      );
    }
  }

  return cleaned;
}


function backfillSessionStatusMarkersOnce_() {
  const props =
    PropertiesService
      .getScriptProperties();

  const versionKey =
    CAREER_OS_CONFIG
      .SESSION_STATUS_BACKFILL_VERSION_PROPERTY;

  const targetVersion =
    CAREER_OS_CONFIG
      .SESSION_STATUS_BACKFILL_VERSION;

  if (
    props.getProperty(versionKey) ===
    targetVersion
  ) {
    return;
  }

  const manifests =
    DriveApp.getFilesByName(
      CAREER_OS_CONFIG
        .SESSION_MANIFEST_FILE
    );

  const maxPerRun =
    Math.max(
      1,
      Number(
        CAREER_OS_CONFIG
          .SESSION_STATUS_BACKFILL_MAX_PER_RUN ||
        25
      )
    );

  let inspected = 0;
  let refreshed = 0;
  let skipped = 0;
  let cleaned = 0;
  let hasMore = false;

  while (manifests.hasNext()) {
    const manifest =
      manifests.next();

    if (inspected >= maxPerRun) {
      hasMore = true;
      break;
    }

    inspected += 1;

    try {
      const parents =
        manifest.getParents();

      if (!parents.hasNext()) {
        skipped += 1;
        continue;
      }

      const workspace =
        parents.next();

      if (
        workspace.getName() !==
        CAREER_OS_CONFIG
          .SESSION_WORKSPACE_FOLDER
      ) {
        skipped += 1;
        continue;
      }

      const sessionParents =
        workspace.getParents();

      if (!sessionParents.hasNext()) {
        skipped += 1;
        continue;
      }

      const sessionFolder =
        sessionParents.next();

      if (!isValidSessionFolder_(sessionFolder)) {
        cleaned +=
          cleanupInvalidSessionArtifacts_(
            workspace,
            sessionFolder
          );

        skipped += 1;
        continue;
      }

      // updateSessionManifest_ also computes ingestion state and creates or
      // renames SESSION_STATUS__*.txt. It does not call Gemini.
      updateSessionManifest_(
        sessionFolder
      );

      refreshed += 1;
    } catch (error) {
      skipped += 1;

      console.log(
        'SESSION_STATUS_BACKFILL_WARNING: ' +
        String(error)
      );
    }
  }

  if (!hasMore) {
    props.setProperty(
      versionKey,
      targetVersion
    );
  }

  console.log(
    'SESSION_STATUS_BACKFILL: ' +
    'refreshed=' + refreshed +
    ' | skipped=' + skipped +
    ' | cleaned=' + cleaned +
    ' | complete=' + String(!hasMore)
  );
}


function assertFreeOnlyConfiguration_() {
  if (!CAREER_OS_CONFIG.FREE_ONLY_MODE) {
    return;
  }

  const allowed = {};

  CAREER_OS_CONFIG
    .FREE_TIER_GEMINI_MODELS
    .forEach(
      model => {
        allowed[String(model)] = true;
      }
    );

  [
    CAREER_OS_CONFIG.GEMINI_IMAGE_MODEL_PRIMARY,
    CAREER_OS_CONFIG.GEMINI_IMAGE_MODEL_FALLBACK,
    CAREER_OS_CONFIG.GEMINI_AUDIO_TRANSCRIBE_MODEL,
    CAREER_OS_CONFIG.GEMINI_AUDIO_FALLBACK_MODEL,
    CAREER_OS_CONFIG.GEMINI_AUDIO_NAVIGATION_MODEL
  ].forEach(
    model => {
      if (!allowed[String(model)]) {
        throw new Error(
          'FREE_ONLY_MODE blocked unapproved Gemini model: ' +
          String(model)
        );
      }
    }
  );

  [
    CAREER_OS_CONFIG.GEMINI_IMAGE_THINKING_LEVEL,
    CAREER_OS_CONFIG.GEMINI_PDF_THINKING_LEVEL,
    CAREER_OS_CONFIG.GEMINI_AUDIO_NAVIGATION_THINKING_LEVEL
  ].forEach(
    level => {
      if (!/^(low|medium|high)$/.test(String(level || ''))) {
        throw new Error(
          'Invalid Gemini 3.8 thinking level in configuration: ' +
          String(level)
        );
      }
    }
  );

  const mediaResolutionAllowed = {
    low: true,
    medium: true,
    high: true,
    ultra_high: true
  };

  [
    CAREER_OS_CONFIG.GEMINI_IMAGE_MEDIA_RESOLUTION
  ].forEach(
    resolution => {
      if (
        !mediaResolutionAllowed[
          String(resolution || '')
        ]
      ) {
        throw new Error(
          'Invalid Gemini media resolution in configuration: ' +
          String(resolution)
        );
      }
    }
  );
}


function buildSessionIngestionStatus_(
  sourceRows,
  textRows
) {
  const sources =
    Array.isArray(sourceRows)
      ? sourceRows
      : [];

  const texts =
    Array.isArray(textRows)
      ? textRows
      : [];

  const result = {
    status: 'PROCESSING',
    sourceCount: sources.length,
    imageTotal: 0,
    imageComplete: 0,
    audioTotal: 0,
    audioComplete: 0,
    pdfTotal: 0,
    pdfComplete: 0,
    pendingCount: 0,
    errorCount: 0,
    deferredCount: 0
  };

  const textIdSet = {};
  const generatedArtifactSet = {};

  texts.forEach(
    row => {
      textIdSet[String(row.id || '')] = true;

      if (
        row.generated === 'yes' &&
        row.sourceId
      ) {
        generatedArtifactSet[
          String(row.sourceId) +
          '|' +
          String(row.sourceFingerprint || '')
        ] = true;
      }
    }
  );

  sources.forEach(
    row => {
      const type =
        String(row.type || '');

      const mime =
        String(row.mime || '')
          .toLowerCase();

      const status =
        String(
          row.processingStatus || ''
        );

      if (type === 'image') {
        result.imageTotal += 1;

        const key =
          String(row.id || '') +
          '|' +
          String(row.fingerprint || '');

        if (generatedArtifactSet[key]) {
          result.imageComplete += 1;
        } else if (
          /ERROR|NEEDS_ATTENTION/i.test(
            status
          )
        ) {
          result.errorCount += 1;
        } else {
          result.pendingCount += 1;
        }

        return;
      }

      if (type === 'audio') {
        result.audioTotal += 1;

        const transcriptReady =
          Boolean(
            row.transcriptFileId &&
            textIdSet[
              String(row.transcriptFileId)
            ]
          );

        if (transcriptReady) {
          result.audioComplete += 1;
        } else if (
          /ERROR|NEEDS_ATTENTION/i.test(
            status
          )
        ) {
          result.errorCount += 1;
        } else {
          result.pendingCount += 1;
        }

        return;
      }

      if (type === 'pdf') {
        result.pdfTotal += 1;

        const key =
          String(row.id || '') +
          '|' +
          String(row.fingerprint || '');

        if (generatedArtifactSet[key]) {
          result.pdfComplete += 1;
        } else if (
          /ERROR|NEEDS_ATTENTION/i.test(
            status
          )
        ) {
          result.errorCount += 1;
        } else {
          result.pendingCount += 1;
        }

        return;
      }

      if (
        type === 'video' ||
        mime ===
          'application/vnd.google-apps.document' ||
        mime ===
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      ) {
        result.deferredCount += 1;
      }
    }
  );

  if (sources.length === 0) {
    result.status = 'EMPTY';
  } else if (result.errorCount > 0) {
    result.status = 'NEEDS_ATTENTION';
  } else if (result.deferredCount > 0) {
    result.status = 'DEFERRED';
  } else if (result.pendingCount > 0) {
    result.status = 'PROCESSING';
  } else {
    result.status = 'COMPLETE';
  }

  return result;
}


function syncSessionStatusMarker_(
  workspace,
  sessionFolder,
  ingestionStatus
) {
  if (
    !workspace ||
    !sessionFolder ||
    !ingestionStatus
  ) {
    return;
  }

  const prefix =
    CAREER_OS_CONFIG
      .SESSION_STATUS_FILE_PREFIX;

  const desiredName =
    prefix +
    String(ingestionStatus.status) +
    '.txt';

  const statusContent = [
    'Career OS Session Ingestion Status',
    '',
    'schema_version: ' +
      CAREER_OS_CONFIG
        .SESSION_STATUS_SCHEMA_VERSION,
    'status: ' +
      String(ingestionStatus.status),
    'session_folder_drive_id: ' +
      sessionFolder.getId(),
    'updated_utc: ' +
      new Date().toISOString(),
    'free_only_mode: ' +
      String(
        CAREER_OS_CONFIG
          .FREE_ONLY_MODE
      ),
    'image_ocr_complete: ' +
      String(ingestionStatus.imageComplete) +
      '/' +
      String(ingestionStatus.imageTotal),
    'audio_transcript_complete: ' +
      String(ingestionStatus.audioComplete) +
      '/' +
      String(ingestionStatus.audioTotal),
    'pdf_text_complete: ' +
      String(ingestionStatus.pdfComplete) +
      '/' +
      String(ingestionStatus.pdfTotal),
    'pending_sources: ' +
      String(ingestionStatus.pendingCount),
    'error_sources: ' +
      String(ingestionStatus.errorCount),
    'deferred_sources: ' +
      String(ingestionStatus.deferredCount),
    'image_model_primary: ' +
      CAREER_OS_CONFIG
        .GEMINI_IMAGE_MODEL_PRIMARY,
    'image_model_fallback: ' +
      CAREER_OS_CONFIG
        .GEMINI_IMAGE_MODEL_FALLBACK,
    'image_thinking_level: ' +
      CAREER_OS_CONFIG
        .GEMINI_IMAGE_THINKING_LEVEL,
    'image_media_resolution: ' +
      CAREER_OS_CONFIG
        .GEMINI_IMAGE_MEDIA_RESOLUTION,
    'pdf_thinking_level: ' +
      CAREER_OS_CONFIG
        .GEMINI_PDF_THINKING_LEVEL,
    'pdf_media_resolution: API_default_medium_class',
    'audio_transcribe_model: ' +
      CAREER_OS_CONFIG
        .GEMINI_AUDIO_TRANSCRIBE_MODEL,
    'audio_navigation_model: ' +
      CAREER_OS_CONFIG
        .GEMINI_AUDIO_NAVIGATION_MODEL,
    'audio_fallback_model: ' +
      CAREER_OS_CONFIG
        .GEMINI_AUDIO_FALLBACK_MODEL,
    '',
    'COMPLETE means mechanical ingestion is complete. ' +
      'AI synthesis may still be pending.',
    ''
  ].join('\n');

  const files =
    workspace.getFiles();

  let marker = null;
  const extras = [];

  while (files.hasNext()) {
    const candidate =
      files.next();

    if (
      !candidate
        .getName()
        .startsWith(prefix)
    ) {
      continue;
    }

    if (!marker) {
      marker = candidate;
    } else {
      extras.push(candidate);
    }
  }

  extras.forEach(
    file => {
      try {
        file.setTrashed(true);
      } catch (error) {
        console.log(
          'SESSION_STATUS_DUPLICATE_CLEANUP_WARNING: ' +
          String(error)
        );
      }
    }
  );

  if (!marker) {
    marker =
      workspace.createFile(
        desiredName,
        statusContent,
        MimeType.PLAIN_TEXT
      );

    console.log(
      'SESSION_STATUS_CREATED: ' +
      desiredName
    );
  } else {
    if (
      marker.getName() !==
      desiredName
    ) {
      marker.setName(
        desiredName
      );

      console.log(
        'SESSION_STATUS_RENAMED: ' +
        desiredName
      );
    }

    let currentContent = '';

    try {
      currentContent =
        marker
          .getBlob()
          .getDataAsString();
    } catch (error) {
      // Fall through and refresh the status file.
    }

    const normalizedCurrent =
      String(currentContent || '')
        .replace(
          /^updated_utc: .*$/m,
          'updated_utc: <normalized>'
        )
        .trim();

    const normalizedNext =
      String(statusContent || '')
        .replace(
          /^updated_utc: .*$/m,
          'updated_utc: <normalized>'
        )
        .trim();

    if (
      normalizedCurrent !==
      normalizedNext
    ) {
      marker.setContent(
        statusContent
      );
    }
  }

  markAsCareerOsGenerated_(
    marker.getId(),
    sessionFolder.getId(),
    sessionFolder.getId()
  );
}


function manifestTypeFromMime_(
  mime,
  name
) {
  const lower =
    String(
      mime || ''
    )
      .toLowerCase();

  if (
    lower.startsWith('audio/')
  ) {
    return 'audio';
  }

  if (
    lower.startsWith('image/')
  ) {
    return 'image';
  }

  if (
    lower ===
    'application/pdf'
  ) {
    return 'pdf';
  }

  if (
    lower.startsWith('video/')
  ) {
    return 'video';
  }

  if (
    /\.txt$/i.test(
      name || ''
    )
  ) {
    return 'text';
  }

  return 'other';
}


function getDriveFileMetadataSafe_(
  fileId
) {
  try {
    return Drive.Files.get(
      fileId,
      {
        fields:
          'id,name,mimeType,modifiedTime,size,' +
          'md5Checksum,sha1Checksum,sha256Checksum,' +
          'appProperties'
      }
    );

  } catch (error) {
    return {
      appProperties: {}
    };
  }
}


function escapeMarkdownCell_(
  value
) {
  return String(
    value === undefined ||
    value === null
      ? ''
      : value
  )
    .replace(
      /\|/g,
      '\\|'
    )
    .replace(
      /[\r\n]+/g,
      ' '
    );
}


/* =========================================================
   DRIVE / FILE HELPERS
   ========================================================= */


function getParentFolder_(
  file
) {

  const parents =
    file.getParents();


  if (
    parents.hasNext()
  ) {
    return (
      parents.next()
    );
  }


  return (
    DriveApp
      .getRootFolder()
  );
}


function buildTxtName_(
  filename
) {

  const dot =
    filename.lastIndexOf(
      '.'
    );


  if (dot <= 0) {
    return (
      filename +
      '.txt'
    );
  }


  return (
    filename.substring(
      0,
      dot
    ) +
    '.txt'
  );
}




function runCareerOsHealthCheck() {
  const props =
    PropertiesService
      .getScriptProperties();

  const token =
    props.getProperty(
      'DRIVE_PAGE_TOKEN'
    );

  const imageQueue =
    loadImageQueue_();

  const audioQueue =
    loadAudioQueue_();

  const handler =
    CAREER_OS_CONFIG
      .QUEUE_WORKER_FUNCTION;

  const workerTriggers =
    ScriptApp
      .getProjectTriggers()
      .filter(
        trigger =>
          trigger.getHandlerFunction() ===
          handler
      );

  let processingMarkers = 0;
  let attentionMarkers = 0;
  let deferredMarkers = 0;
  let completeMarkers = 0;

  const names = [
    ['PROCESSING', 'processingMarkers'],
    ['NEEDS_ATTENTION', 'attentionMarkers'],
    ['DEFERRED', 'deferredMarkers'],
    ['COMPLETE', 'completeMarkers']
  ];

  names.forEach(
    item => {
      const files =
        DriveApp.getFilesByName(
          CAREER_OS_CONFIG
            .SESSION_STATUS_FILE_PREFIX +
          item[0] +
          '.txt'
        );

      let count = 0;

      while (files.hasNext()) {
        files.next();
        count += 1;
      }

      if (item[0] === 'PROCESSING') {
        processingMarkers = count;
      } else if (item[0] === 'NEEDS_ATTENTION') {
        attentionMarkers = count;
      } else if (item[0] === 'DEFERRED') {
        deferredMarkers = count;
      } else if (item[0] === 'COMPLETE') {
        completeMarkers = count;
      }
    }
  );

  console.log(
    'CAREER_OS_HEALTH: ' +
    'watcher=' + (token ? 'READY' : 'MISSING') +
    ' | image_queue=' + imageQueue.length +
    ' | audio_queue=' + audioQueue.length +
    ' | worker_triggers=' + workerTriggers.length +
    ' | complete=' + completeMarkers +
    ' | processing=' + processingMarkers +
    ' | needs_attention=' + attentionMarkers +
    ' | deferred=' + deferredMarkers +
    ' | free_only=' +
      String(
        CAREER_OS_CONFIG
          .FREE_ONLY_MODE
      )
  );
}


/* =========================================================
   GEMINI KEY
   ========================================================= */


function getGeminiApiKey_() {

  const key =
    PropertiesService
      .getScriptProperties()
      .getProperty(
        'GEMINI_API_KEY'
      );


  if (!key) {

    throw new Error(
      'GEMINI_API_KEY is missing ' +
      'from Script Properties.'
    );
  }


  return key;
}