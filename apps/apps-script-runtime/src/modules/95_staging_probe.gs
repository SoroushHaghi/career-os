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
    hasGeminiApiKey: Boolean(props.getProperty('GEMINI_API_KEY')),
    hasTestFolderId: Boolean(props.getProperty('CAREER_OS_STAGING_TEST_FOLDER_ID'))
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
