// In-project cutover snapshot for non-secret runtime state.
// The snapshot intentionally excludes credentials/private config values.

function careerOsCutoverStateKeys_() {
  return [
    'DRIVE_PAGE_TOKEN',
    CAREER_OS_CONFIG.IMAGE_QUEUE_PROPERTY,
    CAREER_OS_CONFIG.AUDIO_QUEUE_PROPERTY,
    CAREER_OS_CONFIG.GEMINI_GLOBAL_BACKOFF_PROPERTY,
    CAREER_OS_CONFIG.GEMINI_QUOTA_429_STREAK_PROPERTY,
    CAREER_OS_CONFIG.GEMINI_QUOTA_CIRCUIT_LEVEL_PROPERTY,
    CAREER_OS_CONFIG.RETRY_POLICY_VERSION_PROPERTY,
    CAREER_OS_CONFIG.SESSION_STATUS_BACKFILL_VERSION_PROPERTY,
    CAREER_OS_CONFIG.PDF_BACKFILL_VERSION_PROPERTY
  ];
}

function careerOsCreateCutoverStateSnapshot_() {
  const props = PropertiesService.getScriptProperties();
  const state = {};

  careerOsCutoverStateKeys_().forEach(function(key) {
    const value = props.getProperty(String(key));
    if (value !== null) {
      state[String(key)] = String(value);
    }
  });

  const triggers = ScriptApp.getProjectTriggers().map(function(trigger) {
    return {
      handlerFunction: trigger.getHandlerFunction(),
      eventType: String(trigger.getEventType()),
      triggerSource: String(trigger.getTriggerSource())
    };
  });

  const snapshot = {
    schemaVersion: '1',
    createdAt: new Date().toISOString(),
    build: getCareerOsBuildInfo(),
    environment: careerOsRuntimeEnvironment_(),
    state: state,
    triggerInventory: triggers,
    secretValuesIncluded: false
  };

  props.setProperty(
    'CAREER_OS_CUTOVER_STATE_SNAPSHOT_V1',
    JSON.stringify(snapshot)
  );

  return snapshot;
}

function careerOsReadCutoverStateSnapshot_() {
  const raw = PropertiesService
    .getScriptProperties()
    .getProperty('CAREER_OS_CUTOVER_STATE_SNAPSHOT_V1');

  return raw ? JSON.parse(raw) : null;
}

function careerOsRestoreCutoverStateSnapshot_() {
  const props = PropertiesService.getScriptProperties();
  const enabled = String(
    props.getProperty('CAREER_OS_CUTOVER_RESTORE') || ''
  ).trim().toUpperCase();

  if (enabled !== 'ENABLED') {
    throw new Error(
      'CAREER_OS_CUTOVER_RESTORE must be ENABLED before restoring runtime state.'
    );
  }

  const snapshot = careerOsReadCutoverStateSnapshot_();

  if (!snapshot || !snapshot.state) {
    throw new Error('No cutover state snapshot is available.');
  }

  const allowed = {};
  careerOsCutoverStateKeys_().forEach(function(key) {
    allowed[String(key)] = true;
  });

  Object.keys(snapshot.state).forEach(function(key) {
    if (allowed[key]) {
      props.setProperty(key, String(snapshot.state[key]));
    }
  });

  return {
    ok: true,
    restoredKeys: Object.keys(snapshot.state).filter(function(key) {
      return Boolean(allowed[key]);
    }),
    triggerInventoryRestored: false
  };
}
