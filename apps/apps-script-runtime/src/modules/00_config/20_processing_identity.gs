// Bump only the affected processor or material prompt/output profile.
const CAREER_OS_PROCESSORS = {
  image: {processorName: 'image_visual_analysis', processorVersion: '1', processingProfileVersion: '1'},
  pdf: {processorName: 'pdf_text_extraction', processorVersion: '1', processingProfileVersion: '1'},
  audio: {processorName: 'audio_transcribe', processorVersion: '1', processingProfileVersion: '1'}
};

function careerOsProcessingIdentity_(sourceId, fingerprint, kind) {
  const descriptor = CAREER_OS_PROCESSORS[kind];
  if (!descriptor || !sourceId || !fingerprint) throw new Error('Missing processing identity input.');
  return processingIdentity(Object.assign({sourceVersionKey: JSON.stringify([String(sourceId), String(fingerprint)])}, descriptor));
}

function careerOsProcessorKind_(mimeType) {
  const mime = String(mimeType || '');
  if (/^image\//.test(mime)) return 'image';
  if (/^audio\//.test(mime)) return 'audio';
  if (mime === 'application/pdf') return 'pdf';
  return '';
}

function careerOsStoredProcessingIdentity_(props) {
  if (!props || !props.careerOsSourceId || !props.careerOsSourceFingerprint) return null;
  return {
    sourceVersionKey: JSON.stringify([String(props.careerOsSourceId), String(props.careerOsSourceFingerprint)]),
    processorName: props.careerOsProcessorName,
    processorVersion: props.careerOsProcessorVersion,
    processingProfileVersion: props.careerOsProcessingProfileVersion
  };
}

function careerOsProcessingProperties_(identity) {
  const value = processingIdentity(identity);
  return {careerOsProcessorName: value.processorName,
    careerOsProcessorVersion: value.processorVersion,
    careerOsProcessingProfileVersion: value.processingProfileVersion};
}

function careerOsProcessingHeader_(identity) {
  const value = processingIdentity(identity);
  return ['source_version_key: ' + value.sourceVersionKey,
    'processor_name: ' + value.processorName,
    'processor_version: ' + value.processorVersion,
    'processing_profile_version: ' + value.processingProfileVersion].join('\n');
}

function careerOsReadProcessingHeader_(text) {
  const head = String(text || '').split('=== END CAREER OS ARTIFACT METADATA ===')[0];
  function field(name) {
    const match = head.match(new RegExp('^' + name + ': (.+)$', 'm'));
    return match ? match[1].trim() : '';
  }
  try { return processingIdentity({sourceVersionKey: field('source_version_key'),
    processorName: field('processor_name'), processorVersion: field('processor_version'),
    processingProfileVersion: field('processing_profile_version')}); }
  catch (_error) { return null; }
}

function careerOsRefreshProcessingJob_(job, kind) {
  const desired = careerOsProcessingIdentity_(job.fileId, job.sourceFingerprint, kind);
  if (sameProcessingIdentity(job.processingIdentity, desired)) return false;
  if (kind === 'audio') {
    deleteGeminiUploadedFile_(job.geminiFileName);
    cleanupGroqChunkPartial_(job);
    job.status = careerOsGetAudioTranscriptionProvider_() === 'groq' ? 'READY_TO_TRANSCRIBE' : 'QUEUED';
    job.uploadUrl = ''; job.offset = 0; job.fileUri = ''; job.geminiFileName = '';
    job.groqChunkStartSample = 0; job.groqChunkIndex = 0; job.groqPartialFileId = '';
    delete job.groqLastChunkMetrics;
  }
  job.processingIdentity = desired;
  job.jobKey = processingIdentityKey(desired);
  job.attempts = 0; job.nextAttemptAt = 0; job.lastError = '';
  return true;
}
