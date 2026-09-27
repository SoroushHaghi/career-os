// Generated artifact/sidecar compatibility functions.

function buildPortableArtifact_(
  sourceFile,
  bodyText,
  options
) {

  const opts =
    options || {};


  const context =
    resolveSessionContext_(
      sourceFile,
      false
    );


  const identity =
    context
      ? {
          course:
            context.courseFolderName ||
            'UNKNOWN',

          session:
            context.sessionFolderName ||
            'UNKNOWN',

          basis:
            'drive_folder_id'
        }
      : inferCourseSessionFromFilename_(
          sourceFile.getName()
        );


  const parentFolderName =
    getParentFolderNameSafe_(
      sourceFile
    );


  const lines = [
    '=== CAREER OS ARTIFACT METADATA ===',

    'schema_version: ' +
      sanitizeMetadataValue_(
        CAREER_OS_CONFIG
          .ARTIFACT_SCHEMA_VERSION
      ),

    'artifact_type: ' +
      sanitizeMetadataValue_(
        opts.artifactType ||
        'text_artifact'
      ),

    'source_name: ' +
      sanitizeMetadataValue_(
        sourceFile.getName()
      ),

    'source_drive_id: ' +
      sanitizeMetadataValue_(
        sourceFile.getId()
      ),

    'source_parent_folder: ' +
      sanitizeMetadataValue_(
        parentFolderName
      ),

    'source_mime_type: ' +
      sanitizeMetadataValue_(
        opts.sourceMimeType ||
        ''
      ),

    'source_size_bytes: ' +
      sanitizeMetadataValue_(
        opts.sourceSizeBytes ||
        ''
      ),

    'source_modified_utc: ' +
      sanitizeMetadataValue_(
        opts.sourceModifiedUtc ||
        ''
      ),

    'source_content_fingerprint: ' +
      sanitizeMetadataValue_(
        opts.sourceFingerprint ||
        getSourceFingerprintById_(
          sourceFile.getId()
        )
      ),

    'source_fingerprint_schema_version: ' +
      sanitizeMetadataValue_(
        CAREER_OS_CONFIG
          .SOURCE_FINGERPRINT_SCHEMA_VERSION
      ),

    'course: ' +
      sanitizeMetadataValue_(
        identity.course
      ),

    'session: ' +
      sanitizeMetadataValue_(
        identity.session
      ),

    'course_session_basis: ' +
      sanitizeMetadataValue_(
        identity.basis
      ),

    'course_folder_drive_id: ' +
      sanitizeMetadataValue_(
        context
          ? context.courseFolderId
          : ''
      ),

    'session_folder_drive_id: ' +
      sanitizeMetadataValue_(
        context
          ? context.sessionFolderId
          : ''
      ),

    'course_name_at_generation: ' +
      sanitizeMetadataValue_(
        context
          ? context.courseFolderName
          : identity.course
      ),

    'session_name_at_generation: ' +
      sanitizeMetadataValue_(
        context
          ? context.sessionFolderName
          : identity.session
      ),

    'generated_utc: ' +
      new Date()
        .toISOString(),

    'generated_by: Career OS Automation',

    'model: ' +
      sanitizeMetadataValue_(
        opts.model ||
        CAREER_OS_CONFIG
          .GEMINI_AUDIO_TRANSCRIBE_MODEL
      ),

    'extraction_method: ' +
      sanitizeMetadataValue_(
        opts.extractionMethod ||
        ''
      ),

    'timestamp_mode: ' +
      sanitizeMetadataValue_(
        opts.timestampMode ||
        'none'
      ),

    'timestamp_note: ' +
      sanitizeMetadataValue_(
        opts.timestampNote ||
        ''
      ),

    '=== END CAREER OS ARTIFACT METADATA ===',

    '',

    String(
      bodyText || ''
    )
      .trim()
  ];


  return lines
    .join(
      '\n'
    )
    .trim() +
    '\n';
}

function sanitizeMetadataValue_(
  value
) {

  return String(
    value === undefined ||
    value === null
      ? ''
      : value
  )
    .replace(
      /[\r\n\t]+/g,
      ' '
    )
    .trim();
}

