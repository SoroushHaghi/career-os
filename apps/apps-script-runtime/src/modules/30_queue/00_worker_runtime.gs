// Queue worker runtime control.
//
// Throughput rule:
// - image and audio are independent fast lanes;
// - each lane owns a short-lived lease, not a global execution lock;
// - production uses one-shot kick triggers so queued work starts promptly;
// - the legacy umbrella entry point remains for manual/backward compatibility.

function careerOsWorkerLaneConfig_(lane) {
  if (lane === 'image') {
    return {
      lane: 'image',
      handler:
        CAREER_OS_CONFIG
          .IMAGE_QUEUE_WORKER_FUNCTION,
      leaseProperty:
        CAREER_OS_CONFIG
          .IMAGE_WORKER_LEASE_PROPERTY,
      pending:
        function() {
          return (
            loadImageQueue_()
              .length > 0
          );
        }
    };
  }

  if (lane === 'audio') {
    return {
      lane: 'audio',
      handler:
        CAREER_OS_CONFIG
          .AUDIO_QUEUE_WORKER_FUNCTION,
      leaseProperty:
        CAREER_OS_CONFIG
          .AUDIO_WORKER_LEASE_PROPERTY,
      pending:
        function() {
          return (
            loadAudioQueue_()
              .length > 0
          );
        }
    };
  }

  if (lane === 'knowledge') {
    return {
      lane: 'knowledge',
      handler:
        CAREER_OS_CONFIG
          .KNOWLEDGE_QUEUE_WORKER_FUNCTION,
      leaseProperty:
        CAREER_OS_CONFIG
          .KNOWLEDGE_WORKER_LEASE_PROPERTY,
      pending:
        function() {
          return (
            careerOsKnowledgeAutomationEnabled_() &&
            loadKnowledgeQueue_().length > 0
          );
        }
    };
  }

  if (lane === 'course_knowledge') {
    return {
      lane: 'course_knowledge',
      handler:
        CAREER_OS_CONFIG
          .COURSE_KNOWLEDGE_QUEUE_WORKER_FUNCTION,
      leaseProperty:
        CAREER_OS_CONFIG
          .COURSE_KNOWLEDGE_WORKER_LEASE_PROPERTY,
      pending:
        function() {
          return (
            careerOsKnowledgeAutomationEnabled_() &&
            loadCourseKnowledgeQueue_().length > 0
          );
        }
    };
  }

  throw new Error(
    'Unknown Career OS worker lane: ' +
    String(lane)
  );
}

function careerOsWorkerLeaseKey_(
  lane
) {
  return careerOsRuntimeStateKey_(
    careerOsWorkerLaneConfig_(
      lane
    )
      .leaseProperty
  );
}

function careerOsWorkerLeaseParse_(
  raw
) {
  if (!raw) {
    return null;
  }

  try {
    const parsed =
      JSON.parse(raw);

    if (
      !parsed ||
      typeof parsed !== 'object'
    ) {
      return null;
    }

    return parsed;
  } catch (error) {
    return null;
  }
}

function careerOsAcquireWorkerLaneLease_(
  lane
) {
  const lock =
    LockService
      .getScriptLock();

  if (!lock.tryLock(1500)) {
    console.log(
      'WORKER_LANE_LEASE_LOCK_BUSY: ' +
      lane
    );

    return '';
  }

  try {
    const props =
      PropertiesService
        .getScriptProperties();

    const key =
      careerOsWorkerLeaseKey_(
        lane
      );

    const current =
      careerOsWorkerLeaseParse_(
        props.getProperty(key)
      );

    const now =
      Date.now();

    if (
      current &&
      Number(
        current.expiresAt || 0
      ) > now
    ) {
      console.log(
        'WORKER_LANE_ALREADY_ACTIVE: ' +
        lane +
        ' | until=' +
        new Date(
          Number(current.expiresAt)
        )
          .toISOString()
      );

      return '';
    }

    const token =
      Utilities
        .getUuid();

    props.setProperty(
      key,
      JSON.stringify(
        {
          lane: lane,
          token: token,
          acquiredAt: now,
          expiresAt:
            now +
            CAREER_OS_CONFIG
              .QUEUE_WORKER_LEASE_MS
        }
      )
    );

    return token;
  } finally {
    lock.releaseLock();
  }
}

