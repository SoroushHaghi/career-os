const CAREER_OS_RUNTIME_CURRENT_ACTIVITY_PROPERTY =
  'CAREER_OS_RUNTIME_CURRENT_ACTIVITY';
const CAREER_OS_RUNTIME_LAST_ACTIVITY_PROPERTY =
  'CAREER_OS_RUNTIME_LAST_ACTIVITY';
const CAREER_OS_PROVIDER_TELEMETRY_PROPERTY =
  'CAREER_OS_PROVIDER_TELEMETRY';

function careerOsRuntimeSafeJsonParse_(
  raw,
  fallback
) {
  try {
    return JSON.parse(
      String(raw || '')
    );
  } catch (error) {
    return fallback;
  }
}

function careerOsRuntimeActivitySanitize_(
  value
) {
  const source =
    value &&
    typeof value === 'object' &&
    !Array.isArray(value)
      ? value
      : {};

  const safe = {};

  [
    'kind',
    'stage',
    'sourceType',
    'sourceName',
    'provider',
    'model',
    'status',
    'detail'
  ].forEach(
    function(key) {
      if (
        source[key] === undefined ||
        source[key] === null
      ) {
        return;
      }

      safe[key] =
        String(
          source[key]
        )
          .substring(
            0,
            300
          );
    }
  );

  return safe;
}

function careerOsRuntimeActivityBegin_(
  details
) {
  const props =
    PropertiesService
      .getScriptProperties();

  const now =
    new Date()
      .toISOString();

  const activity =
    Object.assign(
      {
        status: 'RUNNING',
        startedUtc: now,
        updatedUtc: now
      },
      careerOsRuntimeActivitySanitize_(
        details
      )
    );

  props.setProperty(
    CAREER_OS_RUNTIME_CURRENT_ACTIVITY_PROPERTY,
    JSON.stringify(
      activity
    )
  );

  return activity;
}

function careerOsRuntimeActivityUpdate_(
  details
) {
  const props =
    PropertiesService
      .getScriptProperties();

  const current =
    careerOsRuntimeSafeJsonParse_(
      props.getProperty(
        CAREER_OS_RUNTIME_CURRENT_ACTIVITY_PROPERTY
      ),
      {}
    );

  const activity =
    Object.assign(
      {},
      current,
      careerOsRuntimeActivitySanitize_(
        details
      ),
      {
        updatedUtc:
          new Date()
            .toISOString()
      }
    );

  if (!activity.startedUtc) {
    activity.startedUtc =
      activity.updatedUtc;
  }

  if (!activity.status) {
    activity.status =
      'RUNNING';
  }

  props.setProperty(
    CAREER_OS_RUNTIME_CURRENT_ACTIVITY_PROPERTY,
    JSON.stringify(
      activity
    )
  );

  return activity;
}

function careerOsRuntimeActivityFinish_(
  status,
  details
) {
  const props =
    PropertiesService
      .getScriptProperties();

  const current =
    careerOsRuntimeSafeJsonParse_(
      props.getProperty(
        CAREER_OS_RUNTIME_CURRENT_ACTIVITY_PROPERTY
      ),
      {}
    );

  const now =
    new Date()
      .toISOString();

  const completed =
    Object.assign(
      {},
      current,
      careerOsRuntimeActivitySanitize_(
        details
      ),
      {
        status:
          String(
            status ||
            'DONE'
          ),
        finishedUtc:
          now,
        updatedUtc:
          now
      }
    );

  props.setProperty(
    CAREER_OS_RUNTIME_LAST_ACTIVITY_PROPERTY,
    JSON.stringify(
      completed
    )
  );

  props.deleteProperty(
    CAREER_OS_RUNTIME_CURRENT_ACTIVITY_PROPERTY
  );

  return completed;
}

function careerOsProviderTelemetryRecord_(
  provider,
  details
) {
  const props =
    PropertiesService
      .getScriptProperties();

  const state =
    careerOsRuntimeSafeJsonParse_(
      props.getProperty(
        CAREER_OS_PROVIDER_TELEMETRY_PROPERTY
      ),
      {}
    );

  const name =
    String(
      provider ||
      ''
    )
      .trim()
      .toLowerCase();

  if (!name) {
    return;
  }

  const source =
    details &&
    typeof details === 'object'
      ? details
      : {};

  state[name] = {
    provider:
      name,
    model:
      String(
        source.model ||
        ''
      )
        .substring(
          0,
          120
        ),
    status:
      String(
        source.status ||
        ''
      )
        .substring(
          0,
          80
        ),
    durationMs:
      Math.max(
        0,
        Number(
          source.durationMs ||
          0
        )
      ),
    httpStatus:
      Math.max(
        0,
        Number(
          source.httpStatus ||
          0
        )
      ),
    error:
      String(
        source.error ||
        ''
      )
        .substring(
          0,
          300
        ),
    updatedUtc:
      new Date()
        .toISOString()
  };

  props.setProperty(
    CAREER_OS_PROVIDER_TELEMETRY_PROPERTY,
    JSON.stringify(
      state
    )
  );
}

function careerOsProviderTelemetryState_() {
  return careerOsRuntimeSafeJsonParse_(
    PropertiesService
      .getScriptProperties()
      .getProperty(
        CAREER_OS_PROVIDER_TELEMETRY_PROPERTY
      ),
    {}
  );
}
