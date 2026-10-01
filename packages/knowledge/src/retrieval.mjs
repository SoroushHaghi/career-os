function tokenize(text) {
  return String(text ?? '')
    .toLowerCase()
    .normalize('NFKC')
    .split(/[^\p{L}\p{N}_+-]+/u)
    .filter(Boolean);
}

function overlapScore(queryTokens, textTokens) {
  if (!queryTokens.length || !textTokens.length) return 0;
  const textSet = new Set(textTokens);
  const matched = queryTokens.filter((t) => textSet.has(t)).length;
  return matched / queryTokens.length;
}

export function retrieveEvidence({
  query,
  evidenceUnits = [],
  contextIds = [],
  modalities = [],
  limit = 12,
}) {
  const q = tokenize(query);
  const contextSet = new Set(contextIds.map(String));
  const modalitySet = new Set(modalities.map(String));

  return evidenceUnits
    .filter((e) => {
      if (contextSet.size) {
        const ids = new Set((e.contextIds ?? []).map(String));
        if (![...contextSet].some((id) => ids.has(id))) return false;
      }
      if (modalitySet.size && !modalitySet.has(String(e.modality ?? ''))) return false;
      return true;
    })
    .map((e) => {
      const searchable = [e.content, e.topicLabel, e.topicKey, e.sourceName].filter(Boolean).join(' ');
      const lexicalScore = overlapScore(q, tokenize(searchable));
      const exactBoost = query && searchable.toLowerCase().includes(String(query).toLowerCase()) ? 1 : 0;
      return {
        evidence: e,
        score: lexicalScore + exactBoost,
        retrieval: {
          lexicalScore,
          exactBoost,
          method: 'metadata+lexical',
        },
      };
    })
    .filter((x) => x.score > 0 || !q.length)
    .sort((a, b) => b.score - a.score || String(a.evidence.evidenceId).localeCompare(String(b.evidence.evidenceId)))
    .slice(0, Math.max(0, limit));
}

export function buildEvidenceBundle(results, { query = null, generatedAt = null } = {}) {
  const evidence = results.map((r) => r.evidence);
  return {
    query,
    generatedAt,
    retrievalMethod: 'metadata+lexical',
    evidenceIds: evidence.map((e) => e.evidenceId).filter(Boolean),
    evidence,
  };
}
