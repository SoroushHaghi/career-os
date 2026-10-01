// Public cutover commands intentionally exposed in the Apps Script function picker.
// These wrappers call private implementation helpers and fail closed.

function runCareerOsCutoverPhase1() {
  const preflight = runCareerOsCutoverPreflight();

  if (preflight.environment !== 'staging') {
    throw new Error(
      'Cutover Phase 1 requires CAREER_OS_ENVIRONMENT=staging.'
    );
  }

  if (preflight.triggerCount !== 0) {
    throw new Error(
      'Cutover Phase 1 requires zero installed triggers.'
    );
  }

  if (preflight.scannerAllowed) {
    throw new Error(
      'Cutover Phase 1 requires the scanner to be blocked.'
    );
  }

  if (preflight.triggerMutationAllowed) {
    throw new Error(
      'Cutover Phase 1 requires trigger mutation to be blocked.'
    );
  }

  if (preflight.workerAllowed) {
    throw new Error(
      'Cutover Phase 1 requires CAREER_OS_STAGING_LIVE_PROVIDER_TEST to remain disabled.'
    );
  }

  const snapshot =
    careerOsCreateCutoverStateSnapshot_();

  const shadow =
    runCareerOsVnextShadowSelfTest();

  return {
    ok:
      Boolean(
        preflight.ok &&
        shadow.ok
      ),
    phase:
      'CUTOVER_PHASE_1',
    build:
      getCareerOsBuildInfo(),
    preflight:
      preflight,
    snapshot: {
      createdAt:
        snapshot.createdAt,
      environment:
        snapshot.environment,
      stateKeys:
        Object.keys(
          snapshot.state || {}
        ).sort(),
      secretValuesIncluded:
        snapshot.secretValuesIncluded
    },
    shadow:
      shadow
  };
}


function runCareerOsCutoverSnapshotStatus() {
  const snapshot =
    careerOsReadCutoverStateSnapshot_();

  if (!snapshot) {
    return {
      ok:
        false,
      exists:
        false
    };
  }

  return {
    ok:
      true,
    exists:
      true,
    createdAt:
      snapshot.createdAt,
    environment:
      snapshot.environment,
    stateKeys:
      Object.keys(
        snapshot.state || {}
      ).sort(),
    secretValuesIncluded:
      snapshot.secretValuesIncluded,
    triggerCountAtSnapshot:
      (
        snapshot.triggerInventory ||
        []
      ).length
  };
}
