function stableSortRecords(records, key) {
  return [...records].sort((a, b) => String(a?.[key] ?? '').localeCompare(String(b?.[key] ?? '')));
}

export function toJsonl(records, { sortKey = null } = {}) {
  const list = Array.isArray(records) ? records : [];
  const ordered = sortKey ? stableSortRecords(list, sortKey) : [...list];
  return ordered.map((record) => JSON.stringify(record)).join('\n') + (ordered.length ? '\n' : '');
}

export function parseJsonl(text) {
  if (!text) return [];
  return String(text)
    .split(/\r?\n/)
    .filter((line) => line.trim())
    .map((line) => JSON.parse(line));
}

export function buildContextManifest({
  schemaVersion = '0.1',
  context,
  sources = [],
  artifacts = [],
  evidence = [],
  processing = [],
  generatedAt,
}) {
  if (!context?.contextId) throw new TypeError('context.contextId is required');
  if (!generatedAt) throw new TypeError('generatedAt is required');

  const sourceKeys = [...new Set(sources.map((x) => x.sourceKey).filter(Boolean))].sort();
  const artifactIds = [...new Set(artifacts.map((x) => x.artifactId).filter(Boolean))].sort();
  const evidenceIds = [...new Set(evidence.map((x) => x.evidenceId).filter(Boolean))].sort();

  const jobCounts = processing.reduce((acc, item) => {
    const status = item?.status ?? 'UNKNOWN';
    acc[status] = (acc[status] ?? 0) + 1;
    return acc;
  }, {});

  return {
    schemaVersion,
    generatedAt,
    context,
    counts: {
      sources: sourceKeys.length,
      artifacts: artifactIds.length,
      evidence: evidenceIds.length,
      processing: processing.length,
    },
    sourceKeys,
    artifactIds,
    evidenceIds,
    processingByStatus: Object.fromEntries(Object.entries(jobCounts).sort(([a], [b]) => a.localeCompare(b))),
  };
}

export function buildRegistryProjection(input) {
  const manifest = buildContextManifest(input);
  return {
    manifest,
    files: {
      'sources.jsonl': toJsonl(input.sources ?? [], { sortKey: 'sourceKey' }),
      'artifacts.jsonl': toJsonl(input.artifacts ?? [], { sortKey: 'artifactId' }),
      'evidence.jsonl': toJsonl(input.evidence ?? [], { sortKey: 'evidenceId' }),
      'processing.jsonl': toJsonl(input.processing ?? [], { sortKey: 'processingId' }),
      'CONTEXT_MANIFEST.json': JSON.stringify(manifest, null, 2) + '\n',
    },
  };
}