function careerOsReleaseWorkerLaneLease_(
  lane,
  token
) {
  if (!token) {
    return;
  }

  const lock =
    LockService
      .getScriptLock();

  if (!lock.tryLock(1500)) {
    console.log(
      'WORKER_LANE_LEASE_RELEASE_LOCK_BUSY: ' +
      lane
    );
    return;
  }

  try {
    const props =
      PropertiesService
        .getScriptProperties();

    const key =
      careerOsWorkerLeaseKey_(
        lane
      );

    const current =
      careerOsWorkerLeaseParse_(
        props.getProperty(key)
      );

    if (
      current &&
      current.token === token
    ) {
      props.deleteProperty(
        key
      );
    }
  } finally {
    lock.releaseLock();
  }
}

function careerOsDeleteTriggersForHandler_(
  handler
) {
  if (
    !careerOsRuntimeAllowsTriggerMutation_()
  ) {
    return;
  }

  ScriptApp
    .getProjectTriggers()
    .filter(
      function(trigger) {
        return (
          trigger
            .getHandlerFunction() ===
          handler
        );
      }
    )
    .forEach(
      function(trigger) {
        ScriptApp
          .deleteTrigger(
            trigger
          );
      }
    );
}

function careerOsScheduleLaneKick_(
  lane
) {
  if (
    !careerOsRuntimeAllowsTriggerMutation_()
  ) {
    return;
  }

  const config =
    careerOsWorkerLaneConfig_(
      lane
    );

  if (!config.pending()) {
    careerOsDeleteTriggersForHandler_(
      config.handler
    );
    return;
  }

  const existing =
    ScriptApp
      .getProjectTriggers()
      .filter(
        function(trigger) {
          return (
            trigger
              .getHandlerFunction() ===
            config.handler
          );
        }
      );

  if (existing.length > 1) {
    existing
      .slice(1)
      .forEach(
        function(trigger) {
          ScriptApp
            .deleteTrigger(
              trigger
            );
        }
      );
  }

  if (existing.length >= 1) {
    return;
  }

  ScriptApp
    .newTrigger(
      config.handler
    )
    .timeBased()
    .after(
      CAREER_OS_CONFIG
        .QUEUE_WORKER_KICK_DELAY_MS
    )
    .create();

  console.log(
    'WORKER_LANE_KICK_SCHEDULED: ' +
    lane +
    ' | delay_ms=' +
    CAREER_OS_CONFIG
      .QUEUE_WORKER_KICK_DELAY_MS
  );
}

function careerOsBeginLaneActivity_(
  lane
) {
  const queue =
    lane === 'image'
      ? loadImageQueue_()
      : loadAudioQueue_();

  const first =
    queue[0] || null;

  careerOsRuntimeActivityBegin_(
    {
      kind:
        lane + '_worker',
      stage:
        lane + '_queue_processing',
      sourceType:
        lane,
      sourceName:
        first &&
        first.name ||
        '',
      status:
        'RUNNING'
    }
  );
}

function careerOsFinishLaneActivity_(
  lane,
  status,
  errorMessage
) {
  careerOsRuntimeActivityFinish_(
    status,
    {
      kind:
        lane + '_worker',
      stage:
        lane + '_queue_processing',
      sourceType:
        lane,
      detail:
        errorMessage || ''
    }
  );
}

