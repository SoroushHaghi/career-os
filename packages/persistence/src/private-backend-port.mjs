export function createPrivateBackendPort(adapter) {
  if (!adapter || typeof adapter.writePromotion !== 'function') {
    throw new TypeError('adapter.writePromotion(record) is required');
  }

  return Object.freeze({
    async writePromotion(record) {
      if (!record || record.destination !== 'career-memory') {
        throw new Error('private backend port accepts Career Memory promotion records only');
      }
      if (!record.provenance) {
        throw new Error('promotion record requires provenance');
      }
      return adapter.writePromotion(record);
    },
  });
}

export async function consumePromotionOutbox({
  outbox,
  evaluate,
  buildRecord,
  port,
}) {
  if (!outbox || !Array.isArray(outbox.candidates)) {
    throw new TypeError('outbox.candidates is required');
  }
  if (typeof evaluate !== 'function' || typeof buildRecord !== 'function') {
    throw new TypeError('promotion policy functions are required');
  }

  const results = [];

  for (const candidate of outbox.candidates) {
    const decision = evaluate({
      ...candidate,
      private: true,
    });

    if (!decision.promotable || decision.reviewRequired) {
      results.push({
        candidateId: candidate.candidateId ?? null,
        written: false,
        reviewRequired: Boolean(decision.reviewRequired),
        reasons: [...(decision.reasons ?? [])],
      });
      continue;
    }

    const record = buildRecord(candidate, decision);
    const writeResult = await port.writePromotion(record);

    results.push({
      candidateId: candidate.candidateId ?? null,
      written: Boolean(writeResult?.ok),
      recordId: writeResult?.recordId ?? null,
      reviewRequired: false,
      reasons: [],
    });
  }

  return results;
}
