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

  const processing = careerOsProcessingIdentity_(fileMeta.id, sourceFingerprint, 'audio');
  const jobKey = processingIdentityKey(processing);


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
    processingIdentity: processing,

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

    sessionFolderId:
      String(
        fileMeta.sessionFolderId ||
        ''
      ),

    status:
      careerOsGetAudioTranscriptionProvider_() === 'groq'
        ? 'READY_TO_TRANSCRIBE'
        : 'QUEUED',

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

function careerOsAudioTranscribeMinRemainingMs_() {
  return careerOsGetAudioTranscriptionProvider_() === 'groq'
    ? CAREER_OS_CONFIG.AUDIO_TRANSCRIBE_MIN_REMAINING_MS_GROQ
    : CAREER_OS_CONFIG.AUDIO_TRANSCRIBE_MIN_REMAINING_MS_GEMINI;
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
    // Fair-queue selection: a retry-waiting audio job must not block later
    // independent audio sources that are already due.
    const now =
      Date.now();

    let selectedIndex =
      -1;

    let queueChanged =
      false;

    let earliestNextAttemptAt =
      0;

    for (
      let i = 0;
      i < queue.length;
      i += 1
    ) {
      const candidate =
        queue[i];

      if (
        refreshQueuedAudioVersion_(
          candidate
        )
      ) {
        queueChanged =
          true;
      }

      const candidateNextAttemptAt =
        Number(
          candidate.nextAttemptAt ||
          0
        );

      if (
        candidateNextAttemptAt <=
        now
      ) {
        selectedIndex =
          i;
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
      saveAudioQueue_(
        queue
      );
    }

    if (selectedIndex < 0) {
      console.log(
        'AUDIO_QUEUE_NO_JOB_DUE_YET' +
        (
          earliestNextAttemptAt > 0
            ? ': next=' +
              new Date(
                earliestNextAttemptAt
              )
                .toISOString()
            : ''
        )
      );

      return;
    }

    const job =
      queue[selectedIndex];

    try {
      if (
        careerOsGetAudioTranscriptionProvider_() === 'groq' &&
        (
          job.status === 'QUEUED' ||
          job.status === 'UPLOADING'
        )
      ) {
        deleteGeminiUploadedFile_(
          job.geminiFileName
        );
        job.status = 'READY_TO_TRANSCRIBE';
        job.uploadUrl = '';
        job.offset = 0;
        job.fileUri = '';
        job.geminiFileName = '';
        job.nextAttemptAt = 0;
        saveAudioQueue_(queue);

        console.log(
          'AUDIO_JOB_MIGRATED_TO_GROQ_DIRECT_SOURCE: ' +
          job.name
        );
      }

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
          'GROQ_CHUNKING' ||
        job.status ===
          'GROQ_CHUNKING_FINALIZE'
      ) {
        const remaining =
          deadline -
          Date.now();

        if (
          remaining <
          careerOsAudioTranscribeMinRemainingMs_()
        ) {
          console.log(
            'AUDIO_TRANSCRIBE_DEFERRED_TO_NEXT_RUN: ' +
            job.name +
            ' | remaining_ms=' + remaining +
            ' | required_ms=' +
            careerOsAudioTranscribeMinRemainingMs_()
          );
          return;
        }

        const transcriptionState =
          transcribeUploadedAudio_(
            job
          ) || {
            complete: true
          };

        if (
          transcriptionState.complete ===
          false
        ) {
          saveAudioQueue_(
            queue
          );

          console.log(
            'AUDIO_CHUNK_PROGRESS_SAVED: ' +
            job.name +
            ' | next_sample=' +
            Number(
              job.groqChunkStartSample ||
              0
            )
          );

          // Continue immediately while this worker still has budget.
          // This avoids paying an extra trigger round-trip for every Groq
          // chunk of a large M4A source.
          continue;
        }

        if (
          careerOsGetAudioTranscriptionProvider_() ===
          'gemini'
        ) {
          resetGeminiQuotaCircuitOnSuccess_();
        }

        queue.splice(
          selectedIndex,
          1
        );

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
          'GROQ_CHUNKING' &&
        job.status !==
          'GROQ_CHUNKING_FINALIZE'
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

        if (
          status === 429 &&
          careerOsGetAudioTranscriptionProvider_() ===
            'gemini'
        ) {
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
            ? 'ASR provider quota/rate limit (HTTP 429); retry scheduled.'
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

      // Do not leave temporary provider artifacts behind after a
      // non-retryable/permanent audio failure.
      deleteGeminiUploadedFile_(
        job.geminiFileName
      );

      cleanupGroqChunkPartial_(
        job
      );

      // Do not let one permanently failing source block later queued work.
      // The original source remains untouched and can be retriggered later by
      // a real content change.
      queue.shift();
      saveAudioQueue_(queue);
    }
  }
}

function transcribeUploadedAudio_(
  job
) {
  const provider =
    careerOsGetAudioTranscriptionProvider_();

  const apiKey =
    provider === 'gemini'
      ? getGeminiApiKey_()
      : '';

  const sourceFile =
    DriveApp.getFileById(
      job.fileId
    );

  let transcriptResult = null;
  let usedFallback = false;

  if (provider === 'groq') {
    try {
      if (
        Number(job.size || 0) >
        CAREER_OS_CONFIG
          .GROQ_FREE_TIER_MAX_FILE_BYTES
      ) {
        if (
          !careerOsGroqShouldChunkM4a_(
            job
          )
        ) {
          const unsupported =
            new Error(
              'Groq Free Tier large-audio chunking currently supports ISO-BMFF M4A sources only.'
            );

          unsupported.httpStatus =
            400;

          throw unsupported;
        }

        const chunked =
          processGroqChunkedM4aStep_(
            sourceFile,
            job
          );

        if (
          !chunked ||
          chunked.complete ===
            false
        ) {
          return {
            complete: false
          };
        }

        transcriptResult = {
          text:
            chunked.text,
          model:
            chunked.model,
          provider:
            'groq',
          method:
            chunked.method,
          timestampMode:
            chunked.timestampMode,
          timestampNote:
            chunked.timestampNote
        };
      } else {
        transcriptResult =
          careerOsVnextTranscribe_(
            {
              fileId:
                job.fileId,
              fileName:
                job.name,
              mimeType:
                job.mimeType
            }
          );
      }

      console.log(
        'AUDIO_PRIMARY_TRANSCRIBE_DONE: ' +
        job.name +
        ' | provider=groq' +
        ' | model=' +
        String(
          transcriptResult &&
          transcriptResult.model ||
          ''
        )
      );
    } catch (transcribeError) {
      const primaryStatus =
        Number(
          transcribeError &&
          transcribeError.httpStatus ||
          0
        );

      const transientPrimaryFailure =
        primaryStatus === 0 ||
        primaryStatus === 408 ||
        primaryStatus === 429 ||
        primaryStatus === 500 ||
        primaryStatus === 502 ||
        primaryStatus === 503 ||
        primaryStatus === 504;

      if (transientPrimaryFailure) {
        console.log(
          'AUDIO_TRANSCRIBE_PRIMARY_RETRY_DEFERRED: ' +
          job.name +
          ' | provider=groq' +
          ' | status=' +
          primaryStatus
        );
      }

      throw transcribeError;
    }
  } else if (
    Number(job.attempts || 0) >= 2
  ) {
    console.log(
      'AUDIO_TRANSCRIBE_DEFERRED_FALLBACK_START: ' +
      job.name +
      ' | prior_attempts=' +
      Number(job.attempts || 0) +
      ' | model=' +
      CAREER_OS_CONFIG
        .GEMINI_AUDIO_FALLBACK_MODEL
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
  } else {
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

      const primaryText =
        String(
          transcriptResult &&
          transcriptResult.text ||
          ''
        ).trim();

      if (!primaryText) {
        throw new Error(
          'Gemini primary audio model returned no transcript text.'
        );
      }

      console.log(
        'AUDIO_PRIMARY_TRANSCRIBE_DONE: ' +
        job.name +
        ' | provider=gemini' +
        ' | model=' +
        transcriptResult.model
      );

    } catch (transcribeError) {
      const primaryStatus =
        Number(
          transcribeError &&
          transcribeError.httpStatus ||
          0
        );

      const transientPrimaryFailure =
        primaryStatus === 0 ||
        primaryStatus === 408 ||
        primaryStatus === 429 ||
        primaryStatus === 500 ||
        primaryStatus === 502 ||
        primaryStatus === 503 ||
        primaryStatus === 504;

      if (transientPrimaryFailure) {
        console.log(
          'AUDIO_TRANSCRIBE_PRIMARY_RETRY_DEFERRED: ' +
          job.name +
          ' | provider=gemini' +
          ' | status=' +
          primaryStatus
        );
        throw transcribeError;
      }

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
        primaryStatus
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
  }

  const transcriptText =
    String(
      transcriptResult &&
      transcriptResult.text ||
      ''
    ).trim();

  if (!transcriptText) {
    throw new Error(
      'ASR provider returned no transcript for ' +
      job.name
    );
  }

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
          : (
              provider === 'groq'
                ? CAREER_OS_CONFIG.GROQ_AUDIO_MODEL
                : CAREER_OS_CONFIG.GEMINI_AUDIO_TRANSCRIBE_MODEL
            )
      )
    );

  const extractionMethod =
    String(
      transcriptResult &&
      transcriptResult.method ||
      (
        usedFallback
          ? 'gemini_audio_timestamped_fallback'
          : (
              provider === 'groq'
                ? 'groq_whisper_large_v3_private_url'
                : 'gemini_3_8_audio_timestamped_transcript'
            )
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
          String(
            transcriptResult &&
            transcriptResult.timestampMode ||
            CAREER_OS_CONFIG
              .AUDIO_TIMESTAMP_MODE
          ),

        timestampNote:
          String(
            transcriptResult &&
            transcriptResult.timestampNote ||
            CAREER_OS_CONFIG
              .AUDIO_TIMESTAMP_NOTE
          )
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
    ' | provider=' +
    provider +
    ' | model=' +
    modelSummary
  );

  // Clean up temporary provider artifacts after the durable transcript exists.
  deleteGeminiUploadedFile_(
    job.geminiFileName
  );

  cleanupGroqChunkPartial_(
    job
  );

  return {
    complete: true
  };
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
