// Queue worker runtime control.

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
