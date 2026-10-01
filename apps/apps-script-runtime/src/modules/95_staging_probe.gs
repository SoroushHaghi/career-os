function careerOsVnextAssertStaging_() {
  const props = PropertiesService.getScriptProperties();
  const mode = String(props.getProperty('CAREER_OS_ENVIRONMENT') || '').trim().toLowerCase();

  if (mode !== 'staging') {
    throw new Error(
      'CAREER_OS_ENVIRONMENT must be set to staging in Script Properties before running staging probes.'
    );
  }

  return props;
}

function runCareerOsVnextStagingMetadataProbe() {
  const props = careerOsVnextAssertStaging_();
  const folderId = String(
    props.getProperty('CAREER_OS_STAGING_TEST_FOLDER_ID') || ''
  ).trim();

  if (!folderId) {
    throw new Error(
      'CAREER_OS_STAGING_TEST_FOLDER_ID is missing from Script Properties.'
    );
  }

  const result = Drive.Files.list({
    q: "'" + folderId.replace(/'/g, "\\'") + "' in parents and trashed = false",
    pageSize: 100,
    fields: 'files(id,name,mimeType,size,modifiedTime,md5Checksum,parents,appProperties)'
  });

  const files = (result.files || []).map(function(file) {
    return {
      id: file.id,
      name: file.name,
      mimeType: file.mimeType,
      sourceType: file.sourceType,
      hasChecksum: Boolean(file.md5Checksum),
      parentCount: (file.parents || []).length
    };
  });

  return {
    ok: true,
    environment: 'staging',
    build: getCareerOsBuildInfo(),
    folderReadable: true,
    fileCount: files.length,
    files: files
  };
}

function runCareerOsVnextStagingConfigProbe() {
  const props = careerOsVnextAssertStaging_();

  return {
    ok: true,
    environment: 'staging',
    build: getCareerOsBuildInfo(),
    audioProvider:
      careerOsGetAudioTranscriptionProvider_(),
    hasGeminiApiKey:
      Boolean(
        props.getProperty(
          'GEMINI_API_KEY'
        )
      ),
    hasGroqApiKey:
      Boolean(
        props.getProperty(
          'GROQ_API_KEY'
        )
      ),
    hasAudioProxyBaseUrl:
      Boolean(
        props.getProperty(
          'CAREER_OS_AUDIO_PROXY_BASE_URL'
        )
      ),
    hasAudioProxySharedSecret:
      Boolean(
        props.getProperty(
          'CAREER_OS_AUDIO_PROXY_SHARED_SECRET'
        )
      ),
    hasTestFolderId:
      Boolean(
        props.getProperty(
          'CAREER_OS_STAGING_TEST_FOLDER_ID'
        )
      )
  };
}

function runCareerOsVnextStagingAudioProxyProbe() {
  const props =
    careerOsVnextAssertStaging_();

  const baseUrl =
    String(
      props.getProperty(
        'CAREER_OS_AUDIO_PROXY_BASE_URL'
      ) || ''
    )
      .trim()
      .replace(/\/+$/, '');

  if (!baseUrl) {
    throw new Error(
      'CAREER_OS_AUDIO_PROXY_BASE_URL is missing from Script Properties.'
    );
  }

  const response =
    UrlFetchApp.fetch(
      baseUrl + '/health',
      {
        method: 'get',
        muteHttpExceptions: true
      }
    );

  const status =
    response.getResponseCode();

  if (
    status < 200 ||
    status >= 300
  ) {
    throw new Error(
      'Audio proxy health probe failed with HTTP ' +
      status + '.'
    );
  }

  return {
    ok: true,
    environment: 'staging',
    audioProvider:
      careerOsGetAudioTranscriptionProvider_(),
    proxyReachable: true,
    proxyHttpStatus: status
  };
}


function careerOsVnextAssertLiveStagingProbe_() {
  const props = careerOsVnextAssertStaging_();
  const enabled = String(
    props.getProperty('CAREER_OS_STAGING_LIVE_PROVIDER_TEST') || ''
  ).trim().toUpperCase();

  if (enabled !== 'ENABLED') {
    throw new Error(
      'CAREER_OS_STAGING_LIVE_PROVIDER_TEST must be set to ENABLED before live queue/provider tests.'
    );
  }

  return props;
}

function careerOsVnextGetStagingTestFiles_() {
  const props =
    careerOsVnextAssertStaging_();

  const folderId = String(
    props.getProperty(
      'CAREER_OS_STAGING_TEST_FOLDER_ID'
    ) || ''
  ).trim();

  if (!folderId) {
    throw new Error(
      'CAREER_OS_STAGING_TEST_FOLDER_ID is missing from Script Properties.'
    );
  }

  const result = Drive.Files.list({
    q:
      "'" +
      folderId.replace(/'/g, "\\'") +
      "' in parents and trashed = false",
    pageSize: 100,
    fields:
      'files(id,name,mimeType,size,modifiedTime,' +
      'md5Checksum,sha1Checksum,sha256Checksum,' +
      'parents,appProperties)'
  });

  return (result.files || [])
    .map(function(file) {
      const route =
        classifyFile_(file);

      let sourceType = '';

      if (route === 'IMAGE_OCR') {
        sourceType = 'image';
      } else if (route === 'AUDIO_TRANSCRIBE') {
        sourceType = 'audio';
      }

      if (!sourceType) {
        return null;
      }

      return Object.assign(
        {},
        file,
        {
          sourceType: sourceType,
          sourceFingerprint:
            getSourceFingerprintFromFileMeta_(
              file
            )
        }
      );
    })
    .filter(function(file) {
      return Boolean(file);
    });
}


function runCareerOsVnextStagingLiveQueueProbe() {
  careerOsVnextAssertLiveStagingProbe_();

  const files = careerOsVnextGetStagingTestFiles_();
  const image = files.find(function(file) {
    return file.sourceType === 'image';
  });
  const audio = files.find(function(file) {
    return file.sourceType === 'audio';
  });

  if (!image && !audio) {
    throw new Error(
      'No image or audio test source was found in the configured staging folder.'
    );
  }

  if (image) {
    enqueueImageJob_(image);
  }

  if (audio) {
    enqueueAudioJob_(audio);
  }

  const manifestRefreshCount =
    careerOsFlushDeferredManifestUpdates_(
      deferredManifestSessionIds
    );

  return {
    ok: true,
    build: getCareerOsBuildInfo(),
    imageQueued: Boolean(image),
    audioQueued: Boolean(audio),
    imageName: image ? image.name : '',
    audioName: audio ? audio.name : '',
    providerCallsStarted: false
  };
}

function runCareerOsVnextStagingWorkerOnce() {
  careerOsVnextAssertLiveStagingProbe_();

  processCareerOsQueues();

  return {
    ok: true,
    build: getCareerOsBuildInfo(),
    imageQueueRemaining: loadImageQueue_().length,
    audioQueueRemaining: loadAudioQueue_().length
  };
}

function runCareerOsVnextStagingImageWorkerOnce() {
  careerOsVnextAssertLiveStagingProbe_();

  const startedAt = Date.now();

  processCareerOsImageQueue();

  return {
    ok: true,
    lane: 'image',
    durationMs: Date.now() - startedAt,
    build: getCareerOsBuildInfo(),
    imageQueueRemaining: loadImageQueue_().length,
    audioQueueRemaining: loadAudioQueue_().length
  };
}

function runCareerOsVnextStagingAudioWorkerOnce() {
  careerOsVnextAssertLiveStagingProbe_();

  const startedAt = Date.now();

  processCareerOsAudioQueue();

  return {
    ok: true,
    lane: 'audio',
    durationMs: Date.now() - startedAt,
    build: getCareerOsBuildInfo(),
    imageQueueRemaining: loadImageQueue_().length,
    audioQueueRemaining: loadAudioQueue_().length
  };
}


function runCareerOsVnextStagingFolderIngestProbe() {
  careerOsVnextAssertLiveStagingProbe_();

  const props = careerOsVnextAssertStaging_();
  const folderId = String(
    props.getProperty('CAREER_OS_STAGING_TEST_FOLDER_ID') || ''
  ).trim();

  if (!folderId) {
    throw new Error(
      'CAREER_OS_STAGING_TEST_FOLDER_ID is missing from Script Properties.'
    );
  }

  const result = Drive.Files.list({
    q:
      "'" +
      folderId.replace(/'/g, "\\'") +
      "' in parents and trashed = false",
    pageSize: 100,
    fields:
      'files(id,name,mimeType,size,modifiedTime,' +
      'md5Checksum,sha1Checksum,sha256Checksum,' +
      'parents,appProperties)'
  });

  const report = [];
  const counts = {};
  const deferredManifestSessionIds = {};

  (result.files || []).forEach(function(file) {
    const route = classifyFile_(file);

    counts[route] =
      Number(counts[route] || 0) + 1;

    let action = 'reported_only';
    let errorText = '';

    if (
      route === 'IMAGE_OCR' ||
      route === 'AUDIO_TRANSCRIBE' ||
      route === 'PDF_EXTRACT' ||
      route === 'TEXT_EVIDENCE' ||
      route === 'DOCX_EXTRACT' ||
      route === 'GOOGLE_DOC_EXTRACT'
    ) {
      try {
        handleDriveChange_(
          {
            removed: false,
            file: file
          },
          {
            deferManifestUpdate: true,
            manifestSessionIds:
              deferredManifestSessionIds
          }
        );

        // A source may already be marked DONE by an older processor version.
        // For staging acceptance, ensure the current semantic image artifact
        // exists before treating an image as fully ingested.
        if (route === 'IMAGE_OCR') {
          const sourceFile =
            DriveApp.getFileById(
              file.id
            );

          const context =
            prepareSessionWorkspace_(
              sourceFile
            );

          const sourceFingerprint =
            getSourceFingerprintFromFileMeta_(
              file
            );

          if (
            !hasCurrentSemanticImageArtifactForSource_(
              sourceFile,
              context.workspaceFolder,
              sourceFingerprint,
              file.modifiedTime || ''
            )
          ) {
            enqueueImageJob_(
              Object.assign(
                {},
                file,
                {
                  sourceType: 'image',
                  sourceFingerprint:
                    sourceFingerprint
                }
              )
            );
            action =
              'queued_current_image_processor';
          } else {
            action =
              'ingested_current_image_processor';
          }
        } else {
          action = 'ingested';
        }
      } catch (error) {
        action = 'error';
        errorText = String(
          error && error.message
            ? error.message
            : error
        ).substring(0, 800);
      }
    } else if (route === 'VIDEO_DEFERRED') {
      action = 'deferred_video';
    } else if (route === 'IGNORE') {
      action = 'ignored';
    }

    report.push({
      name: String(file.name || ''),
      mimeType: String(file.mimeType || ''),
      sizeBytes: Number(file.size || 0),
      route: route,
      action: action,
      error: errorText
    });
  });

  return {
    ok: true,
    build: getCareerOsBuildInfo(),
    folderId: folderId,
    fileCount: report.length,
    counts: counts,
    manifestRefreshCount:
      manifestRefreshCount,
    files: report,
    queues: {
      imageCount: loadImageQueue_().length,
      audioCount: loadAudioQueue_().length
    }
  };
}


function runCareerOsVnextConsumeStagingTargetFromDrive() {
  const props =
    careerOsVnextAssertStaging_();

  const controlName =
    '_CAREER_OS_STAGING_TARGET';

  const runtimeFolders =
    DriveApp
      .getFoldersByName(
        '00_CAREER_OS_RUNTIME'
      );

  let controlFile = null;
  let runtimeFolder = null;

  while (
    runtimeFolders.hasNext() &&
    !controlFile
  ) {
    const candidateFolder =
      runtimeFolders.next();

    const files =
      candidateFolder
        .getFilesByName(
          controlName
        );

    if (files.hasNext()) {
      runtimeFolder =
        candidateFolder;
      controlFile =
        files.next();
    }
  }

  if (!controlFile) {
    throw new Error(
      'No private staging-target control document was found in 00_CAREER_OS_RUNTIME.'
    );
  }

  const raw =
    String(
      DocumentApp
        .openById(
          controlFile.getId()
        )
        .getBody()
        .getText() ||
      ''
    )
      .trim();

  if (!raw) {
    throw new Error(
      'Staging-target control document is empty.'
    );
  }

  const payload =
    JSON.parse(
      raw
    );

  const targetFolderId =
    String(
      payload &&
      payload.targetFolderId ||
      ''
    )
      .trim();

  if (!targetFolderId) {
    throw new Error(
      'targetFolderId is missing from staging-target control document.'
    );
  }

  const folder =
    DriveApp
      .getFolderById(
        targetFolderId
      );

  const parents =
    folder.getParents();

  if (!parents.hasNext()) {
    throw new Error(
      'Staging target must not be a Drive root folder.'
    );
  }

  props.setProperty(
    'CAREER_OS_STAGING_TEST_FOLDER_ID',
    targetFolderId
  );

  try {
    controlFile.setTrashed(
      true
    );
  } catch (cleanupError) {
    console.log(
      'STAGING_TARGET_CONTROL_CLEANUP_WARNING: ' +
      String(
        cleanupError
      )
    );
  }

  return {
    ok:
      true,
    targetFolderName:
      folder.getName(),
    targetFolderId:
      targetFolderId,
    runtimeFolderName:
      runtimeFolder
        ? runtimeFolder.getName()
        : '',
    controlConsumed:
      true
  };
}
