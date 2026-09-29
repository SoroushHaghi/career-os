import test from 'node:test';
import assert from 'node:assert/strict';

import {
  createPrivacyDecision,
  evaluateRestrictedDispatch,
} from '../packages/core/src/privacy-decision.mjs';

import {
  createEvidenceBundle,
  createSynthesisClaim,
  createVerificationVerdict,
  evaluateVerifiedClaimSet,
  validateSynthesisClaims,
} from '../packages/knowledge/src/verified-synthesis.mjs';

test('restricted provider privacy decision is bound to exact payload, destination and policy', () => {
  const decision = createPrivacyDecision({
    decision: 'ALLOW',
    payloadDigest: 'sha256:abc',
    destination: 'tubs_ki_toolbox',
    policyVersion: 'tu-privacy-v1',
  });

  assert.equal(
    evaluateRestrictedDispatch({
      privacyDecision: decision,
      payloadDigest: 'sha256:abc',
      destination: 'tubs_ki_toolbox',
      policyVersion: 'tu-privacy-v1',
    }).allowed,
    true
  );

  assert.equal(
    evaluateRestrictedDispatch({
      privacyDecision: decision,
      payloadDigest: 'sha256:changed',
      destination: 'tubs_ki_toolbox',
      policyVersion: 'tu-privacy-v1',
    }).allowed,
    false
  );

  assert.equal(
    evaluateRestrictedDispatch({
      privacyDecision: decision,
      payloadDigest: 'sha256:abc',
      destination: 'other_provider',
      policyVersion: 'tu-privacy-v1',
    }).allowed,
    false
  );

  assert.equal(
    evaluateRestrictedDispatch({
      privacyDecision: decision,
      payloadDigest: 'sha256:abc',
      destination: 'tubs_ki_toolbox',
      policyVersion: 'tu-privacy-v2',
    }).allowed,
    false
  );
});

test('privacy gate fails closed for review, transform and block outcomes', () => {
  for (const state of ['NEEDS_REVIEW', 'TRANSFORM_AND_RECHECK', 'BLOCK']) {
    const decision = createPrivacyDecision({
      decision: state,
      payloadDigest: 'sha256:abc',
      destination: 'tubs_ki_toolbox',
      policyVersion: 'tu-privacy-v1',
    });

    const result = evaluateRestrictedDispatch({
      privacyDecision: decision,
      payloadDigest: 'sha256:abc',
      destination: 'tubs_ki_toolbox',
      policyVersion: 'tu-privacy-v1',
    });

    assert.equal(result.allowed, false, state);
    assert.ok(result.reasons.includes('privacy_decision_not_allow'));
  }
});

function sampleBundle() {
  return createEvidenceBundle({
    contextId: 'ctx:qpl:l1',
    selectionPolicyVersion: 'bundle-policy-v1',
    privacyDecisionId: 'privacy:1',
    evidence: [
      {
        evidenceId: 'E1',
        sourceVersionKey: 'drive:A@v1',
        modality: 'text',
        content: 'BB84 uses non-orthogonal states.',
      },
      {
        evidenceId: 'E2',
        sourceVersionKey: 'drive:B@v1',
        modality: 'text',
        content: 'An authenticated classical channel is required.',
      },
    ],
    coverage: { complete: false, note: 'bounded fixture' },
    exclusions: ['raw-media'],
  });
}

test('evidence bundle identity changes when ordered evidence changes', () => {
  const first = sampleBundle();
  const second = createEvidenceBundle({
    contextId: 'ctx:qpl:l1',
    selectionPolicyVersion: 'bundle-policy-v1',
    privacyDecisionId: 'privacy:1',
    evidence: [...first.evidence].reverse(),
    coverage: { complete: false, note: 'bounded fixture' },
    exclusions: ['raw-media'],
  });

  assert.notEqual(first.bundleId, second.bundleId);
});

test('supported synthesis claims require in-bundle evidence refs', () => {
  const bundle = sampleBundle();

  const good = createSynthesisClaim({
    bundleId: bundle.bundleId,
    text: 'BB84 uses non-orthogonal states.',
    supportStatus: 'SUPPORTED',
    evidenceRefs: ['E1'],
  });

  const bad = createSynthesisClaim({
    bundleId: bundle.bundleId,
    text: 'Unsupported external claim.',
    supportStatus: 'SUPPORTED',
    evidenceRefs: ['E9'],
  });

  assert.equal(
    validateSynthesisClaims({ bundle, claims: [good] }).valid,
    true
  );

  const validation = validateSynthesisClaims({
    bundle,
    claims: [good, bad],
  });
  assert.equal(validation.valid, false);
  assert.ok(
    validation.errors.some(
      (error) => error.code === 'UNKNOWN_EVIDENCE_REF'
    )
  );
});

