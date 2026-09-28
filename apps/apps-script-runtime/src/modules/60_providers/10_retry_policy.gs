// Extracted provider retry/quota compatibility policy.

function getGlobalGeminiBackoffUntil_() {
  const raw =
    PropertiesService
      .getScriptProperties()
      .getProperty(
        CAREER_OS_CONFIG
          .GEMINI_GLOBAL_BACKOFF_PROPERTY
      );

  const value =
    Number(raw || 0);

  return Number.isFinite(value)
    ? value
    : 0;
}

function setGlobalGeminiBackoffUntil_(
  timestampMs
) {
  const value =
    Math.max(
      Number(timestampMs || 0),
      getGlobalGeminiBackoffUntil_()
    );

  PropertiesService
    .getScriptProperties()
    .setProperty(
      CAREER_OS_CONFIG
        .GEMINI_GLOBAL_BACKOFF_PROPERTY,
      String(value)
    );
}

function clearExpiredGlobalGeminiBackoff_() {
  const props =
    PropertiesService
      .getScriptProperties();

  const current =
    getGlobalGeminiBackoffUntil_();

  if (
    current > 0 &&
    current <= Date.now()
  ) {
    props.deleteProperty(
      CAREER_OS_CONFIG
        .GEMINI_GLOBAL_BACKOFF_PROPERTY
    );
  }
}

function getGeminiQuota429Streak_() {
  const raw =
    PropertiesService
      .getScriptProperties()
      .getProperty(
        CAREER_OS_CONFIG
          .GEMINI_QUOTA_429_STREAK_PROPERTY
      );

  const value = Number(raw || 0);

  return Number.isFinite(value)
    ? Math.max(0, value)
    : 0;
}

function getGeminiQuotaCircuitLevel_() {
  const raw =
    PropertiesService
      .getScriptProperties()
      .getProperty(
        CAREER_OS_CONFIG
          .GEMINI_QUOTA_CIRCUIT_LEVEL_PROPERTY
      );

  const value = Number(raw || 0);

  return Number.isFinite(value)
    ? Math.max(0, value)
    : 0;
}

function noteGeminiQuota429_() {
  const props =
    PropertiesService
      .getScriptProperties();

  const nextStreak =
    getGeminiQuota429Streak_() + 1;

  props.setProperty(
    CAREER_OS_CONFIG
      .GEMINI_QUOTA_429_STREAK_PROPERTY,
    String(nextStreak)
  );

  if (
    nextStreak <
    CAREER_OS_CONFIG
      .GEMINI_QUOTA_429_STREAK_THRESHOLD
  ) {
    console.log(
      'GEMINI_QUOTA_429_STREAK: ' +
      nextStreak + '/' +
      CAREER_OS_CONFIG
        .GEMINI_QUOTA_429_STREAK_THRESHOLD
    );
    return 0;
  }

  const nextLevel =
    getGeminiQuotaCircuitLevel_() + 1;

  const delayMs = Math.min(
    CAREER_OS_CONFIG
      .GEMINI_QUOTA_CIRCUIT_BREAKER_MAX_MS,
    CAREER_OS_CONFIG
      .GEMINI_QUOTA_CIRCUIT_BREAKER_MIN_MS *
      Math.pow(2, nextLevel - 1)
  );

  const until =
    Date.now() + delayMs;

  props.setProperty(
    CAREER_OS_CONFIG
      .GEMINI_QUOTA_429_STREAK_PROPERTY,
    '0'
  );

  props.setProperty(
    CAREER_OS_CONFIG
      .GEMINI_QUOTA_CIRCUIT_LEVEL_PROPERTY,
    String(nextLevel)
  );

  setGlobalGeminiBackoffUntil_(until);

  console.log(
    'GEMINI_QUOTA_CIRCUIT_OPEN: level=' +
    nextLevel +
    ' | pause_ms=' + delayMs +
    ' | until=' +
    new Date(until).toISOString()
  );

  return until;
}

function resetGeminiQuotaCircuitOnSuccess_() {
  const props =
    PropertiesService
      .getScriptProperties();

  const hadState =
    getGeminiQuota429Streak_() > 0 ||
    getGeminiQuotaCircuitLevel_() > 0;

  props.deleteProperty(
    CAREER_OS_CONFIG
      .GEMINI_QUOTA_429_STREAK_PROPERTY
  );

  props.deleteProperty(
    CAREER_OS_CONFIG
      .GEMINI_QUOTA_CIRCUIT_LEVEL_PROPERTY
  );

  clearExpiredGlobalGeminiBackoff_();

  if (hadState) {
    console.log(
      'GEMINI_QUOTA_CIRCUIT_RESET_AFTER_SUCCESS'
    );
  }
}

function isQuotaRetryErrorText_(text) {
  return /(?:\b429\b|quota exceeded|too_many_requests)/i
    .test(String(text || ''));
}

