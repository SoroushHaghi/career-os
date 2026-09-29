// Automatic derived-knowledge queues.
// Public code is inert unless the private production property
// CAREER_OS_KNOWLEDGE_AUTOMATION=ENABLED is explicitly set during cutover.

function careerOsKnowledgeQueueLoad_(propertyName) {
  const raw = PropertiesService
    .getScriptProperties()
    .getProperty(
      careerOsRuntimeStateKey_(
        propertyName
      )
    );

  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed)
      ? parsed.filter(function(item) {
          return item && item.sessionFolderId;
        })
      : [];
  } catch (_error) {
    throw new Error(
      'Career OS knowledge queue is corrupted: ' +
      String(propertyName)
    );
  }
}

function careerOsKnowledgeQueueSave_(
  propertyName,
  queue
) {
  const props =
    PropertiesService.getScriptProperties();
  const key =
    careerOsRuntimeStateKey_(propertyName);

  if (!queue || queue.length === 0) {
    props.deleteProperty(key);
    return;
  }

  props.setProperty(
    key,
    JSON.stringify(queue)
  );
}

function loadKnowledgeQueue_() {
  return careerOsKnowledgeQueueLoad_(
    CAREER_OS_CONFIG.KNOWLEDGE_QUEUE_PROPERTY
  );
}

function saveKnowledgeQueue_(queue) {
  careerOsKnowledgeQueueSave_(
    CAREER_OS_CONFIG.KNOWLEDGE_QUEUE_PROPERTY,
    queue
  );
}

function loadCourseKnowledgeQueue_() {
  return careerOsKnowledgeQueueLoad_(
    CAREER_OS_CONFIG.COURSE_KNOWLEDGE_QUEUE_PROPERTY
  );
}

function saveCourseKnowledgeQueue_(queue) {
  careerOsKnowledgeQueueSave_(
    CAREER_OS_CONFIG.COURSE_KNOWLEDGE_QUEUE_PROPERTY,
    queue
  );
}

function careerOsKnowledgeQueueUpsert_(
  queue,
  key,
  sessionFolderId,
  reason
) {
  const now = Date.now();
  let existing = null;

  for (let i = 0; i < queue.length; i += 1) {
    if (String(queue[i].key || '') === String(key)) {
      existing = queue[i];
      break;
    }
  }

  if (!existing) {
    if (
      queue.length >=
      CAREER_OS_CONFIG.MAX_KNOWLEDGE_QUEUE_LENGTH
    ) {
      throw new Error(
        'Knowledge queue is full. Limit=' +
        CAREER_OS_CONFIG.MAX_KNOWLEDGE_QUEUE_LENGTH
      );
    }

    existing = {
      key: String(key),
      sessionFolderId: String(sessionFolderId),
      dirtyAt: now,
      nextAttemptAt:
        now +
        CAREER_OS_CONFIG.KNOWLEDGE_COALESCE_DELAY_MS,
      attempts: 0,
      lastError: '',
      reason: String(reason || 'evidence_changed')
    };
    queue.push(existing);
  } else {
    existing.sessionFolderId =
      String(sessionFolderId);
    existing.dirtyAt = now;
    existing.nextAttemptAt =
      now +
      CAREER_OS_CONFIG.KNOWLEDGE_COALESCE_DELAY_MS;
    existing.attempts = 0;
    existing.lastError = '';
    existing.reason =
      String(reason || existing.reason || 'evidence_changed');
  }

  return existing;
}

function careerOsMarkSessionKnowledgeDirty_(
  sessionFolderId,
  reason
) {
  if (!careerOsKnowledgeAutomationEnabled_()) {
    return {
      queued: false,
      reason: 'automation_disabled'
    };
  }

  const id = String(sessionFolderId || '').trim();
  if (!id) {
    return {
      queued: false,
      reason: 'missing_session'
    };
  }

  const folder = DriveApp.getFolderById(id);
  if (!isValidSessionFolder_(folder)) {
    return {
      queued: false,
      reason: 'ineligible_session'
    };
  }

  const queue = loadKnowledgeQueue_();
  careerOsKnowledgeQueueUpsert_(
    queue,
    'session:' + id,
    id,
    reason
  );
  saveKnowledgeQueue_(queue);

  try {
    careerOsScheduleLaneKick_('knowledge');
  } catch (error) {
    console.log(
      'KNOWLEDGE_KICK_WARNING: ' +
      String(error)
    );
  }

  return {
    queued: true
  };
}

