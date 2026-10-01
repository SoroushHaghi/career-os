// Session status/backfill compatibility projection.

function cleanupInvalidSessionArtifacts_(
  workspace,
  sessionFolder
) {
  if (
    !workspace ||
    !sessionFolder ||
    isValidSessionFolder_(sessionFolder)
  ) {
    return 0;
  }

  let cleaned = 0;
  const files =
    workspace.getFiles();

  while (files.hasNext()) {
    const file =
      files.next();

    const name =
      file.getName();

    if (
      name !==
        CAREER_OS_CONFIG
          .SESSION_MANIFEST_FILE &&
      !name.startsWith(
        CAREER_OS_CONFIG
          .SESSION_STATUS_FILE_PREFIX
      )
    ) {
      continue;
    }

    try {
      const metadata =
        Drive.Files.get(
          file.getId(),
          {
            fields: 'id,appProperties'
          }
        );

      const props =
        metadata.appProperties || {};

      if (
        props.careerOsGenerated === 'true' &&
        props.careerOsSessionFolderId ===
          String(sessionFolder.getId())
      ) {
        file.setTrashed(true);
        cleaned += 1;

        console.log(
          'INVALID_SESSION_ARTIFACT_TRASHED: ' +
          name +
          ' | container=' +
          sessionFolder.getName()
        );
      }
    } catch (error) {
      console.log(
        'INVALID_SESSION_ARTIFACT_CLEANUP_WARNING: ' +
        String(error)
      );
    }
  }

  return cleaned;
}

function backfillSessionStatusMarkersOnce_() {
  const props =
    PropertiesService
      .getScriptProperties();

  const versionKey =
    CAREER_OS_CONFIG
      .SESSION_STATUS_BACKFILL_VERSION_PROPERTY;

  const targetVersion =
    CAREER_OS_CONFIG
      .SESSION_STATUS_BACKFILL_VERSION;

  if (
    props.getProperty(versionKey) ===
    targetVersion
  ) {
    return;
  }

  const manifests =
    DriveApp.getFilesByName(
      CAREER_OS_CONFIG
        .SESSION_MANIFEST_FILE
    );

  const maxPerRun =
    Math.max(
      1,
      Number(
        CAREER_OS_CONFIG
          .SESSION_STATUS_BACKFILL_MAX_PER_RUN ||
        25
      )
    );

  let inspected = 0;
  let refreshed = 0;
  let skipped = 0;
  let cleaned = 0;
  let hasMore = false;

  while (manifests.hasNext()) {
    const manifest =
      manifests.next();

    if (inspected >= maxPerRun) {
      hasMore = true;
      break;
    }

    inspected += 1;

    try {
      const parents =
        manifest.getParents();

      if (!parents.hasNext()) {
        skipped += 1;
        continue;
      }

      const workspace =
        parents.next();

      if (
        workspace.getName() !==
        CAREER_OS_CONFIG
          .SESSION_WORKSPACE_FOLDER
      ) {
        skipped += 1;
        continue;
      }

      const sessionParents =
        workspace.getParents();

      if (!sessionParents.hasNext()) {
        skipped += 1;
        continue;
      }

      const sessionFolder =
        sessionParents.next();

      if (!isValidSessionFolder_(sessionFolder)) {
        cleaned +=
          cleanupInvalidSessionArtifacts_(
            workspace,
            sessionFolder
          );

        skipped += 1;
        continue;
      }

      // updateSessionManifest_ also computes ingestion state and creates or
      // renames SESSION_STATUS__*.txt. It does not call Gemini.
      updateSessionManifest_(
        sessionFolder
      );

      refreshed += 1;
    } catch (error) {
      skipped += 1;

      console.log(
        'SESSION_STATUS_BACKFILL_WARNING: ' +
        String(error)
      );
    }
  }

  if (!hasMore) {
    props.setProperty(
      versionKey,
      targetVersion
    );
  }

  console.log(
    'SESSION_STATUS_BACKFILL: ' +
    'refreshed=' + refreshed +
    ' | skipped=' + skipped +
    ' | cleaned=' + cleaned +
    ' | complete=' + String(!hasMore)
  );
}