test('automatic promotion requires privacy pass, supported claims and verified verdicts', () => {
  const bundle = sampleBundle();
  const claim = createSynthesisClaim({
    bundleId: bundle.bundleId,
    text: 'An authenticated classical channel is required.',
    supportStatus: 'SUPPORTED',
    evidenceRefs: ['E2'],
  });

  const verdict = createVerificationVerdict({
    verificationRunId: 'verify:1',
    claimId: claim.claimId,
    verdict: 'VERIFIED',
    checkedEvidenceRefs: ['E2'],
    verifierIdentity: 'gpt-oss-120b',
  });

  const result = evaluateVerifiedClaimSet({
    bundle,
    claims: [claim],
    verdicts: [verdict],
    privacyDispatchAllowed: true,
  });

  assert.equal(result.automaticallyPromotable, true);
  assert.equal(result.reviewRequired, false);
});

test('qualified verifier result requires review instead of automatic promotion', () => {
  const bundle = sampleBundle();
  const claim = createSynthesisClaim({
    bundleId: bundle.bundleId,
    text: 'An authenticated classical channel is required.',
    supportStatus: 'SUPPORTED',
    evidenceRefs: ['E2'],
  });

  const verdict = createVerificationVerdict({
    verificationRunId: 'verify:2',
    claimId: claim.claimId,
    verdict: 'VERIFIED_WITH_QUALIFICATION',
    checkedEvidenceRefs: ['E2'],
    qualifications: ['scope-limited'],
  });

  const result = evaluateVerifiedClaimSet({
    bundle,
    claims: [claim],
    verdicts: [verdict],
    privacyDispatchAllowed: true,
  });

  assert.equal(result.automaticallyPromotable, false);
  assert.equal(result.reviewRequired, true);
});

test('missing, contradicted or unable verifier outcomes fail closed', () => {
  const bundle = sampleBundle();
  const claim = createSynthesisClaim({
    bundleId: bundle.bundleId,
    text: 'An authenticated classical channel is required.',
    supportStatus: 'SUPPORTED',
    evidenceRefs: ['E2'],
  });

  for (const verdictName of ['NOT_VERIFIED', 'CONTRADICTED', 'UNABLE_TO_VERIFY']) {
    const verdict = createVerificationVerdict({
      verificationRunId: 'verify:' + verdictName,
      claimId: claim.claimId,
      verdict: verdictName,
      checkedEvidenceRefs: ['E2'],
    });

    const result = evaluateVerifiedClaimSet({
      bundle,
      claims: [claim],
      verdicts: [verdict],
      privacyDispatchAllowed: true,
    });

    assert.equal(result.automaticallyPromotable, false, verdictName);
    assert.equal(result.reviewRequired, false, verdictName);
  }

  const missing = evaluateVerifiedClaimSet({
    bundle,
    claims: [claim],
    verdicts: [],
    privacyDispatchAllowed: true,
  });
  assert.equal(missing.automaticallyPromotable, false);
  assert.ok(missing.reasons.some((reason) => reason.startsWith('MISSING_VERDICT:')));
});

test('privacy dispatch failure blocks otherwise verified claim set', () => {
  const bundle = sampleBundle();
  const claim = createSynthesisClaim({
    bundleId: bundle.bundleId,
    text: 'BB84 uses non-orthogonal states.',
    supportStatus: 'SUPPORTED',
    evidenceRefs: ['E1'],
  });
  const verdict = createVerificationVerdict({
    verificationRunId: 'verify:privacy',
    claimId: claim.claimId,
    verdict: 'VERIFIED',
    checkedEvidenceRefs: ['E1'],
  });

  const result = evaluateVerifiedClaimSet({
    bundle,
    claims: [claim],
    verdicts: [verdict],
    privacyDispatchAllowed: false,
  });

  assert.equal(result.automaticallyPromotable, false);
  assert.ok(result.reasons.includes('PRIVACY_DISPATCH_NOT_ALLOWED'));
});
