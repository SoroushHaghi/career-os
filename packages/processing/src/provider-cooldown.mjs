export const DEFAULT_QUOTA_CIRCUIT_POLICY = Object.freeze({
  streakThreshold: 3,
  minCircuitMs: 90 * 1000,
  maxCircuitMs: 5 * 60 * 1000,
});

export function noteQuota429(
  state = {},
  {
    nowMs = Date.now(),
    policy = DEFAULT_QUOTA_CIRCUIT_POLICY,
  } = {},
) {
  const streak = Math.max(0, Number(state.streak ?? 0)) + 1;
  const level = Math.max(0, Number(state.level ?? 0));
  const globalBackoffUntil = Math.max(0, Number(state.globalBackoffUntil ?? 0));

  if (streak < policy.streakThreshold) {
    return {
      streak,
      level,
      globalBackoffUntil,
      circuitOpened: false,
      circuitDelayMs: 0,
    };
  }

  const nextLevel = level + 1;
  const delay = Math.min(
    policy.maxCircuitMs,
    policy.minCircuitMs * (2 ** (nextLevel - 1)),
  );
  const until = Math.max(globalBackoffUntil, Number(nowMs) + delay);

  return {
    streak: 0,
    level: nextLevel,
    globalBackoffUntil: until,
    circuitOpened: true,
    circuitDelayMs: delay,
  };
}

export function noteProviderSuccess(state = {}, { nowMs = Date.now() } = {}) {
  const until = Number(state.globalBackoffUntil ?? 0);
  return {
    streak: 0,
    level: 0,
    globalBackoffUntil: until > Number(nowMs) ? until : 0,
    circuitOpened: false,
    circuitDelayMs: 0,
  };
}

export function mergeProviderBackoff(currentUntil, candidateUntil) {
  return Math.max(
    0,
    Number(currentUntil ?? 0),
    Number(candidateUntil ?? 0),
  );
}
