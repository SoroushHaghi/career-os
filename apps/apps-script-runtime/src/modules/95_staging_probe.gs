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
      sourceType: careerOsVnextClassifySourceType_(file.mimeType, file.name),
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