function careerOsMarkKnowledgeDirtyForSourceFile_(
  sourceFile,
  reason
) {
  if (
    !sourceFile ||
    !careerOsKnowledgeAutomationEnabled_()
  ) {
    return;
  }

  try {
    const context =
      resolveSessionContext_(
        sourceFile,
        false
      );

    if (
      context &&
      context.sessionFolderId
    ) {
      careerOsMarkSessionKnowledgeDirty_(
        context.sessionFolderId,
        reason
      );
    }
  } catch (error) {
    console.log(
      'KNOWLEDGE_DIRTY_MARK_WARNING: ' +
      String(error)
    );
  }
}

function careerOsQueueCourseKnowledgeRefresh_(
  sessionFolderId,
  reason
) {
  if (!careerOsKnowledgeAutomationEnabled_()) {
    return;
  }

  const session =
    DriveApp.getFolderById(
      String(sessionFolderId)
    );
  const parents = session.getParents();

  if (!parents.hasNext()) return;

  const course = parents.next();
  if (parents.hasNext()) {
    throw new Error(
      'Session has ambiguous course parents.'
    );
  }

  const queue = loadCourseKnowledgeQueue_();
  careerOsKnowledgeQueueUpsert_(
    queue,
    'course:' + course.getId(),
    session.getId(),
    reason || 'session_synthesis_changed'
  );
  saveCourseKnowledgeQueue_(queue);

  try {
    careerOsScheduleLaneKick_('course_knowledge');
  } catch (error) {
    console.log(
      'COURSE_KNOWLEDGE_KICK_WARNING: ' +
      String(error)
    );
  }
}

function careerOsQueueJobSessionId_(job) {
  const explicit =
    String(
      job &&
      job.sessionFolderId ||
      ''
    ).trim();

  if (explicit) return explicit;

  try {
    const file =
      DriveApp.getFileById(
        String(job.fileId || '')
      );
    const context =
      resolveSessionContext_(
        file,
        false
      );

    if (
      context &&
      context.sessionFolderId
    ) {
      job.sessionFolderId =
        String(context.sessionFolderId);
      return job.sessionFolderId;
    }
  } catch (_error) {
    // Treat unresolved legacy jobs as pending globally below.
  }

  return '';
}

function careerOsSessionHasPendingMedia_(
  sessionFolderId
) {
  const target = String(sessionFolderId || '');

  const imageQueue = loadImageQueue_();
  for (
    let i = 0;
    i < imageQueue.length;
    i += 1
  ) {
    const id =
      careerOsQueueJobSessionId_(
        imageQueue[i]
      );

    if (!id || id === target) {
      return true;
    }
  }

  const audioQueue = loadAudioQueue_();
  for (
    let i = 0;
    i < audioQueue.length;
    i += 1
  ) {
    const id =
      careerOsQueueJobSessionId_(
        audioQueue[i]
      );

    if (!id || id === target) {
      return true;
    }
  }

  return false;
}

function careerOsKnowledgeRetryJob_(
  queue,
  job,
  error
) {
  job.attempts =
    Number(job.attempts || 0) + 1;
  job.lastError =
    String(
      error &&
      error.message ||
      error ||
      ''
    )
      .substring(0, 500);

  const status =
    Number(
      error &&
      error.httpStatus ||
      0
    );

  if (
    job.attempts >=
    CAREER_OS_CONFIG.KNOWLEDGE_MAX_ATTEMPTS
  ) {
    return false;
  }

  const delayMs =
    computeRetryDelayMs_(
      job.attempts,
      Number(
        error &&
        error.retryAfterMs ||
        0
      ),
      CAREER_OS_CONFIG.KNOWLEDGE_RETRY_MIN_MS,
      CAREER_OS_CONFIG.KNOWLEDGE_RETRY_MAX_MS
    );

  job.nextAttemptAt =
    Date.now() + delayMs;

  if (status === 429) {
    setGlobalGeminiBackoffUntil_(
      job.nextAttemptAt
    );
  }

  // Move retrying work to the tail for fairness.
  const index = queue.indexOf(job);
  if (index >= 0) {
    queue.splice(index, 1);
    queue.push(job);
  }

  return true;
}

function careerOsSelectDueKnowledgeJob_(
  queue
) {
  const now = Date.now();

  for (
    let i = 0;
    i < queue.length;
    i += 1
  ) {
    if (
      Number(queue[i].nextAttemptAt || 0) <= now
    ) {
      return queue[i];
    }
  }

  return null;
}

