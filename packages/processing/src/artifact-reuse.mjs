export function generatedArtifactReuseDecision({
  sourceId,
  sourceFingerprint,
  sourceModifiedTime = '',
  candidate,
}) {
  if (!candidate) return { reusable: false, reason: 'missing_candidate' };

  const props = candidate.appProperties ?? {};
  if (props.careerOsGenerated !== 'true') {
    return { reusable: false, reason: 'not_career_os_generated' };
  }
  if (String(props.careerOsSourceId ?? '') !== String(sourceId)) {
    return { reusable: false, reason: 'different_source' };
  }

  if (
    sourceFingerprint &&
    String(props.careerOsSourceFingerprint ?? '') === String(sourceFingerprint)
  ) {
    return { reusable: true, reason: 'content_fingerprint', upgradeFingerprint: false };
  }

  if (
    sourceModifiedTime &&
    String(props.careerOsSourceModifiedTime ?? '') === String(sourceModifiedTime)
  ) {
    return {
      reusable: true,
      reason: 'legacy_modified_time',
      upgradeFingerprint: Boolean(sourceFingerprint),
    };
  }

  const head = String(candidate.textHead ?? '');
  const sourceMatches = head.includes('source_drive_id: ' + String(sourceId));
  const fingerprintMatches =
    Boolean(sourceFingerprint) &&
    head.includes('source_content_fingerprint: ' + String(sourceFingerprint));
  const modifiedMatches =
    Boolean(sourceModifiedTime) &&
    head.includes('source_modified_utc: ' + String(sourceModifiedTime));

  if (sourceMatches && (fingerprintMatches || modifiedMatches)) {
    return {
      reusable: true,
      reason: fingerprintMatches ? 'portable_header_fingerprint' : 'portable_header_modified_time',
      upgradeFingerprint: Boolean(sourceFingerprint && !fingerprintMatches),
    };
  }

  return { reusable: false, reason: 'source_version_mismatch' };
}
