// Extracted artifact reuse compatibility functions.

function stripPortableArtifactHeader_(
  text
) {
  const raw =
    String(text || '');

  const endMarker =
    '=== END CAREER OS ARTIFACT METADATA ===';

  const index =
    raw.indexOf(endMarker);

  if (index < 0) {
    return raw.trim();
  }

  return raw
    .substring(
      index + endMarker.length
    )
    .replace(
      /^\s+/,
      ''
    )
    .trim();
}

function findGeneratedTextBySourceFingerprint_(
  workspaceFolder,
  sourceFingerprint,
  excludeSourceId
) {
  // Fingerprint-only cross-source reuse cannot establish processor or context compatibility.
  // Keep this legacy entry point fail-closed; same-source reuse uses the full identity below.
  return null;
}

function hasCurrentGeneratedArtifactForSource_(sourceFile, workspaceFolder, sourceFingerprint, sourceModifiedUtc, expectedIdentity) {
  if (!sourceFile || !workspaceFolder || !sourceFingerprint) return false;
  const kind = careerOsProcessorKind_(sourceFile.getMimeType());
  const desired = expectedIdentity || (kind ? careerOsProcessingIdentity_(sourceFile.getId(), sourceFingerprint, kind) : null);
  if (!desired) return false;
  const files = workspaceFolder.getFiles();
  while (files.hasNext()) {
    const candidate = files.next();
    try {
      const props = getDriveFileMetadataSafe_(candidate.getId()).appProperties || {};
      if (props.careerOsGenerated !== 'true') continue;
      if (sameProcessingIdentity(careerOsStoredProcessingIdentity_(props), desired)) return true;
    } catch (_error) { /* fail closed */ }
  }
  return false;
}