function processCareerOsKnowledgeQueue() {
  if (
    !careerOsRuntimeAllowsWorker_() ||
    !careerOsKnowledgeAutomationEnabled_()
  ) {
    console.log(
      careerOsRuntimeBlockReason_(
        'processCareerOsKnowledgeQueue'
      )
    );
    return;
  }

  careerOsDeleteTriggersForHandler_(
    CAREER_OS_CONFIG
      .KNOWLEDGE_QUEUE_WORKER_FUNCTION
  );

  const lane = 'knowledge';
  const lease =
    careerOsAcquireWorkerLaneLease_(lane);

  if (!lease) return;

  try {
    const queue = loadKnowledgeQueue_();
    const job =
      careerOsSelectDueKnowledgeJob_(queue);

    if (!job) return;

    if (
      getGlobalGeminiBackoffUntil_() >
      Date.now()
    ) {
      job.nextAttemptAt =
        getGlobalGeminiBackoffUntil_();
      saveKnowledgeQueue_(queue);
      return;
    }

    if (
      careerOsSessionHasPendingMedia_(
        job.sessionFolderId
      )
    ) {
      job.nextAttemptAt =
        Date.now() +
        CAREER_OS_CONFIG
          .KNOWLEDGE_COALESCE_DELAY_MS;
      saveKnowledgeQueue_(queue);

      console.log(
        'KNOWLEDGE_SESSION_WAITING_FOR_MEDIA'
      );
      return;
    }

    try {
      careerOsRunKnowledgeCompilerAutomatic_(
        job.sessionFolderId
      );

      const index = queue.indexOf(job);
      if (index >= 0) queue.splice(index, 1);
      saveKnowledgeQueue_(queue);

      careerOsQueueCourseKnowledgeRefresh_(
        job.sessionFolderId,
        'session_synthesis_complete'
      );

      console.log(
        'KNOWLEDGE_SESSION_COMPLETE'
      );
    } catch (error) {
      const keep =
        careerOsKnowledgeRetryJob_(
          queue,
          job,
          error
        );

      if (!keep) {
        const index = queue.indexOf(job);
        if (index >= 0) queue.splice(index, 1);

        console.log(
          'KNOWLEDGE_SESSION_PERMANENT_ERROR: ' +
          String(
            error &&
            error.message ||
            error
          )
            .substring(0, 300)
        );
      }

      saveKnowledgeQueue_(queue);
    }
  } finally {
    careerOsReleaseWorkerLaneLease_(
      lane,
      lease
    );

    try {
      ensureQueueWorkerTriggerIfNeeded_();
    } catch (error) {
      console.log(
        'KNOWLEDGE_LANE_KICK_REFRESH_WARNING: ' +
        String(error)
      );
    }
  }
}

function processCareerOsCourseKnowledgeQueue() {
  if (
    !careerOsRuntimeAllowsWorker_() ||
    !careerOsKnowledgeAutomationEnabled_()
  ) {
    console.log(
      careerOsRuntimeBlockReason_(
        'processCareerOsCourseKnowledgeQueue'
      )
    );
    return;
  }

  careerOsDeleteTriggersForHandler_(
    CAREER_OS_CONFIG
      .COURSE_KNOWLEDGE_QUEUE_WORKER_FUNCTION
  );

  const lane = 'course_knowledge';
  const lease =
    careerOsAcquireWorkerLaneLease_(lane);

  if (!lease) return;

  try {
    const queue =
      loadCourseKnowledgeQueue_();
    const job =
      careerOsSelectDueKnowledgeJob_(queue);

    if (!job) return;

    if (
      getGlobalGeminiBackoffUntil_() >
      Date.now()
    ) {
      job.nextAttemptAt =
        getGlobalGeminiBackoffUntil_();
      saveCourseKnowledgeQueue_(queue);
      return;
    }

    try {
      careerOsRunCourseKnowledgeAutomatic_(
        job.sessionFolderId
      );

      const index = queue.indexOf(job);
      if (index >= 0) queue.splice(index, 1);
      saveCourseKnowledgeQueue_(queue);

      console.log(
        'COURSE_KNOWLEDGE_COMPLETE'
      );
    } catch (error) {
      const keep =
        careerOsKnowledgeRetryJob_(
          queue,
          job,
          error
        );

      if (!keep) {
        const index = queue.indexOf(job);
        if (index >= 0) queue.splice(index, 1);

        console.log(
          'COURSE_KNOWLEDGE_PERMANENT_ERROR: ' +
          String(
            error &&
            error.message ||
            error
          )
            .substring(0, 300)
        );
      }

      saveCourseKnowledgeQueue_(queue);
    }
  } finally {
    careerOsReleaseWorkerLaneLease_(
      lane,
      lease
    );

    try {
      ensureQueueWorkerTriggerIfNeeded_();
    } catch (error) {
      console.log(
        'COURSE_KNOWLEDGE_LANE_KICK_REFRESH_WARNING: ' +
        String(error)
      );
    }
  }
}
