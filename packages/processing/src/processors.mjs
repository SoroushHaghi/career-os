import { deterministicId, evidenceId } from '../../core/src/identities.mjs';
import { assertProviderAdapter } from './provider-contracts.mjs';

function artifactDraft({
  sourceVersionKey,
  artifactType,
  contentType,
  processorName,
  processorVersion,
  processingProfileVersion,
  content,
  metadata = {},
}) {
  return {
    artifactId: deterministicId(
      'artifact-draft',
      sourceVersionKey,
      artifactType,
      processorName,
      processorVersion,
      processingProfileVersion
    ),
    artifactType,
    sourceVersionKey,
    contentType,
    processorName,
    processorVersion,
    processingProfileVersion,
    content,
    metadata,
  };
}

export function processTextDeterministically({
  sourceVersionKey,
  text,
  contextIds = [],
  processorVersion = '1',
  processingProfileVersion = '1',
}) {
  const normalized = String(text ?? '').replace(/\r\n/g, '\n').normalize('NFC');
  const artifact = artifactDraft({
    sourceVersionKey,
    artifactType: 'SOURCE_TEXT',
    contentType: 'text/plain',
    processorName: 'text_normalize',
    processorVersion,
    processingProfileVersion,
    content: normalized,
  });

  const evidence = {
    evidenceId: evidenceId({
      sourceVersionKey,
      processorVersion: `${processorVersion}:${processingProfileVersion}`,
      anchor: { kind: 'document', start: 0, end: normalized.length },
    }),
    sourceVersionKey,
    artifactId: artifact.artifactId,
    modality: 'text',
    anchor: { kind: 'document', start: 0, end: normalized.length },
    content: normalized,
    extractionMethod: 'deterministic_text_normalization',
    processorVersion,
    qualityFlags: [],
    contextIds,
  };

  return { status: 'SUCCEEDED', artifacts: [artifact], evidenceUnits: [evidence], warnings: [] };
}

export async function processImageWithProvider({
  sourceVersionKey,
  contentAccess,
  contextIds = [],
  provider,
  processorVersion = '1',
  processingProfileVersion = '1',
}) {
  assertProviderAdapter(provider, 'vision_extract');
  const result = await provider.vision_extract({
    contentAccess,
    mode: 'source_faithful',
  });

  const content = String(result?.text ?? '');
  if (!content.trim()) throw new Error('image extraction returned empty text');

  const artifact = artifactDraft({
    sourceVersionKey,
    artifactType: 'SOURCE_TEXT',
    contentType: 'text/plain',
    processorName: 'image_extract',
    processorVersion,
    processingProfileVersion,
    content,
    metadata: { provider: result.provider ?? null, model: result.model ?? null },
  });

  const evidence = {
    evidenceId: evidenceId({
      sourceVersionKey,
      processorVersion: `${processorVersion}:${processingProfileVersion}`,
      anchor: { kind: 'image', region: 'full' },
    }),
    sourceVersionKey,
    artifactId: artifact.artifactId,
    modality: 'image',
    anchor: { kind: 'image', region: 'full' },
    content,
    extractionMethod: 'vision_extract',
    processorVersion,
    qualityFlags: result.qualityFlags ?? [],
    contextIds,
  };

  return { status: 'SUCCEEDED', artifacts: [artifact], evidenceUnits: [evidence], warnings: result.warnings ?? [] };
}

export async function processAudioWithProvider({
  sourceVersionKey,
  contentAccess,
  contextIds = [],
  provider,
  processorVersion = '1',
  processingProfileVersion = '1',
}) {
  assertProviderAdapter(provider, 'transcribe');
  const result = await provider.transcribe({
    contentAccess,
    mode: 'verbatim',
  });

  const transcript = String(result?.text ?? '');
  if (!transcript.trim()) throw new Error('transcription returned empty text');

  const artifact = artifactDraft({
    sourceVersionKey,
    artifactType: 'TRANSCRIPT',
    contentType: 'text/plain',
    processorName: 'audio_transcribe',
    processorVersion,
    processingProfileVersion,
    content: transcript,
    metadata: { provider: result.provider ?? null, model: result.model ?? null },
  });

  const evidenceUnits = (result.segments?.length ? result.segments : [{ startMs: 0, endMs: null, text: transcript }])
    .map((segment) => ({
      evidenceId: evidenceId({
        sourceVersionKey,
        processorVersion: `${processorVersion}:${processingProfileVersion}`,
        anchor: { kind: 'audio', startMs: segment.startMs ?? 0, endMs: segment.endMs ?? null },
      }),
      sourceVersionKey,
      artifactId: artifact.artifactId,
      modality: 'audio',
      anchor: { kind: 'audio', startMs: segment.startMs ?? 0, endMs: segment.endMs ?? null },
      content: String(segment.text ?? ''),
      extractionMethod: 'transcription',
      processorVersion,
      qualityFlags: segment.qualityFlags ?? [],
      contextIds,
    }));

  return { status: 'SUCCEEDED', artifacts: [artifact], evidenceUnits, warnings: result.warnings ?? [] };
}
