// Extracted artifact reuse compatibility functions.

function stripPortableArtifactHeader_(
  text
) {
  const raw =
    String(text || '');

  const endMarker =
    '=== END CAREER OS ARTIFACT METADATA ===';

  const index =
    raw.indexOf(endMarker);

  if (index < 0) {
    return raw.trim();
  }

  return raw
    .substring(
      index + endMarker.length
    )
    .replace(
      /^\s+/,
      ''
    )
    .trim();
}

function findGeneratedTextBySourceFingerprint_(
  workspaceFolder,
  sourceFingerprint,
  excludeSourceId
) {
  if (
    !workspaceFolder ||
    !sourceFingerprint
  ) {
    return null;
  }

  const files =
    workspaceFolder.getFiles();

  while (files.hasNext()) {
    const candidate =
      files.next();

    if (
      !/\.txt$/i.test(
        candidate.getName()
      )
    ) {
      continue;
    }

    const metadata =
      getDriveFileMetadataSafe_(
        candidate.getId()
      );

    const props =
      metadata.appProperties ||
      {};

    if (
      props.careerOsGenerated !==
        'true' ||
      props.careerOsSourceFingerprint !==
        String(sourceFingerprint)
    ) {
      continue;
    }

    if (
      excludeSourceId &&
      props.careerOsSourceId ===
        String(excludeSourceId)
    ) {
      continue;
    }

    return candidate;
  }

  return null;
}

function hasCurrentGeneratedArtifactForSource_(
  sourceFile,
  workspaceFolder,
  sourceFingerprint,
  sourceModifiedUtc
) {
  if (!sourceFile || !workspaceFolder) {
    return false;
  }

  const sourceId =
    String(sourceFile.getId());

  const expectedFingerprint =
    String(sourceFingerprint || '');

  const expectedModified =
    String(sourceModifiedUtc || '');

  const files =
    workspaceFolder.getFiles();

  while (files.hasNext()) {
    const candidate =
      files.next();

    let metadata;

    try {
      metadata =
        Drive.Files.get(
          candidate.getId(),
          {
            fields:
              'id,appProperties'
          }
        );
    } catch (error) {
      continue;
    }

    const props =
      metadata.appProperties || {};

    if (
      props.careerOsGenerated !== 'true' ||
      props.careerOsSourceId !== sourceId
    ) {
      continue;
    }

    // Primary rule from this version onward: compare source CONTENT.
    if (
      expectedFingerprint &&
      props.careerOsSourceFingerprint ===
        expectedFingerprint
    ) {
      return true;
    }

    // Backward compatibility for artifacts generated before fingerprinting.
    // Only trust the old modifiedTime match when it exactly matches; then
    // upgrade the artifact metadata so future checks use content fingerprint.
    if (
      expectedModified &&
      props.careerOsSourceModifiedTime ===
        expectedModified
    ) {
      if (expectedFingerprint) {
        updateAppPropertiesIfChanged_(
          candidate.getId(),
          {
            careerOsSourceFingerprint:
              expectedFingerprint,
            careerOsFingerprintSchemaVersion:
              CAREER_OS_CONFIG
                .SOURCE_FINGERPRINT_SCHEMA_VERSION
          },
          'SIDECAR_FINGERPRINT_UPGRADE_WARNING'
        );
      }

      return true;
    }

    // Portable header fallback for legacy artifacts.
    try {
      const head =
        candidate
          .getBlob()
          .getDataAsString()
          .substring(0, 8000);

      const sourceMatches =
        head.indexOf(
          'source_drive_id: ' + sourceId
        ) >= 0;

      const fingerprintMatches =
        expectedFingerprint &&
        head.indexOf(
          'source_content_fingerprint: ' +
          expectedFingerprint
        ) >= 0;

      const modifiedMatches =
        expectedModified &&
        head.indexOf(
          'source_modified_utc: ' +
          expectedModified
        ) >= 0;

      if (
        sourceMatches &&
        (fingerprintMatches || modifiedMatches)
      ) {
        if (expectedFingerprint) {
          updateAppPropertiesIfChanged_(
            candidate.getId(),
            {
              careerOsSourceFingerprint:
                expectedFingerprint,
              careerOsFingerprintSchemaVersion:
                CAREER_OS_CONFIG
                  .SOURCE_FINGERPRINT_SCHEMA_VERSION
            },
            'SIDECAR_FINGERPRINT_UPGRADE_WARNING'
          );
        }

        return true;
      }
    } catch (error) {
      // Continue searching.
    }
  }

  return false;
}
