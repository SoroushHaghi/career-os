import { resolveContext } from './context-resolver.mjs';
import { planProcessing } from '../../processing/src/planner.mjs';

export function prepareIngestion({
  source,
  sourceVersion,
  contextHints = [],
  authorization,
  existingArtifacts = [],
  processorVersions = {},
}) {
  if (!source?.sourceKey) throw new TypeError('source.sourceKey is required');
  if (!sourceVersion?.sourceVersionKey) throw new TypeError('sourceVersion.sourceVersionKey is required');
  if (!authorization?.authorizationState) throw new TypeError('authorization.authorizationState is required');

  const context = resolveContext({
    authorizationState: authorization.authorizationState,
    hints: contextHints,
  });

  if (context.status === 'BLOCKED_POLICY') {
    return {
      sourceState: 'BLOCKED_POLICY',
      context,
      processing: { blocked: true, reason: 'processing_not_authorized', jobs: [] },
    };
  }

  const processing = planProcessing({
    source,
    sourceVersion,
    authorization,
    existingArtifacts,
    processorVersions,
  });

  return {
    sourceState: 'REGISTERED',
    context,
    processing,
  };
}
