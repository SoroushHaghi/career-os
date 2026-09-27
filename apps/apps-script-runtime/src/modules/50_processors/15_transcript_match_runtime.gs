// Transcript matching/reuse compatibility processor.

function findConfirmedTranscriptForAudio_(
  sourceFile,
  workspaceFolder,
  sourceFingerprint
) {
  if (!workspaceFolder) {
    return null;
  }

  const sourceId =
    sourceFile.getId();

  const currentSourceFingerprint =
    String(
      sourceFingerprint ||
      getSourceFingerprintById_(
        sourceId
      )
    );

  const sourceBase =
    normalizeEvidenceBasename_(
      sourceFile.getName()
    );

  const audioMetadata =
    getDriveFileMetadataSafe_(
      sourceId
    );

  const audioProps =
    audioMetadata.appProperties || {};

  const previousLinkedTranscriptId =
    String(
      audioProps.careerOsTranscriptFileId ||
      ''
    );

  const previousAudioFingerprint =
    String(
      audioProps.careerOsTranscriptSourceFingerprint ||
      ''
    );

  const previousTranscriptFingerprint =
    String(
      audioProps.careerOsTranscriptEvidenceFingerprint ||
      ''
    );

  const files =
    workspaceFolder.getFiles();

  while (files.hasNext()) {
    const candidate =
      files.next();

    const name =
      candidate.getName();

    if (
      !/\.txt$/i.test(name)
    ) {
      continue;
    }

    const metadata =
      getDriveFileMetadataSafe_(
        candidate.getId()
      );

    const props =
      metadata.appProperties || {};

    const candidateFingerprint =
      buildSourceFingerprintFromMetadata_(
        metadata
      );

    // Strongest signal: Career OS-generated transcript explicitly points to
    // this audio AND to the same content fingerprint.
    if (
      props.careerOsSourceId ===
        String(sourceId) &&
      props.careerOsSourceFingerprint &&
      props.careerOsSourceFingerprint ===
        currentSourceFingerprint
    ) {
      return candidate;
    }

    // Portable artifacts may preserve the exact source/fingerprint in text.
    try {
      const head =
        candidate
          .getBlob()
          .getDataAsString()
          .substring(0, 8000);

      if (
        head.indexOf(
          'source_drive_id: ' +
          String(sourceId)
        ) >= 0 &&
        head.indexOf(
          'source_content_fingerprint: ' +
          currentSourceFingerprint
        ) >= 0
      ) {
        return candidate;
      }
    } catch (error) {
      // Continue with conservative external-transcript matching.
    }

    // Obvious notes/summaries must never satisfy an audio transcript.
    const lower =
      name.toLowerCase();

    if (
      /\b(summary|notes?|outline|flashcards?)\b/i.test(
        lower
      )
    ) {
      continue;
    }

    const candidateBase =
      normalizeEvidenceBasename_(
        name
      );

    if (
      !candidateBase ||
      candidateBase !==
        sourceBase ||
      !looksLikeTranscriptText_(
        candidate
      )
    ) {
      continue;
    }

    // If this exact external transcript was previously linked to an older
    // CONTENT version of the audio and the transcript itself has not changed,
    // it is stale and must not suppress re-transcription.
    if (
      candidate.getId() ===
        previousLinkedTranscriptId &&
      previousAudioFingerprint &&
      currentSourceFingerprint &&
      previousAudioFingerprint !==
        currentSourceFingerprint &&
      previousTranscriptFingerprint &&
      candidateFingerprint ===
        previousTranscriptFingerprint
    ) {
      console.log(
        'EXTERNAL_TRANSCRIPT_STALE_FOR_NEW_AUDIO_CONTENT: ' +
        candidate.getName()
      );

      continue;
    }

    return candidate;
  }

  return null;
}

function normalizeEvidenceBasename_(
  filename
) {
  let base =
    String(
      filename || ''
    )
      .replace(
        /\.[^.]+$/,
        ''
      )
      .toLowerCase()
      .replace(
        /(?:[\s._-]+)(?:career[\s._-]*os)$/i,
        ''
      )
      .replace(
        /(?:[\s._-]+)(?:transcript|transcription)$/i,
        ''
      )
      .replace(
        /[\s._-]+/g,
        ' '
      )
      .trim();

  return base;
}

function looksLikeTranscriptText_(
  file
) {
  try {
    const text =
      file.getBlob()
        .getDataAsString();

    if (
      text.length < 500
    ) {
      return false;
    }

    if (
      /\[\d{2}:\d{2}(?::\d{2})?\]/
        .test(text)
    ) {
      return true;
    }

    if (
      /\b(lecturer|speaker\s*\d*|student|professor|teacher)\s*:/i
        .test(text)
    ) {
      return true;
    }

    // For same-basename external files (e.g. NotebookLM transcript), a
    // substantial prose body is enough unless the filename says notes/summary.
    return (
      text.length >=
      2000
    );

  } catch (error) {
    console.log(
      'TRANSCRIPT_SHAPE_CHECK_WARNING: ' +
      String(error)
    );

    return false;
  }
}

function visibleMetadataReferencesSource_(
  file,
  sourceId
) {
  try {
    const text =
      file.getBlob()
        .getDataAsString();

    const head =
      text.substring(
        0,
        8000
      );

    return (
      head.indexOf(
        'source_drive_id: ' +
        String(sourceId)
      ) >= 0
    );

  } catch (error) {
    return false;
  }
}

function markAudioSatisfiedByTranscript_(
  audioFile,
  transcriptFile,
  sourceFingerprint
) {
  try {
    const context =
      resolveSessionContext_(
        audioFile,
        false
      );

    const audioFingerprint =
      String(
        sourceFingerprint ||
        getSourceFingerprintById_(
          audioFile.getId()
        )
      );

    const transcriptFingerprint =
      getSourceFingerprintById_(
        transcriptFile.getId()
      );

    const audioMetadata =
      getDriveFileMetadataSafe_(
        audioFile.getId()
      );

    updateAppPropertiesIfChanged_(
      audioFile.getId(),
      {
        careerOsTranscriptStatus:
          'confirmed_existing_text',

        careerOsTranscriptFileId:
          transcriptFile.getId(),

        careerOsTranscriptSourceFingerprint:
          audioFingerprint,

        careerOsTranscriptEvidenceFingerprint:
          transcriptFingerprint,

        careerOsSessionFolderId:
          context
            ? context.sessionFolderId
            : ''
      },
      'AUDIO_TRANSCRIPT_LINK_WARNING'
    );

    markAudioSourceProcessingStatus_(
      audioFile.getId(),
      'DONE',
      audioFingerprint,
      audioMetadata.modifiedTime || '',
      ''
    );

  } catch (error) {
    console.log(
      'AUDIO_TRANSCRIPT_LINK_WARNING: ' +
      String(error)
    );
  }
}
