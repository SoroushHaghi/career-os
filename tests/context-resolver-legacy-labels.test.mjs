import test from 'node:test';
import assert from 'node:assert/strict';
import { looksLikeSessionLabel } from '../packages/core/src/context-resolver.mjs';

test('legacy session label forms remain recognized', () => {
  const samples = ['10', 'L10', 'L-8', 'R_03', 'S 12', 'Session 10', 'Lecture 8', 'Chapter 16', 'Week 3', 'Block 2', 'Module 5'];
  for (const label of samples) assert.equal(looksLikeSessionLabel(label), true, label);
});
