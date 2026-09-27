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


/* =========================================================
   PDF HYBRID EXTRACTION

   Primary: Drive PDF -> Google Doc conversion, then read Doc text.
   Fallback: Gemini Free Tier document input only when Drive conversion
   yields no usable text.
   ========================================================= */


/* =========================================================
   SOURCE CONTENT FINGERPRINTS + IDEMPOTENT METADATA

   File ID = source identity.
   Content checksum = source version.
   modifiedTime is informational only and is NOT used as the
   primary version key for binary Drive files.
   ========================================================= */


/* =========================================================
   IMAGE OCR QUEUE

   Drive Changes scanning only ENQUEUES image work. Gemini calls happen
   after the page token has safely advanced. A Gemini 429 therefore never
   causes the Drive watcher to replay the same change batch.
   ========================================================= */



/* =========================================================
   GEMINI 3.8 THINKING CONFIG + STACK ACCESS TESTS
   ========================================================= */


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


/* =========================================================
   AUDIO QUEUE
   ========================================================= */


/* =========================================================
   AUDIO JOB PROCESSOR
   ========================================================= */


/* =========================================================
   GEMINI RESUMABLE FILE UPLOAD
   ========================================================= */


/* =========================================================
   RESUME / OFFSET RECOVERY
   ========================================================= */


/* =========================================================
   UPLOAD ONE AUDIO CHUNK
   ========================================================= */


/* =========================================================
   READ ONLY A BYTE RANGE FROM GOOGLE DRIVE

   Important:
   we do NOT load the whole 60–100 MB file into Apps Script.
   ========================================================= */


/* =========================================================
   TRANSCRIBE THE RECONSTRUCTED GEMINI FILE
   ========================================================= */


/* =========================================================
   DELETE GEMINI TEMP FILE AFTER TRANSCRIPTION
   ========================================================= */


/* =========================================================
   AUDIO MIME NORMALIZATION
   ========================================================= */


/* =========================================================
   AUDIO QUEUE STORAGE
   ========================================================= */


/* =========================================================
   HTTP HEADER HELPER
   ========================================================= */


/* =========================================================
   PORTABLE ARTIFACT METADATA

   This visible header travels with the .txt file if it is
   downloaded, moved to GitHub, indexed by another AI system,
   or detached from Google Drive metadata.
   ========================================================= */


/* =========================================================
   CREATE / UPDATE SAME-NAME TXT
   ========================================================= */


/* =========================================================
   SESSION-CENTRIC WORKSPACE

   Canonical identity = Google Drive folder ID.
   Folder names are mutable human labels and may be corrected later.
   ========================================================= */



/* =========================================================
   SESSION MANIFEST

   This file is deterministic inventory only. It is NOT the final lesson
   synthesis. Final synthesis should be created/reviewed by an AI agent that
   reads the evidence and can reconcile OCR/transcription errors.
   ========================================================= */


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




/* =========================================================
   GEMINI KEY
   ========================================================= */
