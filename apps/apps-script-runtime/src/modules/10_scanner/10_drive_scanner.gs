// Drive change scanner and source classification.

function initializeDriveWatcher() {
  if (!careerOsRuntimeAllowsScanner_()) {
    console.log(careerOsRuntimeBlockReason_('initializeDriveWatcher'));
    return;
  }

  const props =
    PropertiesService.getScriptProperties();

  const existingToken =
    props.getProperty('DRIVE_PAGE_TOKEN');

  // Safety rule: initialization is idempotent. Once a watcher token exists,
  // this function MUST NOT silently reset it and skip unseen Drive changes.
  if (existingToken) {
    console.log(
      'WATCHER_ALREADY_INITIALIZED_NO_RESET: ' +
      existingToken
    );
    return;
  }

  const token =
    Drive.Changes
      .getStartPageToken()
      .startPageToken;

  props.setProperty(
    'DRIVE_PAGE_TOKEN',
    token
  );

  console.log('Watcher initialized.');
  console.log('Start token: ' + token);
}

function checkDriveChanges() {
  if (!careerOsRuntimeAllowsScanner_()) {
    console.log(careerOsRuntimeBlockReason_('checkDriveChanges'));
    return;
  }

  const lock = LockService.getScriptLock();

  if (!lock.tryLock(1000)) {
    console.log(
      'SCANNER_SKIP_LOCKED: another Career OS execution is already running.'
    );
    return;
  }

  careerOsRuntimeActivityBegin_({
    kind: 'scanner',
    stage: 'drive_changes',
    status: 'RUNNING'
  });

  let activityStatus = 'SUCCESS';
  let activityError = '';

  try {
    assertFreeOnlyConfiguration_();
    migrateRetryPolicyState_();
    backfillSessionStatusMarkersOnce_();
    // Recover PDFs that were previously inventoried as DEFERRED before PDF
    // extraction existed. Process at most one existing INBOX PDF per scanner
    // run so the scanner remains bounded.
    backfillOneDeferredInboxPdf_();

    // Scanner only detects changes and enqueues work. Heavy AI work is
    // intentionally separated into processCareerOsQueues().
    scanDriveChanges_();
  } catch (error) {
    activityStatus = 'ERROR';
    activityError = String(
      error && error.message
        ? error.message
        : error
    ).substring(0, 300);
    throw error;
  } finally {
    try {
      ensureQueueWorkerTriggerIfNeeded_();
    } catch (error) {
      console.log(
        'QUEUE_WORKER_TRIGGER_WARNING: ' +
        String(error)
      );
    }

    careerOsRuntimeActivityFinish_(
      activityStatus,
      {
        kind: 'scanner',
        stage: 'drive_changes',
        detail: activityError
      }
    );

    lock.releaseLock();
  }
}

function scanDriveChanges_() {
  const props = PropertiesService.getScriptProperties();

  let pageToken =
    props.getProperty('DRIVE_PAGE_TOKEN');

  if (!pageToken) {
    throw new Error(
      'Watcher is not initialized. ' +
      'Run initializeDriveWatcher() first.'
    );
  }

  let newStartPageToken = null;

  do {
    const result = Drive.Changes.list(
      pageToken,
      {
        pageSize: 100,

        includeRemoved: true,

        restrictToMyDrive: true,

        fields:
          'nextPageToken,newStartPageToken,' +
          'changes(fileId,removed,time,' +
          'file(' +
          'id,' +
          'name,' +
          'mimeType,' +
          'modifiedTime,' +
          'parents,' +
          'trashed,' +
          'size,' +
          'md5Checksum,' +
          'sha1Checksum,' +
          'sha256Checksum,' +
          'appProperties' +
          '))'
      }
    );

    const changes =
      result.changes || [];

    changes.forEach(change => {
      handleDriveChange_(change);
    });

    if (result.newStartPageToken) {
      newStartPageToken =
        result.newStartPageToken;
    }

    pageToken =
      result.nextPageToken;

  } while (pageToken);

  if (newStartPageToken) {
    props.setProperty(
      'DRIVE_PAGE_TOKEN',
      newStartPageToken
    );
  }

  console.log(
    'Drive change check completed.'
  );
}

