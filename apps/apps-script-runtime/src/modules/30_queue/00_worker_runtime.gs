// Queue worker runtime control.

function processCareerOsQueues() {
  if (!careerOsRuntimeAllowsWorker_()) {
    console.log(careerOsRuntimeBlockReason_('processCareerOsQueues'));
    return;
  }

  const lock = LockService.getScriptLock();

  if (!lock.tryLock(1000)) {
    console.log(
      'WORKER_SKIP_LOCKED: another Career OS execution is already running.'
    );
    return;
  }

  const imageQueueAtStart =
    loadImageQueue_();
  const audioQueueAtStart =
    loadAudioQueue_();

  const firstJob =
    imageQueueAtStart[0] ||
    audioQueueAtStart[0] ||
    null;

  careerOsRuntimeActivityBegin_({
    kind: 'worker',
    stage: 'queue_processing',
    sourceType:
      imageQueueAtStart.length
        ? 'image'
        : (
            audioQueueAtStart.length
              ? 'audio'
              : ''
          ),
    sourceName:
      firstJob &&
      firstJob.name ||
      '',
    status: 'RUNNING'
  });

  let activityStatus = 'SUCCESS';
  let activityError = '';

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

      if (
        careerOsGetAudioTranscriptionProvider_() ===
        'groq'
      ) {
        console.log(
          'IMAGE_DEFERRED_BY_GEMINI_GLOBAL_BACKOFF_AUDIO_CONTINUES'
        );
        processAudioQueue_();
      }

      return;
    }

    processImageQueue_();

    // Gemini image quota should only block audio when audio also uses Gemini.
    if (
      getGlobalGeminiBackoffUntil_() >
        Date.now() &&
      careerOsGetAudioTranscriptionProvider_() ===
        'gemini'
    ) {
      console.log(
        'AUDIO_DEFERRED_BY_GEMINI_GLOBAL_BACKOFF'
      );
      return;
    }

    processAudioQueue_();
  } catch (error) {
    activityStatus = 'ERROR';
    activityError = String(
      error && error.message
        ? error.message
        : error
    ).substring(0, 300);
    throw error;
  } finally {
    try {
      removeQueueWorkerTriggerIfIdle_();
    } catch (error) {
      console.log(
        'QUEUE_WORKER_TRIGGER_CLEANUP_WARNING: ' +
        String(error)
      );
    }

    careerOsRuntimeActivityFinish_(
      activityStatus,
      {
        kind: 'worker',
        stage: 'queue_processing',
        detail: activityError
      }
    );

    lock.releaseLock();
  }
}

function ensureQueueWorkerTriggerIfNeeded_() {
  if (!careerOsRuntimeAllowsTriggerMutation_()) {
    return;
  }

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
  if (!careerOsRuntimeAllowsTriggerMutation_()) {
    return;
  }

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
