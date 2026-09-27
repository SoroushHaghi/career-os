// Public-safe runtime preflight for in-place cutover validation.
// Never returns Script Property values.

function runCareerOsCutoverPreflight() {
  const props = PropertiesService.getScriptProperties();
  const propertyKeys = Object.keys(props.getProperties()).sort();

  const triggers = ScriptApp.getProjectTriggers().map(function(trigger) {
    return {
      handlerFunction: trigger.getHandlerFunction(),
      eventType: String(trigger.getEventType()),
      triggerSource: String(trigger.getTriggerSource())
    };
  }).sort(function(a, b) {
    return String(a.handlerFunction).localeCompare(String(b.handlerFunction));
  });

  return {
    ok: true,
    build: getCareerOsBuildInfo(),
    environment: careerOsRuntimeEnvironment_(),
    scriptPropertyKeys: propertyKeys,
    scriptPropertyValuesExposed: false,
    hasGeminiApiKey: Boolean(props.getProperty('GEMINI_API_KEY')),
    hasDrivePageToken: Boolean(props.getProperty('DRIVE_PAGE_TOKEN')),
    imageQueueLength: loadImageQueue_().length,
    audioQueueLength: loadAudioQueue_().length,
    triggerCount: triggers.length,
    triggers: triggers,
    scannerAllowed: careerOsRuntimeAllowsScanner_(),
    workerAllowed: careerOsRuntimeAllowsWorker_(),
    triggerMutationAllowed: careerOsRuntimeAllowsTriggerMutation_()
  };
}