function createOrUpdateTxtSidecar_(
  sourceFile,
  text
) {
  const context =
    prepareSessionWorkspace_(
      sourceFile
    );

  const folder =
    context.workspaceFolder;

  const sourceId =
    sourceFile.getId();

  const preferredName =
    buildTxtName_(
      sourceFile.getName()
    );

  // 1) Prefer the normal same-name .txt only when it is
  //    clearly owned by Career OS for this exact source file.
  let preferredExists = false;

  const preferredFiles =
    folder.getFilesByName(
      preferredName
    );

  while (
    preferredFiles.hasNext()
  ) {
    preferredExists = true;

    const candidate =
      preferredFiles.next();

    if (
      isCareerOsSidecarForSource_(
        candidate.getId(),
        sourceId
      )
    ) {
      candidate.setContent(
        text
      );

      markAsCareerOsGenerated_(
        candidate.getId(),
        sourceId,
        context.sessionFolderId
      );

      console.log(
        'UPDATED_TXT: ' +
        preferredName
      );

      updateSessionManifest_(
        context.sessionFolder
      );

      return candidate;
    }
  }

  // 2) If no same-name .txt exists at all, create the normal one.
  if (!preferredExists) {
    const txtFile =
      folder.createFile(
        preferredName,
        text,
        MimeType.PLAIN_TEXT
      );

    markAsCareerOsGenerated_(
      txtFile.getId(),
      sourceId,
      context.sessionFolderId
    );

    console.log(
      'CREATED_TXT: ' +
      preferredName
    );

    updateSessionManifest_(
      context.sessionFolder
    );

    return txtFile;
  }

  // 3) A same-name .txt exists, but Career OS cannot prove ownership.
  //    Preserve it. This protects manual transcripts, NotebookLM output,
  //    notes, and other user-created files from being overwritten.
  console.log(
    'SIDECAR_CONFLICT_PRESERVED: ' +
    preferredName
  );

  const fallbackName =
    buildCareerOsTxtName_(
      sourceFile.getName()
    );

  let fallbackExists = false;

  const fallbackFiles =
    folder.getFilesByName(
      fallbackName
    );

  while (
    fallbackFiles.hasNext()
  ) {
    fallbackExists = true;

    const candidate =
      fallbackFiles.next();

    if (
      isCareerOsSidecarForSource_(
        candidate.getId(),
        sourceId
      )
    ) {
      candidate.setContent(
        text
      );

      markAsCareerOsGenerated_(
        candidate.getId(),
        sourceId,
        context.sessionFolderId
      );

      console.log(
        'UPDATED_TXT_SAFE: ' +
        fallbackName
      );

      updateSessionManifest_(
        context.sessionFolder
      );

      return candidate;
    }
  }

  // 4) If the standard fallback name is also occupied by a file
  //    Career OS does not own, use a stable source-ID suffix.
  const finalName =
    fallbackExists
      ? buildUniqueCareerOsTxtName_(
          sourceFile.getName(),
          sourceId
        )
      : fallbackName;

  const txtFile =
    folder.createFile(
      finalName,
      text,
      MimeType.PLAIN_TEXT
    );

  markAsCareerOsGenerated_(
    txtFile.getId(),
    sourceId,
    context.sessionFolderId
  );

  console.log(
    'CREATED_TXT_SAFE: ' +
    finalName
  );

  updateSessionManifest_(
    context.sessionFolder
  );

  return txtFile;
}

function buildCareerOsTxtName_(
  filename
) {
  const dot =
    filename.lastIndexOf(
      '.'
    );

  const base =
    dot > 0
      ? filename.substring(
          0,
          dot
        )
      : filename;

  return (
    base +
    '.career-os.txt'
  );
}

function buildUniqueCareerOsTxtName_(
  filename,
  sourceId
) {
  const dot =
    filename.lastIndexOf(
      '.'
    );

  const base =
    dot > 0
      ? filename.substring(
          0,
          dot
        )
      : filename;

  const suffix =
    String(sourceId)
      .slice(-8);

  return (
    base +
    '.career-os-' +
    suffix +
    '.txt'
  );
}

function isCareerOsSidecarForSource_(
  fileId,
  sourceId
) {
  try {
    const metadata =
      Drive.Files.get(
        fileId,
        {
          fields:
            'id,appProperties'
        }
      );

    const props =
      metadata.appProperties ||
      {};

    return (
      props.careerOsGenerated ===
        'true' &&
      props.careerOsSourceId ===
        String(sourceId)
    );

  } catch (error) {
    console.log(
      'SIDECAR_OWNERSHIP_CHECK_WARNING: ' +
      String(error)
    );

    // Fail closed: never overwrite when ownership cannot be proven.
    return false;
  }
}

function markAsCareerOsGenerated_(
  fileId,
  sourceId,
  sessionFolderId
) {
  try {
    const appProperties = {
      careerOsGenerated:
        'true',

      careerOsSourceId:
        String(sourceId),

      careerOsFingerprintSchemaVersion:
        CAREER_OS_CONFIG
          .SOURCE_FINGERPRINT_SCHEMA_VERSION
    };

    if (sessionFolderId) {
      appProperties.careerOsSessionFolderId =
        String(sessionFolderId);
    }

    try {
      const sourceMetadata =
        getDriveFileMetadataSafe_(
          String(sourceId)
        );

      if (
        sourceMetadata.modifiedTime &&
        sourceMetadata.mimeType !==
          'application/vnd.google-apps.folder'
      ) {
        appProperties.careerOsSourceModifiedTime =
          String(sourceMetadata.modifiedTime);
      }

      const sourceFingerprint =
        buildSourceFingerprintFromMetadata_(
          sourceMetadata
        );

      if (sourceFingerprint) {
        appProperties.careerOsSourceFingerprint =
          String(sourceFingerprint);
      }
    } catch (sourceMetadataError) {
      // Optional provenance fields only; ownership safety does not depend on them.
    }

    updateAppPropertiesIfChanged_(
      fileId,
      appProperties,
      'SIDECAR_MARK_WARNING'
    );

  } catch (error) {
    console.log(
      'SIDECAR_MARK_WARNING: ' +
      String(error)
    );
  }
}
