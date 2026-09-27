// Extracted image processor/queue compatibility path.

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
    careerOsVnextVisionExtract_(
      {
        apiKey:
          apiKey,
        base64Data:
          base64Data,
        mimeType:
          mimeType,
        prompt:
          prompt
      }
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
