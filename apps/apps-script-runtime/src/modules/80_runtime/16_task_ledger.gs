const CAREER_OS_TASK_LEDGER_PROPERTY =
  'CAREER_OS_TASK_LEDGER_V1';

const CAREER_OS_TASK_LEDGER_MAX_TASKS =
  80;

const CAREER_OS_TASK_LEDGER_RUNNING_STALE_MS =
  8 * 60 * 1000;

function careerOsTaskLedgerLoad_() {
  return careerOsRuntimeSafeJsonParse_(
    PropertiesService
      .getScriptProperties()
      .getProperty(
        CAREER_OS_TASK_LEDGER_PROPERTY
      ),
    {
      schemaVersion:
        'career-os-task-ledger-v1',
      tasks: {}
    }
  );
}

function careerOsTaskLedgerSanitizeString_(
  value,
  maxLength
) {
  return String(
    value == null
      ? ''
      : value
  )
    .substring(
      0,
      maxLength || 300
    );
}

function careerOsTaskLedgerHasOwn_(
  source,
  key
) {
  return Object.prototype
    .hasOwnProperty
    .call(
      source,
      key
    );
}

function careerOsTaskLedgerNormalize_(
  input
) {
  const source =
    input &&
    typeof input === 'object' &&
    !Array.isArray(input)
      ? input
      : {};

  const taskId =
    careerOsTaskLedgerSanitizeString_(
      source.task_id ||
      source.taskId,
      180
    )
      .trim();

  if (!taskId) {
    throw new Error(
      'Task ledger task_id is required.'
    );
  }

  const normalized = {
    task_id:
      taskId
  };

  function setString(
    targetKey,
    snakeKey,
    camelKey,
    maxLength,
    transform
  ) {
    const hasSnake =
      careerOsTaskLedgerHasOwn_(
        source,
        snakeKey
      );

    const hasCamel =
      camelKey &&
      careerOsTaskLedgerHasOwn_(
        source,
        camelKey
      );

    if (
      !hasSnake &&
      !hasCamel
    ) {
      return;
    }

    let value =
      careerOsTaskLedgerSanitizeString_(
        hasSnake
          ? source[snakeKey]
          : source[camelKey],
        maxLength
      );

    if (transform) {
      value =
        transform(value);
    }

    normalized[targetKey] =
      value;
  }

  function setArray(
    targetKey,
    snakeKey,
    camelKey,
    maxItems,
    maxLength
  ) {
    const hasSnake =
      careerOsTaskLedgerHasOwn_(
        source,
        snakeKey
      );

    const hasCamel =
      camelKey &&
      careerOsTaskLedgerHasOwn_(
        source,
        camelKey
      );

    if (
      !hasSnake &&
      !hasCamel
    ) {
      return;
    }

    const raw =
      hasSnake
        ? source[snakeKey]
        : source[camelKey];

    normalized[targetKey] =
      Array.isArray(raw)
        ? raw
            .slice(
              0,
              maxItems
            )
            .map(
              function(value) {
                return careerOsTaskLedgerSanitizeString_(
                  value,
                  maxLength
                );
              }
            )
        : [];
  }

  setString(
    'parent_id',
    'parent_id',
    'parentId',
    180
  );

  setArray(
    'depends_on',
    'depends_on',
    'dependsOn',
    20,
    180
  );

  setString(
    'title',
    'title',
    null,
    260
  );

  setString(
    'executor',
    'executor',
    null,
    120
  );

  setString(
    'stage',
    'stage',
    null,
    120
  );

  setString(
    'status',
    'status',
    null,
    60,
    function(value) {
      return value
        .toUpperCase();
    }
  );

  setString(
    'started_at',
    'started_at',
    'startedAt',
    80
  );

  setString(
    'finished_at',
    'finished_at',
    'finishedAt',
    80
  );

  setArray(
    'waiting_for',
    'waiting_for',
    'waitingFor',
    20,
    220
  );

  setString(
    'current_action',
    'current_action',
    'currentAction',
    360
  );

  setString(
    'result_or_error',
    'result_or_error',
    'resultOrError',
    420
  );

  return normalized;
}

