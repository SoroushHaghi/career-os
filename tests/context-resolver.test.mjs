import test from 'node:test';
import assert from 'node:assert/strict';
import { ContextResolutionStatus, looksLikeSessionLabel, resolveContext } from '../packages/core/src/context-resolver.mjs';

test('legacy-style session labels remain useful hints', () => {
  for (const label of ['10', 'L10', 'Session 10', 'Lecture 8', 'Week 3', 'Module 5']) {
    assert.equal(looksLikeSessionLabel(label), true, label);
  }
});

test('arbitrary authorized folder label is held, not discarded', () => {
  const result = resolveContext({
    authorizationState: 'AUTHORIZED',
    hints: [{ contextId: 'drive-folder:FOLDER_X', label: 'test', method: 'drive_parent', confidence: 0.4 }],
  });
  assert.equal(result.status, ContextResolutionStatus.UNCLASSIFIED_AUTHORIZED);
  assert.equal(result.primary, null);
});

test('authorized session-like hint resolves automatically', () => {
  const result = resolveContext({
    authorizationState: 'AUTHORIZED',
    hints: [{ contextId: 'drive-folder:FOLDER_10', label: 'L10', method: 'drive_parent', confidence: 0.8 }],
  });
  assert.equal(result.status, ContextResolutionStatus.RESOLVED_PRIMARY);
  assert.equal(result.primary.contextKind, 'session');
});

test('explicit user-confirmed context outranks weak inference', () => {
  const result = resolveContext({
    authorizationState: 'AUTHORIZED',
    hints: [
      { contextId: 'drive-folder:A', label: 'L10', method: 'drive_parent', confidence: 0.8 },
      { contextId: 'context:PROJECT_X', contextKind: 'project', label: 'Project X', method: 'user_confirmed', confidence: 1, isPrimary: true },
    ],
  });
  assert.equal(result.status, ContextResolutionStatus.RESOLVED_PRIMARY);
  assert.equal(result.primary.contextId, 'context:PROJECT_X');
});

test('denied/restricted sources are blocked by policy, not context failure', () => {
  for (const authorizationState of ['DENIED', 'RESTRICTED']) {
    const result = resolveContext({ authorizationState, hints: [] });
    assert.equal(result.status, ContextResolutionStatus.BLOCKED_POLICY);
  }
});
