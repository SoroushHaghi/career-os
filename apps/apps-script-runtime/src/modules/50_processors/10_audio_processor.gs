// Extracted audio processor/queue compatibility path.

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

    interactionId:
      '',

    interactionStartedAt:
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
          'READY_TO_TRANSCRIBE' ||
        job.status ===
          'TRANSCRIBING'
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

        const completed =
          transcribeUploadedAudio_(
            job
          );

        saveAudioQueue_(
          queue
        );

        if (!completed) {
          return;
        }

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
          'READY_TO_TRANSCRIBE' &&
        job.status !==
          'TRANSCRIBING'
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

      if (
        error &&
        error.interactionTerminal
      ) {
        deleteGeminiBackgroundInteraction_(
          job.interactionId
        );
        job.status =
          'READY_TO_TRANSCRIBE';
        job.interactionId = '';
        job.interactionStartedAt = '';
      }

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

      // Do not leave provider-side temporary state behind after a
      // non-retryable/permanent audio failure.
      deleteGeminiBackgroundInteraction_(
        job.interactionId
      );
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
  let usedFallback = false;

  try {
    transcriptResult =
      careerOsVnextTranscribe_(
        {
          apiKey:
            apiKey,
          fileUri:
            job.fileUri,
          mimeType:
            job.mimeType
        }
      );

    const transcriptText =
      String(
        transcriptResult.text || ''
      ).trim();

    if (!transcriptText) {
      throw new Error(
        'Gemini primary audio model returned no transcript text.'
      );
    }

    console.log(
      'AUDIO_PRIMARY_TRANSCRIBE_DONE: ' +
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
      'AUDIO_TRANSCRIBE_PRIMARY_FAILED_FALLBACK: ' +
      job.name +
      ' | status=' +
      Number(
        transcribeError.httpStatus || 0
      )
    );

    transcriptResult =
      careerOsVnextAudioTranscriptFallback_(
        {
          apiKey:
            apiKey,
          fileUri:
            job.fileUri,
          mimeType:
            job.mimeType
        }
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

  // The canonical 3.8 transcription already includes approximate timestamps,
  // so a second full-audio navigation request is intentionally skipped.

  const artifactBody =
    '=== TIMESTAMPED TRANSCRIPT ===\n' +
    transcriptText;

  const modelSummary =
    String(
      transcriptResult &&
      transcriptResult.model ||
      (
        usedFallback
          ? CAREER_OS_CONFIG.GEMINI_AUDIO_FALLBACK_MODEL
          : CAREER_OS_CONFIG.GEMINI_AUDIO_TRANSCRIBE_MODEL
      )
    );

  const extractionMethod =
    String(
      transcriptResult &&
      transcriptResult.method ||
      (
        usedFallback
          ? 'gemini_audio_timestamped_fallback'
          : 'gemini_3_8_audio_timestamped_transcript'
      )
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
          CAREER_OS_CONFIG
            .AUDIO_TIMESTAMP_MODE,

        timestampNote:
          CAREER_OS_CONFIG
            .AUDIO_TIMESTAMP_NOTE
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

function loadAudioQueue_() {

  const raw =
    PropertiesService
      .getScriptProperties()
      .getProperty(
        careerOsRuntimeStateKey_(CAREER_OS_CONFIG.AUDIO_QUEUE_PROPERTY)
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
          careerOsRuntimeStateKey_(CAREER_OS_CONFIG.AUDIO_QUEUE_PROPERTY),
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
      careerOsRuntimeStateKey_(CAREER_OS_CONFIG.AUDIO_QUEUE_PROPERTY)
    );

    return;
  }


  props.setProperty(
    careerOsRuntimeStateKey_(CAREER_OS_CONFIG.AUDIO_QUEUE_PROPERTY),

    JSON.stringify(
      queue
    )
  );
}
