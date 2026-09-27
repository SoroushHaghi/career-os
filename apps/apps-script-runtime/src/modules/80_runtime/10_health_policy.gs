// Runtime health and zero-charge policy checks.

function assertFreeOnlyConfiguration_() {
  if (!CAREER_OS_CONFIG.FREE_ONLY_MODE) {
    return;
  }

  const allowed = {};

  CAREER_OS_CONFIG
    .FREE_TIER_GEMINI_MODELS
    .forEach(
      model => {
        allowed[String(model)] = true;
      }
    );

  [
    CAREER_OS_CONFIG.GEMINI_IMAGE_MODEL_PRIMARY,
    CAREER_OS_CONFIG.GEMINI_IMAGE_MODEL_FALLBACK,
    CAREER_OS_CONFIG.GEMINI_AUDIO_TRANSCRIBE_MODEL,
    CAREER_OS_CONFIG.GEMINI_AUDIO_FALLBACK_MODEL,
    CAREER_OS_CONFIG.GEMINI_AUDIO_NAVIGATION_MODEL
  ].forEach(
    model => {
      if (!allowed[String(model)]) {
        throw new Error(
          'FREE_ONLY_MODE blocked unapproved Gemini model: ' +
          String(model)
        );
      }
    }
  );

  [
    CAREER_OS_CONFIG.GEMINI_IMAGE_THINKING_LEVEL,
    CAREER_OS_CONFIG.GEMINI_PDF_THINKING_LEVEL,
    CAREER_OS_CONFIG.GEMINI_AUDIO_NAVIGATION_THINKING_LEVEL
  ].forEach(
    level => {
      if (!/^(low|medium|high)$/.test(String(level || ''))) {
        throw new Error(
          'Invalid Gemini 3.8 thinking level in configuration: ' +
          String(level)
        );
      }
    }
  );

  const mediaResolutionAllowed = {
    low: true,
    medium: true,
    high: true,
    ultra_high: true
  };

  [
    CAREER_OS_CONFIG.GEMINI_IMAGE_MEDIA_RESOLUTION
  ].forEach(
    resolution => {
      if (
        !mediaResolutionAllowed[
          String(resolution || '')
        ]
      ) {
        throw new Error(
          'Invalid Gemini media resolution in configuration: ' +
          String(resolution)
        );
      }
    }
  );
}

function runCareerOsHealthCheck() {
  const props =
    PropertiesService
      .getScriptProperties();

  const token =
    props.getProperty(
      'DRIVE_PAGE_TOKEN'
    );

  const imageQueue =
    loadImageQueue_();

  const audioQueue =
    loadAudioQueue_();

  const handler =
    CAREER_OS_CONFIG
      .QUEUE_WORKER_FUNCTION;

  const workerTriggers =
    ScriptApp
      .getProjectTriggers()
      .filter(
        trigger =>
          trigger.getHandlerFunction() ===
          handler
      );

  let processingMarkers = 0;
  let attentionMarkers = 0;
  let deferredMarkers = 0;
  let completeMarkers = 0;

  const names = [
    ['PROCESSING', 'processingMarkers'],
    ['NEEDS_ATTENTION', 'attentionMarkers'],
    ['DEFERRED', 'deferredMarkers'],
    ['COMPLETE', 'completeMarkers']
  ];

  names.forEach(
    item => {
      const files =
        DriveApp.getFilesByName(
          CAREER_OS_CONFIG
            .SESSION_STATUS_FILE_PREFIX +
          item[0] +
          '.txt'
        );

      let count = 0;

      while (files.hasNext()) {
        files.next();
        count += 1;
      }

      if (item[0] === 'PROCESSING') {
        processingMarkers = count;
      } else if (item[0] === 'NEEDS_ATTENTION') {
        attentionMarkers = count;
      } else if (item[0] === 'DEFERRED') {
        deferredMarkers = count;
      } else if (item[0] === 'COMPLETE') {
        completeMarkers = count;
      }
    }
  );

  console.log(
    'CAREER_OS_HEALTH: ' +
    'watcher=' + (token ? 'READY' : 'MISSING') +
    ' | image_queue=' + imageQueue.length +
    ' | audio_queue=' + audioQueue.length +
    ' | worker_triggers=' + workerTriggers.length +
    ' | complete=' + completeMarkers +
    ' | processing=' + processingMarkers +
    ' | needs_attention=' + attentionMarkers +
    ' | deferred=' + deferredMarkers +
    ' | free_only=' +
      String(
        CAREER_OS_CONFIG
          .FREE_ONLY_MODE
      )
  );
}
