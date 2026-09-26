export function plainTextSidecarName(sourceName) {
  const name = String(sourceName ?? '');
  const dot = name.lastIndexOf('.');
  const base = dot > 0 ? name.slice(0, dot) : name;
  return `${base}.txt`;
}

export function careerOsSidecarName(sourceName) {
  const name = String(sourceName ?? '');
  const dot = name.lastIndexOf('.');
  const base = dot > 0 ? name.slice(0, dot) : name;
  return `${base}.career-os.txt`;
}

export function uniqueCareerOsSidecarName(sourceName, sourceId) {
  const name = String(sourceName ?? '');
  const dot = name.lastIndexOf('.');
  const base = dot > 0 ? name.slice(0, dot) : name;
  const suffix = String(sourceId ?? '').slice(-8);
  return `${base}.career-os-${suffix}.txt`;
}

export function isOwnedSidecar(candidate, sourceId) {
  const props = candidate?.appProperties ?? {};
  return (
    props.careerOsGenerated === 'true' &&
    String(props.careerOsSourceId ?? '') === String(sourceId ?? '')
  );
}

export function chooseSidecarWritePlan({
  sourceName,
  sourceId,
  preferredCandidates = [],
  fallbackCandidates = [],
}) {
  const preferredName = plainTextSidecarName(sourceName);
  const fallbackName = careerOsSidecarName(sourceName);

  const ownedPreferred = preferredCandidates.find((candidate) => isOwnedSidecar(candidate, sourceId));
  if (ownedPreferred) {
    return {
      action: 'UPDATE_OWNED',
      targetId: ownedPreferred.id ?? null,
      targetName: preferredName,
      reason: 'owned_preferred_sidecar',
    };
  }

  if (preferredCandidates.length === 0) {
    return {
      action: 'CREATE',
      targetId: null,
      targetName: preferredName,
      reason: 'preferred_name_available',
    };
  }

  const ownedFallback = fallbackCandidates.find((candidate) => isOwnedSidecar(candidate, sourceId));
  if (ownedFallback) {
    return {
      action: 'UPDATE_OWNED',
      targetId: ownedFallback.id ?? null,
      targetName: fallbackName,
      reason: 'manual_preferred_preserved_owned_fallback',
    };
  }

  if (fallbackCandidates.length === 0) {
    return {
      action: 'CREATE',
      targetId: null,
      targetName: fallbackName,
      reason: 'manual_preferred_preserved',
    };
  }

  return {
    action: 'CREATE',
    targetId: null,
    targetName: uniqueCareerOsSidecarName(sourceName, sourceId),
    reason: 'all_standard_names_occupied_by_unowned_files',
  };
}
