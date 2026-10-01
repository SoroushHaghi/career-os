// Extracted queue migration/version compatibility functions.

function chooseBetterMigratedQueueJob_(
  current,
  candidate,
  queueType
) {
  if (!current) {
    return candidate;
  }

  if (queueType === 'audio') {
    const rank = {
      QUEUED: 1,
      UPLOADING: 2,
      READY_TO_TRANSCRIBE: 3,
      GROQ_CHUNKING: 4,
      GROQ_CHUNKING_FINALIZE: 5
    };

    const currentRank =
      rank[current.status] || 0;

    const candidateRank =
      rank[candidate.status] || 0;

    if (candidateRank > currentRank) {
      return candidate;
    }

    if (
      candidateRank === currentRank &&
      Number(candidate.offset || 0) >
        Number(current.offset || 0)
    ) {
      return candidate;
    }
  }

  if (
    Number(candidate.attempts || 0) >
    Number(current.attempts || 0)
  ) {
    return candidate;
  }

  return current;
}

function migrateQueueFingerprints_(
  queue,
  queueType
) {
  const sourceQueue =
    Array.isArray(queue)
      ? queue
      : [];

  let changed = false;
  const result = [];
  const indexByKey = {};

  sourceQueue.forEach(job => {
    if (!job || !job.fileId) {
      changed = true;
      return;
    }

    const metadata =
      getDriveFileMetadataSafe_(
        job.fileId
      );

    const fingerprint =
      buildSourceFingerprintFromMetadata_(
        metadata
      );

    const hadFingerprint =
      Boolean(job.sourceFingerprint);

    if (!hadFingerprint) {
      // Legacy queue migration: old jobs did not store a content fingerprint.
      // Adopt the current content fingerprint once, then future content changes
      // are handled by refreshQueued*Version_() rather than silently mutating
      // an in-progress upload job.
      job.sourceFingerprint =
        fingerprint;
      changed = true;
    }

    const sameContent =
      String(job.sourceFingerprint || '') ===
      String(fingerprint || '');

    if (sameContent) {
      if (metadata.modifiedTime) {
        job.modifiedTime =
          metadata.modifiedTime;
      }

      if (metadata.name) {
        job.name = metadata.name;
      }

      if (metadata.mimeType) {
        job.mimeType =
          queueType === 'audio'
            ? normalizeAudioMimeType_(
                metadata.mimeType
              )
            : metadata.mimeType;
      }

      if (metadata.size) {
        job.size =
          Number(metadata.size);
      }
    }

    if (careerOsRefreshProcessingJob_(job, queueType)) changed = true;
    const newKey = processingIdentityKey(job.processingIdentity);

    if (job.jobKey !== newKey) {
      job.jobKey = newKey;
      changed = true;
    }

    if (
      Object.prototype.hasOwnProperty.call(
        indexByKey,
        newKey
      )
    ) {
      const index =
        indexByKey[newKey];

      result[index] =
        chooseBetterMigratedQueueJob_(
          result[index],
          job,
          queueType
        );

      changed = true;
      return;
    }

    indexByKey[newKey] =
      result.length;

    result.push(job);
  });

  return {
    queue: result,
    changed: changed
  };
}

function refreshQueuedImageVersion_(
  job
) {
  const metadata =
    getDriveFileMetadataSafe_(
      job.fileId
    );

  const currentFingerprint =
    buildSourceFingerprintFromMetadata_(
      metadata
    );

  if (
    !job.sourceFingerprint ||
    job.sourceFingerprint ===
      currentFingerprint
  ) {
    return careerOsRefreshProcessingJob_(job, 'image');
  }

  job.sourceFingerprint =
    currentFingerprint;

  job.jobKey =
    String(job.fileId) +
    '|' +
    currentFingerprint;

  job.modifiedTime =
    metadata.modifiedTime ||
    job.modifiedTime ||
    '';

  job.name =
    metadata.name ||
    job.name;

  job.mimeType =
    metadata.mimeType ||
    job.mimeType;

  job.size =
    Number(
      metadata.size ||
      job.size ||
      0
    );

  job.attempts = 0;
  job.nextAttemptAt = 0;
  job.lastError = '';

  careerOsRefreshProcessingJob_(job, 'image');

  console.log(
    'IMAGE_JOB_CONTENT_VERSION_REFRESHED: ' +
    job.name +
    ' | ' +
    shortFingerprint_(
      currentFingerprint
    )
  );

  return true;
}

function refreshQueuedAudioVersion_(
  job
) {
  const metadata =
    getDriveFileMetadataSafe_(
      job.fileId
    );

  const currentFingerprint =
    buildSourceFingerprintFromMetadata_(
      metadata
    );

  if (
    !job.sourceFingerprint ||
    job.sourceFingerprint ===
      currentFingerprint
  ) {
    return careerOsRefreshProcessingJob_(job, 'audio');
  }

  // The queued source content changed. Any in-progress provider artifact
  // belongs to the old version and must not be transcribed as current.
  deleteGeminiUploadedFile_(
    job.geminiFileName
  );

  cleanupGroqChunkPartial_(
    job
  );

  job.sourceFingerprint =
    currentFingerprint;

  job.jobKey =
    String(job.fileId) +
    '|' +
    currentFingerprint;

  job.name =
    metadata.name ||
    job.name;

  job.mimeType =
    normalizeAudioMimeType_(
      metadata.mimeType ||
      job.mimeType
    );

  job.size =
    Number(
      metadata.size ||
      job.size ||
      0
    );

  job.modifiedTime =
    metadata.modifiedTime ||
    job.modifiedTime ||
    '';

  job.status = 'QUEUED';
  job.uploadUrl = '';
  job.offset = 0;
  job.fileUri = '';
  job.geminiFileName = '';
  job.groqChunkStartSample = 0;
  job.groqChunkIndex = 0;
  job.groqPartialFileId = '';
  job.attempts = 0;
  job.nextAttemptAt = 0;
  job.lastError = '';

  careerOsRefreshProcessingJob_(job, 'audio');

  console.log(
    'AUDIO_JOB_CONTENT_VERSION_REFRESHED: ' +
    job.name +
    ' | ' +
    shortFingerprint_(
      currentFingerprint
    )
  );

  return true;
}
