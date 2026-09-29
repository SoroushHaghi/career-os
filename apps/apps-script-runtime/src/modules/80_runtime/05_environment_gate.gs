function careerOsRuntimeEnvironment_() {
  const value = String(
    PropertiesService
      .getScriptProperties()
      .getProperty('CAREER_OS_ENVIRONMENT') ||
    ''
  ).trim().toLowerCase();

  if (value === 'production' || value === 'staging') {
    return value;
  }

  return 'frozen';
}

function careerOsRuntimeStateKey_(baseKey) {
  const key = String(baseKey || '');
  return careerOsRuntimeEnvironment_() === 'staging'
    ? key + '__STAGING'
    : key;
}

function careerOsRuntimeAllowsScanner_() {
  return careerOsRuntimeEnvironment_() === 'production';
}

function careerOsRuntimeAllowsWorker_() {
  const environment = careerOsRuntimeEnvironment_();

  if (environment === 'production') {
    return true;
  }

  if (environment !== 'staging') {
    return false;
  }

  return String(
    PropertiesService
      .getScriptProperties()
      .getProperty('CAREER_OS_STAGING_LIVE_PROVIDER_TEST') ||
    ''
  ).trim().toUpperCase() === 'ENABLED';
}

function careerOsRuntimeAllowsTriggerMutation_() {
  return careerOsRuntimeEnvironment_() === 'production';
}

function careerOsRuntimeBlockReason_(kind) {
  return (
    'CAREER_OS_RUNTIME_BLOCKED: ' +
    String(kind || 'operation') +
    ' | environment=' +
    careerOsRuntimeEnvironment_()
  );
}

function careerOsKnowledgeAutomationEnabled_() {
  return (
    careerOsRuntimeEnvironment_() === 'production' &&
    String(
      PropertiesService
        .getScriptProperties()
        .getProperty(
          CAREER_OS_CONFIG
            .KNOWLEDGE_AUTOMATION_ENABLED_PROPERTY
        ) || ''
    )
      .trim()
      .toUpperCase() === 'ENABLED'
  );
}