function processCareerOsImageQueue() {
  if (
    !careerOsRuntimeAllowsWorker_()
  ) {
    console.log(
      careerOsRuntimeBlockReason_(
        'processCareerOsImageQueue'
      )
    );
    return;
  }

  const lane = 'image';

  careerOsDeleteTriggersForHandler_(
    CAREER_OS_CONFIG
      .IMAGE_QUEUE_WORKER_FUNCTION
  );

  const leaseToken =
    careerOsAcquireWorkerLaneLease_(
      lane
    );

  if (!leaseToken) {
    return;
  }

  const taskId =
    'apps-script:image:' +
    leaseToken;

  const imageQueueAtStart =
    loadImageQueue_();

  try {
    careerOsTaskLedgerBegin_(
      taskId,
      {
        title:
          'Process image fast lane',
        executor:
          'apps-script:image',
        stage:
          'fast_lane:image',
        current_action:
          imageQueueAtStart.length
            ? 'Processing ' +
              String(
                imageQueueAtStart[0].name ||
                'queued image'
              )
            : 'Checking image queue'
      }
    );
  } catch (taskError) {
    console.log(
      'IMAGE_TASK_LEDGER_BEGIN_WARNING: ' +
      String(taskError)
    );
  }

  let activityStatus =
    'SUCCESS';
  let activityError =
    '';

  careerOsBeginLaneActivity_(
    lane
  );

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
        'IMAGE_LANE_GEMINI_BACKOFF_UNTIL: ' +
        new Date(
          globalBackoffUntil
        )
          .toISOString()
      );
      return;
    }

    processImageQueue_();
  } catch (error) {
    activityStatus =
      'ERROR';

    activityError =
      String(
        error &&
        error.message
          ? error.message
          : error
      )
        .substring(
          0,
          300
        );

    throw error;
  } finally {
    careerOsFinishLaneActivity_(
      lane,
      activityStatus,
      activityError
    );

    try {
      const imageQueueRemaining =
        loadImageQueue_().length;

      careerOsTaskLedgerFinish_(
        taskId,
        activityStatus !== 'SUCCESS'
          ? 'FAILED'
          : (
              imageQueueRemaining > 0
                ? 'PENDING'
                : 'DONE'
            ),
        {
          title:
            'Process image fast lane',
          executor:
            'apps-script:image',
          stage:
            'fast_lane:image',
          waiting_for:
            imageQueueRemaining > 0
              ? ['next image worker slice']
              : [],
          current_action:
            activityStatus !== 'SUCCESS'
              ? 'Lane run failed'
              : (
                  imageQueueRemaining > 0
                    ? 'More queued image work remains'
                    : 'Lane run completed'
                ),
          result_or_error:
            activityError ||
            (
              'imageQueueRemaining=' +
              imageQueueRemaining
            )
        }
      );
    } catch (taskError) {
      console.log(
        'IMAGE_TASK_LEDGER_FINISH_WARNING: ' +
        String(taskError)
      );
    }

    careerOsReleaseWorkerLaneLease_(
      lane,
      leaseToken
    );

    try {
      ensureQueueWorkerTriggerIfNeeded_();
    } catch (error) {
      console.log(
        'IMAGE_LANE_KICK_REFRESH_WARNING: ' +
        String(error)
      );
    }
  }
}

