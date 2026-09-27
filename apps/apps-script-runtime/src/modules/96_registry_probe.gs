function runCareerOsVnextStagingRegistryProbe() {
  const props = PropertiesService.getScriptProperties();
  const environment = String(
    props.getProperty('CAREER_OS_ENVIRONMENT') || ''
  ).trim().toLowerCase();

  if (environment !== 'staging') {
    throw new Error('Registry probe is staging-only.');
  }

  const enabled = String(
    props.getProperty('CAREER_OS_STAGING_REGISTRY_WRITE') || ''
  ).trim().toUpperCase();

  if (enabled !== 'ENABLED') {
    throw new Error('CAREER_OS_STAGING_REGISTRY_WRITE must be ENABLED.');
  }

  const folderId = String(
    props.getProperty('CAREER_OS_STAGING_TEST_FOLDER_ID') || ''
  ).trim();

  if (!folderId) {
    throw new Error('CAREER_OS_STAGING_TEST_FOLDER_ID is missing.');
  }

  return careerOsVnextWriteContextRegistryProjection_(
    DriveApp.getFolderById(folderId)
  );
}
