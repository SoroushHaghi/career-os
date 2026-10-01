import { deterministicId } from './identities.mjs';

export const KnowledgeTypes = Object.freeze([
  'Concept','Topic','Course','Project','Session','Artifact','Skill','Person','Organization','Method','Formula','QuestionPattern'
]);

function text(value, name) {
  if (typeof value !== 'string' || !value.trim()) throw new TypeError(`${name} must be a non-empty string`);
  return value.trim();
}

export function createKnowledgeEntity(input) {
  const knowledgeType = text(input.knowledgeType, 'knowledgeType');
  if (!KnowledgeTypes.includes(knowledgeType)) throw new TypeError(`unsupported knowledgeType: ${knowledgeType}`);
  const label = text(input.label, 'label');
  const normalizedKey = String(input.normalizedKey ?? label.toLowerCase().replace(/\s+/g, ' '));
  return {
    knowledgeId: input.knowledgeId ?? deterministicId('knowledge', knowledgeType, normalizedKey),
    knowledgeType,
    label,
    normalizedKey,
    provenance: input.provenance ?? null,
    confidence: input.confidence == null ? null : Number(input.confidence),
  };
}

export function createKnowledgeRelation(input) {
  const sourceKnowledgeId = text(input.sourceKnowledgeId, 'sourceKnowledgeId');
  const targetKnowledgeId = text(input.targetKnowledgeId, 'targetKnowledgeId');
  const relationType = text(input.relationType, 'relationType');
  const evidenceIds = [...new Set((input.evidenceIds ?? []).map(String))].sort();
  return {
    relationId: input.relationId ?? deterministicId('relation', sourceKnowledgeId, relationType, targetKnowledgeId, evidenceIds.join('|')),
    sourceKnowledgeId,
    relationType,
    targetKnowledgeId,
    evidenceIds,
    provenance: input.provenance ?? null,
    confidence: input.confidence == null ? null : Number(input.confidence),
  };
}
