import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildContextBundle,
  createInteractionEvent,
  createTaskRecord,
} from '../packages/core/src/shared-context.mjs';

test('interaction event is deterministic and keeps raw content behind a reference', () => {
  const input = {
    runtime: 'ai-client-a',
    eventKind: 'message',
    occurredAt: '2026-01-01T10:00:00Z',
    sessionRef: 'session-1',
    sequence: 4,
    contextIds: ['ctx-1', 'ctx-1'],
    contentRef: 'private://events/e4',
    contentFingerprint: 'sha256:abc',
  };

  const a = createInteractionEvent(input);
  const b = createInteractionEvent(input);

  assert.equal(a.eventId, b.eventId);
  assert.deepEqual([...a.contextIds], ['ctx-1']);
  assert.equal(a.contentRef, 'private://events/e4');
  assert.equal(Object.hasOwn(a, 'content'), false);
});

test('task record preserves dependencies and rejects unknown status', () => {
  const task = createTaskRecord({
    taskId: 'task-1',
    title: 'Reconcile session evidence',
    executor: 'ai-client-b',
    status: 'RUNNING',
    contextIds: ['course-1'],
    dependsOn: ['task-0'],
    waitingFor: [],
    inputRefs: ['artifact-1'],
    outputRefs: [],
    updatedAt: '2026-01-01T10:01:00Z',
  });

  assert.deepEqual([...task.dependsOn], ['task-0']);
  assert.throws(
    () => createTaskRecord({
      taskId: 'task-2',
      title: 'x',
      status: 'UNKNOWN',
      updatedAt: '2026-01-01T10:02:00Z',
    }),
    /unsupported task status/
  );
});

test('context bundle is bounded and excludes completed tasks from the handoff', () => {
  const bundle = buildContextBundle({
    objective: 'Continue the current project without re-reading full history',
    generatedAt: '2026-01-01T11:00:00Z',
    currentState: { phase: 'review' },
    priorities: ['P0', 'P1', 'P2'],
    tasks: [
      { taskId: 'done', status: 'DONE', updatedAt: '2026-01-01T10:00:00Z' },
      { taskId: 'run', status: 'RUNNING', updatedAt: '2026-01-01T10:59:00Z' },
      { taskId: 'wait', status: 'WAITING', updatedAt: '2026-01-01T10:30:00Z' },
    ],
    knowledgeRefs: ['k1', 'k2', 'k3'],
    evidenceRefs: ['e1', 'e2'],
    recentEventRefs: ['i1', 'i2', 'i3'],
    limits: {
      tasks: 1,
      priorities: 2,
      knowledgeRefs: 2,
      evidenceRefs: 1,
      recentEventRefs: 2,
    },
  });

  assert.equal(bundle.activeTasks.length, 1);
  assert.equal(bundle.activeTasks[0].taskId, 'run');
  assert.deepEqual([...bundle.priorities], ['P0', 'P1']);
  assert.deepEqual([...bundle.knowledgeRefs], ['k1', 'k2']);
  assert.deepEqual([...bundle.evidenceRefs], ['e1']);
  assert.deepEqual([...bundle.recentEventRefs], ['i1', 'i2']);
});