function buildSessionIngestionStatus_(
  sourceRows,
  textRows
) {
  const sources =
    Array.isArray(sourceRows)
      ? sourceRows
      : [];

  const texts =
    Array.isArray(textRows)
      ? textRows
      : [];

  const result = {
    status: 'PROCESSING',
    sourceCount: sources.length,
    imageTotal: 0,
    imageComplete: 0,
    audioTotal: 0,
    audioComplete: 0,
    pdfTotal: 0,
    pdfComplete: 0,
    pendingCount: 0,
    errorCount: 0,
    deferredCount: 0
  };

  const textIdSet = {};
  const generatedArtifactSet = {};

  texts.forEach(
    row => {
      textIdSet[String(row.id || '')] = true;

      if (
        row.generated === 'yes' &&
        row.sourceId
      ) {
        generatedArtifactSet[
          String(row.sourceId) +
          '|' +
          String(row.sourceFingerprint || '')
        ] = true;
      }
    }
  );

  sources.forEach(
    row => {
      const type =
        String(row.type || '');

      const mime =
        String(row.mime || '')
          .toLowerCase();

      const status =
        String(
          row.processingStatus || ''
        );

      if (type === 'image') {
        result.imageTotal += 1;

        const key =
          String(row.id || '') +
          '|' +
          String(row.fingerprint || '');

        if (generatedArtifactSet[key]) {
          result.imageComplete += 1;
        } else if (
          /ERROR|NEEDS_ATTENTION/i.test(
            status
          )
        ) {
          result.errorCount += 1;
        } else {
          result.pendingCount += 1;
        }

        return;
      }

      if (type === 'audio') {
        result.audioTotal += 1;

        const transcriptReady =
          Boolean(
            row.transcriptFileId &&
            textIdSet[
              String(row.transcriptFileId)
            ]
          );

        if (transcriptReady) {
          result.audioComplete += 1;
        } else if (
          /ERROR|NEEDS_ATTENTION/i.test(
            status
          )
        ) {
          result.errorCount += 1;
        } else {
          result.pendingCount += 1;
        }

        return;
      }

      if (type === 'pdf') {
        result.pdfTotal += 1;

        const key =
          String(row.id || '') +
          '|' +
          String(row.fingerprint || '');

        if (generatedArtifactSet[key]) {
          result.pdfComplete += 1;
        } else if (
          /ERROR|NEEDS_ATTENTION/i.test(
            status
          )
        ) {
          result.errorCount += 1;
        } else {
          result.pendingCount += 1;
        }

        return;
      }

      if (
        type === 'video' ||
        mime ===
          'application/vnd.google-apps.document' ||
        mime ===
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      ) {
        result.deferredCount += 1;
      }
    }
  );

  if (sources.length === 0) {
    result.status = 'EMPTY';
  } else if (result.errorCount > 0) {
    result.status = 'NEEDS_ATTENTION';
  } else if (result.deferredCount > 0) {
    result.status = 'DEFERRED';
  } else if (result.pendingCount > 0) {
    result.status = 'PROCESSING';
  } else {
    result.status = 'COMPLETE';
  }

  return result;
}

