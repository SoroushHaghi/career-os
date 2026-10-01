import { processingIdentity, processingIdentityKey, sameProcessingIdentity } from '../../core/src/processing-identity.mjs';

export const ProcessorKinds = Object.freeze({
  IMAGE_EXTRACT: 'image_extract',
  AUDIO_TRANSCRIBE: 'audio_transcribe',
  DOCUMENT_EXTRACT: 'document_extract',
  TEXT_NORMALIZE: 'text_normalize',
  VIDEO_TRANSCRIBE: 'video_transcribe',
  VIDEO_VISUAL: 'video_visual',
});

export function classifySourceType({ mimeType = '', name = '' }) {
  const mime = String(mimeType).toLowerCase();
  const lower = String(name).toLowerCase();
  if (mime.startsWith('image/') || /\.(png|jpe?g|webp|heic|heif)$/i.test(lower)) return 'image';
  if (mime.startsWith('audio/') || /\.(m4a|mp3|wav|aac|flac|ogg)$/i.test(lower)) return 'audio';
  if (mime.startsWith('video/') || /\.(mp4|mov|mkv|webm)$/i.test(lower)) return 'video';
  if (mime === 'application/pdf' || /\.pdf$/i.test(lower)) return 'pdf';
  if (/presentation/.test(mime) || /\.(pptx?|odp)$/i.test(lower)) return 'presentation';
  if (mime.startsWith('text/') || /\.(txt|md|csv|json|ya?ml|js|ts|py|java|cpp|c|h)$/i.test(lower)) return 'text';
  if (/document|wordprocessingml/.test(mime) || /\.(docx?|odt)$/i.test(lower)) return 'document';
  return 'binary';
}

export function processingIdempotencyKey({
  sourceVersionKey,
  processorName,
  processorVersion,
  processingProfileVersion,
}) {
  return processingIdentityKey({sourceVersionKey, processorName, processorVersion, processingProfileVersion});
}

function currentArtifact(existingArtifacts, artifactType, identity) {
  return existingArtifacts.find((a) =>
    a?.artifactType === artifactType &&
    sameProcessingIdentity(a?.processingIdentity || a, identity) &&
    a?.state !== 'INVALID' &&
    a?.state !== 'STALE'
  );
}

export function planProcessing({
  source,
  sourceVersion,
  authorization,
  existingArtifacts = [],
  processorVersions = {},
  processingProfileVersions = {},
}) {
  if (authorization?.authorizationState !== 'AUTHORIZED') {
    return { blocked: true, reason: 'processing_not_authorized', jobs: [] };
  }

  const sourceType = source?.sourceType ?? classifySourceType(source ?? {});
  const sourceVersionKey = sourceVersion?.sourceVersionKey;
  if (!sourceVersionKey) throw new TypeError('sourceVersion.sourceVersionKey is required');

  const versions = {
    image: processorVersions.image ?? '1',
    audio: processorVersions.audio ?? '1',
    document: processorVersions.document ?? '1',
    text: processorVersions.text ?? '1',
    videoTranscript: processorVersions.videoTranscript ?? '1',
    videoVisual: processorVersions.videoVisual ?? '1',
  };

  const jobs = [];
  const pushIfNeeded = (processorName, processorVersion, artifactType) => {
    const identity = processingIdentity({sourceVersionKey, processorName, processorVersion,
      processingProfileVersion: processingProfileVersions[processorName] ?? '1'});
    const existing = currentArtifact(existingArtifacts, artifactType, identity);
    jobs.push({
      ...identity,
      processingIdentity: identity,
      jobKey: processingIdentityKey(identity),
      processorName,
      processorVersion,
      artifactType,
      outcome: existing ? 'SKIPPED_CURRENT' : 'PLANNED',
      existingArtifactId: existing?.artifactId ?? null,
    });
  };

  if (sourceType === 'image') pushIfNeeded(ProcessorKinds.IMAGE_EXTRACT, versions.image, 'SOURCE_TEXT');
  else if (sourceType === 'audio') pushIfNeeded(ProcessorKinds.AUDIO_TRANSCRIBE, versions.audio, 'TRANSCRIPT');
  else if (sourceType === 'pdf' || sourceType === 'presentation' || sourceType === 'document') {
    pushIfNeeded(ProcessorKinds.DOCUMENT_EXTRACT, versions.document, 'SOURCE_TEXT');
  } else if (sourceType === 'text') pushIfNeeded(ProcessorKinds.TEXT_NORMALIZE, versions.text, 'SOURCE_TEXT');
  else if (sourceType === 'video') {
    pushIfNeeded(ProcessorKinds.VIDEO_TRANSCRIBE, versions.videoTranscript, 'TRANSCRIPT');
    pushIfNeeded(ProcessorKinds.VIDEO_VISUAL, versions.videoVisual, 'TIMELINE');
  }

  return { blocked: false, sourceType, jobs };
}