function handleDriveChange_(change) {
  if (change.removed) {
    console.log(
      'IGNORE_REMOVED: ' +
      change.fileId
    );

    return;
  }

  const file = change.file;

  if (!file || file.trashed) {
    console.log(
      'IGNORE_TRASHED: ' +
      change.fileId
    );

    return;
  }

  const route =
    classifyFile_(file);

  console.log({
    route: route,
    name: file.name,
    mimeType: file.mimeType,
    fileId: file.id,
    size: file.size || null,
    modifiedTime: file.modifiedTime,
    sourceFingerprint:
      getSourceFingerprintFromFileMeta_(file)
  });


  // Evidence processing is session-scoped. A top-level course folder (for
  // example SAMPLE_COURSE_A directly under My Drive) is a container, not a session.
  // This prevents course-level PDFs/project files from creating a fake
  // SESSION_MANIFEST or SESSION_STATUS marker.
  const sessionScopedRoutes = {
    TEXT_EVIDENCE: true,
    IMAGE_OCR: true,
    AUDIO_TRANSCRIBE: true,
    PDF_EXTRACT: true,
    DOCX_EXTRACT: true,
    GOOGLE_DOC_EXTRACT: true
  };

  if (
    sessionScopedRoutes[route]
  ) {
    const vnextContextDecision =
      careerOsVnextResolveProcessingContextForFile_(
        file
      );

    if (
      vnextContextDecision.status ===
      'UNCLASSIFIED_AUTHORIZED'
    ) {
      careerOsVnextRegisterHeldSource_(
        file,
        vnextContextDecision
      );
      return;
    }

    if (
      vnextContextDecision.status ===
      'BLOCKED_POLICY'
    ) {
      console.log(
        'SOURCE_OUTSIDE_AUTHORIZED_SCOPE_SKIPPED: ' +
        file.name
      );
      return;
    }
  }


  if (route === 'SESSION_FOLDER_EVENT') {
    handleSessionOrCourseFolderChange_(file);
    return;
  }


  if (route === 'TEXT_EVIDENCE') {
    handleTextEvidence_(file);
    return;
  }


  if (route === 'IMAGE_OCR') {
    const context =
      prepareSessionWorkspaceForSourceId_(
        file.id
      );

    const sourceFile =
      DriveApp.getFileById(
        file.id
      );

    const sourceFingerprint =
      getSourceFingerprintFromFileMeta_(file);

    if (
      hasCurrentSemanticImageArtifactForSource_(
        sourceFile,
        context.workspaceFolder,
        sourceFingerprint,
        file.modifiedTime || ''
      )
    ) {
      console.log(
        'IMAGE_ALREADY_PROCESSED_FOR_CURRENT_SEMANTIC_VERSION: ' +
        file.name
      );

      updateSessionManifest_(
        context.sessionFolder
      );

      return;
    }

    if (
      reuseExactImageEvidenceIfAvailable_(
        sourceFile,
        context.workspaceFolder,
        sourceFingerprint,
        file.modifiedTime || ''
      )
    ) {
      updateSessionManifest_(
        context.sessionFolder
      );
      return;
    }

    enqueueImageJob_(
      Object.assign(
        {},
        file,
        { sourceFingerprint: sourceFingerprint }
      )
    );

    updateSessionManifest_(
      context.sessionFolder
    );

    return;
  }


  if (route === 'AUDIO_TRANSCRIBE') {
    const sourceFile =
      DriveApp.getFileById(
        file.id
      );

    const context =
      prepareSessionWorkspace_(
        sourceFile
      );

    const sourceFingerprint =
      getSourceFingerprintFromFileMeta_(file);

    const existingTranscript =
      findConfirmedTranscriptForAudio_(
        sourceFile,
        context.workspaceFolder,
        sourceFingerprint
      );

    if (existingTranscript) {
      markAudioSatisfiedByTranscript_(
        sourceFile,
        existingTranscript,
        sourceFingerprint
      );

      console.log(
        'AUDIO_TRANSCRIPTION_SATISFIED_BY_EXISTING_TEXT: ' +
        file.name +
        ' -> ' +
        existingTranscript.getName()
      );

      updateSessionManifest_(
        context.sessionFolder
      );

      return;
    }

    enqueueAudioJob_(
      Object.assign(
        {},
        file,
        { sourceFingerprint: sourceFingerprint }
      )
    );

    updateSessionManifest_(
      context.sessionFolder
    );

    return;
  }


  if (route === 'PDF_EXTRACT') {
    handlePdfEvidence_(file);
    return;
  }


  if (
    route === 'DOCX_EXTRACT' ||
    route === 'GOOGLE_DOC_EXTRACT'
  ) {
    prepareSessionWorkspaceForSourceId_(
      file.id
    );

    console.log(
      'DOCUMENT_DEFERRED: ' +
      'DOCX/Google Docs extraction will be added later.'
    );

    return;
  }
}

function isSupportedImageMime_(
  mimeType
) {
  const mime =
    String(mimeType || '')
      .toLowerCase();

  return [
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/heic',
    'image/heif'
  ].includes(mime);
}

function classifyFile_(file) {
  const mime =
    (file.mimeType || '')
      .toLowerCase();

  const appProperties =
    file.appProperties || {};


  // Ignore Career OS-generated artifacts. Their source changes are
  // handled through the original file or explicit session refreshes.
  if (
    appProperties[
      CAREER_OS_CONFIG
        .GENERATED_APP_PROPERTY_KEY
    ] ===
    CAREER_OS_CONFIG
      .GENERATED_APP_PROPERTY_VALUE
  ) {
    return 'IGNORE';
  }


  // Folder rename/move events matter because the folder ID is the
  // canonical session identity while the human-readable name may change.
  if (
    mime ===
    'application/vnd.google-apps.folder'
  ) {
    return 'SESSION_FOLDER_EVENT';
  }


  // Ignore Apps Script projects.
  if (
    mime ===
    'application/vnd.google-apps.script'
  ) {
    return 'IGNORE';
  }


  const supportedImages = [
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/heic',
    'image/heif'
  ];


  if (
    supportedImages.includes(mime)
  ) {
    return 'IMAGE_OCR';
  }


  if (
    mime.startsWith('image/')
  ) {
    return 'IMAGE_UNSUPPORTED';
  }


  if (
    mime.startsWith('audio/')
  ) {
    return 'AUDIO_TRANSCRIBE';
  }


  if (
    mime === 'application/pdf'
  ) {
    return 'PDF_EXTRACT';
  }


  // A TXT/MD file is already text. It is evidence, not something that
  // needs another extraction pass. TXT files are organized into the
  // session workspace automatically.
  if (
    mime.startsWith('text/')
  ) {
    return 'TEXT_EVIDENCE';
  }


  if (
    mime ===
    'application/vnd.google-apps.document'
  ) {
    return 'GOOGLE_DOC_EXTRACT';
  }


  if (
    mime ===
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ) {
    return 'DOCX_EXTRACT';
  }


  if (
    mime.startsWith('video/')
  ) {
    return 'VIDEO_DEFERRED';
  }


  return 'IGNORE';
}