function migrateRetryPolicyState_() {
  const props =
    PropertiesService.getScriptProperties();

  const currentVersion =
    props.getProperty(
      CAREER_OS_CONFIG.RETRY_POLICY_VERSION_PROPERTY
    );

  if (
    currentVersion ===
    CAREER_OS_CONFIG.RETRY_POLICY_VERSION
  ) {
    return;
  }

  // The previous quota/backoff state belongs to the prior image-model policy.
  // Do not carry stale 429 history into the 3.8-primary / 3.5-fallback policy.
  // Preserve queued work and source fingerprints, but make quota-blocked
  // jobs immediately eligible for a clean attempt.
  const imageQueue = loadImageQueue_();
  const audioQueue = loadAudioQueue_();

  let resetImageJobs = 0;
  let resetAudioJobs = 0;

  imageQueue.forEach(function(job) {
    if (
      isQuotaRetryErrorText_(job.lastError) ||
      Number(job.attempts || 0) >=
        CAREER_OS_CONFIG.IMAGE_MAX_ATTEMPTS
    ) {
      job.attempts = 0;
      job.nextAttemptAt = 0;
      job.lastError = '';
      resetImageJobs += 1;
    }
  });

  audioQueue.forEach(function(job) {
    if (
      isQuotaRetryErrorText_(job.lastError) ||
      /\b503\b/.test(String(job.lastError || '')) ||
      Number(job.attempts || 0) >=
        CAREER_OS_CONFIG.AUDIO_MAX_ATTEMPTS
    ) {
      job.attempts = 0;
      job.nextAttemptAt = 0;
      job.lastError = '';
      resetAudioJobs += 1;
    }
  });

  saveImageQueue_(imageQueue);
  saveAudioQueue_(audioQueue);

  props.deleteProperty(
    CAREER_OS_CONFIG.GEMINI_GLOBAL_BACKOFF_PROPERTY
  );
  props.deleteProperty(
    CAREER_OS_CONFIG.GEMINI_QUOTA_429_STREAK_PROPERTY
  );
  props.deleteProperty(
    CAREER_OS_CONFIG.GEMINI_QUOTA_CIRCUIT_LEVEL_PROPERTY
  );

  props.setProperty(
    CAREER_OS_CONFIG.RETRY_POLICY_VERSION_PROPERTY,
    CAREER_OS_CONFIG.RETRY_POLICY_VERSION
  );

  console.log(
    'RETRY_POLICY_MIGRATED_TO_AUDIO_PRIMARY_3_8_GENERATE_CONTENT_V4: ' +
    'image_jobs_reset=' + resetImageJobs +
    ' | audio_jobs_reset=' + resetAudioJobs +
    ' | stale_backoff_cleared=true'
  );
}

function computeRetryDelayMs_(
  attemptNumber,
  serverRetryAfterMs,
  baseMs,
  maxMs
) {
  const attempt =
    Math.max(
      1,
      Number(attemptNumber || 1)
    );

  const exponential =
    Math.min(
      Number(maxMs),
      Number(baseMs) *
        Math.pow(2, attempt - 1)
    );

  const serverDelay =
    Math.max(
      0,
      Number(serverRetryAfterMs || 0)
    );

  const jitter =
    Math.floor(
      Math.random() *
      CAREER_OS_CONFIG
        .RETRY_JITTER_MAX_MS
    );

  // If Gemini explicitly supplies Retry-After, prefer that authoritative
  // hint, but never retry faster than our one-minute worker cadence.
  // Exponential backoff is the fallback only when no server hint exists.
  if (serverDelay > 0) {
    return (
      Math.max(
        Number(baseMs),
        serverDelay
      ) +
      jitter
    );
  }

  return exponential + jitter;
}

function parseRetryAfterMs_(response, body) {
  try {
    const headers =
      response.getAllHeaders();

    const retryAfter =
      getHeaderCaseInsensitive_(
        headers,
        'retry-after'
      );

    if (retryAfter) {
      const seconds =
        Number(retryAfter);

      if (
        Number.isFinite(seconds) &&
        seconds > 0
      ) {
        return Math.ceil(seconds * 1000);
      }
    }
  } catch (error) {
    // Fall back to response-body parsing.
  }

  const match =
    String(body || '')
      .match(
        /retry in\s+([0-9.]+)s/i
      );

  if (match) {
    const seconds =
      Number(match[1]);

    if (
      Number.isFinite(seconds) &&
      seconds > 0
    ) {
      return Math.ceil(seconds * 1000);
    }
  }

  return 0;
}

function createRetryAwareHttpError_(
  message,
  status,
  response,
  body
) {
  const error =
    new Error(
      String(message) +
      ' HTTP ' +
      String(status)
    );

  error.httpStatus =
    Number(status || 0);

  error.retryAfterMs =
    parseRetryAfterMs_(
      response,
      body || ''
    );

  return error;
}

function getHeaderCaseInsensitive_(
  headers,
  targetName
) {

  const target =
    String(
      targetName
    )
      .toLowerCase();


  for (
    const key in headers
  ) {

    if (
      String(key)
        .toLowerCase() ===
      target
    ) {

      const value =
        headers[key];


      if (
        Array.isArray(value)
      ) {

        return (
          value.length
            ? value[0]
            : ''
        );
      }


      return value;
    }
  }


  return '';
}
