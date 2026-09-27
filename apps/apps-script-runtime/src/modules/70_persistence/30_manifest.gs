// Human-readable session manifest compatibility projection.

function handleSessionOrCourseFolderChange_(
  fileMeta
) {
  try {
    const folder =
      DriveApp.getFolderById(
        fileMeta.id
      );

    // Case 1: the changed folder itself is a session workspace.
    if (
      folder.getName() ===
      CAREER_OS_CONFIG
        .SESSION_WORKSPACE_FOLDER
    ) {
      const parents =
        folder.getParents();

      if (parents.hasNext()) {
        const candidateSession =
          parents.next();

        if (
          isValidSessionFolder_(
            candidateSession
          )
        ) {
          updateSessionManifest_(
            candidateSession
          );
        } else {
          console.log(
            'NON_SESSION_WORKSPACE_EVENT_IGNORED: ' +
            candidateSession.getName()
          );
        }
      }

      return;
    }

    // Case 2: changed folder is a session folder that already has a workspace.
    const ownWorkspace =
      folder.getFoldersByName(
        CAREER_OS_CONFIG
          .SESSION_WORKSPACE_FOLDER
      );

    if (
      ownWorkspace.hasNext() &&
      isValidSessionFolder_(folder)
    ) {
      updateSessionManifest_(
        folder
      );

      console.log(
        'SESSION_FOLDER_LABEL_REFRESHED: ' +
        folder.getName()
      );

      return;
    }

    // Case 3: changed folder may be a course/container folder. Refresh
    // participating sessions up to two levels below it (e.g. SAMPLE_COURSE_A / L / 10).
    const refreshed =
      refreshSessionManifestsUnderFolder_(
        folder,
        2
      );

    if (refreshed > 0) {
      console.log(
        'COURSE_OR_COLLECTION_LABEL_REFRESHED_SESSION_MANIFESTS: ' +
        refreshed
      );
    }

  } catch (error) {
    console.log(
      'FOLDER_CHANGE_HANDLER_WARNING: ' +
      String(error)
    );
  }
}

function refreshSessionManifestsUnderFolder_(
  rootFolder,
  maxDepth
) {
  let refreshed = 0;

  function visit(folder, depth) {
    if (depth > maxDepth) {
      return;
    }

    const workspace =
      folder.getFoldersByName(
        CAREER_OS_CONFIG
          .SESSION_WORKSPACE_FOLDER
      );

    if (
      workspace.hasNext() &&
      isValidSessionFolder_(folder)
    ) {
      updateSessionManifest_(folder);
      refreshed += 1;
      return;
    }

    if (depth === maxDepth) {
      return;
    }

    const children =
      folder.getFolders();

    while (children.hasNext()) {
      visit(
        children.next(),
        depth + 1
      );
    }
  }

  const children =
    rootFolder.getFolders();

  while (children.hasNext()) {
    visit(
      children.next(),
      1
    );
  }

  return refreshed;
}

function normalizeManifestForComparison_(
  text
) {
  return String(text || '')
    .replace(
      /^updated_utc: .*$/m,
      'updated_utc: <normalized>'
    )
    .trim();
}