function processCareerOsAudioQueue() {
  if (
    !careerOsRuntimeAllowsWorker_()
  ) {
    console.log(
      careerOsRuntimeBlockReason_(
        'processCareerOsAudioQueue'
      )
    );
    return;
  }

  const lane = 'audio';

  careerOsDeleteTriggersForHandler_(
    CAREER_OS_CONFIG
      .AUDIO_QUEUE_WORKER_FUNCTION
  );

  const leaseToken =
    careerOsAcquireWorkerLaneLease_(
      lane
    );

  if (!leaseToken) {
    return;
  }

  const taskId =
    'apps-script:audio:' +
    leaseToken;

  const audioQueueAtStart =
    loadAudioQueue_();

  try {
    careerOsTaskLedgerBegin_(
      taskId,
      {
        title:
          'Process audio fast lane',
        executor:
          'apps-script:audio',
        stage:
          'fast_lane:audio',
        current_action:
          audioQueueAtStart.length
            ? 'Processing ' +
              String(
                audioQueueAtStart[0].name ||
                'queued audio'
              )
            : 'Checking audio queue'
      }
    );
  } catch (taskError) {
    console.log(
      'AUDIO_TASK_LEDGER_BEGIN_WARNING: ' +
      String(taskError)
    );
  }

  let activityStatus =
    'SUCCESS';
  let activityError =
    '';

  careerOsBeginLaneActivity_(
    lane
  );

  try {
    assertFreeOnlyConfiguration_();
    migrateRetryPolicyState_();

    if (
      careerOsGetAudioTranscriptionProvider_() ===
        'gemini' &&
      getGlobalGeminiBackoffUntil_() >
        Date.now()
    ) {
      console.log(
        'AUDIO_LANE_GEMINI_BACKOFF_UNTIL: ' +
        new Date(
          getGlobalGeminiBackoffUntil_()
        )
          .toISOString()
      );
      return;
    }

    processAudioQueue_();
  } catch (error) {
    activityStatus =
      'ERROR';

    activityError =
      String(
        error &&
        error.message
          ? error.message
          : error
      )
        .substring(
          0,
          300
        );

    throw error;
  } finally {
    careerOsFinishLaneActivity_(
      lane,
      activityStatus,
      activityError
    );

    try {
      const audioQueueRemaining =
        loadAudioQueue_().length;

      careerOsTaskLedgerFinish_(
        taskId,
        activityStatus !== 'SUCCESS'
          ? 'FAILED'
          : (
              audioQueueRemaining > 0
                ? 'PENDING'
                : 'DONE'
            ),
        {
          title:
            'Process audio fast lane',
          executor:
            'apps-script:audio',
          stage:
            'fast_lane:audio',
          waiting_for:
            audioQueueRemaining > 0
              ? ['next audio worker slice']
              : [],
          current_action:
            activityStatus !== 'SUCCESS'
              ? 'Lane run failed'
              : (
                  audioQueueRemaining > 0
                    ? 'More queued audio work remains'
                    : 'Lane run completed'
                ),
          result_or_error:
            activityError ||
            (
              'audioQueueRemaining=' +
              audioQueueRemaining
            )
        }
      );
    } catch (taskError) {
      console.log(
        'AUDIO_TASK_LEDGER_FINISH_WARNING: ' +
        String(taskError)
      );
    }

    careerOsReleaseWorkerLaneLease_(
      lane,
      leaseToken
    );

    try {
      ensureQueueWorkerTriggerIfNeeded_();
    } catch (error) {
      console.log(
        'AUDIO_LANE_KICK_REFRESH_WARNING: ' +
        String(error)
      );
    }
  }
}

function processCareerOsQueues() {
  if (
    !careerOsRuntimeAllowsWorker_()
  ) {
    console.log(
      careerOsRuntimeBlockReason_(
        'processCareerOsQueues'
      )
    );
    return;
  }

  // Legacy/manual compatibility only. Normal production dispatch targets
  // the independent lane handlers above so they may overlap.
  processCareerOsImageQueue();
  processCareerOsAudioQueue();
}

function ensureQueueWorkerTriggerIfNeeded_() {
  if (
    !careerOsRuntimeAllowsTriggerMutation_()
  ) {
    return;
  }

  // Remove the legacy serial trigger if an earlier deployment left one behind.
  careerOsDeleteTriggersForHandler_(
    CAREER_OS_CONFIG
      .QUEUE_WORKER_FUNCTION
  );

  careerOsScheduleLaneKick_(
    'image'
  );

  careerOsScheduleLaneKick_(
    'audio'
  );

  careerOsScheduleLaneKick_(
    'knowledge'
  );

  careerOsScheduleLaneKick_(
    'course_knowledge'
  );

  if (!hasPendingCareerOsWork_()) {
    clearExpiredGlobalGeminiBackoff_();
  }
}

function removeQueueWorkerTriggerIfIdle_() {
  if (
    !careerOsRuntimeAllowsTriggerMutation_()
  ) {
    return;
  }

  const lanes =
    [
      'image',
      'audio',
      'knowledge',
      'course_knowledge'
    ];

  lanes.forEach(
    function(lane) {
      const config =
        careerOsWorkerLaneConfig_(
          lane
        );

      if (!config.pending()) {
        careerOsDeleteTriggersForHandler_(
          config.handler
        );
      }
    }
  );

  careerOsDeleteTriggersForHandler_(
    CAREER_OS_CONFIG
      .QUEUE_WORKER_FUNCTION
  );

  if (!hasPendingCareerOsWork_()) {
    clearExpiredGlobalGeminiBackoff_();
  }
}

function hasPendingCareerOsWork_() {
  return (
    loadImageQueue_().length > 0 ||
    loadAudioQueue_().length > 0 ||
    (
      careerOsKnowledgeAutomationEnabled_() &&
      (
        loadKnowledgeQueue_().length > 0 ||
        loadCourseKnowledgeQueue_().length > 0
      )
    )
  );
}
