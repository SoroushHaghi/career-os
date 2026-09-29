import { deterministicId } from './identities.mjs';

export const PrivacyDecisionStates = Object.freeze([
  'ALLOW',
  'TRANSFORM_AND_RECHECK',
  'BLOCK',
  'NEEDS_REVIEW',
]);

function requireText(value, name) {
  if (typeof value !== 'string' || !value.trim()) {
    throw new TypeError(`${name} must be a non-empty string`);
  }
  return value.trim();
}

export function createPrivacyDecision(input = {}) {
  const decision = requireText(input.decision, 'decision').toUpperCase();
  if (!PrivacyDecisionStates.includes(decision)) {
    throw new TypeError(`unsupported privacy decision: ${decision}`);
  }

  const payloadDigest = requireText(input.payloadDigest, 'payloadDigest');
  const destination = requireText(input.destination, 'destination');
  const policyVersion = requireText(input.policyVersion, 'policyVersion');

  const findings = Array.isArray(input.findings)
    ? input.findings.map(String)
    : [];

  const transformations = Array.isArray(input.transformations)
    ? input.transformations.map(String)
    : [];

  return {
    privacyDecisionId:
      input.privacyDecisionId ??
      deterministicId(
        'privacy-decision',
        payloadDigest,
        destination,
        policyVersion,
        decision,
        findings.length ? findings.join('|') : 'none',
        transformations.length ? transformations.join('|') : 'none'
      ),
    decision,
    payloadDigest,
    destination,
    policyVersion,
    findings,
    transformations,
    residualRisk: input.residualRisk == null ? null : String(input.residualRisk),
    assessedAt: input.assessedAt == null ? null : String(input.assessedAt),
    assessor: input.assessor == null ? null : String(input.assessor),
  };
}

export function evaluateRestrictedDispatch({
  privacyDecision,
  payloadDigest,
  destination,
  policyVersion,
} = {}) {
  const reasons = [];

  if (!privacyDecision) {
    reasons.push('missing_privacy_decision');
    return { allowed: false, reasons };
  }

  let normalized;
  try {
    normalized = createPrivacyDecision(privacyDecision);
  } catch (_error) {
    reasons.push('invalid_privacy_decision');
    return { allowed: false, reasons };
  }

  if (normalized.decision !== 'ALLOW') {
    reasons.push('privacy_decision_not_allow');
  }

  if (String(payloadDigest ?? '') !== normalized.payloadDigest) {
    reasons.push('payload_digest_mismatch');
  }

  if (String(destination ?? '') !== normalized.destination) {
    reasons.push('destination_mismatch');
  }

  if (String(policyVersion ?? '') !== normalized.policyVersion) {
    reasons.push('policy_version_mismatch');
  }

  return {
    allowed: reasons.length === 0,
    reasons,
    privacyDecisionId: normalized.privacyDecisionId,
  };
}

export function assertRestrictedDispatch(input = {}) {
  const result = evaluateRestrictedDispatch(input);
  if (!result.allowed) {
    throw new Error(
      'restricted provider dispatch blocked: ' +
      result.reasons.join(',')
    );
  }
  return result;
}
