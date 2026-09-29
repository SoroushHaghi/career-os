import { deterministicId } from '../../core/src/identities.mjs';

export const ClaimSupportStates = Object.freeze([
  'SUPPORTED',
  'PARTIALLY_SUPPORTED',
  'UNSUPPORTED',
  'CONTRADICTED',
  'UNDETERMINED',
  'INFERRED',
]);

export const VerificationVerdicts = Object.freeze([
  'VERIFIED',
  'VERIFIED_WITH_QUALIFICATION',
  'NOT_VERIFIED',
  'CONTRADICTED',
  'UNABLE_TO_VERIFY',
]);

function requireText(value, name) {
  if (typeof value !== 'string' || !value.trim()) {
    throw new TypeError(`${name} must be a non-empty string`);
  }
  return value.trim();
}

function uniqueStrings(values = []) {
  return [...new Set(values.map(String))];
}

export function createEvidenceBundle(input = {}) {
  const contextId = requireText(input.contextId, 'contextId');
  const selectionPolicyVersion = requireText(
    input.selectionPolicyVersion,
    'selectionPolicyVersion'
  );
  const privacyDecisionId = requireText(
    input.privacyDecisionId,
    'privacyDecisionId'
  );

  if (!Array.isArray(input.evidence) || input.evidence.length === 0) {
    throw new TypeError('evidence must be a non-empty array');
  }

  const evidence = input.evidence.map((item, index) => {
    const evidenceId = requireText(item?.evidenceId, `evidence[${index}].evidenceId`);
    const sourceVersionKey = requireText(
      item?.sourceVersionKey,
      `evidence[${index}].sourceVersionKey`
    );

    return {
      evidenceId,
      sourceVersionKey,
      modality: item.modality == null ? null : String(item.modality),
      anchor: item.anchor ?? null,
      contentDigest:
        item.contentDigest == null
          ? deterministicId(
              'evidence-content',
              evidenceId,
              String(item.content ?? '')
            )
          : requireText(item.contentDigest, `evidence[${index}].contentDigest`),
      content: item.content == null ? null : String(item.content),
    };
  });

  const orderedItemIdentity = evidence
    .map((item) =>
      [
        item.evidenceId,
        item.sourceVersionKey,
        item.contentDigest,
      ].join('\u001f')
    )
    .join('\u001e');

  const coverage = input.coverage ?? null;
  const exclusions = Array.isArray(input.exclusions)
    ? input.exclusions.map(String)
    : [];

  const bundleId =
    input.bundleId ??
    deterministicId(
      'evidence-bundle',
      contextId,
      selectionPolicyVersion,
      privacyDecisionId,
      orderedItemIdentity,
      JSON.stringify(coverage),
      exclusions.join('|')
    );

  return {
    schemaVersion: '0.1',
    bundleId,
    contextId,
    selectionPolicyVersion,
    privacyDecisionId,
    evidence,
    evidenceIds: evidence.map((item) => item.evidenceId),
    sourceVersionKeys: uniqueStrings(
      evidence.map((item) => item.sourceVersionKey)
    ),
    coverage,
    exclusions,
  };
}

export function createSynthesisClaim(input = {}) {
  const bundleId = requireText(input.bundleId, 'bundleId');
  const text = requireText(input.text, 'text');
  const supportStatus = requireText(
    input.supportStatus,
    'supportStatus'
  ).toUpperCase();

  if (!ClaimSupportStates.includes(supportStatus)) {
    throw new TypeError(
      `unsupported claim support status: ${supportStatus}`
    );
  }

  const evidenceRefs = uniqueStrings(input.evidenceRefs ?? []);
  const qualifiers = uniqueStrings(input.qualifiers ?? []);
  const uncertainties = uniqueStrings(input.uncertainties ?? []);

  return {
    claimId:
      input.claimId ??
      deterministicId(
        'synthesis-claim',
        bundleId,
        text,
        supportStatus,
        evidenceRefs.join('|')
      ),
    bundleId,
    text,
    claimType: input.claimType == null ? 'FACTUAL' : String(input.claimType),
    supportStatus,
    evidenceRefs,
    scope: input.scope == null ? null : String(input.scope),
    qualifiers,
    uncertainties,
    confidence: input.confidence == null ? null : Number(input.confidence),
    synthesisRunId:
      input.synthesisRunId == null ? null : String(input.synthesisRunId),
  };
}

