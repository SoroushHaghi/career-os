import { buildTopicBlocks } from './fusion.mjs';

export function buildKnowledgePackage(input) {
  const context = input.context;
  if (!context?.contextId) throw new TypeError('context.contextId is required');

  const evidence = input.evidence ?? [];
  return {
    schemaVersion: '0.1',
    context,
    sourceKeys: [...new Set((input.sources ?? []).map((x) => x.sourceKey).filter(Boolean))].sort(),
    artifactIds: [...new Set((input.artifacts ?? []).map((x) => x.artifactId).filter(Boolean))].sort(),
    evidenceIds: [...new Set(evidence.map((x) => x.evidenceId).filter(Boolean))].sort(),
    concepts: buildTopicBlocks(evidence),
    relations: input.relations ?? [],
    timeline: input.timeline ?? [],
  };
}
