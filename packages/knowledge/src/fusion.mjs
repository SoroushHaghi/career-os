import { deterministicId } from '../../core/src/identities.mjs';

function normalizeTopicKey(value) {
  return String(value ?? '').trim().toLowerCase().replace(/\s+/g, ' ');
}

export function buildTopicBlocks(evidenceUnits = []) {
  const groups = new Map();

  for (const evidence of evidenceUnits) {
    const topicKey = normalizeTopicKey(evidence?.topicKey);
    if (!topicKey) continue;

    if (!groups.has(topicKey)) {
      groups.set(topicKey, {
        topicId: deterministicId('topic', topicKey),
        topicKey,
        labels: new Set(),
        evidenceIds: [],
        contextIds: new Set(),
        modalities: new Set(),
        conflicts: [],
      });
    }

    const group = groups.get(topicKey);
    if (evidence.topicLabel) group.labels.add(String(evidence.topicLabel));
    if (evidence.evidenceId) group.evidenceIds.push(String(evidence.evidenceId));
    for (const contextId of evidence.contextIds ?? []) group.contextIds.add(String(contextId));
    if (evidence.modality) group.modalities.add(String(evidence.modality));
  }

  return [...groups.values()]
    .map((group) => ({
      topicId: group.topicId,
      topicKey: group.topicKey,
      label: [...group.labels][0] ?? group.topicKey,
      evidenceIds: [...new Set(group.evidenceIds)].sort(),
      contextIds: [...group.contextIds].sort(),
      modalities: [...group.modalities].sort(),
      conflicts: group.conflicts,
    }))
    .sort((a, b) => a.topicKey.localeCompare(b.topicKey));
}

export function createConflictRecord({
  subject,
  evidenceIds,
  disagreementType,
  status = 'OPEN',
  resolution = null,
  provenance = null,
}) {
  const refs = [...new Set((evidenceIds ?? []).map(String))].sort();
  if (!subject || refs.length < 2) throw new TypeError('conflict requires subject and at least two evidence refs');
  return {
    conflictId: deterministicId('conflict', subject, disagreementType ?? 'unspecified', ...refs),
    subject: String(subject),
    evidenceIds: refs,
    disagreementType: String(disagreementType ?? 'unspecified'),
    status,
    resolution,
    provenance,
  };
}
