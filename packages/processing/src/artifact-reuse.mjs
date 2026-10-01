import { sameProcessingIdentity } from '../../core/src/processing-identity.mjs';

export function generatedArtifactReuseDecision({sourceId, expectedIdentity, candidate}) {
  if (!candidate) return {reusable: false, reason: 'missing_candidate'};
  const props = candidate.appProperties ?? {};
  if (props.careerOsGenerated !== 'true') return {reusable: false, reason: 'not_career_os_generated'};
  if (String(props.careerOsSourceId ?? '') !== String(sourceId)) return {reusable: false, reason: 'different_source'};
  const stored = {
    sourceVersionKey: JSON.stringify([String(sourceId), String(props.careerOsSourceFingerprint || '')]),
    processorName: props.careerOsProcessorName,
    processorVersion: props.careerOsProcessorVersion,
    processingProfileVersion: props.careerOsProcessingProfileVersion
  };
  const reusable = sameProcessingIdentity(stored, expectedIdentity);
  return {reusable, reason: reusable ? 'processing_identity' : 'processing_identity_mismatch', upgradeFingerprint: false};
}