function updateSessionManifest_(
  sessionFolder
) {
  if (!sessionFolder) {
    return;
  }

  if (!isValidSessionFolder_(sessionFolder)) {
    console.log(
      'NON_SESSION_MANIFEST_SKIPPED: ' +
      sessionFolder.getName()
    );
    return;
  }

  const workspace =
    getOrCreateSessionWorkspaceFolder_(
      sessionFolder,
      true
    );

  const hierarchy =
    resolveCourseHierarchyForSessionFolder_(
      sessionFolder
    );

  const courseFolder =
    hierarchy.courseFolder;

  const collectionFolder =
    hierarchy.collectionFolder;

  const sourceRows = [];
  const sourceFiles =
    sessionFolder.getFiles();

  while (sourceFiles.hasNext()) {
    const file =
      sourceFiles.next();

    const metadata =
      getDriveFileMetadataSafe_(
        file.getId()
      );

    const appProps =
      metadata.appProperties || {};

    const currentFingerprint =
      buildSourceFingerprintFromMetadata_(
        metadata
      );

    const sourceMime =
      String(
        file.getMimeType() || ''
      ).toLowerCase();

    const isPdfSource =
      sourceMime ===
      'application/pdf';

    const isAudioSource =
      sourceMime.startsWith(
        'audio/'
      );

    let processingStatus =
      isPdfSource
        ? (appProps.careerOsPdfStatus || '')
        : (
            isAudioSource
              ? (appProps.careerOsAudioStatus || '')
              : (appProps.careerOsImageStatus || '')
          );

    const processingFingerprint =
      String(
        isPdfSource
          ? (appProps.careerOsPdfProcessedSourceFingerprint || '')
          : (
              isAudioSource
                ? (appProps.careerOsAudioProcessedSourceFingerprint || '')
                : (appProps.careerOsImageProcessedSourceFingerprint || '')
            )
      );

    if (
      processingStatus &&
      processingFingerprint &&
      currentFingerprint &&
      processingFingerprint !==
        currentFingerprint
    ) {
      processingStatus =
        'STALE_' +
        processingStatus;
    }

    // One-time recovery for jobs that the previous version marked ERROR
    // only because the free-tier quota returned HTTP 429.
    if (
      appProps.careerOsImageStatus ===
        'ERROR' &&
      /HTTP 429/i.test(
        String(
          appProps.careerOsImageLastError ||
          ''
        )
      )
    ) {
      enqueueImageJob_(
        {
          id: file.getId(),
          name: file.getName(),
          mimeType: file.getMimeType(),
          size: metadata.size || 0,
          modifiedTime:
            metadata.modifiedTime ||
            file.getLastUpdated()
              .toISOString(),
          sourceFingerprint:
            currentFingerprint
        }
      );

      markImageSourceProcessingStatus_(
        file.getId(),
        'RETRY_WAIT',
        currentFingerprint,
        metadata.modifiedTime || '',
        'Recovered legacy HTTP 429 quota error; queued for retry.'
      );

      processingStatus =
        'RETRY_WAIT';
    }

    sourceRows.push({
      type:
        manifestTypeFromMime_(
          file.getMimeType(),
          file.getName()
        ),

      name:
        file.getName(),

      id:
        file.getId(),

      mime:
        file.getMimeType(),

      modified:
        file.getLastUpdated()
          .toISOString(),

      fingerprint:
        currentFingerprint,

      transcriptStatus:
        appProps.careerOsTranscriptStatus ||
        '',

      transcriptFileId:
        appProps.careerOsTranscriptFileId ||
        '',

      processingStatus:
        processingStatus
    });
  }

  const textRows = [];
  const workspaceFiles =
    workspace.getFiles();

  while (workspaceFiles.hasNext()) {
    const file =
      workspaceFiles.next();

    if (
      file.getName() ===
        CAREER_OS_CONFIG
          .SESSION_MANIFEST_FILE ||
      file.getName().startsWith(
        CAREER_OS_CONFIG
          .SESSION_STATUS_FILE_PREFIX
      )
    ) {
      continue;
    }

    const metadata =
      getDriveFileMetadataSafe_(
        file.getId()
      );

    const props =
      metadata.appProperties || {};

    textRows.push({
      name:
        file.getName(),

      id:
        file.getId(),

      generated:
        props.careerOsGenerated ===
        'true'
          ? 'yes'
          : 'no',

      evidenceType:
        props.careerOsEvidenceType ||
        (
          props.careerOsGenerated ===
          'true'
            ? 'career_os_generated_text'
            : 'external_text'
        ),

      sourceId:
        props.careerOsSourceId ||
        '',

      sourceFingerprint:
        props.careerOsSourceFingerprint ||
        '',

      fingerprint:
        buildSourceFingerprintFromMetadata_(
          metadata
        ),

      modified:
        file.getLastUpdated()
          .toISOString()
    });
  }

  sourceRows.sort(
    (a, b) =>
      a.name.localeCompare(
        b.name
      )
  );

  textRows.sort(
    (a, b) =>
      a.name.localeCompare(
        b.name
      )
  );

  const ingestionStatus =
    buildSessionIngestionStatus_(
      sourceRows,
      textRows
    );

  syncSessionStatusMarker_(
    workspace,
    sessionFolder,
    ingestionStatus
  );

  const lines = [
    '# Career OS Session Manifest',
    '',
    '> Mechanical inventory generated by the ingestion automation. ' +
      'This is not the final lesson synthesis.',
    '',
    'schema_version: ' +
      CAREER_OS_CONFIG
        .SESSION_MANIFEST_SCHEMA_VERSION,
    '',
    'session_folder_name_current: ' +
      sanitizeMetadataValue_(
        sessionFolder.getName()
      ),
    '',
    'session_folder_drive_id: ' +
      sessionFolder.getId(),
    '',
    'course_folder_name_current: ' +
      sanitizeMetadataValue_(
        courseFolder
          ? courseFolder.getName()
          : 'UNKNOWN'
      ),
    '',
    'course_folder_drive_id: ' +
      (
        courseFolder
          ? courseFolder.getId()
          : ''
      ),
    '',
    'collection_folder_name_current: ' +
      sanitizeMetadataValue_(
        collectionFolder
          ? collectionFolder.getName()
          : ''
      ),
    '',
    'collection_folder_drive_id: ' +
      (
        collectionFolder
          ? collectionFolder.getId()
          : ''
      ),
    '',
    'workspace_folder_name: ' +
      CAREER_OS_CONFIG
        .SESSION_WORKSPACE_FOLDER,
    '',
    'workspace_folder_drive_id: ' +
      workspace.getId(),
    '',
    'ingestion_status: ' +
      ingestionStatus.status,
    '',
    'free_only_mode: ' +
      String(
        CAREER_OS_CONFIG
          .FREE_ONLY_MODE
      ),
    '',
    'updated_utc: ' +
      new Date()
        .toISOString(),
    '',
    '## Source evidence',
    '',
    '| Type | Name | Drive ID | MIME | Content fingerprint | Modified UTC | Transcript status | Transcript file ID | Processing status |',
    '|---|---|---|---|---|---|---|---|---|'
  ];

  if (
    sourceRows.length === 0
  ) {
    lines.push(
      '| — | No source files found | — | — | — | — | — | — | — |'
    );
  } else {
    sourceRows.forEach(row => {
      lines.push(
        '| ' +
        escapeMarkdownCell_(
          row.type
        ) +
        ' | ' +
        escapeMarkdownCell_(
          row.name
        ) +
        ' | ' +
        escapeMarkdownCell_(
          row.id
        ) +
        ' | ' +
        escapeMarkdownCell_(
          row.mime
        ) +
        ' | ' +
        escapeMarkdownCell_(
          row.fingerprint
        ) +
        ' | ' +
        escapeMarkdownCell_(
          row.modified
        ) +
        ' | ' +
        escapeMarkdownCell_(
          row.transcriptStatus
        ) +
        ' | ' +
        escapeMarkdownCell_(
          row.transcriptFileId
        ) +
        ' | ' +
        escapeMarkdownCell_(
          row.processingStatus
        ) +
        ' |'
      );
    });
  }

  lines.push(
    '',
    '## Text evidence',
    '',
    '| Name | Drive ID | Generated by Career OS | Evidence type | Content fingerprint | Source Drive ID | Source content fingerprint | Modified UTC |',
    '|---|---|---|---|---|---|---|---|'
  );

  if (
    textRows.length === 0
  ) {
    lines.push(
      '| No text evidence yet | — | — | — | — | — | — | — |'
    );
  } else {
    textRows.forEach(row => {
      lines.push(
        '| ' +
        escapeMarkdownCell_(
          row.name
        ) +
        ' | ' +
        escapeMarkdownCell_(
          row.id
        ) +
        ' | ' +
        escapeMarkdownCell_(
          row.generated
        ) +
        ' | ' +
        escapeMarkdownCell_(
          row.evidenceType
        ) +
        ' | ' +
        escapeMarkdownCell_(
          row.fingerprint
        ) +
        ' | ' +
        escapeMarkdownCell_(
          row.sourceId
        ) +
        ' | ' +
        escapeMarkdownCell_(
          row.sourceFingerprint
        ) +
        ' | ' +
        escapeMarkdownCell_(
          row.modified
        ) +
        ' |'
      );
    });
  }

  lines.push(
    '',
    '## AI handoff',
    '',
    '- Canonical session identity is `session_folder_drive_id`, not the folder name.',
    '- Session/course/collection folder names are mutable labels and may be corrected later.',
    '- Read source-derived text evidence before producing a final synthesis.',
    '- Treat OCR/transcription as evidence that may contain extraction errors.',
    '- Final durable synthesis should be created/reviewed by an AI agent, not by this ingestion script.',
    '- Recommended final file: `SESSION_SYNTHESIS.md`.',
    ''
  );

  const content =
    lines.join(
      '\n'
    );

  const existing =
    workspace.getFilesByName(
      CAREER_OS_CONFIG
        .SESSION_MANIFEST_FILE
    );

  let manifest;

  if (existing.hasNext()) {
    manifest =
      existing.next();

    let currentContent = '';

    try {
      currentContent =
        manifest
          .getBlob()
          .getDataAsString();
    } catch (error) {
      // If reading fails, fall back to writing the deterministic manifest.
    }

    if (
      normalizeManifestForComparison_(
        currentContent
      ) !==
      normalizeManifestForComparison_(
        content
      )
    ) {
      manifest.setContent(
        content
      );

      console.log(
        'SESSION_MANIFEST_UPDATED: ' +
        sessionFolder.getName()
      );
    } else {
      console.log(
        'SESSION_MANIFEST_UNCHANGED: ' +
        sessionFolder.getName()
      );
    }

  } else {
    manifest =
      workspace.createFile(
        CAREER_OS_CONFIG
          .SESSION_MANIFEST_FILE,
        content,
        MimeType.PLAIN_TEXT
      );
  }

  markAsCareerOsGenerated_(
    manifest.getId(),
    sessionFolder.getId(),
    sessionFolder.getId()
  );
}

function manifestTypeFromMime_(
  mime,
  name
) {
  const lower =
    String(
      mime || ''
    )
      .toLowerCase();

  if (
    lower.startsWith('audio/')
  ) {
    return 'audio';
  }

  if (
    lower.startsWith('image/')
  ) {
    return 'image';
  }

  if (
    lower ===
    'application/pdf'
  ) {
    return 'pdf';
  }

  if (
    lower.startsWith('video/')
  ) {
    return 'video';
  }

  if (
    /\.txt$/i.test(
      name || ''
    )
  ) {
    return 'text';
  }

  return 'other';
}

function escapeMarkdownCell_(
  value
) {
  return String(
    value === undefined ||
    value === null
      ? ''
      : value
  )
    .replace(
      /\|/g,
      '\\|'
    )
    .replace(
      /[\r\n]+/g,
      ' '
    );
}
