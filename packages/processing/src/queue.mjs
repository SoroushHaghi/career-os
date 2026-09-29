import { processingIdentityKey } from '../../core/src/processing-identity.mjs';

export function jobKey({ sourceVersionKey, processorName, processorVersion, processingProfileVersion }) {
  return processingIdentityKey({ sourceVersionKey, processorName, processorVersion, processingProfileVersion });
}

export function enqueueUnique(queue = [], job) {
  const key = jobKey(job);
  if (queue.some((item) => item.jobKey === key)) {
    return { queue: [...queue], added: false, jobKey: key };
  }
  return {
    queue: [...queue, { ...job, jobKey: key }],
    added: true,
    jobKey: key,
  };
}

export function dueJobs(queue = [], nowMs = Date.now()) {
  return queue.filter((job) => Number(job.nextAttemptAt ?? 0) <= nowMs);
}

export function retryDelayMs({
  retryAfterMs = 0,
  attempt = 0,
  baseDelayMs = 5000,
  maxDelayMs = 15 * 60 * 1000,
}) {
  const providerHint = Number(retryAfterMs);
  if (Number.isFinite(providerHint) && providerHint > 0) {
    return Math.min(providerHint, maxDelayMs);
  }
  const boundedAttempt = Math.max(0, Math.min(12, Number(attempt) || 0));
  return Math.min(baseDelayMs * (2 ** boundedAttempt), maxDelayMs);
}

export function scheduleRetry(job, input = {}) {
  const nowMs = Number(input.nowMs ?? Date.now());
  const delay = retryDelayMs({
    retryAfterMs: input.retryAfterMs,
    attempt: job.attempts ?? 0,
    baseDelayMs: input.baseDelayMs,
    maxDelayMs: input.maxDelayMs,
  });
  return {
    ...job,
    attempts: Number(job.attempts ?? 0) + 1,
    nextAttemptAt: nowMs + delay,
    lastError: String(input.lastError ?? job.lastError ?? ''),
  };
}