function careerOsTaskLedgerUpsert_(
  input
) {
  const lock =
    LockService
      .getScriptLock();

  if (!lock.tryLock(1500)) {
    console.log(
      'TASK_LEDGER_LOCK_BUSY'
    );
    return null;
  }

  try {
    const ledger =
      careerOsTaskLedgerLoad_();

    if (
      !ledger.tasks ||
      typeof ledger.tasks !== 'object'
    ) {
      ledger.tasks = {};
    }

    const normalized =
      careerOsTaskLedgerNormalize_(
        input
      );

    const now =
      new Date()
        .toISOString();

    const previous =
      ledger.tasks[
        normalized.task_id
      ] || {};

    const merged =
      Object.assign(
        {},
        previous,
        normalized,
        {
          updated_at:
            now
        }
      );

    if (!merged.status) {
      merged.status =
        'PENDING';
    }

    if (
      merged.status === 'RUNNING'
    ) {
      if (
        previous.status !== 'RUNNING' ||
        !merged.started_at
      ) {
        merged.started_at =
          normalized.started_at ||
          now;
      }

      merged.finished_at =
        '';
    }

    if (
      [
        'DONE',
        'SUCCESS',
        'FAILED',
        'ERROR',
        'BLOCKED',
        'CANCELLED'
      ]
        .indexOf(
          merged.status
        ) >= 0 &&
      !merged.finished_at
    ) {
      merged.finished_at =
        now;
    }

    ledger.tasks[
      merged.task_id
    ] =
      merged;

    const ordered =
      Object.keys(
        ledger.tasks
      )
        .map(
          function(key) {
            return ledger.tasks[key];
          }
        )
        .sort(
          function(a, b) {
            return String(
              b.updated_at || ''
            )
              .localeCompare(
                String(
                  a.updated_at || ''
                )
              );
          }
        )
        .slice(
          0,
          CAREER_OS_TASK_LEDGER_MAX_TASKS
        );

    const compact = {
      schemaVersion:
        'career-os-task-ledger-v1',
      tasks: {}
    };

    ordered.forEach(
      function(task) {
        compact.tasks[
          task.task_id
        ] =
          task;
      }
    );

    PropertiesService
      .getScriptProperties()
      .setProperty(
        CAREER_OS_TASK_LEDGER_PROPERTY,
        JSON.stringify(
          compact
        )
      );

    return merged;
  } finally {
    lock.releaseLock();
  }
}

function careerOsTaskLedgerSnapshot_() {
  const ledger =
    careerOsTaskLedgerLoad_();

  const now =
    Date.now();

  const tasks =
    Object.keys(
      ledger.tasks || {}
    )
      .map(
        function(key) {
          const task =
            Object.assign(
              {},
              ledger.tasks[key]
            );

          const updatedAt =
            Date.parse(
              task.updated_at || ''
            );

          const stale =
            task.status ===
              'RUNNING' &&
            (
              !isFinite(updatedAt) ||
              now - updatedAt >
                CAREER_OS_TASK_LEDGER_RUNNING_STALE_MS
            );

          task.observed_status =
            stale
              ? 'LAST_SEEN_RUNNING'
              : task.status;

          task.stale =
            stale;

          return task;
        }
      )
      .sort(
        function(a, b) {
          return String(
            b.updated_at || ''
          )
            .localeCompare(
              String(
                a.updated_at || ''
              )
            );
        }
      );

  return {
    schemaVersion:
      ledger.schemaVersion ||
      'career-os-task-ledger-v1',
    serverTimeUtc:
      new Date()
        .toISOString(),
    tasks:
      tasks
  };
}

function careerOsTaskLedgerBegin_(
  taskId,
  details
) {
  const source =
    Object.assign(
      {},
      details || {},
      {
        task_id:
          taskId,
        status:
          'RUNNING',
        started_at:
          new Date()
            .toISOString()
      }
    );

  return careerOsTaskLedgerUpsert_(
    source
  );
}

function careerOsTaskLedgerFinish_(
  taskId,
  status,
  details
) {
  return careerOsTaskLedgerUpsert_(
    Object.assign(
      {},
      details || {},
      {
        task_id:
          taskId,
        status:
          status ||
          'DONE',
        finished_at:
          new Date()
            .toISOString()
      }
    )
  );
}