export function validateSynthesisClaims({
  bundle,
  claims,
} = {}) {
  if (!bundle?.bundleId || !Array.isArray(bundle.evidenceIds)) {
    throw new TypeError('bundle is required');
  }
  if (!Array.isArray(claims)) {
    throw new TypeError('claims must be an array');
  }

  const allowed = new Set(bundle.evidenceIds.map(String));
  const seenClaimIds = new Set();
  const errors = [];

  const normalized = claims.map((claim, index) => {
    let item;
    try {
      item = createSynthesisClaim({
        ...claim,
        bundleId: claim?.bundleId ?? bundle.bundleId,
      });
    } catch (error) {
      errors.push({
        index,
        code: 'INVALID_CLAIM',
        detail: String(error.message || error),
      });
      return null;
    }

    if (item.bundleId !== bundle.bundleId) {
      errors.push({
        claimId: item.claimId,
        code: 'BUNDLE_ID_MISMATCH',
      });
    }

    if (seenClaimIds.has(item.claimId)) {
      errors.push({
        claimId: item.claimId,
        code: 'DUPLICATE_CLAIM_ID',
      });
    }
    seenClaimIds.add(item.claimId);

    for (const ref of item.evidenceRefs) {
      if (!allowed.has(ref)) {
        errors.push({
          claimId: item.claimId,
          code: 'UNKNOWN_EVIDENCE_REF',
          evidenceRef: ref,
        });
      }
    }

    if (
      ['SUPPORTED', 'PARTIALLY_SUPPORTED'].includes(item.supportStatus) &&
      item.evidenceRefs.length === 0
    ) {
      errors.push({
        claimId: item.claimId,
        code: 'SUPPORTED_CLAIM_WITHOUT_EVIDENCE',
      });
    }

    return item;
  }).filter(Boolean);

  return {
    valid: errors.length === 0,
    errors,
    claims: normalized,
  };
}

export function createVerificationVerdict(input = {}) {
  const claimId = requireText(input.claimId, 'claimId');
  const verificationRunId = requireText(
    input.verificationRunId,
    'verificationRunId'
  );
  const verdict = requireText(input.verdict, 'verdict').toUpperCase();

  if (!VerificationVerdicts.includes(verdict)) {
    throw new TypeError(
      `unsupported verification verdict: ${verdict}`
    );
  }

  return {
    verificationId:
      input.verificationId ??
      deterministicId(
        'claim-verification',
        verificationRunId,
        claimId,
        verdict,
        uniqueStrings(input.checkedEvidenceRefs ?? []).join('|')
      ),
    verificationRunId,
    claimId,
    verdict,
    checkedEvidenceRefs: uniqueStrings(input.checkedEvidenceRefs ?? []),
    rationale: input.rationale == null ? null : String(input.rationale),
    qualifications: uniqueStrings(input.qualifications ?? []),
    verifierIdentity:
      input.verifierIdentity == null ? null : String(input.verifierIdentity),
  };
}

export function evaluateVerifiedClaimSet({
  bundle,
  claims,
  verdicts,
  privacyDispatchAllowed,
  materialClaimIds,
} = {}) {
  const validation = validateSynthesisClaims({ bundle, claims });
  const reasons = validation.errors.map((error) => error.code);
  const reviewReasons = [];

  if (privacyDispatchAllowed !== true) {
    reasons.push('PRIVACY_DISPATCH_NOT_ALLOWED');
  }

  const material = new Set(
    (materialClaimIds ?? validation.claims.map((claim) => claim.claimId))
      .map(String)
  );

  const claimIds = new Set(validation.claims.map((claim) => claim.claimId));
  const verdictByClaim = new Map();

  for (const raw of verdicts ?? []) {
    let verdict;
    try {
      verdict = createVerificationVerdict(raw);
    } catch (_error) {
      reasons.push('INVALID_VERIFICATION_VERDICT');
      continue;
    }

    if (!claimIds.has(verdict.claimId)) {
      reasons.push('VERDICT_FOR_UNKNOWN_CLAIM');
      continue;
    }

    if (verdictByClaim.has(verdict.claimId)) {
      reasons.push('DUPLICATE_VERDICT_FOR_CLAIM');
      continue;
    }

    verdictByClaim.set(verdict.claimId, verdict);
  }

  for (const claim of validation.claims) {
    if (!material.has(claim.claimId)) continue;

    if (claim.supportStatus !== 'SUPPORTED') {
      reasons.push(
        'MATERIAL_CLAIM_NOT_FULLY_SUPPORTED:' +
        claim.claimId
      );
    }

    const verdict = verdictByClaim.get(claim.claimId);
    if (!verdict) {
      reasons.push(
        'MISSING_VERDICT:' +
        claim.claimId
      );
      continue;
    }

    if (verdict.verdict === 'VERIFIED_WITH_QUALIFICATION') {
      reviewReasons.push(
        'QUALIFIED_VERDICT:' +
        claim.claimId
      );
      continue;
    }

    if (verdict.verdict !== 'VERIFIED') {
      reasons.push(
        'MATERIAL_CLAIM_NOT_VERIFIED:' +
        claim.claimId
      );
    }
  }

  return {
    automaticallyPromotable:
      reasons.length === 0 &&
      reviewReasons.length === 0,
    reviewRequired:
      reasons.length === 0 &&
      reviewReasons.length > 0,
    reasons: uniqueStrings(reasons),
    reviewReasons: uniqueStrings(reviewReasons),
    normalizedClaims: validation.claims,
    normalizedVerdicts: [...verdictByClaim.values()],
  };
}
