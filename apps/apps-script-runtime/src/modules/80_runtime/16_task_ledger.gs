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

  const dependsOn =
    Array.isArray(
      source.depends_on ||
      source.dependsOn
    )
      ? (
          source.depends_on ||
          source.dependsOn
        )
          .slice(0, 20)
          .map(
            function(value) {
              return careerOsTaskLedgerSanitizeString_(
                value,
                180
              );
            }
          )
      : [];

  const waitingFor =
    Array.isArray(
      source.waiting_for ||
      source.waitingFor
    )
      ? (
          source.waiting_for ||
          source.waitingFor
        )
          .slice(0, 20)
          .map(
            function(value) {
              return careerOsTaskLedgerSanitizeString_(
                value,
                220
              );
            }
          )
      : [];

  return {
    task_id:
      taskId,
    parent_id:
      careerOsTaskLedgerSanitizeString_(
        source.parent_id ||
        source.parentId,
        180
      ),
    depends_on:
      dependsOn,
    title:
      careerOsTaskLedgerSanitizeString_(
        source.title,
        260
      ),
    executor:
      careerOsTaskLedgerSanitizeString_(
        source.executor,
        120
      ),
    stage:
      careerOsTaskLedgerSanitizeString_(
        source.stage,
        120
      ),
    status:
      careerOsTaskLedgerSanitizeString_(
        source.status ||
        'PENDING',
        60
      )
        .toUpperCase(),
    started_at:
      careerOsTaskLedgerSanitizeString_(
        source.started_at ||
        source.startedAt,
        80
      ),
    updated_at:
      careerOsTaskLedgerSanitizeString_(
        source.updated_at ||
        source.updatedAt,
        80
      ),
    finished_at:
      careerOsTaskLedgerSanitizeString_(
        source.finished_at ||
        source.finishedAt,
        80
      ),
    waiting_for:
      waitingFor,
    current_action:
      careerOsTaskLedgerSanitizeString_(
        source.current_action ||
        source.currentAction,
        360
      ),
    result_or_error:
      careerOsTaskLedgerSanitizeString_(
        source.result_or_error ||
        source.resultOrError,
        420
      )
  };
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
            normalized.updated_at ||
            now
        }
      );

    if (
      merged.status === 'RUNNING' &&
      !merged.started_at
    ) {
      merged.started_at =
        now;
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