function syncSessionStatusMarker_(
  workspace,
  sessionFolder,
  ingestionStatus
) {
  if (
    !workspace ||
    !sessionFolder ||
    !ingestionStatus
  ) {
    return;
  }

  const prefix =
    CAREER_OS_CONFIG
      .SESSION_STATUS_FILE_PREFIX;

  const desiredName =
    prefix +
    String(ingestionStatus.status) +
    '.txt';

  const statusContent = [
    'Career OS Session Ingestion Status',
    '',
    'schema_version: ' +
      CAREER_OS_CONFIG
        .SESSION_STATUS_SCHEMA_VERSION,
    'status: ' +
      String(ingestionStatus.status),
    'session_folder_drive_id: ' +
      sessionFolder.getId(),
    'updated_utc: ' +
      new Date().toISOString(),
    'free_only_mode: ' +
      String(
        CAREER_OS_CONFIG
          .FREE_ONLY_MODE
      ),
    'image_ocr_complete: ' +
      String(ingestionStatus.imageComplete) +
      '/' +
      String(ingestionStatus.imageTotal),
    'audio_transcript_complete: ' +
      String(ingestionStatus.audioComplete) +
      '/' +
      String(ingestionStatus.audioTotal),
    'pdf_text_complete: ' +
      String(ingestionStatus.pdfComplete) +
      '/' +
      String(ingestionStatus.pdfTotal),
    'pending_sources: ' +
      String(ingestionStatus.pendingCount),
    'error_sources: ' +
      String(ingestionStatus.errorCount),
    'deferred_sources: ' +
      String(ingestionStatus.deferredCount),
    'image_model_primary: ' +
      CAREER_OS_CONFIG
        .GEMINI_IMAGE_MODEL_PRIMARY,
    'image_model_fallback: ' +
      CAREER_OS_CONFIG
        .GEMINI_IMAGE_MODEL_FALLBACK,
    'image_thinking_level: ' +
      CAREER_OS_CONFIG
        .GEMINI_IMAGE_THINKING_LEVEL,
    'image_media_resolution: ' +
      CAREER_OS_CONFIG
        .GEMINI_IMAGE_MEDIA_RESOLUTION,
    'pdf_thinking_level: ' +
      CAREER_OS_CONFIG
        .GEMINI_PDF_THINKING_LEVEL,
    'pdf_media_resolution: API_default_medium_class',
    'audio_transcribe_model: ' +
      CAREER_OS_CONFIG
        .GEMINI_AUDIO_TRANSCRIBE_MODEL,
    'audio_navigation_model: ' +
      CAREER_OS_CONFIG
        .GEMINI_AUDIO_NAVIGATION_MODEL,
    'audio_fallback_model: ' +
      CAREER_OS_CONFIG
        .GEMINI_AUDIO_FALLBACK_MODEL,
    '',
    'COMPLETE means mechanical ingestion is complete. ' +
      'AI synthesis may still be pending.',
    ''
  ].join('\n');

  const files =
    workspace.getFiles();

  let marker = null;
  const extras = [];

  while (files.hasNext()) {
    const candidate =
      files.next();

    if (
      !candidate
        .getName()
        .startsWith(prefix)
    ) {
      continue;
    }

    if (!marker) {
      marker = candidate;
    } else {
      extras.push(candidate);
    }
  }

  extras.forEach(
    file => {
      try {
        file.setTrashed(true);
      } catch (error) {
        console.log(
          'SESSION_STATUS_DUPLICATE_CLEANUP_WARNING: ' +
          String(error)
        );
      }
    }
  );

  if (!marker) {
    marker =
      workspace.createFile(
        desiredName,
        statusContent,
        MimeType.PLAIN_TEXT
      );

    console.log(
      'SESSION_STATUS_CREATED: ' +
      desiredName
    );
  } else {
    if (
      marker.getName() !==
      desiredName
    ) {
      marker.setName(
        desiredName
      );

      console.log(
        'SESSION_STATUS_RENAMED: ' +
        desiredName
      );
    }

    let currentContent = '';

    try {
      currentContent =
        marker
          .getBlob()
          .getDataAsString();
    } catch (error) {
      // Fall through and refresh the status file.
    }

    const normalizedCurrent =
      String(currentContent || '')
        .replace(
          /^updated_utc: .*$/m,
          'updated_utc: <normalized>'
        )
        .trim();

    const normalizedNext =
      String(statusContent || '')
        .replace(
          /^updated_utc: .*$/m,
          'updated_utc: <normalized>'
        )
        .trim();

    if (
      normalizedCurrent !==
      normalizedNext
    ) {
      marker.setContent(
        statusContent
      );
    }
  }

  markAsCareerOsGenerated_(
    marker.getId(),
    sessionFolder.getId(),
    sessionFolder.getId()
  );
}
