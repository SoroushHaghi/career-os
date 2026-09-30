import { deterministicId } from './identities.mjs';

const text = (value, name) => {
  if (typeof value !== 'string' || !value.trim()) {
    throw new TypeError(`${name} must be a non-empty string`);
  }
  return value.trim();
};

const optionalText = (value) =>
  value == null || value === '' ? null : String(value).trim();

const uniqueStrings = (values = []) =>
  Object.freeze([...new Set(values.map(String).map((v) => v.trim()).filter(Boolean))]);

export const InteractionKinds = Object.freeze([
  'message',
  'decision',
  'status_change',
  'artifact_created',
  'task_update',
  'observation',
]);

export const TaskStatuses = Object.freeze([
  'QUEUED',
  'RUNNING',
  'WAITING',
  'DONE',
  'FAILED',
  'CANCELLED',
]);

/**
 * Portable envelope for a private interaction/event log.
 *
 * Raw message text intentionally does not belong in this public contract.
 * Implementations keep private content behind contentRef and may add a
 * contentFingerprint for idempotency.
 */
export function createInteractionEvent(input) {
  const runtime = text(input.runtime, 'runtime');
  const eventKind = text(input.eventKind, 'eventKind');
  if (!InteractionKinds.includes(eventKind)) {
    throw new TypeError(`unsupported eventKind: ${eventKind}`);
  }

  const occurredAt = text(input.occurredAt, 'occurredAt');
  const sessionRef = optionalText(input.sessionRef);
  const contentFingerprint = optionalText(input.contentFingerprint);
  const sequence = Number.isInteger(input.sequence) && input.sequence >= 0
    ? input.sequence
    : null;

  const identitySeed = [
    runtime,
    sessionRef ?? 'no-session',
    eventKind,
    sequence == null ? occurredAt : String(sequence),
    contentFingerprint ?? 'no-fingerprint',
  ];

  return Object.freeze({
    eventId: input.eventId ?? deterministicId('interaction-event', ...identitySeed),
    runtime,
    eventKind,
    occurredAt,
    sessionRef,
    sequence,
    actorRole: optionalText(input.actorRole),
    contextIds: uniqueStrings(input.contextIds),
    taskIds: uniqueStrings(input.taskIds),
    contentRef: optionalText(input.contentRef),
    contentFingerprint,
    summaryRef: optionalText(input.summaryRef),
    provenance: input.provenance ?? null,
  });
}

/**
 * Runtime-neutral task ledger record for coordination across AI clients.
 */
export function createTaskRecord(input) {
  const status = text(input.status, 'status');
  if (!TaskStatuses.includes(status)) {
    throw new TypeError(`unsupported task status: ${status}`);
  }

  const taskId = text(input.taskId, 'taskId');

  return Object.freeze({
    taskId,
    parentTaskId: optionalText(input.parentTaskId),
    title: text(input.title, 'title'),
    executor: optionalText(input.executor),
    status,
    stage: optionalText(input.stage),
    contextIds: uniqueStrings(input.contextIds),
    dependsOn: uniqueStrings(input.dependsOn),
    waitingFor: uniqueStrings(input.waitingFor),
    inputRefs: uniqueStrings(input.inputRefs),
    outputRefs: uniqueStrings(input.outputRefs),
    currentAction: optionalText(input.currentAction),
    resultRef: optionalText(input.resultRef),
    startedAt: optionalText(input.startedAt),
    updatedAt: text(input.updatedAt, 'updatedAt'),
    finishedAt: optionalText(input.finishedAt),
  });
}

function bounded(values, limit) {
  const n = Number.isInteger(limit) && limit >= 0 ? limit : 0;
  return Object.freeze([...values].slice(0, n));
}

/**
 * Build a small handoff package for a newly connected AI runtime.
 *
 * The bundle contains references and compressed current state, not raw history.
 * Callers decide which private records the references resolve to.
 */
export function buildContextBundle({
  objective,
  generatedAt,
  currentState = {},
  priorities = [],
  tasks = [],
  knowledgeRefs = [],
  evidenceRefs = [],
  recentEventRefs = [],
  limits = {},
}) {
  const taskLimit = limits.tasks ?? 12;
  const priorityLimit = limits.priorities ?? 8;
  const knowledgeLimit = limits.knowledgeRefs ?? 16;
  const evidenceLimit = limits.evidenceRefs ?? 16;
  const eventLimit = limits.recentEventRefs ?? 12;

  const activeTasks = tasks
    .filter((task) => task && !['DONE', 'CANCELLED'].includes(String(task.status)))
    .sort((a, b) =>
      String(b.updatedAt ?? '').localeCompare(String(a.updatedAt ?? '')) ||
      String(a.taskId ?? '').localeCompare(String(b.taskId ?? ''))
    );

  return Object.freeze({
    schemaVersion: 1,
    objective: text(objective, 'objective'),
    generatedAt: text(generatedAt, 'generatedAt'),
    currentState: Object.freeze({ ...currentState }),
    priorities: bounded(uniqueStrings(priorities), priorityLimit),
    activeTasks: bounded(activeTasks, taskLimit),
    knowledgeRefs: bounded(uniqueStrings(knowledgeRefs), knowledgeLimit),
    evidenceRefs: bounded(uniqueStrings(evidenceRefs), evidenceLimit),
    recentEventRefs: bounded(uniqueStrings(recentEventRefs), eventLimit),
  });
}
